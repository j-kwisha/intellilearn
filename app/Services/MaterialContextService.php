<?php

namespace App\Services;

use App\Models\{Enrollment, LessonMaterial, User};
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\{Log, Storage};

class MaterialContextService
{
    public function authorize(User $user, LessonMaterial $material): void
    {
        $lesson = $material->lesson;
        $course = $lesson?->course;
        abort_unless($course, 404);
        $allowed = $user->isAdmin()
            || ($user->isInstructor() && $course->instructor_id === $user->id)
            || ($user->isStudent() && $lesson->is_published
                && Enrollment::where('user_id', $user->id)->where('course_id', $course->id)->where('status', 'active')->exists());
        abort_unless($allowed, 403, 'You do not have access to this material.');
    }

    /** Upgrade old truncated extractions once; never serve a stale prefix as a full module. */
    public function resolve(LessonMaterial $material): array
    {
        $path = $material->publicStoragePath();
        $disk = Storage::disk('public');
        $available = $path !== null ? $disk->exists($path) : null;
        $ready = $available !== false
            && (int) $material->extraction_version === DocumentTextService::MATERIAL_EXTRACTION_VERSION
            && trim($material->extracted_text ?? '') !== '';
        $status = $ready ? 'ready' : 'unavailable';
        if (!$ready && $path !== null && $available) {
            $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            if (!in_array($extension, ['pdf', 'docx', 'pptx', 'txt'], true)) {
                $status = 'unsupported';
            } else {
                try {
                    $file = new UploadedFile($disk->path($path), basename($path), null, null, true);
                    $text = app(DocumentTextService::class)->extractMaterial($file);
                    $material->update(['extracted_text' => $text, 'extraction_version' => DocumentTextService::MATERIAL_EXTRACTION_VERSION]);
                    $status = 'ready';
                    Log::info('Full module text extracted', ['material_id' => $material->id, 'extension' => $extension,
                        'text_length' => mb_strlen($text), 'extraction_version' => DocumentTextService::MATERIAL_EXTRACTION_VERSION]);
                } catch (\Throwable $error) {
                    $status = 'extraction_failed';
                    Log::warning('Lesson material text extraction failed', ['material_id' => $material->id,
                        'extension' => $extension, 'exception_type' => get_class($error)]);
                }
            }
        }
        return [
            'material_id' => $material->id, 'title' => $material->title,
            'extracted_text' => $status === 'ready' ? $material->extracted_text : null,
            'has_text' => $status === 'ready', 'context_status' => $status, 'file_available' => $available,
        ];
    }
}
