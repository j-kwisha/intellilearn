<?php

namespace Tests\Feature;

use App\Models\{Course, Enrollment, User};
use App\Services\DocumentTextService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\{DB, Hash, Log, Mail};
use Laravel\Sanctum\Sanctum;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;
use Mockery;
use Tests\TestCase;

class PresentationHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function beforeRefreshingDatabase(): void
    {
        // Other feature suites use smaller schemas; do not reuse their migrations.
        RefreshDatabaseState::$migrated = false;
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        RefreshDatabaseState::$migrated = false;
        RefreshDatabaseState::$inMemoryConnections = [];
    }

    protected function migrateFreshUsing(): array
    {
        // Use the real account/course migrations, including OAuth's nullable password.
        return ['--path' => array_map(fn ($name) => 'database/migrations/' . $name, [
            '0001_01_01_000000_create_users_table.php',
            '2026_03_25_222538_create_personal_access_tokens_table.php',
            '2026_03_26_000001_create_courses_table.php',
            '2026_03_26_000002_create_enrollments_table.php',
            '2026_04_22_000001_add_join_code_to_courses_table.php',
            '2026_09_29_105934_add_google_oauth_to_users_table.php',
        ])];
    }

    public function test_instructor_and_student_bearer_sessions_remain_independent_and_logout_only_revokes_its_token(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);
        $course = $this->course($instructor);
        $teacherToken = $this->postJson('/api/login', ['email' => $instructor->email, 'password' => 'password'])
            ->assertOk()->assertJsonPath('user.id', $instructor->id)->json('token');
        $studentToken = $this->postJson('/api/login', ['email' => $student->email, 'password' => 'password'])
            ->assertOk()->assertJsonPath('user.id', $student->id)->json('token');
        // Each HTTP request starts with freshly resolved guards in production.
        $request = function ($method, $uri, $token) {
            app('auth')->forgetGuards();
            return $this->json($method, $uri, [], ['Authorization' => 'Bearer ' . $token]);
        };
        $request('GET', '/api/me', $teacherToken)->assertOk()->assertJsonPath('user.id', $instructor->id)->assertJsonPath('user.role', 'instructor');
        $request('GET', '/api/me', $studentToken)->assertOk()->assertJsonPath('user.id', $student->id)->assertJsonPath('user.role', 'student');
        $request('GET', "/api/courses/{$course->id}", $teacherToken)->assertOk();
        $request('GET', "/api/courses/{$course->id}", $studentToken)->assertForbidden();
        $request('GET', '/api/me', $teacherToken)->assertOk()->assertJsonPath('user.id', $instructor->id);
        $request('POST', '/api/logout', $studentToken)->assertOk();
        $request('GET', '/api/me', $studentToken)->assertUnauthorized();
        $request('GET', '/api/me', $teacherToken)->assertOk()->assertJsonPath('user.id', $instructor->id);
        $request('GET', '/api/me', 'invalid-token')->assertUnauthorized();
    }

    private function google(User $user, bool $verified = true, string $id = 'google-account'): void
    {
        $google = (new GoogleUser)->map(['id' => $id, 'email' => $user->email,
            'name' => 'Google Student', 'avatar' => 'https://example.test/avatar.png'])
            ->setRaw(['given_name' => 'Google', 'family_name' => 'Student', 'email_verified' => $verified]);
        $provider = Mockery::mock();
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->once()->andReturn($google);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    private function course(User $instructor): Course
    {
        return Course::create(['name' => 'Fixture Course', 'code' => 'FIXTURE',
            'semester' => '2026', 'instructor_id' => $instructor->id]);
    }

    public function test_factory_matches_schema_and_normal_password_login_remains_valid(): void
    {
        $user = User::factory()->create();
        $this->assertNotEmpty($user->first_name);
        $this->assertNotEmpty($user->last_name);
        $this->assertFalse(array_key_exists('name', $user->getAttributes()));
        $this->assertTrue(Hash::check('password', $user->password));
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->assertOk()->assertJsonStructure(['token']);
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'incorrect'])->assertStatus(422);
    }

    public function test_oauth_creates_verified_passwordless_user_using_actual_nullable_schema(): void
    {
        $unsaved = User::factory()->make();
        $this->google($unsaved);
        $this->getJson('/api/auth/google/callback')->assertOk()->assertJsonStructure(['token'])
            ->assertJsonMissingPath('user.password');
        $user = User::where('email', $unsaved->email)->firstOrFail();
        $this->assertNull($user->password);
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertSame('student', $user->role);
        $this->assertNotNull($user->last_login_at);
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'anything'])->assertStatus(422);
    }

    public function test_oauth_preserves_existing_password_and_role_and_verifies_matching_email(): void
    {
        $user = User::factory()->unverified()->create(['role' => 'instructor']);
        $hash = $user->password;
        $this->google($user);
        $this->getJson('/api/auth/google/callback')->assertOk();
        $user->refresh();
        $this->assertSame($hash, $user->password);
        $this->assertSame('instructor', $user->role);
        $this->assertTrue($user->hasVerifiedEmail());
    }

    public function test_unverified_google_email_cannot_create_or_link_account(): void
    {
        $user = User::factory()->make();
        $this->google($user, false);
        $this->getJson('/api/auth/google/callback')->assertStatus(422);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_inactive_user_cannot_login_through_google(): void
    {
        $user = User::factory()->create(['is_active' => false]);
        $this->google($user);
        $this->getJson('/api/auth/google/callback')->assertForbidden();
        $this->assertNull($user->fresh()->google_id);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_oauth_error_response_is_generic_and_failure_is_logged(): void
    {
        $provider = Mockery::mock();
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andThrow(new \RuntimeException('private-provider-detail'));
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
        Log::spy();
        $response = $this->getJson('/api/auth/google/callback')->assertStatus(500)
            ->assertExactJson(['message' => 'OAuth authentication failed']);
        $this->assertStringNotContainsString('private-provider-detail', $response->getContent());
        Log::shouldHaveReceived('warning')->once()->with('Google OAuth authentication failed', ['exception_type' => \RuntimeException::class]);
    }

    public function test_oauth_user_can_set_password_only_with_valid_reset_token(): void
    {
        $user = User::factory()->create(['password' => null, 'google_id' => 'google-reset']);
        DB::table('password_reset_tokens')->insert(['email' => $user->email, 'token' => Hash::make('reset-token'), 'created_at' => now()]);
        $payload = ['email' => $user->email, 'token' => 'invalid', 'password' => 'NewPassword123', 'password_confirmation' => 'NewPassword123'];
        $this->postJson('/api/reset-password', $payload)->assertStatus(422);
        $this->assertNull($user->fresh()->password);
        $this->postJson('/api/reset-password', array_merge($payload, ['token' => 'reset-token']))->assertOk();
        $this->assertTrue(Hash::check('NewPassword123', $user->fresh()->password));
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'NewPassword123'])->assertOk();
    }

    public function test_admin_provisioned_student_and_instructor_are_verified_and_can_login(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Mail::fake();
        foreach (['student', 'instructor'] as $role) {
            Sanctum::actingAs($admin);
            $email = $role . '@example.test';
            $this->postJson('/api/admin/users', ['first_name' => 'Provisioned', 'last_name' => 'Account',
                'email' => $email, 'password' => 'AccountPassword123', 'password_confirmation' => 'AccountPassword123', 'role' => $role])->assertCreated();
            $user = User::where('email', $email)->firstOrFail();
            $this->assertTrue($user->hasVerifiedEmail());
            $this->assertTrue(Hash::check('AccountPassword123', $user->password));
            $this->postJson('/api/login', ['email' => $email, 'password' => 'AccountPassword123'])->assertOk();
        }
        Mail::assertNothingSent();
    }

    public function test_self_registered_password_account_still_requires_verification(): void
    {
        Mail::fake();
        $this->postJson('/api/register', ['first_name' => 'Self', 'last_name' => 'Registered', 'email' => 'self@example.test',
            'password' => 'AccountPassword123', 'password_confirmation' => 'AccountPassword123'])->assertCreated();
        $user = User::where('email', 'self@example.test')->firstOrFail();
        $this->assertFalse($user->hasVerifiedEmail());
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'AccountPassword123'])
            ->assertForbidden()->assertJsonPath('requires_verification', true);
    }

    public function test_course_assignment_rejects_non_instructors_on_create_and_update(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create();
        $instructor = User::factory()->create(['role' => 'instructor']);
        Sanctum::actingAs($admin);
        $payload = ['name' => 'Fixture', 'code' => 'FIXTURE', 'semester' => '2026'];
        foreach ([$student, $admin] as $invalid) {
            $this->postJson('/api/courses', $payload + ['instructor_id' => $invalid->id])->assertStatus(422)->assertJsonValidationErrors('instructor_id');
        }
        $response = $this->postJson('/api/courses', $payload + ['instructor_id' => $instructor->id])->assertCreated();
        $courseId = $response->json('course.id');
        $this->putJson("/api/courses/$courseId", ['instructor_id' => $student->id])->assertStatus(422);
        $this->assertSame($instructor->id, Course::findOrFail($courseId)->instructor_id);
    }

    public function test_enrollment_rejects_non_students_and_accepts_students(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create();
        $course = $this->course($instructor);
        Sanctum::actingAs($instructor);
        foreach ([$instructor, $admin] as $invalid) {
            $this->postJson("/api/courses/{$course->id}/enroll", ['user_id' => $invalid->id])->assertStatus(422)->assertJsonValidationErrors('user_id');
        }
        $this->postJson("/api/courses/{$course->id}/enroll", ['user_id' => $student->id])->assertCreated();
        $this->assertDatabaseCount('enrollments', 1);
    }

    public function test_role_changes_cannot_invalidate_existing_course_assignments_or_enrollments(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create();
        $course = $this->course($instructor);
        Enrollment::create(['course_id' => $course->id, 'user_id' => $student->id]);
        Sanctum::actingAs($admin);
        $this->putJson("/api/admin/users/{$instructor->id}", ['role' => 'student'])->assertStatus(422)->assertJsonValidationErrors('role');
        $this->putJson("/api/admin/users/{$student->id}", ['role' => 'instructor'])->assertStatus(422)->assertJsonValidationErrors('role');
        $this->assertSame('instructor', $instructor->fresh()->role);
        $this->assertSame('student', $student->fresh()->role);
        $unassigned = User::factory()->create();
        $this->putJson("/api/admin/users/{$unassigned->id}", ['role' => 'instructor'])->assertOk();
    }

    public function test_production_config_disables_debug_even_when_enabled_in_environment(): void
    {
        $oldEnv = $_ENV;
        $oldServer = $_SERVER;
        $oldProcessEnv = getenv('APP_ENV');
        $oldProcessDebug = getenv('APP_DEBUG');
        try {
            $_ENV['APP_ENV'] = $_SERVER['APP_ENV'] = 'production';
            $_ENV['APP_DEBUG'] = $_SERVER['APP_DEBUG'] = 'true';
            putenv('APP_ENV=production');
            putenv('APP_DEBUG=true');
            $config = require config_path('app.php');
            $this->assertFalse($config['debug']);
        } finally {
            $_ENV = $oldEnv;
            $_SERVER = $oldServer;
            putenv($oldProcessEnv === false ? 'APP_ENV' : 'APP_ENV=' . $oldProcessEnv);
            putenv($oldProcessDebug === false ? 'APP_DEBUG' : 'APP_DEBUG=' . $oldProcessDebug);
        }
    }

    public function test_reference_upload_failure_does_not_expose_exception_details(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $course = $this->course($instructor);
        Sanctum::actingAs($instructor);
        $this->mock(DocumentTextService::class, fn ($mock) => $mock->shouldReceive('extract')->andThrow(new \RuntimeException('private-provider-detail')));
        $response = $this->postJson("/api/courses/{$course->id}/upload-reference-text", [
            'reference_file' => UploadedFile::fake()->createWithContent('source.txt', 'Source content'),
        ])->assertStatus(500)->assertJsonMissingPath('debug_error')->assertJsonMissingPath('debug_location');
        $this->assertStringNotContainsString('private-provider-detail', $response->getContent());
    }
}
