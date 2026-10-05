<?php

namespace App\Services;

use App\Models\Lesson;
use App\Models\LessonMaterial;
use Illuminate\Validation\ValidationException;

class EssayReferenceService
{
    public const MAX_LENGTH = 24000;

    public function resolve(array $question, int $courseId, bool $forGrading = false): array
    {
        $text = trim($question['reference_text'] ?? '');
        $hadText = $text !== '';
        $materials = [];
        $lessonId = $question['reference_lesson_id'] ?? null;
        $state = 'missing';
        $file = $question['reference_file'] ?? null;
        if ($lessonId && !Lesson::where('id', $lessonId)->where('course_id', $courseId)->exists()) {
            if (!$forGrading) throw ValidationException::withMessages(['reference_lesson_id' => 'Select a lesson belonging to this course.']);
            $text = '';
            $state = 'unavailable';
        }
        if ($text === '' && $lessonId && $state !== 'unavailable') {
            $rows = LessonMaterial::where('lesson_id', $lessonId)->orderBy('order')->get();
            $state = $rows->isEmpty() ? 'unavailable' : 'extraction_failed';
            $text = $rows->pluck('extracted_text')->filter(fn ($value) => trim($value ?? '') !== '')->implode("\n\n---\n\n");
            $materials = $rows->map(fn ($m) => ['id' => $m->id, 'title' => $m->title, 'file_path' => $m->file_path])->all();
        }
        // Old failed uploads returned explanatory placeholders, not document content.
        if (preg_match('/^(PDF|DOCX) file uploaded:/', trim($text))) $text = '';
        $text = str_replace("\0", '', trim($text));
        if ($text !== '') $state = 'ready';
        elseif (($file || $hadText) && $state !== 'unavailable') $state = 'extraction_failed';
        return [
            'state' => $state,
            'type' => $file ? 'uploaded_file' : ($lessonId ? 'lesson' : ($text !== '' ? 'text' : 'none')),
            'text' => mb_substr($text, 0, self::MAX_LENGTH),
            'truncated' => mb_strlen($text) > self::MAX_LENGTH,
            'lesson_id' => $lessonId, 'materials' => $materials,
            'file' => $question['reference_file'] ?? null,
            'sha256' => hash('sha256', mb_substr($text, 0, self::MAX_LENGTH)),
        ];
    }
}
