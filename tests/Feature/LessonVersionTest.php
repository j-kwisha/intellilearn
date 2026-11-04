<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Foundation\Testing\{RefreshDatabase, RefreshDatabaseState};
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LessonVersionTest extends TestCase
{
    use RefreshDatabase;

    protected function beforeRefreshingDatabase(): void { RefreshDatabaseState::$migrated = false; }
    protected function tearDown(): void
    {
        parent::tearDown();
        RefreshDatabaseState::$migrated = false;
        RefreshDatabaseState::$inMemoryConnections = [];
    }

    protected function migrateFreshUsing(): array
    {
        return ['--path' => array_values(array_filter(glob('database/migrations/*.php'),
            fn ($path) => !str_ends_with($path, '2026_10_04_180000_add_docx_to_lesson_materials_type.php')))];
    }

    public function test_instructor_can_restore_a_saved_lesson_version(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $course = Course::create(['name' => 'Research Skills', 'code' => 'RS101', 'semester' => '2026', 'instructor_id' => $instructor->id]);
        $lesson = $course->lessons()->create(['title' => 'Original title', 'description' => 'Original content', 'is_published' => true]);
        Sanctum::actingAs($instructor);

        $this->putJson("/api/courses/{$course->id}/lessons/{$lesson->id}", ['title' => 'Updated title'])->assertOk();
        $versions = $this->getJson("/api/courses/{$course->id}/lessons/{$lesson->id}/versions")
            ->assertOk()->assertJsonCount(1, 'versions')->json('versions');
        $this->postJson("/api/courses/{$course->id}/lessons/{$lesson->id}/versions/{$versions[0]['id']}/restore")
            ->assertOk()->assertJsonPath('lesson.title', 'Original title')->assertJsonPath('lesson.description', 'Original content');
        $this->assertDatabaseHas('lessons', ['id' => $lesson->id, 'title' => 'Original title']);
    }
}
