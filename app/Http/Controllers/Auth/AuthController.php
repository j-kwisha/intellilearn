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
            'first_name'        => $request->first_name,
            'last_name'         => $request->last_name,
            'email'             => $request->email,
            'password'          => $request->password,
            'role'              => 'student',
            'email_verified_at' => now(), // Auto-verify for live demo
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Registration successful.',
            'user'    => [
                'id'         => $user->id,
                'first_name' => $user->first_name,
                'last_name'  => $user->last_name,
                'email'      => $user->email,
                'role'       => $user->role,
                'full_name'  => $user->full_name,
            ],
            'token' => $token,
        ], 201);
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
        if (! $user || ! Hash::check($request->password, $user->password)) {
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
            ],
            'token' => $token,
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

            // Send email via Resend
            \Resend::emails()->send([
                'from'    => 'IntelliLearn <onboarding@resend.dev>',
                'to'      => [$request->email],
                'subject' => 'Reset your IntelliLearn password',
                'html'    => "
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
                ",
            ]);
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
        if (Hash::check($request->password, $user->password)) {
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
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email is already verified.',
            ]);
        }

        $request->user()->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Verification email sent.',
        ]);
    }
}
