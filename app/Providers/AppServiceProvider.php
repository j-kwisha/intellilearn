<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        $frontend = env('FRONTEND_URL', 'http://localhost:5173');

        // Point password reset emails to the frontend reset page
        ResetPassword::createUrlUsing(function ($user, string $token) use ($frontend) {
            return "{$frontend}/reset-password?token={$token}&email=" . urlencode($user->email);
        });

        // Point email verification emails directly to the backend signed route
        // Backend verifies and redirects to frontend with status
        VerifyEmail::createUrlUsing(function ($notifiable) {
            return URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes(60),
                ['id' => $notifiable->getKey(), 'hash' => sha1($notifiable->getEmailForVerification())]
            );
        });
    }
}
