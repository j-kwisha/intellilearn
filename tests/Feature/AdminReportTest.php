<?php

namespace Tests\Feature;

use App\Models\{Assessment, Course, Enrollment, Question, Submission, SubmissionAnswer, User};
use Illuminate\Foundation\Testing\{RefreshDatabase, RefreshDatabaseState};
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminReportTest extends TestCase
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
        return ['--path' => array_map(fn ($name) => 'database/migrations/'.$name, [
            '0001_01_01_000000_create_users_table.php',
            '2026_03_26_000001_create_courses_table.php',
            '2026_03_26_000002_create_enrollments_table.php',
            '2026_03_26_000003_create_lessons_table.php',
            '2026_03_26_000005_create_assessments_table.php',
            '2026_09_26_170354_create_rubrics_table.php',
            '2026_09_26_170400_create_rubric_criteria_table.php',
            '2026_09_26_170424_add_criterion_scores_to_submission_answers.php',
            '2026_10_06_000001_extend_essay_rubrics_and_grading_audit.php',
            '2026_10_06_000002_add_essay_grading_states.php',
        ])];
    }

    private function fixture(): array
    {
        $this->travelTo(\Carbon\Carbon::parse('2026-10-10 12:00:00', 'UTC'));
        Http::preventStrayRequests();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $teacher = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);
        $course = Course::create(['name' => 'Information Security', 'code' => 'SEC101',
            'semester' => '2026', 'instructor_id' => $teacher->id, 'status' => 'active']);
        $this->enroll($course, $student);
        return [$course, $student, $teacher];
    }

    private function enroll(Course $course, User $student, array $extra = []): Enrollment
    {
        return Enrollment::forceCreate(array_merge(['course_id' => $course->id, 'user_id' => $student->id,
            'status' => 'active', 'created_at' => now()->subDays(30)], $extra));
    }

    private function assessment(Course $course, array $extra = []): Assessment
    {
        return $course->assessments()->create(array_merge(['title' => 'Security principles', 'type' => 'quiz',
            'total_points' => 100, 'is_published' => true, 'available_from' => now()->subDays(10),
            'due_date' => now()->subDay()], $extra));
    }

    private function submission(Assessment $assessment, User $student, array $extra = []): Submission
    {
        return Submission::create(array_merge(['assessment_id' => $assessment->id, 'user_id' => $student->id,
            'status' => 'graded', 'grading_status' => 'graded', 'percentage' => 90, 'submitted_at' => now()->subDays(2)], $extra));
    }

    public function test_reports_are_admin_only(): void
    {
        Http::preventStrayRequests();
        $this->getJson('/api/admin/reports')->assertUnauthorized();
        foreach (['student', 'instructor'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $this->getJson('/api/admin/reports?include_risk=1')->assertForbidden();
        }
        Http::assertNothingSent();
    }

    public function test_students_are_unique_retakes_are_deduplicated_and_ungraded_work_is_not_averaged(): void
    {
        [$course, $student, $teacher] = $this->fixture();
        $other = User::factory()->create(['role' => 'student']);
        $this->enroll($course, $other);
        $second = Course::create(['name' => 'Network Fundamentals', 'code' => 'NET101', 'semester' => '2026', 'instructor_id' => $teacher->id]);
        $this->enroll($second, $student);
        $quiz = $this->assessment($course);
        $pending = $this->assessment($course);
        $this->submission($quiz, $student, ['percentage' => 40]);
        $this->submission($quiz, $student, ['percentage' => 90, 'attempt_number' => 2]);
        $this->submission($pending, $student, ['percentage' => 0, 'status' => 'submitted', 'grading_status' => 'pending']);
        $this->assessment($course, ['available_from' => now()->addDay(), 'due_date' => now()->addDays(3)]);
        $draft = $this->assessment($course, ['is_published' => false]);
        $this->submission($draft, $student, ['percentage' => 1]);
        $report = $this->getJson('/api/admin/reports')->assertOk();
        $report->assertJsonPath('overview.students', 2)->assertJsonPath('overview.enrollments', 3)
            ->assertJsonPath('overview.instructors', 1)->assertJsonPath('overview.active_courses', 2)
            ->assertJsonPath('overview.pending_grading', 1);
        $row = collect($report->json('courses'))->firstWhere('id', $course->id);
        $this->assertEquals(90, $row['average_score']);
        $this->assertEquals(50, $row['submission_rate']);
        $this->assertSame(2, $row['submitted_count']);
        $this->assertSame(4, $row['expected_count']);
        $this->assertSame(2, $row['missed_assessments']);
        Http::assertNothingSent();
    }

    public function test_only_expired_deadlines_after_enrollment_count_as_missing_and_inactive_enrollments_are_excluded(): void
    {
        [$course, $student] = $this->fixture();
        $this->assessment($course, ['due_date' => now()->subDays(40)]);
        $this->assessment($course, ['due_date' => now()]);
        $this->assessment($course, ['due_date' => null]);
        $this->assessment($course, ['available_from' => now()->addDay(), 'due_date' => now()->addDays(2)]);
        $old = $this->assessment($course);
        $this->submission($old, $student, ['status' => 'in_progress', 'percentage' => null]);
        $inactive = User::factory()->create(['role' => 'student', 'is_active' => false]);
        $this->enroll($course, $inactive);
        $dropped = User::factory()->create(['role' => 'student']);
        $this->enroll($course, $dropped, ['status' => 'dropped']);
        $this->getJson('/api/admin/reports')->assertOk()->assertJsonPath('overview.students', 1)
            ->assertJsonPath('courses.0.expected_count', 3)->assertJsonPath('courses.0.missed_assessments', 1)
            ->assertJsonPath('courses.0.average_score', null)->assertJsonPath('students.0.risk_status', 'insufficient_data');
    }

    public function test_course_instructor_and_deadline_filters_and_validation(): void
    {
        [$course, $student, $teacher] = $this->fixture();
        $quiz = $this->assessment($course);
        $this->submission($quiz, $student);
        $this->assessment($course, ['due_date' => now()->subDays(2)]);
        $this->assessment($course, ['due_date' => null]);
        $query = http_build_query(['course_id' => $course->id, 'instructor_id' => $teacher->id, 'from' => '2026-10-09', 'to' => '2026-10-09']);
        $this->getJson('/api/admin/reports?'.$query)->assertOk()->assertJsonPath('courses.0.expected_count', 1)
            ->assertJsonPath('courses.0.submitted_count', 1)->assertJsonPath('filters.from', '2026-10-09');
        $this->getJson('/api/admin/reports?to=2026-10-09')->assertOk()->assertJsonPath('courses.0.expected_count', 2);
        $this->getJson('/api/admin/reports?from=2026-10-11&to=2026-10-09')->assertUnprocessable();
        $this->getJson('/api/admin/reports?instructor_id='.$student->id)->assertUnprocessable();
        $this->getJson('/api/admin/reports?from=invalid')->assertUnprocessable();
        $this->getJson('/api/admin/reports?course_id=99999')->assertUnprocessable();
        $otherTeacher = User::factory()->create(['role' => 'instructor']);
        $this->getJson('/api/admin/reports?instructor_id='.$otherTeacher->id)->assertOk()->assertJsonCount(0, 'courses');
    }

    public function test_grading_errors_are_separate_from_pending_and_overrides_are_not_counted_as_current_ai_grades(): void
    {
        [$course, $student] = $this->fixture();
        $quiz = $this->assessment($course);
        $question = Question::create(['assessment_id' => $quiz->id, 'question_text' => 'Explain the principle', 'type' => 'essay', 'points' => 10]);
        foreach ([
            ['graded', 'graded', 8, false, ['criteria' => []]],
            ['graded', 'graded', 9, true, ['criteria' => []]],
            ['submitted', 'pending', null, false, null],
            ['submitted', 'grading_error', null, false, null],
        ] as [$status, $grading, $points, $override, $evaluation]) {
            $submission = $this->submission($quiz, $student, ['status' => $status, 'grading_status' => $grading]);
            SubmissionAnswer::create(['submission_id' => $submission->id, 'question_id' => $question->id,
                'grading_status' => $grading, 'points_earned' => $points, 'instructor_override' => $override,
                'ai_evaluation' => $evaluation, 'answer_text' => 'PRIVATE STUDENT ESSAY', 'reference_snapshot' => ['text' => 'PRIVATE REFERENCE']]);
        }
        $this->getJson('/api/admin/reports')->assertOk()->assertJsonPath('grading.graded_submissions', 2)
            ->assertJsonPath('grading.pending_submissions', 1)->assertJsonPath('grading.error_submissions', 1)
            ->assertJsonPath('grading.ai_graded_essays', 1)->assertJsonPath('grading.teacher_overrides', 1)
            ->assertJsonPath('grading.pending_essays', 1)->assertJsonPath('grading.error_essays', 1)
            ->assertDontSee('PRIVATE STUDENT ESSAY')->assertDontSee('PRIVATE REFERENCE');
    }

    public function test_ai_risk_is_validated_cached_and_uses_deduplicated_submission_metrics(): void
    {
        [$course, $student] = $this->fixture();
        $quiz = $this->assessment($course);
        $this->submission($quiz, $student, ['percentage' => 40]);
        $this->submission($quiz, $student, ['percentage' => 60, 'attempt_number' => 2]);
        $this->assessment($course, ['available_from' => now()->addDay(), 'due_date' => now()->addDays(2)]);
        Http::fake(['*/predict' => Http::response(['at_risk' => true, 'risk_probability' => 0.85, 'reasons' => ['Low quiz performance']])]);
        $this->getJson('/api/admin/reports?include_risk=1')->assertOk()->assertJsonPath('students.0.risk_status', 'at_risk')
            ->assertJsonPath('students.0.risk_probability', 85)->assertJsonPath('students.0.risk_reasons.0', 'Low quiz performance');
        Http::assertSent(fn ($request) => $request['quiz_avg'] == 60 && $request['submission_rate'] == 1 && $request['missed_tasks'] == 0);
        $this->getJson('/api/admin/reports?include_risk=1')->assertOk();
        Http::assertSentCount(1);
    }

    public function test_ai_failures_malformed_responses_and_insufficient_data_do_not_appear_as_safe(): void
    {
        [$course, $student] = $this->fixture();
        $quiz = $this->assessment($course);
        $this->submission($quiz, $student);
        foreach ([Http::response([], 500), Http::response('not json', 200),
            Http::response(['at_risk' => false, 'risk_probability' => 2, 'reasons' => []]), Http::failedConnection()] as $failure) {
            Http::fake(['*/predict' => $failure]);
            $this->getJson('/api/admin/reports?include_risk=1')->assertOk()->assertJsonPath('students.0.risk_status', 'unavailable')
                ->assertJsonPath('students.0.risk_probability', null)->assertJsonPath('courses.0.average_score', 90);
        }
        $new = User::factory()->create(['role' => 'student']);
        $this->enroll($course, $new);
        $response = $this->getJson('/api/admin/reports?include_risk=1')->assertOk();
        $this->assertSame('insufficient_data', collect($response->json('students'))->firstWhere('student_id', $new->id)['risk_status']);
    }
}
