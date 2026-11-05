<?php

namespace Tests\Feature;

use App\Models\{Assessment, Course, Enrollment, Lesson, LessonMaterial, Question, Submission, SubmissionAnswer, User};
use Illuminate\Foundation\Testing\{RefreshDatabase, RefreshDatabaseState};
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\{Http, Storage};
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PdfQuizImportTest extends TestCase
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
            '2026_04_26_000001_add_extracted_text_to_lesson_materials.php',
            '2026_09_26_160747_create_matching_pairs_table.php',
            '2026_09_26_162950_add_score_visibility_to_assessments_table.php',
            '2026_09_26_170354_create_rubrics_table.php',
            '2026_09_26_170400_create_rubric_criteria_table.php',
            '2026_09_26_170424_add_criterion_scores_to_submission_answers.php',
            '2026_10_04_160000_add_reference_fields_to_questions.php',
            '2026_10_09_000001_add_original_filename_to_lesson_materials.php',
            '2026_10_28_000001_add_extraction_version_to_lesson_materials.php',
            '2026_10_06_000001_extend_essay_rubrics_and_grading_audit.php',
            '2026_11_05_000001_add_learning_and_security_features.php',
            '2026_11_05_000002_add_attempt_unlocks_and_activity_logs.php',
            '2026_10_06_000002_add_essay_grading_states.php',
        ])];
    }

    private function fixture(): array
    {
        Http::preventStrayRequests();
        Storage::fake('public');
        $teacher = User::factory()->create(['role' => 'instructor']);
        $course = Course::create(['name' => 'Networking', 'code' => 'NET101', 'semester' => '2026', 'instructor_id' => $teacher->id]);
        $assessment = $course->assessments()->create(['title' => 'Imported networking quiz', 'type' => 'quiz', 'is_published' => false]);
        Sanctum::actingAs($teacher);
        return [$course, $assessment];
    }

    private function path(Course $course, Assessment $assessment): string
    {
        return "/api/courses/{$course->id}/assessments/{$assessment->id}/import-pdf";
    }

    private function pdf(array $lines): string
    {
        $stream = "BT /F1 12 Tf 50 750 Td 16 TL\n";
        foreach ($lines as $line) $stream .= '('.str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line).") Tj T*\n";
        $stream .= 'ET';
        $objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Length '.strlen($stream)." >>\nstream\n{$stream}\nendstream"];
        $pdf = "%PDF-1.4\n"; $offsets = [];
        foreach ($objects as $index => $object) { $offsets[] = strlen($pdf); $pdf .= ($index + 1)." 0 obj\n{$object}\nendobj\n"; }
        $xref = strlen($pdf); $pdf .= "xref\n0 6\n0000000000 65535 f \n";
        foreach ($offsets as $offset) $pdf .= sprintf("%010d 00000 n \n", $offset);
        return $pdf."trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";
    }

    public function test_real_pdf_returns_faithful_review_draft_without_saving_or_publishing(): void
    {
        [$course, $assessment] = $this->fixture();
        $file = UploadedFile::fake()->createWithContent('Networking Quiz.pdf', $this->pdf([
            'Networking Quiz', 'Select one answer.', '1. Which protocol serves web pages? (2 points)',
            'A. HTTP', 'B. SMTP', '2. Define bandwidth.', 'Answer Key', '1. A', '2. Data transfer capacity.',
        ]));
        $this->postJson($this->path($course, $assessment), ['file' => $file])->assertOk()
            ->assertJsonCount(2, 'questions')->assertJsonPath('questions.0.question_text', 'Which protocol serves web pages? (2 points)')
            ->assertJsonPath('questions.0.options', ['HTTP', 'SMTP'])->assertJsonPath('questions.0.correct_answer', 'HTTP')
            ->assertJsonPath('questions.1.correct_answer', 'Data transfer capacity.')->assertJsonPath('filename', 'Networking Quiz.pdf');
        $this->assertDatabaseCount('questions', 0);
        $this->assertFalse($assessment->fresh()->is_published);
        $this->assertNull($assessment->fresh()->file_path);
        $this->assertSame([], Storage::disk('public')->allFiles());
        Http::assertNothingSent();
    }

    public function test_no_answer_key_is_left_for_instructor_to_complete(): void
    {
        [$course, $assessment] = $this->fixture();
        $file = UploadedFile::fake()->createWithContent('Quiz.pdf', $this->pdf(['1. What is 2 + 2?', 'A. 3', 'B. 4']));
        $this->postJson($this->path($course, $assessment), ['file' => $file])->assertOk()->assertJsonPath('questions.0.correct_answer', '');
        Http::assertNothingSent();
    }

    public function test_imported_quiz_can_be_saved_published_taken_and_graded_online(): void
    {
        [$course, $assessment] = $this->fixture();
        $file = UploadedFile::fake()->createWithContent('Quiz.pdf', $this->pdf([
            '1. Which protocol serves web pages? (2 points)', 'A. HTTP', 'B. SMTP', 'Correct answer: A',
            'II. True or False', '2. Encryption protects data. (3 points)', 'Answer: True',
        ]));
        $path = "/api/courses/{$course->id}/assessments/{$assessment->id}";
        $questions = $this->postJson($path.'/import-pdf', ['file' => $file])->assertOk()->json('questions');
        $saved = $this->postJson($path.'/questions/bulk', ['questions' => $questions])->assertCreated()->json('questions');
        $this->putJson($path, ['is_published' => true])->assertOk();
        $this->assertSame('quiz', $assessment->fresh()->type);
        $this->assertSame('5.00', $assessment->fresh()->total_points);
        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'active']);
        Sanctum::actingAs($student);
        $this->getJson($path)->assertOk()->assertJsonCount(2, 'assessment.questions')
            ->assertJsonPath('assessment.questions.0.question_text', 'Which protocol serves web pages? (2 points)')
            ->assertJsonMissingPath('assessment.questions.0.correct_answer')->assertJsonPath('assessment.file_url', null);
        $submissionId = $this->postJson($path.'/start')->assertCreated()->json('submission.id');
        $this->postJson($path.'/submit', ['submission_id' => $submissionId, 'answers' => [
            ['question_id' => $saved[0]['id'], 'answer_text' => 'HTTP'],
            ['question_id' => $saved[1]['id'], 'answer_text' => 'True'],
        ]])->assertOk()->assertJsonPath('submission.status', 'graded')
            ->assertJsonPath('submission.score', '5.00')->assertJsonPath('submission.percentage', '100.00');
        Http::assertNothingSent();
    }

    public function test_bulk_question_save_accepts_empty_unselected_reference_lesson(): void
    {
        [$course, $assessment] = $this->fixture();
        $path = "/api/courses/{$course->id}/assessments/{$assessment->id}";

        $response = $this->postJson($path.'/questions/bulk', ['questions' => [[
            'question_text' => 'Match each term to its definition.',
            'type' => 'matching',
            'points' => 1,
            'reference_lesson_id' => '',
            'reference_text' => '',
            'matching_pairs' => [
                ['left_item' => 'HTTP', 'right_item' => 'Web protocol', 'correct_match' => 'Web protocol'],
                ['left_item' => 'SMTP', 'right_item' => 'Mail protocol', 'correct_match' => 'Mail protocol'],
            ],
        ]]]);

        $response->assertCreated()->assertJsonCount(1, 'questions');
        $this->assertDatabaseHas('questions', [
            'id' => $response->json('questions.0.id'),
            'reference_lesson_id' => null,
            'reference_text' => null,
        ]);
        $this->assertDatabaseCount('matching_pairs', 2);
    }

    public function test_due_date_does_not_interrupt_an_attempt_started_during_availability(): void
    {
        [$course, $assessment] = $this->fixture();
        $path = "/api/courses/{$course->id}/assessments/{$assessment->id}";
        $question = $this->postJson($path.'/questions', [
            'question_text' => 'Which protocol serves web pages?',
            'type' => 'multiple_choice',
            'options' => ['HTTP', 'SMTP'],
            'correct_answer' => 'HTTP',
            'points' => 1,
        ])->assertCreated()->json('question');
        $assessment->update(['is_published' => true, 'time_limit_minutes' => 10, 'due_date' => now()->addMinute()]);

        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'active']);
        Sanctum::actingAs($student);
        $submissionId = $this->postJson($path.'/start')->assertCreated()->json('submission.id');

        $this->travel(2)->minutes();
        $this->putJson($path.'/autosave', [
            'submission_id' => $submissionId,
            'question_id' => $question['id'],
            'answer_text' => 'HTTP',
        ])->assertOk()->assertJsonPath('saved', true);
        $this->postJson($path.'/submit', [
            'submission_id' => $submissionId,
            'answers' => [['question_id' => $question['id'], 'answer_text' => 'HTTP']],
        ])->assertOk()->assertJsonPath('submission.status', 'graded')->assertJsonPath('submission.score', '1.00');
    }

    public function test_autosave_enumeration_random_order_and_pretest_grading(): void
    {
        [$course, $assessment] = $this->fixture();
        $path = "/api/courses/{$course->id}/assessments/{$assessment->id}";
        $this->postJson($path.'/questions', ['question_text' => 'Name two transport protocols.', 'type' => 'enumeration', 'correct_answer' => "TCP\nUDP", 'points' => 2])->assertCreated();
        $this->postJson($path.'/questions', ['question_text' => 'Which protocol is secure?', 'type' => 'multiple_choice', 'options' => ['HTTP', 'HTTPS'], 'correct_answer' => 'HTTPS', 'points' => 1])->assertCreated();
        $this->putJson($path, ['is_published' => true, 'shuffle_questions' => true, 'assessment_stage' => 'pre_test', 'passing_score' => 70])->assertOk();
        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'active']);
        Sanctum::actingAs($student);
        $start = $this->postJson($path.'/start')->assertCreated();
        $submissionId = $start->json('submission.id');
        $this->assertCount(2, $start->json('submission.question_order'));
        $questionId = $start->json('submission.question_order.0');
        $this->putJson($path.'/autosave', ['submission_id' => $submissionId, 'question_id' => $questionId, 'answer_text' => 'TCP'])->assertOk()->assertJsonPath('saved', true);
        $this->assertDatabaseHas('submission_answers', ['submission_id' => $submissionId, 'question_id' => $questionId, 'answer_text' => 'TCP']);
        $result = $this->postJson($path.'/submit', ['submission_id' => $submissionId, 'answers' => [
            ['question_id' => Question::where('assessment_id', $assessment->id)->where('type', 'enumeration')->value('id'), 'answer_text' => "TCP\n"],
            ['question_id' => Question::where('assessment_id', $assessment->id)->where('type', 'multiple_choice')->value('id'), 'answer_text' => 'HTTPS'],
        ]])->assertOk();
        $this->assertSame(2.0, (float) $result->json('submission.score'));
        $this->assertSame('pre_test', $assessment->fresh()->assessment_stage);
    }

    public function test_practice_uses_previously_missed_questions_without_changing_assessment_grade(): void
    {
        [$course, $assessment] = $this->fixture();
        $path = "/api/courses/{$course->id}/assessments/{$assessment->id}";
        $question = $this->postJson($path.'/questions', ['question_text' => 'Which protocol provides encryption?', 'type' => 'multiple_choice', 'options' => ['HTTP', 'HTTPS'], 'correct_answer' => 'HTTPS', 'points' => 1])->assertCreated()->json('question');
        $this->putJson($path, ['is_published' => true])->assertOk();
        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'active']);
        Sanctum::actingAs($student);
        $submission = $this->postJson($path.'/start')->assertCreated()->json('submission.id');
        $this->postJson($path.'/submit', ['submission_id' => $submission, 'answers' => [['question_id' => $question['id'], 'answer_text' => 'HTTP']]])
            ->assertOk()->assertJsonPath('submission.percentage', '0.00');
        $this->getJson('/api/student/practice?course_id='.$course->id)->assertOk()
            ->assertJsonCount(1, 'questions')->assertJsonMissingPath('questions.0.correct_answer');
        $practice = $this->postJson('/api/student/practice', ['course_id' => $course->id, 'answers' => [['question_id' => $question['id'], 'answer_text' => 'HTTPS']]])
            ->assertOk()->assertJsonPath('attempt.percentage', 100);
        $this->assertDatabaseHas('practice_attempt_answers', ['practice_attempt_id' => $practice->json('attempt.id'), 'question_id' => $question['id'], 'is_correct' => 1]);
        $this->assertSame('0.00', Submission::findOrFail($submission)->fresh()->percentage);
    }

    public function test_pre_post_learning_gain_and_question_difficulty_are_reported(): void
    {
        [$course, $assessment] = $this->fixture();
        $teacher = User::findOrFail($course->instructor_id);
        $student = User::factory()->create(['role' => 'student']);
        $pre = $course->assessments()->create(['title' => 'Baseline', 'type' => 'quiz', 'assessment_stage' => 'pre_test']);
        $post = $course->assessments()->create(['title' => 'Follow-up', 'type' => 'quiz', 'assessment_stage' => 'post_test']);
        foreach ([[$pre, 50], [$post, 80]] as [$test, $percentage]) {
            Submission::create(['user_id' => $student->id, 'assessment_id' => $test->id, 'status' => 'graded', 'score' => $percentage, 'total_points' => 100, 'percentage' => $percentage]);
        }
        $question = $assessment->questions()->create(['question_text' => 'Which networking layer routes packets?', 'type' => 'multiple_choice', 'options' => ['Network', 'Physical'], 'correct_answer' => 'Network', 'points' => 1]);
        $attempt = Submission::create(['user_id' => $student->id, 'assessment_id' => $assessment->id, 'status' => 'graded', 'score' => 0, 'total_points' => 1, 'percentage' => 0]);
        SubmissionAnswer::create(['submission_id' => $attempt->id, 'question_id' => $question->id, 'answer_text' => 'Physical', 'is_correct' => false, 'points_earned' => 0]);
        Sanctum::actingAs($teacher);
        $this->getJson("/api/courses/{$course->id}/knowledge-gain")->assertOk()
            ->assertJsonPath('students.0.pre_test_average', 50)->assertJsonPath('students.0.post_test_average', 80)->assertJsonPath('students.0.gain', 30);
        $this->getJson("/api/courses/{$course->id}/assessments/{$assessment->id}/question-analysis")->assertOk()
            ->assertJsonPath('questions.0.percent_correct', 0)->assertJsonPath('questions.0.difficulty', 'Difficult');
    }

    public function test_locked_attempt_can_only_be_resumed_after_instructor_unlocks_that_student(): void
    {
        [$course, $assessment] = $this->fixture();
        $path = "/api/courses/{$course->id}/assessments/{$assessment->id}";
        $question = $this->postJson($path.'/questions', ['question_text' => 'Which protocol is encrypted?', 'type' => 'multiple_choice',
            'options' => ['HTTP', 'HTTPS'], 'correct_answer' => 'HTTPS', 'points' => 1])->assertCreated()->json('question');
        $assessment->update(['is_published' => true, 'max_attempts' => 1]);
        $student = User::factory()->create(['role' => 'student']);
        $other = User::factory()->create(['role' => 'student']);
        foreach ([$student, $other] as $learner) Enrollment::create(['user_id' => $learner->id, 'course_id' => $course->id, 'status' => 'active']);

        Sanctum::actingAs($student);
        $submissionId = $this->postJson($path.'/start')->assertCreated()->json('submission.id');
        $this->postJson($path.'/lock', ['submission_id' => $submissionId, 'answers' => [['question_id' => $question['id'], 'answer_text' => 'HTTP']]])
            ->assertOk()->assertJsonPath('locked', true);
        $this->postJson($path.'/start')->assertStatus(423);
        $this->postJson($path.'/submit', ['submission_id' => $submissionId, 'answers' => [['question_id' => $question['id'], 'answer_text' => 'HTTPS']]])
            ->assertNotFound();

        // This learner uses their one permitted attempt; the other learner does too.
        // Only the selected learner receives a one-time additional attempt.
        Submission::create(['user_id' => $other->id, 'assessment_id' => $assessment->id, 'attempt_number' => 1, 'status' => 'graded', 'score' => 0, 'total_points' => 1, 'percentage' => 0]);
        Sanctum::actingAs(User::findOrFail($course->instructor_id));
        $this->postJson($path.'/unlock', ['student_id' => $student->id])->assertOk()->assertJsonPath('message', 'This student can resume their saved attempt.');
        Sanctum::actingAs($student);
        $this->postJson($path.'/start')->assertOk()->assertJsonPath('submission.id', $submissionId);
        $this->postJson($path.'/submit', ['submission_id' => $submissionId, 'answers' => [['question_id' => $question['id'], 'answer_text' => 'HTTPS']]])->assertOk();
        $this->postJson($path.'/start')->assertStatus(422);

        Sanctum::actingAs(User::findOrFail($course->instructor_id));
        $this->postJson($path.'/unlock', ['student_id' => $student->id])->assertOk();
        Sanctum::actingAs($other);
        $this->postJson($path.'/start')->assertStatus(422);
        Sanctum::actingAs($student);
        $this->postJson($path.'/start')->assertCreated()->assertJsonPath('submission.attempt_number', 2);
    }

    public function test_instructor_can_build_a_destination_quiz_from_selected_question_counts_and_admin_can_audit_changes(): void
    {
        [$course, $destination] = $this->fixture();
        $sourceOne = $course->assessments()->create(['title' => 'Unit 1', 'type' => 'quiz', 'is_published' => true]);
        $sourceTwo = $course->assessments()->create(['title' => 'Unit 2', 'type' => 'quiz', 'is_published' => true]);
        $sourceOne->questions()->create(['question_text' => 'Q1', 'type' => 'multiple_choice', 'options' => ['A', 'B'], 'correct_answer' => 'A', 'points' => 1]);
        $sourceOne->questions()->create(['question_text' => 'Q2', 'type' => 'true_false', 'options' => ['True', 'False'], 'correct_answer' => 'True', 'points' => 1]);
        $sourceTwo->questions()->create(['question_text' => 'Q3', 'type' => 'enumeration', 'correct_answer' => 'TCP', 'points' => 2]);

        Sanctum::actingAs(User::findOrFail($course->instructor_id));
        $base = "/api/courses/{$course->id}";
        $this->getJson($base.'/test-bank/sources')->assertOk()->assertJsonFragment(['id' => $sourceOne->id, 'eligible_question_count' => 2]);
        $this->postJson($base.'/assessments/'.$destination->id.'/question-bank', ['sources' => [
            ['assessment_id' => $sourceOne->id, 'count' => 1], ['assessment_id' => $sourceTwo->id, 'count' => 1],
        ]])->assertCreated()->assertJsonCount(2, 'questions');
        $this->assertDatabaseHas('activity_logs', ['action' => 'assessment.questions_imported', 'course_id' => $course->id]);

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->getJson('/api/admin/activity-logs')->assertOk()->assertJsonPath('data.0.action', 'assessment.questions_imported')
            ->assertJsonPath('data.0.user.id', $course->instructor_id);
        Sanctum::actingAs(User::factory()->create(['role' => 'student']));
        $this->getJson('/api/admin/activity-logs')->assertForbidden();
    }

    public function test_lesson_quiz_generation_propagates_provider_cooldown_instead_of_a_generic_server_error(): void
    {
        [$course, $assessment] = $this->fixture();
        $lesson = Lesson::create(['course_id' => $course->id, 'title' => 'Network Basics', 'topic' => 'Protocols', 'description' => 'Core protocols']);
        Storage::disk('public')->put('materials/network.txt', 'HTTP transfers web pages. SMTP sends email.');
        LessonMaterial::create(['lesson_id' => $lesson->id, 'title' => 'Network notes', 'type' => 'other',
            'file_path' => 'materials/network.txt', 'extracted_text' => 'HTTP transfers web pages. SMTP sends email.',
            'extraction_version' => \App\Services\DocumentTextService::MATERIAL_EXTRACTION_VERSION]);
        Http::fake(['*/generate-quiz-draft' => Http::response(
            ['detail' => 'AI quiz generation is busy. Please try again shortly.'], 503,
            ['Retry-After' => '47', 'X-Retry-Source' => 'provider'])]);

        $this->postJson("/api/courses/{$course->id}/assessments/{$assessment->id}/generate-quiz-draft", [
            'lesson_id' => $lesson->id, 'question_count' => 5,
        ])->assertStatus(503)
            ->assertHeader('Retry-After', '47')
            ->assertJsonPath('retry_after_seconds', 47)
            ->assertJsonPath('retry_estimated', false)
            ->assertJsonPath('message', 'The AI provider is busy or has reached a temporary request limit. Wait before trying again.');

        $this->assertDatabaseCount('questions', 0);
    }

    public function test_student_other_instructor_and_wrong_course_cannot_import(): void
    {
        [$course, $assessment] = $this->fixture();
        foreach (['student', 'instructor'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $this->postJson($this->path($course, $assessment))->assertForbidden();
        }
        Sanctum::actingAs(User::findOrFail($course->instructor_id));
        $other = $course->replicate(); $other->code = 'NET102'; $other->save();
        $this->postJson($this->path($other, $assessment))->assertNotFound();
    }

    public function test_invalid_non_pdf_oversized_and_image_only_files_are_rejected(): void
    {
        [$course, $assessment] = $this->fixture();
        foreach ([UploadedFile::fake()->createWithContent('Fake.pdf', 'not a pdf'),
            UploadedFile::fake()->createWithContent('Questions.txt', '1. Quiz question'),
            UploadedFile::fake()->create('Large.pdf', 10241, 'application/pdf'),
            UploadedFile::fake()->createWithContent('Scanned.pdf', $this->pdf([])),
        ] as $file) {
            $this->postJson($this->path($course, $assessment), ['file' => $file])->assertUnprocessable()->assertJsonValidationErrors('file');
        }
        $this->assertDatabaseCount('questions', 0);
    }
}
