<?php

namespace App\Services;

use App\Models\Lesson;
use App\Models\LessonMaterial;
use Illuminate\Validation\ValidationException;

class EssayReferenceService
{
    public const MAX_LENGTH = 24000;

    public function resolve(array $question, int $courseId): array
    {
        $text = trim($question['reference_text'] ?? '');
        $materials = [];
        $lessonId = $question['reference_lesson_id'] ?? null;
        if ($lessonId && !Lesson::where('id', $lessonId)->where('course_id', $courseId)->exists()) {
            throw ValidationException::withMessages(['reference_lesson_id' => 'Select a lesson belonging to this course.']);
        }
        if ($text === '' && $lessonId) {
            $rows = LessonMaterial::where('lesson_id', $lessonId)->whereNotNull('extracted_text')->orderBy('order')->get();
            $text = $rows->pluck('extracted_text')->implode("\n\n---\n\n");
            $materials = $rows->map(fn ($m) => ['id' => $m->id, 'title' => $m->title, 'file_path' => $m->file_path])->all();
        }
        // Old failed uploads returned explanatory placeholders, not document content.
        if (preg_match('/^(PDF|DOCX) file uploaded:/', trim($text))) $text = '';
        $text = str_replace("\0", '', trim($text));
        return [
            'text' => mb_substr($text, 0, self::MAX_LENGTH),
            'truncated' => mb_strlen($text) > self::MAX_LENGTH,
            'lesson_id' => $lessonId, 'materials' => $materials,
            'file' => $question['reference_file'] ?? null,
            'sha256' => hash('sha256', mb_substr($text, 0, self::MAX_LENGTH)),
        ];
    }
}
