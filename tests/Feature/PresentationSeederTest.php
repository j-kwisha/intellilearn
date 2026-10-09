<?php
namespace Tests\Feature;

use App\Http\Controllers\AiController;
use App\Models\{Assessment, Course, Enrollment, Grade, Lesson, LessonMaterial, Question, Submission, User};
use App\Services\{EssayGradingService, EssayReferenceService, RubricService};
use Database\Seeders\{AdminSeeder, DatabaseSeeder};
use Database\Seeders\Presentation\PresentationData;
use Illuminate\Foundation\Testing\{RefreshDatabase, RefreshDatabaseState};
use Illuminate\Support\Facades\{DB, Hash, Http, Storage};
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PresentationSeederTest extends TestCase
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
        // Full migrations are also validated separately on PostgreSQL. Only this
        // historical migration uses unguarded PostgreSQL constraint syntax.
        return ['--path' => array_values(array_filter(glob('database/migrations/*.php'),
            fn ($p) => !str_ends_with($p, '2026_10_04_180000_add_docx_to_lesson_materials_type.php')))];
    }
    protected function setUp(): void
    {
        parent::setUp();
        config(['presentation.password' => 'Presentation2026!', 'presentation.date' => '2026-10-06']);
        $this->travelTo(\Carbon\Carbon::parse('2026-10-06 12:00:00'));
        Storage::fake('public');
        Http::preventStrayRequests();
    }
    private function dataset(): void { $this->seed(DatabaseSeeder::class); }
    private function user(string $name): User { return User::where('email', "$name@intellilearn.edu")->firstOrFail(); }

    public function test_exact_dataset_counts_and_verified_credentials(): void
    {
        $this->dataset();
        foreach (['admin' => 1, 'instructor' => 2, 'student' => 10] as $role => $count) $this->assertSame($count, User::where('role', $role)->count());
        foreach (['courses' => 3, 'lessons' => 12, 'lesson_materials' => 12, 'assessments' => 15, 'questions' => 66,
            'announcements' => 9, 'calendar_events' => 9, 'enrollments' => 26, 'submissions' => 94, 'grades' => 26, 'lesson_progress' => 104] as $table => $count) $this->assertDatabaseCount($table, $count);
        foreach (User::all() as $user) {
            $this->assertTrue($user->is_active);
            $this->assertTrue($user->hasVerifiedEmail());
            $this->assertTrue(Hash::check(config('presentation.password'), $user->password));
            $this->assertStringEndsWith('@intellilearn.edu', $user->email);
        }
        $this->assertSame(0, User::where('email', 'like', '%@demo.com')->count());
        foreach (array_merge(Course::pluck('name')->all(), Lesson::pluck('title')->all(), Assessment::pluck('title')->all()) as $title) {
            $this->assertDoesNotMatchRegularExpression('/\b(TEST\s*\d*|dummy|demo|sample|asdf)\b/i', $title);
        }
        Http::assertNothingSent();
    }

    public function test_role_relationships_timing_and_future_calendar_are_valid(): void
    {
        $this->dataset();
        foreach (Course::with('instructor', 'lessons')->get() as $course) {
            $this->assertTrue($course->instructor->isInstructor());
            $this->assertCount(4, $course->lessons);
        }
        foreach (Enrollment::with('user')->get() as $enrollment) $this->assertTrue($enrollment->user->isStudent());
        foreach (User::where('role', 'student')->get() as $student) $this->assertGreaterThanOrEqual(2, Enrollment::where('user_id', $student->id)->count());
        foreach (Submission::with('assessment')->get() as $submission) {
            $this->assertTrue(Enrollment::where('user_id', $submission->user_id)->where('course_id', $submission->assessment->course_id)->exists());
            $this->assertTrue($submission->created_at->greaterThanOrEqualTo($submission->assessment->available_from));
            $this->assertTrue($submission->created_at->lessThan($submission->assessment->due_date));
            if ($submission->status === 'graded') {
                $this->assertTrue($submission->graded_at->greaterThan($submission->submitted_at));
                $this->assertSame((float) $submission->score, (float) $submission->answers()->sum('points_earned'));
                $this->assertSame(round((float) $submission->score / (float) $submission->total_points * 100, 2), (float) $submission->percentage);
            }
        }
        $this->assertSame(9, DB::table('calendar_events')->where('start_date', '>', PresentationData::date())->count());
    }

    public function test_reseeding_and_legacy_admin_entry_point_do_not_duplicate_or_randomize_data(): void
    {
        $this->dataset();
        $capture = fn () => [
            User::orderBy('id')->get()->toArray(), Course::orderBy('id')->get()->toArray(),
            Submission::orderBy('id')->get()->toArray(), Grade::orderBy('id')->get()->toArray(),
            DB::table('submission_answers')->orderBy('id')->get()->toJson(),
        ];
        $before = $capture();
        $this->dataset();
        $this->seed(AdminSeeder::class);
        $this->assertSame($before, $capture());
        $this->assertDatabaseCount('users', 13);
        $this->assertDatabaseCount('enrollments', 26);
        $this->assertDatabaseCount('announcements', 9);
        $this->assertDatabaseCount('calendar_events', 9);
    }

    public function test_seeded_grades_match_actual_grade_computation_and_performance_varies(): void
    {
        $this->dataset();
        $before = Grade::orderBy('id')->get()->toArray();
        foreach (Course::all() as $course) {
            Sanctum::actingAs($course->instructor);
            $this->postJson("/api/courses/{$course->id}/grades/compute")->assertOk();
        }
        $this->assertSame($before, Grade::orderBy('id')->get()->toArray());
        $course = Course::where('code', 'IT 321')->firstOrFail();
        $method = new \ReflectionMethod(AiController::class, 'computeStudentMetrics');
        $metrics = fn ($name) => $method->invoke(app(AiController::class), $this->user($name)->id, $course->id, 5);
        $high = $metrics('isabella.santos'); $risk = $metrics('alyssa.delacruz');
        $this->assertSame(100.0, (float) $high['quiz_avg']);
        $this->assertSame(.8, $high['submission_rate']);
        $this->assertSame(4, $high['login_count']);
        $this->assertSame(20.0, (float) $risk['quiz_avg']);
        $this->assertSame(.2, $risk['submission_rate']);
        $this->assertSame(4, $risk['missed_tasks']);
        $this->assertLessThan($high['login_count'], $risk['login_count']);
        $improving = Submission::where('user_id', $this->user('sofia.ramos')->id)->whereHas('assessment', fn ($q) => $q->where('course_id', $course->id)->where('type', 'quiz'))->orderBy('submitted_at')->pluck('percentage');
        $this->assertSame(['40.00', '80.00'], $improving->all());
    }

    public function test_pdf_references_rubrics_matching_and_manual_pending_work_are_compatible(): void
    {
        $this->dataset();
        foreach (LessonMaterial::all() as $material) {
            Storage::disk('public')->assertExists($material->file_path);
            $parsed = (new \Smalot\PdfParser\Parser)->parseContent(Storage::disk('public')->get($material->file_path))->getText();
            $this->assertSame(trim($parsed), $material->extracted_text);
            $this->assertGreaterThan(100, mb_strlen($parsed));
        }
        foreach (Assessment::with('questions')->get() as $assessment) {
            $this->assertSame((float) $assessment->total_points, (float) $assessment->questions->sum('points'));
            Sanctum::actingAs($assessment->course->instructor);
            $this->putJson("/api/courses/{$assessment->course_id}/assessments/{$assessment->id}", ['is_published' => true])->assertOk();
        }
        foreach (Question::where('type', 'essay')->get() as $question) {
            $rubric = app(RubricService::class)->snapshot($question->rubric);
            app(RubricService::class)->validate($rubric, 10);
            $reference = app(EssayReferenceService::class)->resolve($question->getAttributes(), $question->assessment->course_id, true);
            $this->assertSame($question->reference_lesson_id ? 'ready' : 'missing', $reference['state']);
        }
        $this->assertSame(3, Submission::where('status', 'submitted')->count());
        $this->assertSame(3, Submission::where('status', 'in_progress')->count());
        $this->assertSame(88, Submission::where('status', 'graded')->count());
        foreach (Submission::where('status', 'submitted')->get() as $pending) {
            $this->assertNull($pending->percentage);
            $ungraded = $pending->answers()->whereNull('points_earned')->firstOrFail();
            $this->assertNull($ungraded->ai_feedback);
            $this->assertNull($ungraded->question->reference_lesson_id);
        }
        foreach (Question::where('type', 'matching')->get() as $question) $this->assertCount(3, $question->matchingPairs);
        $sourceQuestion = Question::where('type', 'essay')->whereNotNull('reference_lesson_id')->firstOrFail();
        $snapshot = app(RubricService::class)->snapshot($sourceQuestion->rubric);
        Http::fake(['*/grade-essay' => Http::response(['status' => 'graded',
            'criteria' => array_map(fn ($c) => ['criterion_id' => $c['id'], 'awarded_points' => $c['max_points'], 'feedback' => 'Accurate source application.'], $snapshot['criteria']),
            'overall_feedback' => 'Clear source-grounded reasoning.', 'strengths' => [], 'areas_for_improvement' => [],
        ])]);
        $result = app(EssayGradingService::class)->grade($sourceQuestion, PresentationData::courses()['IT 321']['answer']);
        $this->assertSame('graded', $result['grading_status']);
        $this->assertSame(10, $result['points_earned']);
        Http::assertSent(fn ($r) => $r['reference_material'] === $result['reference_snapshot']['text']);
    }

    public function test_presentation_login_dashboards_and_quiz_submission_work(): void
    {
        $this->travelTo(PresentationData::date()->setHour(12));
        $this->dataset();
        foreach (['marisol.reyes', 'adrian.mendoza', 'isabella.santos'] as $name) {
            $account = $this->user($name);
            $this->postJson('/api/login', ['email' => $account->email, 'password' => config('presentation.password')])
                ->assertOk()->assertJsonPath('user.role', $account->role);
        }
        Sanctum::actingAs($this->user('marisol.reyes'));
        $this->getJson('/api/admin/users')->assertOk()->assertJsonCount(13, 'users');
        Sanctum::actingAs($this->user('adrian.mendoza'));
        $this->getJson('/api/instructor/stats')->assertOk()->assertJsonPath('my_courses', 2);
        $course = Course::where('code', 'IT 321')->firstOrFail();
        Sanctum::actingAs($this->user('isabella.santos'));
        $this->getJson('/api/student/stats')->assertOk();
        $this->getJson('/api/courses')->assertOk()->assertJsonCount(3, 'courses');
        $this->getJson("/api/courses/{$course->id}/lessons")->assertOk()->assertJsonCount(4, 'lessons');
        $this->getJson("/api/courses/{$course->id}/announcements")->assertOk()->assertJsonCount(3, 'announcements');
        $this->getJson('/api/calendar')->assertOk()->assertJsonCount(9, 'events');
        $assessment = $course->assessments()->orderByDesc('due_date')->firstOrFail();
        $path = "/api/courses/{$course->id}/assessments/{$assessment->id}";
        $attempt = $this->postJson($path . '/start')->assertCreated()->json('submission.id');
        $this->postJson($path . '/submit', ['submission_id' => $attempt,
            'answers' => $assessment->questions()->get()->map(fn ($q) => ['question_id' => $q->id, 'answer_text' => $q->correct_answer])->all(),
        ])->assertOk()->assertJsonPath('submission.status', 'graded')->assertJsonPath('submission.percentage', '100.00');
    }

    public function test_assessment_dates_block_early_starts_closed_resumes_and_late_submissions(): void
    {
        $this->dataset();
        $this->travelTo(PresentationData::date()->setHour(12));
        $course = Course::where('code', 'IT 321')->firstOrFail();
        $assessment = $course->assessments()->orderByDesc('due_date')->firstOrFail();
        $student = $this->user('isabella.santos');
        Sanctum::actingAs($student);
        $path = "/api/courses/{$course->id}/assessments/{$assessment->id}";
        $assessment->update(['available_from' => now()->addHour(), 'due_date' => now()->addHours(2)]);
        $this->postJson($path . '/start')->assertForbidden()->assertJsonPath('message', 'This assessment is not open yet.');
        $this->assertSame(0, $assessment->submissions()->count());
        $assessment->update(['available_from' => now(), 'due_date' => now()->addHour()]);
        $attempt = $this->postJson($path . '/start')->assertCreated()->json('submission.id');
        $this->postJson($path . '/start')->assertOk()->assertJsonPath('submission.id', $attempt);
        $this->travel(1)->hours();
        $this->postJson($path . '/start')->assertForbidden()->assertJsonPath('message', 'The deadline for this assessment has passed.');
        $question = $assessment->questions()->firstOrFail();
        $this->postJson($path . '/submit', ['submission_id' => $attempt, 'answers' => [
            ['question_id' => $question->id, 'answer_text' => $question->correct_answer],
        ]])->assertForbidden();
        $this->assertDatabaseHas('submissions', ['id' => $attempt, 'status' => 'in_progress']);
        $this->assertSame(0, Submission::findOrFail($attempt)->answers()->count());
        // A fresh attempt is also denied after closure.
        Sanctum::actingAs($this->user('sofia.ramos'));
        $this->postJson($path . '/start')->assertForbidden();
        // Assessments without date restrictions remain usable.
        $assessment->update(['available_from' => null, 'due_date' => null]);
        $this->postJson($path . '/start')->assertCreated();
    }

    public function test_assessment_details_and_local_day_scheduling_can_be_updated(): void
    {
        $this->dataset();
        $this->travelTo(\Carbon\Carbon::parse('2026-10-06 00:30:00', 'UTC'));
        $course = Course::where('code', 'IT 321')->firstOrFail();
        Sanctum::actingAs($this->user('adrian.mendoza'));
        $path = "/api/courses/{$course->id}/assessments";
        // Midnight in Manila is 16:00 UTC on the preceding day.
        $created = $this->postJson($path, ['title' => 'Local day assessment', 'type' => 'quiz', 'max_attempts' => 1,
            'available_from' => '2026-10-05T16:00:00.000Z', 'due_date' => '2026-10-06T15:59:59.000Z', 'is_published' => true,
        ])->assertCreated()->json('assessment.id');
        Sanctum::actingAs($this->user('isabella.santos'));
        $this->postJson($path . "/{$created}/start")->assertCreated();
        Sanctum::actingAs($this->user('adrian.mendoza'));
        $this->putJson($path . "/{$created}", ['title' => 'Updated title', 'description' => 'Updated instructions',
            'type' => 'individual_activity', 'topic' => 'Updated topic', 'lesson_id' => $course->lessons()->first()->id,
            'time_limit_minutes' => 40, 'max_attempts' => 3, 'score_visibility' => 'hidden', 'is_published' => false,
        ])->assertOk()->assertJsonPath('assessment.description', 'Updated instructions')
            ->assertJsonPath('assessment.time_limit_minutes', 40)->assertJsonPath('assessment.score_visibility', 'hidden');
        $this->putJson($path . "/{$created}", ['due_date' => '2026-10-05T15:00:00Z'])->assertUnprocessable();
        $otherLesson = Course::where('code', 'IT 323')->first()->lessons()->first();
        $this->putJson($path . "/{$created}", ['lesson_id' => $otherLesson->id])->assertUnprocessable();
        $this->putJson($path . "/{$created}", ['time_limit_minutes' => null, 'available_from' => null,
            'due_date' => null, 'lesson_id' => null])->assertOk()->assertJsonPath('assessment.time_limit_minutes', null)
            ->assertJsonPath('assessment.available_from', null)->assertJsonPath('assessment.due_date', null);
    }

    public function test_office_material_downloads_keep_original_names_and_enforce_access(): void
    {
        $this->dataset();
        // The harness skips the PostgreSQL-only DOCX constraint migration.
        // Reproduce its production type list using SQLite's table rebuild.
        \Illuminate\Support\Facades\Schema::table('lesson_materials', function (\Illuminate\Database\Schema\Blueprint $table) {
            $table->enum('type', ['pdf', 'video', 'ppt', 'docx', 'pptx', 'xlsx', 'link', 'other'])->default('pdf')->change();
        });
        $course = Course::where('code', 'IT 321')->firstOrFail();
        $lesson = $course->lessons()->firstOrFail();
        $path = "/api/courses/{$course->id}/lessons/{$lesson->id}/materials";
        foreach (['docx' => 'Week 1 Reading.docx', 'ppt' => 'Chapter 1 Slides.pptx'] as $type => $name) {
            Sanctum::actingAs($this->user('adrian.mendoza'));
            $material = $this->postJson($path, ['title' => 'Assigned reading', 'type' => $type,
                'file' => \Illuminate\Http\UploadedFile::fake()->create($name, 10),
            ])->assertCreated()->assertJsonPath('material.original_filename', $name)->json('material');
            Sanctum::actingAs($this->user('isabella.santos'));
            $this->get($path . "/{$material['id']}/download")->assertOk()->assertDownload($name);
            Sanctum::actingAs($this->user('lara.villanueva'));
            $this->getJson($path . "/{$material['id']}/download")->assertForbidden();
            Sanctum::actingAs($this->user('adrian.mendoza'));
            $record = LessonMaterial::findOrFail($material['id']);
            // Old uploads stored full storage URLs and did not retain their original name.
            $record->update(['original_filename' => null, 'file_path' => Storage::disk('public')->url($record->file_path)]);
            $extension = pathinfo($name, PATHINFO_EXTENSION);
            $this->get($path . "/{$record->id}/download")->assertOk()->assertDownload('Assigned reading.' . $extension);
            Storage::disk('public')->delete($material['file_path']);
            $this->getJson($path . "/{$record->id}/download")->assertNotFound();
        }
    }

    public function test_material_context_and_filtered_calendar_respect_course_access(): void
    {
        $this->dataset();
        $course = Course::where('code', 'IT 323')->firstOrFail();
        $material = $course->lessons()->firstOrFail()->materials()->firstOrFail();
        foreach (['miguel.navarro', 'adrian.mendoza'] as $name) {
            Sanctum::actingAs($this->user($name));
            $this->getJson("/api/ai/materials/{$material->id}/context")->assertForbidden();
            $this->getJson("/api/calendar?course_id={$course->id}")->assertOk()->assertJsonCount(0, 'events');
        }
        foreach (['isabella.santos', 'lara.villanueva', 'marisol.reyes'] as $name) {
            Sanctum::actingAs($this->user($name));
            $this->getJson("/api/ai/materials/{$material->id}/context")->assertOk()->assertJsonPath('has_text', true);
            $this->getJson("/api/calendar?course_id={$course->id}")->assertOk()->assertJsonCount(3, 'events');
        }
        $material->lesson->update(['is_published' => false]);
        Sanctum::actingAs($this->user('isabella.santos'));
        $this->getJson("/api/ai/materials/{$material->id}/context")->assertForbidden();
    }

    public function test_seeding_refuses_production_and_preserves_unrelated_accounts(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        try { $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])->run(); $this->fail('Production seeding must be refused.'); }
        catch (\RuntimeException $e) { $this->assertStringContainsString('local/testing', $e->getMessage()); }
        $this->assertDatabaseCount('users', 0);
        $this->app->detectEnvironment(fn () => 'testing');
        $unrelated = User::factory()->create(['email' => 'existing@example.test']);
        try { $this->seed(DatabaseSeeder::class); $this->fail('Unrelated data must be preserved.'); }
        catch (\RuntimeException $e) { $this->assertStringContainsString('dedicated empty', $e->getMessage()); }
        $this->assertDatabaseCount('users', 1);
        $this->assertNotNull($unrelated->fresh());
    }
}
