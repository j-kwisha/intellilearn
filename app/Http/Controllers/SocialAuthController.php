<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    /**
     * Redirect to Google OAuth
     * 
     * GET /api/auth/google/redirect
     */
    public function redirectToGoogle(): JsonResponse
    {
        $url = Socialite::driver('google')
            ->stateless()
            ->redirect()
            ->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    /**
     * Handle Google OAuth callback
     * 
     * GET /api/auth/google/callback
     */
    public function handleGoogleCallback(Request $request): JsonResponse
    {
        if (str_starts_with((string) $request->input('state'), 'link_')) {
            return response()->json(['message' => 'Complete profile import from the account that started it.'], 422);
        }
        try {
            // Get user from Google
            $googleUser = Socialite::driver('google')->stateless()->user();

            if (!filter_var($googleUser->getEmail(), FILTER_VALIDATE_EMAIL)
                || !($googleUser->user['email_verified'] ?? $googleUser->user['verified_email'] ?? false)) {
                return response()->json(['message' => 'Choose a Google account with a verified email address.'], 422);
            }

            // Find or create user
            $user = User::where('google_id', $googleUser->getId())
                ->orWhere('email', $googleUser->getEmail())
                ->first();

            if ($user) {
                if (strcasecmp($user->email, (string) $googleUser->getEmail()) !== 0) {
                    return response()->json(['message' => 'The Google email must match your IntelliLearn account email.'], 422);
                }
                if (!$user->is_active) {
                    return response()->json(['message' => 'Your account has been deactivated. Please contact the administrator.'], 403);
                }
                if ($user->google_id && (string) $user->google_id !== (string) $googleUser->getId()) {
                    return response()->json(['message' => 'This email is linked to another Google account.'], 422);
                }
                // Update existing user with Google info
                $user->update([
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                ]);
            } else {
                // Create new user
                $user = User::create([
                    'google_id' => $googleUser->getId(),
                    'first_name' => $googleUser->user['given_name'] ?? $googleUser->getName(),
                    'last_name' => $googleUser->user['family_name'] ?? '',
                    'email' => $googleUser->getEmail(),
                    'avatar' => $googleUser->getAvatar(),
                    'password' => null, // No password for OAuth users
                    'role' => 'student', // Default role for new OAuth users
                ]);
            }

            // Only Google's verified email assertion can verify an OAuth account.
            if (!$user->hasVerifiedEmail()) $user->markEmailAsVerified();
            $user->update(['last_login_at' => now()]);

            // Generate token
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Login successful',
                'user' => $user,
                'token' => $token,
            ]);

        } catch (\Throwable $e) {
            Log::warning('Google OAuth authentication failed', ['exception_type' => get_class($e)]);
            return response()->json([
                'message' => 'OAuth authentication failed',
            ], 500);
        }
    }

    /**
     * Link Google account to existing user
     * 
     * POST /api/auth/google/link
     */
    public function redirectToGoogleLink(Request $request): JsonResponse
    {
        $state = 'link_' . Str::random(64);
        Cache::put('google_profile_link:' . $state, $request->user()->id, now()->addMinutes(10));
        $url = Socialite::driver('google')->stateless()->redirect()->getTargetUrl();

        return response()->json(['url' => $url . '&' . http_build_query([
            'state' => $state,
            'prompt' => 'select_account',
            'login_hint' => $request->user()->email,
        ])]);
    }

    public function linkGoogleAccount(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string'], 'state' => ['required', 'string', 'max:128']]);
        $stateKey = 'google_profile_link:' . $request->input('state');
        if ((string) Cache::get($stateKey) !== (string) $request->user()->id) {
            return response()->json(['message' => 'Google connection expired. Please connect again.'], 422);
        }
        Cache::forget($stateKey);
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            // Get user from Google
            $googleUser = Socialite::driver('google')->stateless()->user();

            if (!($googleUser->user['email_verified'] ?? $googleUser->user['verified_email'] ?? false)
                || strcasecmp((string) $googleUser->getEmail(), $user->email) !== 0) {
                return response()->json(['message' => 'Choose the verified Google account with the same email as your IntelliLearn account.'], 422);
            }

            // Check if Google account is already linked to another user
            $existingUser = User::where('google_id', $googleUser->getId())
                ->where('id', '!=', $user->id)
                ->first();

            if ($existingUser) {
                return response()->json([
                    'message' => 'This Google account is already linked to another user.',
                ], 422);
            }

            // Link Google account
            $user->update([
                'google_id' => $googleUser->getId(),
                'avatar' => $googleUser->getAvatar(),
                'first_name' => $googleUser->user['given_name'] ?? $user->first_name,
                'last_name' => $googleUser->user['family_name'] ?? $user->last_name,
            ]);

            return response()->json([
                'message' => 'Google account linked successfully',
                'user' => $user,
            ]);

        } catch (\Throwable $e) {
            Log::warning('Google profile linking failed', ['user_id' => $request->user()?->id, 'exception_type' => get_class($e)]);
            return response()->json([
                'message' => 'Failed to link Google account',
            ], 500);
        }
    }

    /**
     * Unlink Google account from user
     * 
     * POST /api/auth/google/unlink
     */
    public function unlinkGoogleAccount(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!$user->google_id) {
            return response()->json([
                'message' => 'No Google account is linked to this user.',
            ], 422);
        }

        // Ensure user has a password before unlinking
        if (!$user->password) {
            return response()->json([
                'message' => 'Cannot unlink Google account. Please set a password first.',
            ], 422);
        }

        $user->update([
            'google_id' => null,
            'avatar' => null,
        ]);

        return response()->json([
            'message' => 'Google account unlinked successfully',
            'user' => $user,
        ]);
    }
}
