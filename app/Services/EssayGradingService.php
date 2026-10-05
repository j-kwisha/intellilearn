<?php

namespace App\Services;

use App\Models\Question;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EssayGradingService
{
    public function grade(Question $question, ?string $answer): array
    {
        $pending = [
            'answer_text' => $answer, 'points_earned' => null, 'is_correct' => null,
            'ai_feedback' => null, 'criterion_scores' => null, 'ai_evaluation' => null,
            'rubric_snapshot' => null, 'reference_snapshot' => null,
        ];
        try {
            $reference = app(EssayReferenceService::class)->resolve([
                'reference_text' => $question->reference_text,
                'reference_lesson_id' => $question->reference_lesson_id,
                'reference_file' => $question->reference_file,
            ], $question->assessment->course_id);
            $rubric = $question->rubric()->with('criteria.levels')->first();
            if (!$rubric) return $pending;
            $service = app(RubricService::class);
            $snapshot = $service->snapshot($rubric);
            $service->validate($snapshot, (float) $question->points);
            $pending['rubric_snapshot'] = $snapshot;
            $pending['reference_snapshot'] = $reference;
            if (trim($reference['text']) === '') return $pending;
            if (!trim($answer ?? '')) {
                $result = [
                    'criteria' => array_map(fn ($c) => [
                        'criterion_id' => $c['id'], 'awarded_points' => 0, 'feedback' => 'No answer was provided.',
                    ], $snapshot['criteria']),
                    'overall_feedback' => 'No answer was provided.', 'strengths' => [], 'areas_for_improvement' => [],
                ];
                $model = null;
            } else {
                $result = Http::timeout(60)->post(rtrim(env('AI_SERVICE_URL', 'http://127.0.0.1:8001'), '/') . '/grade-essay', [
                    'question' => $question->question_text,
                    'instructions' => $question->assessment->description ?? '',
                    'answer' => $answer, 'max_points' => (float) $question->points,
                    'reference_material' => $reference['text'], 'rubric' => $snapshot,
                ])->throw()->json();
                if (!is_array($result) || ($result['status'] ?? '') !== 'graded') throw new \RuntimeException('AI grading did not succeed');
                $model = $result['ai_model'] ?? null;
            }
            // Never trust the model's total, percentage, criterion names or maxima.
            $evaluation = $service->evaluation($result, $snapshot);
            $evaluation['ai_model'] = $model;
            $evaluation['graded_at'] = now()->toIso8601String();
            return array_merge($pending, [
                'points_earned' => $evaluation['total_score'],
                'is_correct' => $evaluation['total_score'] >= ((float) $question->points * 0.5),
                'ai_feedback' => $evaluation['overall_feedback'],
                'criterion_scores' => json_encode(array_column($evaluation['criteria'], 'awarded_points', 'criterion_id')),
                'ai_evaluation' => $evaluation,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Essay grading pending instructor review', ['question_id' => $question->id, 'error' => $e->getMessage()]);
            return $pending;
        }
    }
}
