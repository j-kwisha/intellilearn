<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;
use Mockery;
use Tests\TestCase;

class GoogleProfileLinkTest extends TestCase
{
    use RefreshDatabase;

    protected function migrateFreshUsing(): array
    {
        // This flow needs only users; other migrations contain PostgreSQL-specific SQL.
        return ['--path' => 'database/migrations/0001_01_01_000000_create_users_table.php'];
    }

    private function account(string $email = 'student@example.test'): User
    {
        return User::create([
            'first_name' => 'Original', 'last_name' => 'Name',
            'email' => $email, 'password' => 'TestPassword123', 'role' => 'student',
        ]);
    }

    private function google(string $email, bool $verified = true): void
    {
        $google = (new GoogleUser)->map([
            'id' => 'google-test-id', 'email' => $email,
            'avatar' => 'https://example.test/photo.png',
        ])->setRaw(['given_name' => 'Google', 'family_name' => 'Student', 'email_verified' => $verified]);
        $provider = Mockery::mock();
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->once()->andReturn($google);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    public function test_import_updates_name_and_photo_without_changing_password_or_verification(): void
    {
        $user = $this->account();
        $password = $user->password;
        Sanctum::actingAs($user);
        Cache::put('google_profile_link:link_test', $user->id, 600);
        $this->google($user->email);

        $this->postJson('/api/auth/google/link', ['code' => 'test-code', 'state' => 'link_test'])
            ->assertOk()->assertJsonPath('user.first_name', 'Google')
            ->assertJsonPath('user.last_name', 'Student')
            ->assertJsonPath('user.avatar', 'https://example.test/photo.png');
        $user->refresh();
        $this->assertSame($password, $user->password);
        $this->assertNull($user->email_verified_at);
        $this->postJson('/api/auth/google/link', ['code' => 'test-code', 'state' => 'link_test'])->assertStatus(422);
    }

    public function test_different_google_email_is_rejected(): void
    {
        $user = $this->account();
        Sanctum::actingAs($user);
        Cache::put('google_profile_link:link_test', $user->id, 600);
        $this->google('other@example.test');
        $this->postJson('/api/auth/google/link', ['code' => 'test-code', 'state' => 'link_test'])->assertStatus(422);
        $this->assertNull($user->fresh()->google_id);
        $this->assertSame('Original', $user->fresh()->first_name);
    }

    public function test_unverified_google_email_is_rejected(): void
    {
        $user = $this->account();
        Sanctum::actingAs($user);
        Cache::put('google_profile_link:link_test', $user->id, 600);
        $this->google($user->email, false);
        $this->postJson('/api/auth/google/link', ['code' => 'test-code', 'state' => 'link_test'])->assertStatus(422);
        $this->assertNull($user->fresh()->google_id);
    }

    public function test_state_for_another_account_is_rejected_before_google_is_called(): void
    {
        $user = $this->account();
        Sanctum::actingAs($user);
        Cache::put('google_profile_link:link_test', $user->id + 1, 600);
        Socialite::shouldReceive('driver')->never();
        $this->postJson('/api/auth/google/link', ['code' => 'test-code', 'state' => 'link_test'])->assertStatus(422);
    }

    public function test_link_callback_cannot_use_public_sign_in(): void
    {
        Socialite::shouldReceive('driver')->never();
        $this->getJson('/api/auth/google/callback?state=link_test&code=test-code')->assertStatus(422);
    }

    public function test_expired_state_is_rejected(): void
    {
        $user = $this->account();
        Sanctum::actingAs($user);
        Cache::put('google_profile_link:link_test', $user->id, now()->addMinutes(10));
        $this->travel(11)->minutes();
        Socialite::shouldReceive('driver')->never();
        $this->postJson('/api/auth/google/link', ['code' => 'test-code', 'state' => 'link_test'])->assertStatus(422);
    }

    public function test_google_account_already_linked_to_another_user_is_rejected(): void
    {
        $user = $this->account();
        $other = $this->account('other@example.test');
        $other->update(['google_id' => 'google-test-id']);
        Sanctum::actingAs($user);
        Cache::put('google_profile_link:link_test', $user->id, 600);
        $this->google($user->email);
        $this->postJson('/api/auth/google/link', ['code' => 'test-code', 'state' => 'link_test'])->assertStatus(422);
        $this->assertNull($user->fresh()->google_id);
    }

    public function test_redirect_issues_a_state_bound_to_the_current_account(): void
    {
        $user = $this->account();
        Sanctum::actingAs($user);
        $provider = Mockery::mock();
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('redirect')->andReturn(new \Illuminate\Http\RedirectResponse('https://accounts.google.com/o/oauth2/auth?client_id=test'));
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
        $response = $this->getJson('/api/auth/google/link/redirect')->assertOk();
        parse_str(parse_url($response->json('url'), PHP_URL_QUERY), $params);
        $this->assertStringStartsWith('link_', $params['state']);
        $this->assertSame($user->id, Cache::get('google_profile_link:' . $params['state']));
        $this->assertSame($user->email, $params['login_hint']);
    }
}
