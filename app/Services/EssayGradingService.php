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
            'grading_status' => 'pending', 'grading_error_code' => null,
        ];
        $phase = 'reference_resolution';
        $diagnostics = ['question_id' => $question->id];
        try {
            $reference = app(EssayReferenceService::class)->resolve([
                'reference_text' => $question->reference_text,
                'reference_lesson_id' => $question->reference_lesson_id,
                'reference_file' => $question->reference_file,
            ], $question->assessment->course_id, true);
            $pending['reference_snapshot'] = $reference;
            $diagnostics += [
                'reference_type' => $reference['type'], 'reference_state' => $reference['state'],
                'reference_lesson_id' => $reference['lesson_id'],
                'reference_file_path' => $reference['file']['path'] ?? null,
                'reference_material_ids' => array_column($reference['materials'], 'id'),
                'reference_material_paths' => array_column($reference['materials'], 'file_path'),
                'extracted_text_exists' => trim($reference['text']) !== '',
                'extracted_text_length' => mb_strlen($reference['text']),
            ];
            $rubric = $question->rubric()->with('criteria.levels')->first();
            $diagnostics += ['rubric_id' => $rubric?->id, 'rubric_criteria_count' => $rubric?->criteria->count() ?? 0];
            Log::info('Essay grading prerequisites', $diagnostics);
            $phase = 'rubric_configuration';
            if (!$rubric) throw new \RuntimeException('Missing saved rubric');
            $service = app(RubricService::class);
            $snapshot = $service->snapshot($rubric);
            $service->validate($snapshot, (float) $question->points);
            $pending['rubric_snapshot'] = $snapshot;
            $pending['reference_snapshot'] = $reference;
            if (in_array($reference['state'], ['missing', 'unavailable'], true)) return $pending;
            $phase = 'reference_extraction';
            if ($reference['state'] !== 'ready') throw new \RuntimeException('Reference text extraction failed');
            if (!trim($answer ?? '')) {
                $result = [
                    'criteria' => array_map(fn ($c) => [
                        'criterion_id' => $c['id'], 'awarded_points' => 0, 'feedback' => 'No answer was provided.',
                    ], $snapshot['criteria']),
                    'overall_feedback' => 'No answer was provided.', 'strengths' => [], 'areas_for_improvement' => [],
                ];
                $model = null;
            } else {
                $phase = 'ai_service';
                $response = Http::timeout(60)->post(rtrim(env('AI_SERVICE_URL', 'http://127.0.0.1:8001'), '/') . '/grade-essay', [
                    'question' => $question->question_text,
                    'instructions' => $question->assessment->description ?? '',
                    'answer' => $answer, 'max_points' => (float) $question->points,
                    'reference_material' => $reference['text'], 'rubric' => $snapshot,
                ]);
                $diagnostics['http_status'] = $response->status();
                Log::info('Essay grading HTTP response', $diagnostics);
                $response->throw();
                $phase = 'ai_response_validation';
                $result = $response->json();
                if (!is_array($result) || ($result['status'] ?? '') !== 'graded') throw new \RuntimeException('AI grading did not succeed');
                $model = $result['ai_model'] ?? null;
            }
            // Never trust the model's total, percentage, criterion names or maxima.
            $phase = 'ai_response_validation';
            $evaluation = $service->evaluation($result, $snapshot);
            Log::info('Essay grading validated', $diagnostics + ['response_valid' => true]);
            $evaluation['ai_model'] = $model;
            $evaluation['graded_at'] = now()->toIso8601String();
            return array_merge($pending, [
                'points_earned' => $evaluation['total_score'],
                'is_correct' => $evaluation['total_score'] >= ((float) $question->points * 0.5),
                'ai_feedback' => $evaluation['overall_feedback'],
                'criterion_scores' => json_encode(array_column($evaluation['criteria'], 'awarded_points', 'criterion_id')),
                'ai_evaluation' => $evaluation,
                'grading_status' => 'graded',
            ]);
        } catch (\Throwable $e) {
            Log::warning('Essay grading error', $diagnostics + ['error_code' => $phase, 'exception_type' => get_class($e), 'response_valid' => false]);
            return array_merge($pending, ['grading_status' => 'grading_error', 'grading_error_code' => $phase]);
        }
    }
}
