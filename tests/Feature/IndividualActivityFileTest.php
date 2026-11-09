<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\{RefreshDatabase, RefreshDatabaseState};
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class IndividualActivityFileTest extends TestCase
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

    public function test_instructor_file_student_submission_and_manual_grade_flow(): void
    {
        config()->set('app.key', 'base64:' . base64_encode(str_repeat('k', 32)));
        Storage::fake('public');
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);
        $otherStudent = User::factory()->create(['role' => 'student']);
        $course = Course::create([
            'name' => 'File Activities', 'code' => 'FA101', 'semester' => '2026',
            'instructor_id' => $instructor->id,
        ]);
        $course->enrollments()->create(['user_id' => $student->id, 'status' => 'active']);
        $course->enrollments()->create(['user_id' => $otherStudent->id, 'status' => 'active']);

        $base = "/api/courses/{$course->id}/assessments";
        $created = $this->actingAs($instructor)->postJson($base, [
            'title' => 'Write a report', 'type' => 'individual_activity',
            'max_attempts' => 1, 'defer_publication' => true,
        ])->assertCreated()->json('assessment');
        $url = "$base/{$created['id']}";

        $this->putJson($url, ['is_published' => true])->assertUnprocessable();
        $taskFile = UploadedFile::fake()->create('report-instructions.pdf', 10, 'application/pdf');
        $this->post("$url/upload-file", ['file' => $taskFile])->assertOk();
        $this->putJson($url, ['is_published' => true])->assertOk();
        $this->actingAs($student)->getJson($url)->assertOk()
            ->assertJsonPath('assessment.original_filename', 'report-instructions.pdf');
        $this->get("$url/file/download")->assertOk();

        $started = $this->postJson("$url/start")->assertCreated()->json('submission');
        $work = UploadedFile::fake()->create('my-report.docx', 1100,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        $plain = file_get_contents($work->getRealPath());
        $submitted = $this->post("$url/submit-activity", [
            'submission_id' => $started['id'], 'file' => $work,
        ])->assertOk()->json('submission');
        $this->assertSame('submitted', $submitted['status']);
        $this->assertSame('my-report.docx', $submitted['original_filename']);
        $this->assertStringStartsWith('IAF1', Storage::disk('public')->get($submitted['file_path']));
        $this->assertNotSame($plain, Storage::disk('public')->get($submitted['file_path']));
        $download = "$url/submissions/{$submitted['id']}/file/download";
        $downloaded = $this->get($download)->assertOk()->assertDownload('my-report.docx');
        $this->assertSame($plain, $downloaded->streamedContent());
        $this->actingAs($otherStudent)->get($download)->assertForbidden();
        $this->postJson("$url/submit-activity", ['submission_id' => $started['id']])->assertUnprocessable();

        $graded = $this->actingAs($instructor)->putJson("$url/submissions/{$submitted['id']}/grade-activity", [
            'score' => 84, 'feedback' => 'Good work.',
        ])->assertOk()->json('submission');
        $this->assertSame('graded', $graded['status']);
        $this->assertEquals(84, $graded['percentage']);
        $this->assertDatabaseHas('grades', [
            'course_id' => $course->id, 'user_id' => $student->id, 'activity_average' => 84,
        ]);
        $this->actingAs($student)->getJson("$url/submissions/{$submitted['id']}")
            ->assertOk()->assertJsonPath('submission.ai_feedback', 'Good work.');
    }

    public function test_existing_question_based_individual_activities_still_accept_answers(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);
        $course = Course::create([
            'name' => 'Earlier Activities', 'code' => 'EA101', 'semester' => '2026',
            'instructor_id' => $instructor->id,
        ]);
        $course->enrollments()->create(['user_id' => $student->id, 'status' => 'active']);
        $base = "/api/courses/{$course->id}/assessments";
        $assessment = $this->actingAs($instructor)->postJson($base, [
            'title' => 'Earlier question activity', 'type' => 'individual_activity',
            'max_attempts' => 1,
        ])->assertCreated()->json('assessment');
        $url = "$base/{$assessment['id']}";
        $question = $this->postJson("$url/questions", [
            'question_text' => 'Choose A', 'type' => 'multiple_choice',
            'options' => ['A', 'B'], 'correct_answer' => 'A', 'points' => 1,
        ])->assertCreated()->json('question');
        $this->putJson($url, ['is_published' => true])->assertOk();
        $started = $this->actingAs($student)->postJson("$url/start")->assertCreated()->json('submission');
        $this->postJson("$url/submit", [
            'submission_id' => $started['id'],
            'answers' => [['question_id' => $question['id'], 'answer_text' => 'A']],
        ])->assertOk();
    }
}
