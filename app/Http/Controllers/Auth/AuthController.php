<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * REGISTER A NEW USER
     *
     * POST /api/register
     * Body: { first_name, last_name, email, password, password_confirmation }
     *
     * What happens:
     * 1. RegisterRequest validates all fields automatically
     * 2. User is created in the database (password is auto-hashed)
     * 3. Email verification is triggered
     * 4. A Sanctum token is generated for immediate login
     * 5. User data + token are returned
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'first_name' => $request->first_name,
            'last_name'  => $request->last_name,
            'email'      => $request->email,
            'password'   => $request->password,
            'role'       => 'student',
            // email_verified_at intentionally NOT set — user must verify via email
        ]);

        // Send verification email via Resend
        $this->sendVerificationEmail($user);

        // Return token so frontend can show resend option if needed
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message'           => 'Registration successful. Please check your email to verify your account.',
            'requires_verification' => true,
            'user' => [
                'id'         => $user->id,
                'first_name' => $user->first_name,
                'last_name'  => $user->last_name,
                'email'      => $user->email,
                'role'       => $user->role,
            ],
            'token' => $token,
        ], 201);
    }

    /**
     * Send email verification link via Laravel Mail (resend transport)
     */
    private function sendVerificationEmail(User $user): void
    {
        // Build a signed verification URL
        $verifyUrl = \URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $html = "
            <div style='font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;'>
                <h2 style='color: #1e1b4b;'>Verify your email</h2>
                <p>Hi {$user->first_name},</p>
                <p>Thanks for signing up for IntelliLearn! Click the button below to verify your email address. This link expires in <strong>60 minutes</strong>.</p>
                <a href='{$verifyUrl}' style='display:inline-block; background:#7655D9; color:white; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:bold; margin: 16px 0;'>
                    Verify Email Address
                </a>
                <p style='color:#64748b; font-size:13px;'>If you did not create an account, you can safely ignore this email.</p>
                <p style='color:#64748b; font-size:13px;'>Or copy this link: <a href='{$verifyUrl}'>{$verifyUrl}</a></p>
            </div>
        ";

        // Send email via Laravel Mail - same method as forgot password (no try-catch to match working flow)
        \Illuminate\Support\Facades\Mail::send([], [], function ($message) use ($user, $html) {
            $message->to($user->email, "{$user->first_name} {$user->last_name}")
                ->from(config('mail.from.address'), config('mail.from.name'))
                ->subject('Verify your IntelliLearn account')
                ->html($html);
        });
    }

    /**
     * LOG IN AN EXISTING USER
     *
     * POST /api/login
     * Body: { email, password }
     *
     * What happens:
     * 1. LoginRequest validates email and password are present
     * 2. We check if the credentials match a user in the database
     * 3. We check if the account is active (not deactivated by admin)
     * 4. Update last_login_at timestamp
     * 5. Generate a token and return user data
     */
    public function login(LoginRequest $request): JsonResponse
    {
        // Find the user by email
        $user = User::where('email', $request->email)->first();

        // Check if user exists AND password matches
        if (! $user || ! $user->password || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Check if account is active
        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated. Please contact the administrator.'],
            ]);
        }

        if ($user->isAdmin()) {
            $code = (string) random_int(100000, 999999);
            $challenge = bin2hex(random_bytes(32));
            DB::table('admin_login_challenges')->where('user_id', $user->id)->delete();
            DB::table('admin_login_challenges')->insert([
                'user_id' => $user->id, 'token_hash' => hash('sha256', $challenge), 'code_hash' => Hash::make($code),
                'attempts' => 0, 'expires_at' => now()->addMinutes(5), 'created_at' => now(), 'updated_at' => now(),
            ]);
            try {
                Mail::raw("Your IntelliLearn admin login code is {$code}. It expires in 5 minutes.",
                    fn ($message) => $message->to($user->email, $user->full_name)->subject('IntelliLearn admin sign-in code'));
            } catch (\Throwable $error) {
                DB::table('admin_login_challenges')->where('token_hash', hash('sha256', $challenge))->delete();
                $providerError = preg_replace('/Bearer\s+[^\s]+/i', 'Bearer [redacted]', $error->getMessage());
                $providerError = preg_replace('/\bre_[A-Za-z0-9_-]{12,}\b/', '[redacted-api-key]', $providerError);
                $providerError = preg_replace('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', '[redacted-email]', $providerError);
                \Illuminate\Support\Facades\Log::error('Admin sign-in email could not be sent', [
                    'user_id' => $user->id,
                    'exception_type' => get_class($error),
                    'provider_error' => mb_substr($providerError, 0, 300),
                ]);
                return response()->json(['message' => 'Could not send the admin verification code. Please try again later.'], 503);
            }
            return response()->json(['requires_two_factor' => true, 'challenge_token' => $challenge,
                'message' => 'A verification code was sent to your admin email address.']);
        }

        // Check if email is verified
        // Skip verification check for instructor and admin accounts
        if ($user->isStudent() && ! $user->hasVerifiedEmail()) {
            // Generate a fresh token for resend capability
            $token = $user->createToken('auth-token')->plainTextToken;
            return response()->json([
                'message'               => 'Please verify your email before logging in. Check your inbox for the verification link.',
                'requires_verification' => true,
                'email'                 => $user->email,
                'token'                 => $token,
            ], 403);
        }

        // Update last login timestamp — feeds into predictive analytics
        $user->update(['last_login_at' => now()]);

        // Create token
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'user'    => [
                'id'         => $user->id,
                'first_name' => $user->first_name,
                'last_name'  => $user->last_name,
                'email'      => $user->email,
                'role'       => $user->role,
                'full_name'  => $user->full_name,
                'avatar'     => $user->avatar,
                'birthday'  => $user->birthday?->toDateString(),
                'year_level' => $user->year_level,
                'section'    => $user->section,
                'student_id' => $user->student_id,
            ],
            'token' => $token,
        ]);
    }

    public function verifyAdminLogin(Request $request): JsonResponse
    {
        $data = $request->validate(['challenge_token' => ['required', 'string', 'size:64'], 'code' => ['required', 'digits:6']]);
        $tokenHash = hash('sha256', $data['challenge_token']);
        $challenge = DB::table('admin_login_challenges')->where('token_hash', $tokenHash)->first();
        if (!$challenge || now()->gte($challenge->expires_at) || $challenge->attempts >= 5) {
            if ($challenge) DB::table('admin_login_challenges')->where('id', $challenge->id)->delete();
            return response()->json(['message' => 'The verification code expired. Sign in again to request a new code.'], 422);
        }
        if (!Hash::check($data['code'], $challenge->code_hash)) {
            DB::table('admin_login_challenges')->where('id', $challenge->id)->increment('attempts');
            return response()->json(['message' => 'The verification code is incorrect.'], 422);
        }
        $user = User::whereKey($challenge->user_id)->where('role', 'admin')->where('is_active', true)->first();
        DB::table('admin_login_challenges')->where('id', $challenge->id)->delete();
        if (!$user) return response()->json(['message' => 'This account is unavailable.'], 403);
        $user->update(['last_login_at' => now()]);
        return response()->json([
            'message' => 'Login successful.',
            'user' => ['id' => $user->id, 'first_name' => $user->first_name, 'last_name' => $user->last_name,
                'email' => $user->email, 'role' => $user->role, 'full_name' => $user->full_name, 'avatar' => $user->avatar,
                'birthday' => $user->birthday?->toDateString(), 'year_level' => $user->year_level, 'section' => $user->section, 'student_id' => $user->student_id],
            'token' => $user->createToken('auth-token')->plainTextToken,
        ]);
    }

    /**
     * LOG OUT THE CURRENT USER
     *
     * POST /api/logout
     * Headers: Authorization: Bearer {token}
     *
     * Deletes the current token so it can't be used again.
     */
    public function logout(Request $request): JsonResponse
    {
        // Delete the token that was used for this request
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * GET CURRENT USER INFO
     *
     * GET /api/me
     * Headers: Authorization: Bearer {token}
     *
     * Returns the profile of whoever is currently logged in.
     * The frontend calls this on page load to check if the
     * user is still authenticated.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id'                => $user->id,
                'first_name'        => $user->first_name,
                'last_name'         => $user->last_name,
                'email'             => $user->email,
                'role'              => $user->role,
                'full_name'         => $user->full_name,
                'email_verified_at' => $user->email_verified_at,
                'avatar'            => $user->avatar,
                'birthday'          => $user->birthday?->toDateString(),
                'year_level'        => $user->year_level,
                'section'           => $user->section,
                'student_id'        => $user->student_id,
                'created_at'        => $user->created_at,
            ],
        ]);
    }

    /**
     * FORGOT PASSWORD — SEND RESET EMAIL
     *
     * POST /api/forgot-password
     * Body: { email }
     *
     * Sends a password reset link to the user's email via Resend.
     * The link contains a signed token valid for 60 minutes.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        // Find the user — always return success to prevent email enumeration
        $user = User::where('email', $request->email)->first();

        if ($user) {
            // Delete any existing token for this email
            \DB::table('password_reset_tokens')->where('email', $request->email)->delete();

            // Generate a secure random token
            $token = \Str::random(64);

            // Store hashed token in DB
            \DB::table('password_reset_tokens')->insert([
                'email'      => $request->email,
                'token'      => \Hash::make($token),
                'created_at' => now(),
            ]);

            // Build reset URL
            $frontend = env('FRONTEND_URL', 'http://localhost:5173');
            $resetUrl = "{$frontend}/reset-password?token={$token}&email=" . urlencode($request->email);

            // Send email via Laravel Mail (resend transport)
            $resetHtml = "
                <div style='font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;'>
                    <h2 style='color: #173861;'>Reset your password</h2>
                    <p>Hi {$user->first_name},</p>
                    <p>We received a request to reset your IntelliLearn password. Click the button below to set a new password. This link expires in <strong>60 minutes</strong>.</p>
                    <a href='{$resetUrl}' style='display:inline-block; background:#173861; color:white; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:bold; margin: 16px 0;'>
                        Reset Password
                    </a>
                    <p style='color:#64748b; font-size:13px;'>If you did not request a password reset, you can safely ignore this email.</p>
                    <p style='color:#64748b; font-size:13px;'>Or copy this link: <a href='{$resetUrl}'>{$resetUrl}</a></p>
                </div>
            ";
            \Illuminate\Support\Facades\Mail::send([], [], function ($message) use ($user, $resetUrl, $resetHtml) {
                $message->to($user->email, "{$user->first_name} {$user->last_name}")
                    ->from('onboarding@resend.dev', 'IntelliLearn')
                    ->subject('Reset your IntelliLearn password')
                    ->html($resetHtml);
            });
        }

        return response()->json([
            'message' => 'If an account with that email exists, a password reset link has been sent.',
        ]);
    }

    /**
     * RESET PASSWORD — VALIDATE TOKEN AND SET NEW PASSWORD
     *
     * POST /api/reset-password
     * Body: { token, email, password, password_confirmation }
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => ['required', 'string'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'regex:/[A-Z]/', 'regex:/[0-9]/'],
        ]);

        // Find the reset record
        $record = \DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (! $record) {
            throw ValidationException::withMessages([
                'email' => ['This password reset link is invalid.'],
            ]);
        }

        // Check token expiry (60 minutes)
        if (now()->diffInMinutes($record->created_at) > 60) {
            \DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            throw ValidationException::withMessages([
                'email' => ['This password reset link has expired. Please request a new one.'],
            ]);
        }

        // Validate token
        if (! Hash::check($request->token, $record->token)) {
            throw ValidationException::withMessages([
                'email' => ['This password reset link is invalid.'],
            ]);
        }

        // Find user
        $user = User::where('email', $request->email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['No account found with this email address.'],
            ]);
        }

        // Check new password is different from current
        if ($user->password && Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['New password must be different from your current password.'],
            ]);
        }

        // Update password and clean up
        $user->update(['password' => $request->password]);
        $user->tokens()->delete();
        \DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'message' => 'Password has been reset successfully. Please login with your new password.',
        ]);
    }

    /**
     * RESEND EMAIL VERIFICATION
     *
     * POST /api/email/resend
     * Headers: Authorization: Bearer {token}
     *
     * Resends the verification email if user hasn't verified yet.
     */
    public function resendVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email is already verified.']);
        }

        $this->sendVerificationEmail($user);

        return response()->json(['message' => 'Verification email sent. Please check your inbox.']);
    }
}
