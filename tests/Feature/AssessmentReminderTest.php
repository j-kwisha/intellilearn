<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\{RefreshDatabase, RefreshDatabaseState};
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AssessmentReminderTest extends TestCase
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

    public function test_due_soon_assessment_reminder_is_sent_once_per_day(): void
    {
        Mail::fake();
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);
        $course = Course::create(['name' => 'Research Skills', 'code' => 'RS102', 'semester' => '2026', 'instructor_id' => $instructor->id]);
        $course->enrollments()->create(['user_id' => $student->id, 'status' => 'active']);
        $course->assessments()->create(['title' => 'Research quiz', 'type' => 'quiz', 'is_published' => true, 'due_date' => now()->addHours(6)]);

        $this->artisan('assessments:send-deadline-reminders')->assertSuccessful();
        $this->artisan('assessments:send-deadline-reminders')->assertSuccessful();
        $this->assertDatabaseCount('assessment_reminder_logs', 1);
    }
}
