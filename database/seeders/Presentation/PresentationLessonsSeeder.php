<?php
namespace Database\Seeders\Presentation;
use App\Models\{Course, Lesson, LessonMaterial};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use App\Services\DocumentTextService;

class PresentationLessonsSeeder extends Seeder
{
    public function run(): void
    {
        PresentationData::assertSafe();
        foreach (PresentationData::courses() as $code => $data) {
            $course = Course::where('code', $code)->firstOrFail();
            foreach ($data['lessons'] as $order => [$title, $topic, $text]) {
                $lesson = Lesson::updateOrCreate(['course_id' => $course->id, 'order' => $order], [
                    'title' => $title, 'topic' => $topic, 'description' => $text, 'is_published' => true,
                    'available_from' => PresentationData::date()->subDays(30 - $order * 5),
                    'created_at' => PresentationData::date()->subDays(32 - $order * 5),
                ]);
                $path = 'presentation/lessons/' . strtolower(str_replace(' ', '-', $code)) . '-' . $order . '.pdf';
                Storage::disk('public')->put($path, self::pdf($title, $text));
                $extracted = app(DocumentTextService::class)->extract(new UploadedFile(Storage::disk('public')->path($path), basename($path), 'application/pdf', null, true));
                LessonMaterial::updateOrCreate(['lesson_id' => $lesson->id, 'order' => 0], [
                    'title' => $title . ' — Instructor Notes', 'type' => 'pdf', 'file_path' => $path, 'extracted_text' => $extracted,
                    'created_at' => $lesson->created_at,
                ]);
            }
        }
    }

    private static function pdf(string $title, string $text): string
    {
        $stream = "BT /F1 11 Tf 16 TL 50 742 Td\n";
        foreach (explode("\n", wordwrap($title . "\n\n" . $text, 85, "\n", true)) as $line) {
            $stream .= '(' . str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line) . ") Tj T*\n";
        }
        $stream .= 'ET';
        $objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Length ' . strlen($stream) . " >>\nstream\n$stream\nendstream"];
        $pdf = "%PDF-1.4\n"; $offsets = [];
        foreach ($objects as $index => $object) { $offsets[] = strlen($pdf); $pdf .= ($index + 1) . " 0 obj\n$object\nendobj\n"; }
        $xref = strlen($pdf); $pdf .= "xref\n0 6\n0000000000 65535 f \n";
        foreach ($offsets as $offset) $pdf .= sprintf("%010d 00000 n \n", $offset);
        return $pdf . "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n$xref\n%%EOF";
    }
}
