<?php
namespace Database\Seeders\Presentation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PresentationUsersSeeder extends Seeder
{
    public function run(): void
    {
        PresentationData::assertSafe();
        foreach (PresentationData::USERS as $index => [$first, $last, $mail, $role]) {
            $user = User::firstOrNew(['email' => "$mail@intellilearn.edu"]);
            $user->fill(['first_name' => $first, 'last_name' => $last, 'role' => $role, 'is_active' => true]);
            if (!$user->password || !Hash::check(config('presentation.password'), $user->password)) $user->password = config('presentation.password');
            $user->forceFill(['email_verified_at' => PresentationData::date()->subDays(45),
                'last_login_at' => PresentationData::date()->subDays($index >= 11 ? 12 : 1)->setHour(9),
                'created_at' => PresentationData::date()->subDays(45)])->save();
        }
    }
}
