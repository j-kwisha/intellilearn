<?php

namespace Tests\Feature;

use App\Models\{Assessment, Course, Lesson, Question, Submission, User};
use App\Services\RubricService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EssayRubricTest extends TestCase
{
    use RefreshDatabase;

    protected function migrateFreshUsing(): array
    {
        // Exercise actual feature migrations without unrelated PostgreSQL-only constraint SQL.
        return ['--path' => array_map(fn ($name) => 'database/migrations/' . $name, [
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
            '2026_10_06_000001_extend_essay_rubrics_and_grading_audit.php',
            '2026_10_06_000002_add_essay_grading_states.php',
        ])];
    }

    private function fixture(): array
    {
        Http::preventStrayRequests();
        $teacher = User::create(['first_name' => 'Teacher', 'last_name' => 'Test', 'email' => 'teacher@example.test', 'role' => 'instructor', 'password' => 'TestPassword123']);
        $student = User::create(['first_name' => 'Student', 'last_name' => 'Test', 'email' => 'student@example.test', 'role' => 'student', 'password' => 'TestPassword123']);
        $course = Course::create(['name' => 'Course', 'code' => 'TEST', 'semester' => '2026', 'instructor_id' => $teacher->id]);
        $assessment = $course->assessments()->create(['title' => 'Essay assessment', 'type' => 'quiz', 'max_attempts' => 1, 'total_points' => 10, 'is_published' => false]);
        $question = $assessment->questions()->create(['question_text' => 'Explain three risks from the source.', 'type' => 'essay', 'points' => 10, 'reference_text' => 'The source describes privacy, bias and overreliance risks.']);
        return [$teacher, $student, $course, $assessment, $question];
    }

    private function rubric(): array
    {
        return ['title' => 'Risk Essay', 'source' => 'manual', 'total_points' => 10, 'criteria' => [
            ['criterion' => 'Accuracy', 'description' => 'Explains three correct risks.', 'max_points' => 6, 'levels' => [
                ['label' => 'Beginning', 'description' => 'Limited accurate explanation.', 'min_points' => 0, 'max_points' => 3],
                ['label' => 'Excellent', 'description' => 'Explains the three risks accurately.', 'min_points' => 3, 'max_points' => 6],
            ]],
            ['criterion' => 'Evidence', 'description' => 'Uses specific source evidence.', 'max_points' => 4, 'levels' => [
                ['label' => 'Beginning', 'description' => 'Generic or unsupported statements.', 'min_points' => 0, 'max_points' => 2],
                ['label' => 'Excellent', 'description' => 'Specific, relevant source examples.', 'min_points' => 2, 'max_points' => 4],
            ]],
        ]];
    }

    private function path(Course $course, Assessment $assessment): string
    {
        return "/api/courses/{$course->id}/assessments/{$assessment->id}";
    }

    private function aiResult(Question $question): array
    {
        $criteria = $question->rubric->criteria;
        return ['status' => 'graded', 'total_score' => 999, 'percentage' => 999,
            'criteria' => [
                ['criterion_id' => $criteria[0]->id, 'awarded_points' => 4, 'feedback' => 'Two risks explained well.'],
                ['criterion_id' => $criteria[1]->id, 'awarded_points' => 3, 'feedback' => 'Relevant evidence.'],
            ], 'overall_feedback' => 'Good source-based response.', 'strengths' => ['Accurate examples'],
            'areas_for_improvement' => [], 'ai_model' => 'test-model'];
    }

    private function attempt(User $student, Assessment $assessment): Submission
    {
        return Submission::create(['user_id' => $student->id, 'assessment_id' => $assessment->id, 'status' => 'in_progress']);
    }

    public function test_manual_rubric_saves_normalized_levels_and_matching_total(): void
    {
        [$teacher, , $course, $assessment, $question] = $this->fixture();
        Sanctum::actingAs($teacher);
        $this->postJson($this->path($course, $assessment) . "/questions/{$question->id}/rubric", $this->rubric())
            ->assertCreated()->assertJsonPath('rubric.total_points', '10.00');
        $this->assertDatabaseCount('rubric_criteria', 2);
        $this->assertDatabaseCount('rubric_levels', 4);
        $this->assertSame($teacher->id, $question->fresh()->rubric->created_by);
    }

    public function test_invalid_total_and_ranges_do_not_replace_saved_rubric(): void
    {
        [$teacher, , $course, $assessment, $question] = $this->fixture();
        $saved = app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        Sanctum::actingAs($teacher);
        $invalid = $this->rubric(); $invalid['criteria'][0]['max_points'] = 7;
        $url = $this->path($course, $assessment) . "/questions/{$question->id}/rubric";
        $this->postJson($url, $invalid)->assertStatus(422);
        $invalid = $this->rubric(); $invalid['criteria'][0]['levels'][1]['min_points'] = 2;
        $this->postJson($url, $invalid)->assertStatus(422);
        $this->assertSame($saved->id, $question->fresh()->rubric->id);
        $this->assertDatabaseCount('rubric_levels', 4);
    }

    public function test_ai_generation_returns_editable_draft_without_saving_it(): void
    {
        [$teacher, , $course, $assessment, $question] = $this->fixture();
        Sanctum::actingAs($teacher);
        Http::fake(['*/generate-rubric' => Http::response($this->rubric())]);
        $this->postJson($this->path($course, $assessment) . '/rubric/generate', [
            'question_text' => $question->question_text, 'points' => 10, 'reference_text' => $question->reference_text,
        ])->assertOk()->assertJsonPath('rubric.source', 'ai_generated');
        $this->assertDatabaseCount('rubrics', 0);
        Http::assertSent(fn ($r) => $r['reference_material'] === $question->reference_text);
    }

    public function test_invalid_ai_rubric_is_rejected_without_persistence(): void
    {
        [$teacher, , $course, $assessment, $question] = $this->fixture();
        Sanctum::actingAs($teacher);
        $invalid = $this->rubric(); $invalid['criteria'][0]['max_points'] = -1;
        Http::fake(['*/generate-rubric' => Http::response($invalid)]);
        $this->postJson($this->path($course, $assessment) . '/rubric/generate', [
            'question_text' => $question->question_text, 'points' => 10, 'reference_text' => $question->reference_text,
        ])->assertStatus(502);
        $this->assertDatabaseCount('rubrics', 0);
    }

    public function test_publishing_requires_saved_valid_rubrics_and_points_edit_cannot_break_them(): void
    {
        [$teacher, , $course, $assessment, $question] = $this->fixture();
        Sanctum::actingAs($teacher);
        $path = $this->path($course, $assessment);
        $this->putJson($path, ['is_published' => true])->assertStatus(422);
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        $this->putJson($path, ['is_published' => true])->assertOk();
        $this->putJson($path . "/questions/{$question->id}", ['points' => 20])->assertStatus(422);
        $this->assertSame('10.00', $question->fresh()->points);
    }

    public function test_bulk_validation_saves_no_partial_questions(): void
    {
        [$teacher, , $course, $assessment] = $this->fixture();
        Sanctum::actingAs($teacher);
        $invalid = $this->rubric(); $invalid['criteria'][0]['max_points'] = 7;
        $this->postJson($this->path($course, $assessment) . '/questions/bulk', ['questions' => [
            ['question_text' => 'First', 'type' => 'essay', 'points' => 10, 'rubric' => $this->rubric()],
            ['question_text' => 'Second', 'type' => 'essay', 'points' => 10, 'rubric' => $invalid],
        ]])->assertStatus(422);
        $this->assertDatabaseCount('questions', 1);
        $this->assertDatabaseCount('rubrics', 0);
    }

    public function test_students_cannot_retrieve_or_modify_rubric_configuration(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        Sanctum::actingAs($student);
        $path = $this->path($course, $assessment) . "/questions/{$question->id}/rubric";
        $this->getJson($path)->assertForbidden();
        $this->postJson($path, $this->rubric())->assertForbidden();
    }

    public function test_other_instructors_and_cross_course_references_are_rejected(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        $student->update(['role' => 'instructor']);
        Sanctum::actingAs($student);
        $this->postJson($this->path($course, $assessment) . "/questions/{$question->id}/rubric", $this->rubric())->assertForbidden();
        $other = Course::create(['name' => 'Other', 'code' => 'OTHER', 'semester' => '2026', 'instructor_id' => $student->id]);
        $lesson = Lesson::create(['course_id' => $other->id, 'title' => 'Private lesson']);
        Sanctum::actingAs($teacher);
        $this->putJson($this->path($course, $assessment) . "/questions/{$question->id}", ['reference_lesson_id' => $lesson->id])->assertStatus(422);
    }

    public function test_grading_sums_criteria_in_backend_and_stores_snapshots(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        Http::fake(['*/grade-essay' => Http::response($this->aiResult($question))]);
        $submission = $this->attempt($student, $assessment);
        Sanctum::actingAs($student);
        $this->postJson($this->path($course, $assessment) . '/submit', ['submission_id' => $submission->id, 'answers' => [
            ['question_id' => $question->id, 'answer_text' => 'Privacy, bias and overreliance, as explained in the reading.'],
        ]])->assertOk()->assertJsonPath('submission.score', '7.00')->assertJsonPath('submission.percentage', '70.00')
            ->assertJsonMissingPath('submission.answers.0.ai_evaluation')
            ->assertJsonMissingPath('submission.answers.0.question.reference_text');
        $answer = $submission->answers()->first();
        $this->assertSame(7, $answer->ai_evaluation['total_score']);
        $this->assertSame($question->reference_text, $answer->reference_snapshot['text']);
        $this->assertCount(2, $answer->rubric_snapshot['criteria']);
        Http::assertSent(fn ($r) => count($r['rubric']['criteria'][0]['levels']) === 2 && $r['reference_material'] === $question->reference_text);
    }

    public function test_reference_missing_essay_stays_pending_even_if_later_essay_succeeds(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        $question->update(['reference_text' => null]);
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        $second = $assessment->questions()->create(['question_text' => 'Second essay', 'type' => 'essay', 'points' => 10, 'order' => 1, 'reference_text' => 'Source content']);
        app(RubricService::class)->save($second, $this->rubric(), $teacher->id);
        Http::fake(['*/grade-essay' => Http::response($this->aiResult($second))]);
        $submission = $this->attempt($student, $assessment);
        Sanctum::actingAs($student);
        $this->postJson($this->path($course, $assessment) . '/submit', ['submission_id' => $submission->id, 'answers' => [
            ['question_id' => $question->id, 'answer_text' => 'Unreferenced essay'],
            ['question_id' => $second->id, 'answer_text' => 'Referenced essay'],
        ]])->assertOk()->assertJsonPath('submission.status', 'submitted');
        $first = $submission->answers()->where('question_id', $question->id)->first();
        $this->assertNull($first->points_earned); $this->assertNull($first->ai_feedback);
        $this->assertSame('pending', $first->grading_status);
        $this->assertSame('pending', $submission->fresh()->grading_status);
        Http::assertSentCount(1);
    }

    public function test_missing_rubric_and_blank_unreferenced_answer_do_not_call_ai(): void
    {
        [, $student, $course, $assessment, $question] = $this->fixture();
        $submission = $this->attempt($student, $assessment);
        Sanctum::actingAs($student);
        $this->postJson($this->path($course, $assessment) . '/submit', ['submission_id' => $submission->id, 'answers' => [
            ['question_id' => $question->id, 'answer_text' => 'An answer without a rubric'],
        ]])->assertOk()->assertJsonPath('submission.status', 'submitted');
        Http::assertNothingSent();
        $this->assertNull($submission->answers()->first()->ai_feedback);
        $this->assertSame('grading_error', $submission->fresh()->grading_status);
        $this->assertSame('rubric_configuration', $submission->answers()->first()->grading_error_code);
    }

    public function test_invalid_ai_scores_leave_answer_in_error_without_losing_response(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        $invalid = $this->aiResult($question); $invalid['criteria'][0]['awarded_points'] = 100;
        Http::fake(['*/grade-essay' => Http::response($invalid)]);
        $submission = $this->attempt($student, $assessment);
        Sanctum::actingAs($student);
        $this->postJson($this->path($course, $assessment) . '/submit', ['submission_id' => $submission->id, 'answers' => [
            ['question_id' => $question->id, 'answer_text' => 'Keep this answer'],
        ]])->assertOk()->assertJsonPath('submission.status', 'submitted');
        $answer = $submission->answers()->first();
        $this->assertSame('Keep this answer', $answer->answer_text);
        $this->assertNull($answer->points_earned);
        $this->assertNotNull($answer->rubric_snapshot);
        $this->assertSame('grading_error', $answer->grading_status);
        $this->assertSame('ai_response_validation', $answer->grading_error_code);
    }

    public function test_teacher_criterion_override_preserves_original_ai_and_historical_rubric(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        Http::fake(['*/grade-essay' => Http::response($this->aiResult($question))]);
        $submission = $this->attempt($student, $assessment);
        Sanctum::actingAs($student);
        $path = $this->path($course, $assessment);
        $this->postJson($path . '/submit', ['submission_id' => $submission->id, 'answers' => [['question_id' => $question->id, 'answer_text' => 'Essay']]])->assertOk();
        $answer = $submission->answers()->first();
        $original = $answer->ai_evaluation;
        $snapshot = $answer->rubric_snapshot;
        // Editing the live rubric does not change the historical IDs/maxima used for overrides.
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        Sanctum::actingAs($teacher);
        $scores = array_column($snapshot['criteria'], 'max_points', 'id');
        $this->putJson($path . "/submissions/{$submission->id}/grade", ['grades' => [[
            'question_id' => $question->id, 'points_earned' => 1, 'criterion_scores' => $scores, 'ai_feedback' => 'Teacher feedback',
        ]]])->assertOk()->assertJsonPath('submission.score', '10.00');
        $answer->refresh();
        $this->assertSame($original, $answer->ai_evaluation);
        $this->assertSame($snapshot, $answer->rubric_snapshot);
        $this->assertSame('10.00', $answer->points_earned);
        $this->assertSame($teacher->id, $answer->overridden_by);
        $teacherScores = $answer->teacher_criterion_scores;
        $this->putJson($path . "/submissions/{$submission->id}/grade", ['grades' => [[
            'question_id' => $question->id, 'points_earned' => 10, 'ai_feedback' => 'Updated feedback only',
        ]]])->assertOk();
        $this->assertSame($teacherScores, $answer->fresh()->teacher_criterion_scores);
        $question->update(['points' => 20]);
        $this->putJson($path . "/submissions/{$submission->id}/grade", ['grades' => [[
            'question_id' => $question->id, 'points_earned' => 11,
        ]]])->assertStatus(422);
        $this->getJson($path . "/submissions/{$submission->id}")->assertOk()->assertJsonPath('submission.answers.0.ai_evaluation.total_score', 7);
    }

    public function test_blank_referenced_essay_receives_zero_without_ai_request(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        $submission = $this->attempt($student, $assessment);
        Sanctum::actingAs($student);
        $this->postJson($this->path($course, $assessment) . '/submit', ['submission_id' => $submission->id, 'answers' => [
            ['question_id' => $question->id, 'answer_text' => ''],
        ]])->assertOk()->assertJsonPath('submission.status', 'graded')->assertJsonPath('submission.score', '0.00');
        Http::assertNothingSent();
        $this->assertCount(2, $submission->answers()->first()->ai_evaluation['criteria']);
    }

    public function test_blank_unreferenced_essay_stays_pending_with_no_feedback(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        $question->update(['reference_text' => null]);
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        $submission = $this->attempt($student, $assessment);
        Sanctum::actingAs($student);
        $this->postJson($this->path($course, $assessment) . '/submit', ['submission_id' => $submission->id, 'answers' => [
            ['question_id' => $question->id, 'answer_text' => ''],
        ]])->assertOk()->assertJsonPath('submission.status', 'submitted');
        $answer = $submission->answers()->first();
        $this->assertNull($answer->points_earned); $this->assertNull($answer->ai_feedback);
        Http::assertNothingSent();
    }

    public function test_hidden_scores_do_not_leak_through_feedback_or_audit_data(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        $assessment->update(['score_visibility' => 'hidden']);
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        Http::fake(['*/grade-essay' => Http::response($this->aiResult($question))]);
        $submission = $this->attempt($student, $assessment);
        Sanctum::actingAs($student);
        $path = $this->path($course, $assessment);
        $this->postJson($path . '/submit', ['submission_id' => $submission->id, 'answers' => [['question_id' => $question->id, 'answer_text' => 'Essay']]])
            ->assertOk()->assertJsonMissingPath('submission.answers.0.ai_feedback')
            ->assertJsonMissingPath('submission.answers.0.points_earned')
            ->assertJsonMissingPath('submission.answers.0.ai_evaluation');
        $this->getJson($path . "/submissions/{$submission->id}")->assertOk()->assertJsonMissingPath('submission.answers.0.ai_feedback')
            ->assertJsonMissingPath('submission.answers.0.rubric_snapshot');
    }

    public function test_selected_lesson_uses_its_document_content_without_implicit_course_fallback(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        $lesson = Lesson::create(['course_id' => $course->id, 'title' => 'Selected Source']);
        $material = $lesson->materials()->create(['title' => 'Source PDF', 'type' => 'pdf', 'extracted_text' => 'Specific selected reference.']);
        $question->update(['reference_text' => null, 'reference_lesson_id' => $lesson->id]);
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        Http::fake(['*/grade-essay' => Http::response($this->aiResult($question))]);
        $submission = $this->attempt($student, $assessment);
        Sanctum::actingAs($student);
        $this->postJson($this->path($course, $assessment) . '/submit', ['submission_id' => $submission->id, 'answers' => [['question_id' => $question->id, 'answer_text' => 'Essay']]])->assertOk()->assertJsonPath('submission.grading_status', 'graded');
        Http::assertSent(fn ($r) => $r['reference_material'] === 'Specific selected reference.');
        $this->assertSame($material->id, $submission->answers()->first()->reference_snapshot['materials'][0]['id']);
    }

    public function test_reference_upload_extracts_real_text_and_rejects_failed_pdf(): void
    {
        [$teacher, , $course] = $this->fixture();
        Sanctum::actingAs($teacher);
        $path = "/api/courses/{$course->id}/upload-reference-text";
        $this->postJson($path, ['reference_file' => UploadedFile::fake()->createWithContent('source.txt', 'Real source content.')])
            ->assertOk()->assertJsonPath('extracted_text', 'Real source content.')->assertJsonPath('reference_file.filename', 'source.txt');
        $this->postJson($path, ['reference_file' => UploadedFile::fake()->create('broken.pdf', 1, 'application/pdf')])->assertStatus(422);
    }

    public function test_uploaded_pdf_text_is_persisted_and_retrieved_for_grading(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        $source = 'Privacy, bias and overreliance are the three risks.';
        $stream = "BT /F1 12 Tf 50 700 Td ($source) Tj ET";
        $objects = ['<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            '<< /Length ' . strlen($stream) . " >>\nstream\n$stream\nendstream"];
        $pdf = "%PDF-1.4\n"; $offsets = [];
        foreach ($objects as $index => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($index + 1) . " 0 obj\n$object\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 6\n0000000000 65535 f \n";
        foreach ($offsets as $offset) $pdf .= sprintf("%010d 00000 n \n", $offset);
        $pdf .= "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n$xref\n%%EOF";
        Sanctum::actingAs($teacher);
        $upload = $this->postJson("/api/courses/{$course->id}/upload-reference-text", [
            'reference_file' => UploadedFile::fake()->createWithContent('source.pdf', $pdf),
        ])->assertOk();
        $text = $upload->json('extracted_text');
        $this->assertStringContainsString($source, $text);
        $this->putJson($this->path($course, $assessment) . "/questions/{$question->id}", [
            'reference_text' => $text, 'reference_file' => $upload->json('reference_file'), 'rubric' => $this->rubric(),
        ])->assertOk();
        $question->refresh();
        $this->assertSame($text, $question->reference_text);
        Http::fake(['*/grade-essay' => Http::response($this->aiResult($question))]);
        $submission = $this->attempt($student, $assessment);
        Sanctum::actingAs($student);
        $this->postJson($this->path($course, $assessment) . '/submit', ['submission_id' => $submission->id,
            'answers' => [['question_id' => $question->id, 'answer_text' => 'Essay']]])
            ->assertOk()->assertJsonPath('submission.status', 'graded')->assertJsonPath('submission.grading_status', 'graded');
        Http::assertSent(fn ($r) => $r['reference_material'] === $text);
        $this->assertSame($text, $submission->answers()->first()->reference_snapshot['text']);
    }

    public function test_deleted_lesson_and_deleted_material_stay_pending(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        $lesson = Lesson::create(['course_id' => $course->id, 'title' => 'Deleted source']);
        $material = $lesson->materials()->create(['title' => 'Source', 'type' => 'pdf', 'extracted_text' => 'Readable source']);
        $question->update(['reference_text' => null, 'reference_lesson_id' => $lesson->id]);
        $material->delete();
        $result = app(\App\Services\EssayGradingService::class)->grade($question->fresh(), 'Essay');
        $this->assertSame('pending', $result['grading_status']);
        $this->assertSame('unavailable', $result['reference_snapshot']['state']);
        $lesson->delete();
        $result = app(\App\Services\EssayGradingService::class)->grade($question->fresh(), 'Essay');
        $this->assertSame('pending', $result['grading_status']);
        $this->assertNull($result['ai_feedback']);
        Http::assertNothingSent();
    }

    public function test_failed_extraction_is_an_error_instead_of_pending(): void
    {
        [$teacher, , $course, , $question] = $this->fixture();
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        $question->update(['reference_text' => null, 'reference_file' => ['filename' => 'source.pdf']]);
        $result = app(\App\Services\EssayGradingService::class)->grade($question->fresh(), 'Essay');
        $this->assertSame('grading_error', $result['grading_status']);
        $this->assertSame('reference_extraction', $result['grading_error_code']);
        $lesson = Lesson::create(['course_id' => $course->id, 'title' => 'Unreadable source']);
        $lesson->materials()->create(['title' => 'Source', 'type' => 'pdf', 'extracted_text' => null]);
        $question->update(['reference_file' => null, 'reference_lesson_id' => $lesson->id]);
        $this->assertSame('grading_error', app(\App\Services\EssayGradingService::class)->grade($question->fresh(), 'Essay')['grading_status']);
        Http::assertNothingSent();
    }

    public function test_http_failure_timeout_and_malformed_json_persist_error_states(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        foreach (['http', 'timeout', 'json'] as $failure) {
            Http::swap(new \Illuminate\Http\Client\Factory);
            Http::preventStrayRequests();
            Http::fake(['*/grade-essay' => function () use ($failure) {
                if ($failure === 'timeout') throw new \Illuminate\Http\Client\ConnectionException('Timed out');
                return $failure === 'http' ? Http::response([], 500) : Http::response('{broken json', 200);
            }]);
            $submission = $this->attempt($student, $assessment);
            Sanctum::actingAs($student);
            $this->postJson($this->path($course, $assessment) . '/submit', ['submission_id' => $submission->id,
                'answers' => [['question_id' => $question->id, 'answer_text' => 'Preserved essay']]])
                ->assertOk()->assertJsonPath('submission.grading_status', 'grading_error');
            $answer = $submission->answers()->first();
            $this->assertSame('grading_error', $answer->grading_status);
            $this->assertSame('Preserved essay', $answer->answer_text);
            $this->assertNull($answer->points_earned);
            $this->assertSame($failure === 'json' ? 'ai_response_validation' : 'ai_service', $answer->grading_error_code);
            Sanctum::actingAs($teacher);
            $this->putJson($this->path($course, $assessment) . "/submissions/{$submission->id}/grade", [
                'grades' => [['question_id' => $question->id, 'points_earned' => 5, 'ai_feedback' => 'Teacher review']],
            ])->assertOk()->assertJsonPath('submission.grading_status', 'graded');
            $this->assertNull($answer->fresh()->grading_error_code);
        }
    }

    public function test_invalid_saved_rubric_is_a_configuration_error(): void
    {
        [$teacher, , , , $question] = $this->fixture();
        $rubric = app(RubricService::class)->save($question, $this->rubric(), $teacher->id);
        $rubric->criteria()->first()->update(['max_points' => 7]);
        $result = app(\App\Services\EssayGradingService::class)->grade($question->fresh(), 'Essay');
        $this->assertSame('grading_error', $result['grading_status']);
        $this->assertSame('rubric_configuration', $result['grading_error_code']);
        Http::assertNothingSent();
    }

    public function test_partial_manual_grading_does_not_finalize_ungraded_answers(): void
    {
        [$teacher, $student, $course, $assessment, $question] = $this->fixture();
        $second = $assessment->questions()->create(['question_text' => 'Second', 'type' => 'essay', 'points' => 10]);
        $submission = $this->attempt($student, $assessment);
        $submission->update(['status' => 'submitted', 'total_points' => 20]);
        foreach ([$question, $second] as $q) $submission->answers()->create(['question_id' => $q->id, 'answer_text' => 'Essay']);
        Sanctum::actingAs($teacher);
        $this->putJson($this->path($course, $assessment) . "/submissions/{$submission->id}/grade", ['grades' => [[
            'question_id' => $question->id, 'points_earned' => 7,
        ]]])->assertOk()->assertJsonPath('submission.status', 'submitted')->assertJsonPath('submission.percentage', null);
    }
}
