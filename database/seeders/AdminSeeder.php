<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Only create if doesn't exist yet
        if (! User::where('email', 'admin@demo.com')->exists()) {
            User::create([
                'first_name'        => 'Admin',
                'last_name'         => 'User',
                'email'             => 'admin@demo.com',
                'password'          => 'Admin123!',
                'role'              => 'admin',
                'is_active'         => true,
                'email_verified_at' => now(),
            ]);
        }

        if (! User::where('email', 'instructor@demo.com')->exists()) {
            User::create([
                'first_name'        => 'Demo',
                'last_name'         => 'Instructor',
                'email'             => 'instructor@demo.com',
                'password'          => 'Admin123!',
                'role'              => 'instructor',
                'is_active'         => true,
                'email_verified_at' => now(),
            ]);
        }

        if (! User::where('email', 'student@demo.com')->exists()) {
            User::create([
                'first_name'        => 'Demo',
                'last_name'         => 'Student',
                'email'             => 'student@demo.com',
                'password'          => 'Admin123!',
                'role'              => 'student',
                'is_active'         => true,
                'email_verified_at' => now(),
            ]);
        }
    }
}
