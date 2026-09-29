<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        try {
            // Get user from Google
            $googleUser = Socialite::driver('google')->stateless()->user();

            // Find or create user
            $user = User::where('google_id', $googleUser->getId())
                ->orWhere('email', $googleUser->getEmail())
                ->first();

            if ($user) {
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
                    'email_verified_at' => now(),
                    'password' => null, // No password for OAuth users
                    'role' => 'student', // Default role for new OAuth users
                ]);
            }

            // Generate token
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Login successful',
                'user' => $user,
                'token' => $token,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'OAuth authentication failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Link Google account to existing user
     * 
     * POST /api/auth/google/link
     */
    public function linkGoogleAccount(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            // Get user from Google
            $googleUser = Socialite::driver('google')->stateless()->user();

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
            ]);

            return response()->json([
                'message' => 'Google account linked successfully',
                'user' => $user,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to link Google account',
                'error' => $e->getMessage(),
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
