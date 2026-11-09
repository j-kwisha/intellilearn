<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\{RefreshDatabase, RefreshDatabaseState};
use Tests\TestCase;

class AssessmentCalendarEventTest extends TestCase
{
    use RefreshDatabase;

    protected function beforeRefreshingDatabase(): void
    {
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
        return ['--path' => array_values(array_filter(glob('database/migrations/*.php'),
            fn ($path) => !str_ends_with($path, '2026_10_04_180000_add_docx_to_lesson_materials_type.php')))];
    }

    public function test_scheduled_assessment_calendar_event_is_created_updated_and_removed_automatically(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $course = Course::create([
            'name' => 'Learning Materials',
            'code' => 'LM101',
            'semester' => '2026',
            'instructor_id' => $instructor->id,
        ]);

        $student = User::factory()->create(['role' => 'student']);
        $course->enrollments()->create(['user_id' => $student->id, 'status' => 'active']);

        $created = $this->actingAs($instructor)->postJson("/api/courses/{$course->id}/assessments", [
            'title' => 'Individual reflection',
            'type' => 'individual_activity',
            'max_attempts' => 1,
            'available_from' => now()->addHour()->toISOString(),
            'due_date' => now()->addHours(3)->toISOString(),
            'defer_publication' => true,
        ])->assertCreated()->json('assessment');

        $this->assertDatabaseHas('calendar_events', [
            'assessment_id' => $created['id'],
            'course_id' => $course->id,
            'event_type' => 'activity',
            'title' => 'Due: Individual reflection',
        ]);

        $this->putJson("/api/courses/{$course->id}/assessments/{$created['id']}", [
            'title' => 'Updated reflection',
            'due_date' => now()->addHours(4)->toISOString(),
            'is_published' => true,
        ])->assertOk();

        $this->assertDatabaseCount('calendar_events', 1);
        $this->actingAs($student)->getJson('/api/calendar')
            ->assertOk()
            ->assertJsonPath('events.0.title', 'Due: Updated reflection');
        $this->assertDatabaseHas('calendar_events', [
            'assessment_id' => $created['id'],
            'title' => 'Due: Updated reflection',
        ]);

        $this->actingAs($instructor)->putJson("/api/courses/{$course->id}/assessments/{$created['id']}", [
            'due_date' => null,
            'available_from' => null,
        ])->assertOk();

        $this->assertDatabaseMissing('calendar_events', ['assessment_id' => $created['id']]);
    }
}
