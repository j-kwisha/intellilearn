<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\{RefreshDatabase, RefreshDatabaseState};
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\{Hash, Storage};
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfileSettingsTest extends TestCase
{
    use RefreshDatabase;

    // Tiny real images let validation run without requiring GD on development machines.
    private const IMAGES = [
        'png' => 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGMsC73JwMDAxAAGABN3AagPhhDuAAAAAElFTkSuQmCC',
        'jpg' => '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDNooor7U1P/9k=',
        'webp' => 'UklGRjQAAABXRUJQVlA4ICgAAABwAQCdASoCAAIAAUAmJaACdAGIQAD+6mX//Vof/8tD//lofuefKoAA',
    ];

    protected function beforeRefreshingDatabase(): void { RefreshDatabaseState::$migrated = false; }

    protected function tearDown(): void
    {
        parent::tearDown();
        RefreshDatabaseState::$migrated = false;
        RefreshDatabaseState::$inMemoryConnections = [];
    }

    protected function migrateFreshUsing(): array
    {
        return ['--path' => [
            'database/migrations/0001_01_01_000000_create_users_table.php',
            'database/migrations/2026_09_29_105934_add_google_oauth_to_users_table.php',
        ]];
    }

    private function account(string $role = 'student'): User
    {
        Storage::fake('public');
        $user = User::factory()->create(['role' => $role, 'password' => 'OriginalPassword123']);
        Sanctum::actingAs($user);
        return $user;
    }

    private function image(string $extension = 'png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('portrait.'.$extension, base64_decode(self::IMAGES[$extension]));
    }

    private function upload(array $data = [])
    {
        return $this->post('/api/profile', array_merge(['_method' => 'PUT'], $data), ['Accept' => 'application/json']);
    }

    private function savedPath(User $user): string
    {
        return 'avatars/user_'.$user->id.'/'.basename($user->fresh()->avatar);
    }

    public function test_student_and_instructor_can_save_real_images_and_retrieve_the_persisted_photo(): void
    {
        foreach (['student', 'instructor'] as $role) {
            $user = $this->account($role);
            foreach (array_keys(self::IMAGES) as $extension) {
                $response = $this->upload(['first_name' => 'Updated', 'avatar' => $this->image($extension)])
                    ->assertOk()->assertJsonPath('user.first_name', 'Updated')->assertJsonPath('user.id', $user->id);
                $path = $this->savedPath($user);
                Storage::disk('public')->assertExists($path);
                $this->assertSame(Storage::disk('public')->url($path), $response->json('user.avatar'));
                $this->assertSame(base64_decode(self::IMAGES[$extension]), Storage::disk('public')->get($path));
                $this->assertArrayNotHasKey('password', $response->json('user'));
                // A new authenticated request resolves the current database user.
                Sanctum::actingAs($user->fresh());
                $this->getJson('/api/me')->assertOk()->assertJsonPath('user.avatar', $user->fresh()->avatar);
            }
        }
    }

    public function test_replacing_and_removing_a_photo_delete_only_the_previous_owned_upload(): void
    {
        $user = $this->account();
        $this->upload(['avatar' => $this->image()])->assertOk();
        $old = $this->savedPath($user);
        $this->upload(['avatar' => $this->image('webp')])->assertOk();
        $new = $this->savedPath($user);
        Storage::disk('public')->assertMissing($old)->assertExists($new);
        $this->upload(['remove_avatar' => '1'])->assertOk()->assertJsonPath('user.avatar', null);
        Storage::disk('public')->assertMissing($new);
        $this->assertNull($user->fresh()->avatar);
    }

    public function test_names_only_updates_preserve_the_photo_and_do_not_change_other_accounts_or_roles(): void
    {
        $user = $this->account();
        $other = User::factory()->create();
        $this->upload(['avatar' => $this->image()])->assertOk();
        $avatar = $user->fresh()->avatar;
        $otherName = $other->first_name;
        $this->putJson('/api/profile', ['first_name' => 'New name', 'user_id' => $other->id, 'role' => 'admin'])
            ->assertOk()->assertJsonPath('user.avatar', $avatar)->assertJsonPath('user.role', 'student');
        Storage::disk('public')->assertExists($this->savedPath($user));
        $this->assertSame($otherName, $other->fresh()->first_name);
    }

    public function test_removing_external_photos_or_another_users_path_never_deletes_their_files(): void
    {
        $user = $this->account();
        $path = 'avatars/user_999/portrait.png';
        Storage::disk('public')->put($path, base64_decode(self::IMAGES['png']));
        foreach (['https://example.test/google-photo.png', Storage::disk('public')->url($path)] as $avatar) {
            $user->update(['avatar' => $avatar]);
            $this->upload(['remove_avatar' => '1'])->assertOk()->assertJsonPath('user.avatar', null);
            Storage::disk('public')->assertExists($path);
        }
    }

    public function test_invalid_or_spoofed_images_are_rejected_without_updating_the_profile(): void
    {
        $user = $this->account();
        $name = $user->first_name;
        $files = [
            UploadedFile::fake()->createWithContent('spoof.png', '<html>This is not an image</html>')->mimeType('image/png'),
            UploadedFile::fake()->createWithContent('empty.jpg', ''),
            UploadedFile::fake()->createWithContent('vector.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>'),
            UploadedFile::fake()->createWithContent('image.gif', base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')),
            $this->image()->size(5121),
        ];
        foreach ($files as $file) {
            $this->upload(['first_name' => 'Must not save', 'avatar' => $file])->assertUnprocessable()->assertJsonValidationErrors('avatar');
            $this->assertSame($name, $user->fresh()->first_name);
            $this->assertNull($user->fresh()->avatar);
            $this->assertSame([], Storage::disk('public')->allFiles());
        }
        $this->putJson('/api/profile', ['avatar' => 'https://example.test/not-an-upload.png'])
            ->assertUnprocessable()->assertJsonValidationErrors('avatar');
    }

    public function test_five_megabyte_limit_is_inclusive(): void
    {
        $user = $this->account();
        $this->upload(['avatar' => $this->image()->size(5120)])->assertOk();
        $this->assertNotNull($user->fresh()->avatar);
    }

    public function test_upload_and_remove_together_are_rejected_without_mutation(): void
    {
        $user = $this->account();
        $user->update(['avatar' => 'https://example.test/existing.png']);
        $this->upload(['avatar' => $this->image(), 'remove_avatar' => '1'])
            ->assertUnprocessable()->assertJsonValidationErrors('avatar');
        $this->assertSame('https://example.test/existing.png', $user->fresh()->avatar);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_storage_failure_keeps_previous_profile_and_returns_a_safe_retry_message(): void
    {
        $user = $this->account();
        $user->update(['avatar' => 'https://example.test/existing.png']);
        $name = $user->first_name;
        $disk = \Mockery::mock(Storage::disk('public'))->makePartial();
        $disk->shouldReceive('putFileAs')->once()->andReturn(false);
        Storage::shouldReceive('disk')->with('public')->andReturn($disk);
        $this->upload(['first_name' => 'Must not save', 'avatar' => $this->image()])->assertStatus(503)
            ->assertExactJson(['message' => 'Could not save your profile. Please try again.']);
        $this->assertSame($name, $user->fresh()->first_name);
        $this->assertSame('https://example.test/existing.png', $user->fresh()->avatar);
    }

    public function test_profile_and_password_updates_require_authentication(): void
    {
        $this->putJson('/api/profile', ['first_name' => 'Unauthorized'])->assertUnauthorized();
        $this->putJson('/api/profile/password', [])->assertUnauthorized();
    }

    public function test_password_change_checks_current_password_and_confirmation_before_hashing_the_new_password(): void
    {
        $user = $this->account();
        $payload = ['current_password' => 'OriginalPassword123', 'password' => 'NewPassword456', 'password_confirmation' => 'NewPassword456'];
        $this->putJson('/api/profile/password', array_merge($payload, ['current_password' => 'WrongPassword123']))
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->putJson('/api/profile/password', array_merge($payload, ['password_confirmation' => 'Mismatch']))
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertTrue(Hash::check('OriginalPassword123', $user->fresh()->password));
        $this->putJson('/api/profile/password', $payload)->assertOk();
        $this->assertTrue(Hash::check('NewPassword456', $user->fresh()->password));
    }

    public function test_oauth_only_accounts_cannot_bypass_current_password_verification(): void
    {
        $user = $this->account();
        $user->update(['password' => null]);
        $this->putJson('/api/profile/password', ['current_password' => 'Anything123', 'password' => 'NewPassword456', 'password_confirmation' => 'NewPassword456'])
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->assertNull($user->fresh()->password);
    }
}
