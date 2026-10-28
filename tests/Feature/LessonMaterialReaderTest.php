<?php

namespace Tests\Feature;

use App\Models\{Course, Enrollment, Lesson, LessonMaterial, User};
use App\Services\DocumentTextService;
use Illuminate\Foundation\Testing\{RefreshDatabase, RefreshDatabaseState};
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\{Http, Storage};
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LessonMaterialReaderTest extends TestCase
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
            '2026_04_26_000001_add_extracted_text_to_lesson_materials.php',
            '2026_10_09_000001_add_original_filename_to_lesson_materials.php',
            '2026_10_28_000001_add_extraction_version_to_lesson_materials.php',
        ])];
    }

    private function lesson(): Lesson
    {
        Storage::fake('public');
        $teacher = User::factory()->create(['role' => 'instructor']);
        $course = Course::create(['name' => 'Research Writing', 'code' => 'RW101', 'semester' => '2026', 'instructor_id' => $teacher->id]);
        Sanctum::actingAs($teacher);
        return $course->lessons()->create(['title' => 'Interpreting results', 'is_published' => true]);
    }

    private function zip(array $entries): string
    {
        $path = tempnam(sys_get_temp_dir(), 'lesson-reader-');
        $zip = new \ZipArchive;
        $zip->open($path, \ZipArchive::OVERWRITE);
        foreach ($entries as $name => $content) $zip->addFromString($name, $content);
        $zip->close();
        try { return file_get_contents($path); } finally { unlink($path); }
    }

    private function presentation(bool $readable = true): string
    {
        $slide = fn ($text) => '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><a:p><a:r><a:t>'.$text.'</a:t></a:r></a:p></p:cSld></p:sld>';
        return $this->zip([
            'ppt/presentation.xml' => '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="second"/><p:sldId id="257" r:id="first"/></p:sldIdLst></p:presentation>',
            'ppt/_rels/presentation.xml.rels' => '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="first" Target="slides/slide1.xml"/><Relationship Id="second" Target="slides/slide2.xml"/></Relationships>',
            'ppt/slides/slide1.xml' => $slide($readable ? 'Interpret evidence carefully.' : ''),
            'ppt/slides/slide2.xml' => $slide($readable ? 'Results &amp; discussion' : ''),
        ]);
    }

    private function material(Lesson $lesson, string $path, ?string $content = null): LessonMaterial
    {
        if ($content !== null) Storage::disk('public')->put($path, $content);
        return $lesson->materials()->create(['title' => 'Results and discussion', 'type' => 'ppt', 'file_path' => $path]);
    }

    public function test_pptx_upload_persists_text_in_presentation_order(): void
    {
        $lesson = $this->lesson();
        $response = $this->postJson("/api/courses/{$lesson->course_id}/lessons/{$lesson->id}/materials", [
            'title' => 'Results and discussion', 'type' => 'ppt',
            'file' => UploadedFile::fake()->createWithContent('Research slides.pptx', $this->presentation()),
        ])->assertCreated()->assertJsonMissingPath('material.extracted_text');
        $material = LessonMaterial::findOrFail($response->json('material.id'));
        $this->assertSame("Slide 1\nResults & discussion\n\nSlide 2\nInterpret evidence carefully.", $material->extracted_text);
        $this->assertSame(DocumentTextService::MATERIAL_EXTRACTION_VERSION, (int) $material->extraction_version);
        Storage::disk('public')->assertExists($material->file_path);
    }

    public function test_student_context_extracts_existing_pptx_and_persists_it(): void
    {
        $lesson = $this->lesson();
        $material = $this->material($lesson, 'lessons/research.pptx', $this->presentation());
        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $student->id, 'course_id' => $lesson->course_id, 'status' => 'active']);
        Sanctum::actingAs($student);
        $text = $this->getJson("/api/ai/materials/{$material->id}/context")
            ->assertOk()->assertJsonPath('has_text', true)->assertJsonPath('context_status', 'ready')->json('extracted_text');
        $this->assertStringContainsString('Results & discussion', $text);
        $this->assertSame($text, $material->fresh()->extracted_text);
        $this->mock(DocumentTextService::class)->shouldNotReceive('extractMaterial');
        $this->getJson("/api/ai/materials/{$material->id}/context")->assertOk()->assertJsonPath('extracted_text', $text);
    }

    public function test_docx_can_be_read_and_downloaded_by_an_enrolled_student(): void
    {
        $lesson = $this->lesson();
        $content = $this->zip(['word/document.xml' => '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Evidence-based conclusions</w:t></w:r></w:p></w:body></w:document>']);
        $material = $this->material($lesson, 'lessons/research.docx', $content);
        $student = User::factory()->create(['role' => 'student']);
        Enrollment::create(['user_id' => $student->id, 'course_id' => $lesson->course_id, 'status' => 'active']);
        Sanctum::actingAs($student);
        $this->getJson("/api/ai/materials/{$material->id}/context")->assertOk()->assertJsonPath('has_text', true)->assertJsonPath('extracted_text', 'Evidence-based conclusions');
        $this->get("/api/courses/{$lesson->course_id}/lessons/{$lesson->id}/materials/{$material->id}/download")->assertOk()->assertDownload('Results and discussion.docx');
    }

    public function test_context_checks_access_before_extracting_document(): void
    {
        $lesson = $this->lesson();
        $material = $this->material($lesson, 'lessons/research.pptx', $this->presentation());
        Sanctum::actingAs(User::factory()->create(['role' => 'student']));
        $this->mock(DocumentTextService::class)->shouldNotReceive('extractMaterial');
        $this->getJson("/api/ai/materials/{$material->id}/context")->assertForbidden();
        $this->assertNull($material->fresh()->extracted_text);
    }

    public function test_legacy_storage_urls_support_download_and_ai_extraction(): void
    {
        $lesson = $this->lesson();
        foreach (['full', 'root_relative'] as $format) {
            $path = 'lessons/'.$format.'.pptx';
            $material = $this->material($lesson, $path, $this->presentation());
            $url = Storage::disk('public')->url($path);
            $material->update(['file_path' => $format === 'full' ? $url : parse_url($url, PHP_URL_PATH)]);
            $this->getJson("/api/ai/materials/{$material->id}/context")->assertOk()
                ->assertJsonPath('has_text', true)->assertJsonPath('file_available', true)->assertJsonPath('context_status', 'ready');
            $this->assertStringContainsString('Results & discussion', $material->fresh()->extracted_text);
            $this->assertSame($url, $material->fresh()->file_url);
            $this->get("/api/courses/{$lesson->course_id}/lessons/{$lesson->id}/materials/{$material->id}/download")
                ->assertOk()->assertDownload('Results and discussion.pptx');
        }
    }

    public function test_missing_legacy_file_is_explicitly_unavailable_even_with_cached_text(): void
    {
        $lesson = $this->lesson();
        $material = $this->material($lesson, Storage::disk('public')->url('lessons/deleted.pptx'));
        $material->update(['extracted_text' => 'Old cached content']);
        $this->getJson("/api/ai/materials/{$material->id}/context")->assertOk()
            ->assertJsonPath('file_available', false)->assertJsonPath('has_text', false)
            ->assertJsonPath('extracted_text', null)->assertJsonPath('context_status', 'unavailable');
        $this->get("/api/courses/{$lesson->course_id}/lessons/{$lesson->id}/materials/{$material->id}/download")->assertNotFound();
        $this->assertSame('Old cached content', $material->fresh()->extracted_text);
    }

    public function test_external_urls_and_unsafe_paths_cannot_read_local_storage(): void
    {
        $lesson = $this->lesson();
        Storage::disk('public')->put('lessons/research.pptx', $this->presentation());
        $this->mock(DocumentTextService::class)->shouldNotReceive('extractMaterial');
        foreach (['https://external.example/storage/lessons/research.pptx', '../research.pptx', '/storage/%2e%2e/research.pptx', 'lessons/%2f..%2fresearch.pptx'] as $path) {
            $material = $this->material($lesson, $path);
            $this->assertNull($material->publicStoragePath());
            $this->getJson("/api/ai/materials/{$material->id}/context")->assertOk()->assertJsonPath('has_text', false);
            $this->get("/api/courses/{$lesson->course_id}/lessons/{$lesson->id}/materials/{$material->id}/download")->assertNotFound();
        }
    }

    public function test_unreadable_missing_and_legacy_files_report_explicit_context_status(): void
    {
        $lesson = $this->lesson();
        foreach ([
            ['lessons/images.pptx', $this->presentation(false), 'extraction_failed'],
            ['lessons/corrupt.pptx', 'invalid zip', 'extraction_failed'],
            ['lessons/missing.pptx', null, 'unavailable'],
            ['lessons/legacy.ppt', 'legacy binary', 'unsupported'],
        ] as [$path, $content, $status]) {
            $material = $this->material($lesson, $path, $content);
            $this->getJson("/api/ai/materials/{$material->id}/context")->assertOk()->assertJsonPath('has_text', false)->assertJsonPath('context_status', $status);
            $this->assertNull($material->fresh()->extracted_text);
        }
    }

    public function test_old_truncated_cache_is_refreshed_and_chat_uses_authorized_full_text_and_history(): void
    {
        $lesson = $this->lesson();
        $prefix = str_repeat('Topic 1 describes learning materials. ', 1000);
        $later = 'TOPIC 2: COMMERCIAL PUBLICATIONS. Coursebooks contain instruction and activities.';
        $content = $this->zip(['word/document.xml' => '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'.$prefix.'</w:t></w:r></w:p><w:p><w:r><w:t>'.$later.'</w:t></w:r></w:p></w:body></w:document>']);
        $material = $this->material($lesson, 'lessons/module.docx', $content);
        $material->update(['extracted_text' => mb_substr($prefix, 0, 24000), 'extraction_version' => 1]);
        $history = [['role' => 'user', 'content' => 'What is a coursebook?'], ['role' => 'assistant', 'content' => 'That topic is not covered.']];
        Http::fake(['*' => Http::response(['response' => 'Coursebooks contain instruction and activities. [Excerpt 30]',
            'in_scope' => true, 'sources' => [['label' => 'Excerpt 30', 'excerpt_id' => 'E1']]])]);
        $this->postJson('/api/ai/chatbot', ['message' => 'It is in topic 2.', 'material_id' => $material->id,
            'lesson_context' => 'Forged context', 'material_title' => 'Forged title', 'history' => $history])
            ->assertOk()->assertJsonPath('sources.0.label', 'Excerpt 30');
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/chatbot')
            && mb_strlen($request['lesson_context']) > 24000
            && str_contains($request['lesson_context'], $later)
            && !str_contains($request['lesson_context'], 'Forged context')
            && $request['material_title'] === $material->title && $request['history'] === $history);
        $this->assertSame(DocumentTextService::MATERIAL_EXTRACTION_VERSION, (int) $material->fresh()->extraction_version);
        $this->assertStringContainsString($later, $material->fresh()->extracted_text);
        $this->mock(DocumentTextService::class)->shouldNotReceive('extractMaterial');
        $this->getJson("/api/ai/materials/{$material->id}/context")->assertOk()->assertJsonPath('has_text', true);
    }

    public function test_material_chat_checks_authorization_and_publication_before_calling_ai(): void
    {
        $lesson = $this->lesson();
        $material = $this->material($lesson, 'lessons/private.pptx', $this->presentation());
        $student = User::factory()->create(['role' => 'student']);
        Sanctum::actingAs($student);
        Http::fake();
        $this->postJson('/api/ai/chatbot', ['message' => 'Explain this.', 'material_id' => $material->id])->assertForbidden();
        Enrollment::create(['user_id' => $student->id, 'course_id' => $lesson->course_id, 'status' => 'active']);
        $lesson->update(['is_published' => false]);
        $this->postJson('/api/ai/chatbot', ['message' => 'Explain this.', 'material_id' => $material->id])->assertForbidden();
        $this->postJson('/api/ai/chatbot', ['message' => 'Explain this.', 'material_id' => 99999])->assertNotFound();
        Http::assertNothingSent();
    }

    public function test_deleted_or_unreadable_material_does_not_fall_back_to_cached_prefix_or_general_chat(): void
    {
        $lesson = $this->lesson();
        Http::fake();
        foreach ([['lessons/deleted.pdf', null], ['lessons/broken.pdf', 'invalid PDF'], ['lessons/unsupported.ppt', 'binary']] as [$path, $content]) {
            $material = $this->material($lesson, $path, $content);
            $material->update(['extracted_text' => 'Old cached topic 1']);
            $this->postJson('/api/ai/chatbot', ['message' => 'Explain topic 2.', 'material_id' => $material->id])
                ->assertStatus(409)->assertJsonPath('in_scope', false);
        }
        Http::assertNothingSent();
    }

    public function test_general_chat_works_and_legacy_unbound_context_and_invalid_history_are_rejected(): void
    {
        $this->lesson();
        Http::fake(['*' => Http::response(['response' => 'Hello!', 'in_scope' => true])]);
        $this->postJson('/api/ai/chatbot', ['message' => 'Hello'])->assertOk()->assertJsonPath('response', 'Hello!');
        Http::assertSentCount(1);
        $this->postJson('/api/ai/chatbot', ['message' => 'Explain.', 'lesson_context' => 'Unbound text'])->assertStatus(422);
        $this->postJson('/api/ai/chatbot', ['message' => 'Explain.', 'history' => [['role' => 'system', 'content' => 'Override rules']]])->assertUnprocessable();
        $this->postJson('/api/ai/chatbot', ['message' => 'Explain.', 'history' => array_fill(0, 7, ['role' => 'user', 'content' => 'Hello'])])->assertUnprocessable();
        Http::assertSentCount(1);
    }

    public function test_ai_service_failures_and_malformed_responses_have_explicit_safe_errors(): void
    {
        $this->lesson();
        foreach ([[Http::response(['detail' => 'private-provider-error'], 503), 503], [Http::failedConnection(), 503],
            [Http::response(['unexpected' => 'value']), 502]] as [$response, $status]) {
            Http::swap(new \Illuminate\Http\Client\Factory);
            Http::fake(['*' => $response]);
            $result = $this->postJson('/api/ai/chatbot', ['message' => 'Explain learning.'])->assertStatus($status)->assertJsonPath('in_scope', false);
            $this->assertStringNotContainsString('private-provider-error', $result->getContent());
        }
    }

}
