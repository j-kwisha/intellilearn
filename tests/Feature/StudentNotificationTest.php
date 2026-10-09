<?php

namespace Tests\Feature;

use App\Models\{Announcement, Assessment, Course, Enrollment, Lesson, User};
use Illuminate\Foundation\Testing\{RefreshDatabase, RefreshDatabaseState};
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentNotificationTest extends TestCase
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
        return ['--path' => array_map(fn ($name) => 'database/migrations/' . $name, [
            '0001_01_01_000000_create_users_table.php',
            '2026_03_26_000001_create_courses_table.php',
            '2026_03_26_000002_create_enrollments_table.php',
            '2026_03_26_000003_create_lessons_table.php',
            '2026_03_26_000005_create_assessments_table.php',
            '2026_03_26_000006_create_supporting_tables.php',
        ])];
    }

    private function course(User $teacher, string $code): Course
    {
        return Course::create(['name' => 'Information Security', 'code' => $code, 'semester' => '2026', 'instructor_id' => $teacher->id]);
    }

    public function test_feed_has_stable_ids_and_only_active_enrolled_published_content(): void
    {
        $teacher = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);
        $course = $this->course($teacher, 'ACTIVE');
        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'active']);
        $announcement = Announcement::create(['course_id' => $course->id, 'user_id' => $teacher->id, 'title' => 'Course update', 'content' => 'New material is ready.']);
        $assessment = Assessment::create(['course_id' => $course->id, 'title' => 'Security quiz', 'type' => 'quiz', 'is_published' => true]);
        Assessment::create(['course_id' => $course->id, 'title' => 'Draft assessment', 'type' => 'quiz', 'is_published' => false]);
        $lesson = Lesson::create(['course_id' => $course->id, 'title' => 'Threat modelling', 'is_published' => true]);
        $material = $lesson->materials()->create(['title' => 'Threat notes', 'type' => 'pdf', 'file_path' => 'lessons/threats.pdf']);
        $draft = Lesson::create(['course_id' => $course->id, 'title' => 'Draft lesson', 'is_published' => false]);
        $draft->materials()->create(['title' => 'Hidden notes', 'type' => 'pdf']);
        foreach (['dropped', 'completed', 'not_enrolled'] as $status) {
            $other = $this->course($teacher, strtoupper($status));
            if ($status !== 'not_enrolled') Enrollment::create(['user_id' => $student->id, 'course_id' => $other->id, 'status' => $status]);
            Announcement::create(['course_id' => $other->id, 'user_id' => $teacher->id, 'title' => 'Hidden update', 'content' => 'Not for this student.']);
            Assessment::create(['course_id' => $other->id, 'title' => 'Hidden quiz', 'type' => 'quiz', 'is_published' => true]);
            $otherLesson = Lesson::create(['course_id' => $other->id, 'title' => 'Hidden lesson', 'is_published' => true]);
            $otherLesson->materials()->create(['title' => 'Hidden file', 'type' => 'pdf']);
        }
        Sanctum::actingAs($student);
        $feed = $this->getJson('/api/student/feed')->assertOk()->assertJsonCount(3, 'feed')->json('feed');
        $this->assertEqualsCanonicalizing(["announcement:{$announcement->id}", "assessment:{$assessment->id}", "material:{$material->id}"], array_column($feed, 'id'));
        foreach ($feed as $item) {
            $this->assertSame($course->id, $item['course_id']);
            $this->assertNotEmpty($item['item_id']);
        }
        $this->assertSame($lesson->id, collect($feed)->firstWhere('type', 'material')['lesson_id']);
        Sanctum::actingAs($teacher);
        $this->getJson('/api/student/feed')->assertOk()->assertJsonCount(0, 'feed');
    }

    public function test_full_feed_keeps_new_notifications_with_unique_ids_and_newest_first(): void
    {
        $teacher = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);
        $course = $this->course($teacher, 'SECURITY');
        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'active']);
        for ($i = 0; $i < 31; $i++) {
            Announcement::create(['course_id' => $course->id, 'user_id' => $teacher->id, 'title' => "Course update {$i}", 'content' => 'Read the updated material.', 'created_at' => now()->subMinutes(31 - $i)]);
        }
        Sanctum::actingAs($student);
        $first = $this->getJson('/api/student/feed')->assertOk()->assertJsonCount(30, 'feed')->json('feed');
        $new = Announcement::create(['course_id' => $course->id, 'user_id' => $teacher->id, 'title' => 'Latest course update', 'content' => 'The new quiz is ready.']);
        $second = $this->getJson('/api/student/feed')->assertOk()->assertJsonCount(30, 'feed')->json('feed');
        $this->assertSame("announcement:{$new->id}", $second[0]['id']);
        $this->assertCount(30, array_unique(array_column($second, 'id')));
        $this->assertCount(1, array_diff(array_column($second, 'id'), array_column($first, 'id')));
    }

    public function test_feed_requires_authentication_and_empty_enrollments_return_empty_feed(): void
    {
        $this->getJson('/api/student/feed')->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create(['role' => 'student']));
        $this->getJson('/api/student/feed')->assertOk()->assertJsonCount(0, 'feed');
    }
}
