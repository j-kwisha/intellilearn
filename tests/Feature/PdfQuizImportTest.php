<?php

namespace Tests\Feature;

use App\Models\{Assessment, Course, Enrollment, User};
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
            '2026_09_26_160747_create_matching_pairs_table.php',
            '2026_09_26_162950_add_score_visibility_to_assessments_table.php',
            '2026_09_26_170354_create_rubrics_table.php',
            '2026_09_26_170400_create_rubric_criteria_table.php',
            '2026_09_26_170424_add_criterion_scores_to_submission_answers.php',
            '2026_10_04_160000_add_reference_fields_to_questions.php',
            '2026_10_06_000001_extend_essay_rubrics_and_grading_audit.php',
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
