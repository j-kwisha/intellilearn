<?php

namespace Tests\Feature;

use App\Models\{Course, Enrollment, Lesson, LessonMaterial, User};
use App\Services\DocumentTextService;
use Illuminate\Foundation\Testing\{RefreshDatabase, RefreshDatabaseState};
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
        $this->mock(DocumentTextService::class)->shouldNotReceive('extract');
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
        $this->mock(DocumentTextService::class)->shouldNotReceive('extract');
        $this->getJson("/api/ai/materials/{$material->id}/context")->assertForbidden();
        $this->assertNull($material->fresh()->extracted_text);
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
}
