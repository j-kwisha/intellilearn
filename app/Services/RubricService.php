<?php

namespace App\Services;

use App\Models\Question;
use App\Models\Rubric;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class RubricService
{
    public function validate(array $data, float $points): array
    {
        $data = Validator::make($data, [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'source' => ['required', 'in:manual,ai_generated'],
            'total_points' => ['required', 'numeric', 'min:0.01', 'max:999.99', 'decimal:0,2'],
            'criteria' => ['required', 'array', 'min:1', 'max:20'],
            'criteria.*.criterion' => ['required', 'string', 'max:255', 'distinct:ignore_case'],
            'criteria.*.description' => ['required', 'string', 'max:4000'],
            'criteria.*.max_points' => ['required', 'numeric', 'min:0.01', 'max:999.99', 'decimal:0,2'],
            'criteria.*.levels' => ['required', 'array', 'min:1', 'max:10'],
            'criteria.*.levels.*.label' => ['required', 'string', 'max:255'],
            'criteria.*.levels.*.description' => ['required', 'string', 'max:4000'],
            'criteria.*.levels.*.min_points' => ['required', 'numeric', 'min:0', 'decimal:0,2'],
            'criteria.*.levels.*.max_points' => ['required', 'numeric', 'min:0', 'decimal:0,2'],
        ])->validate();
        $total = array_sum(array_map(fn ($c) => (int) round($c['max_points'] * 100), $data['criteria']));
        if ($total !== (int) round($points * 100) || $total !== (int) round($data['total_points'] * 100)) {
            throw ValidationException::withMessages(['rubric' => 'Criterion points and rubric total must equal the question points.']);
        }
        foreach ($data['criteria'] as $criterion) {
            $levels = $criterion['levels'];
            usort($levels, fn ($a, $b) => $a['min_points'] <=> $b['min_points']);
            $previous = -1;
            foreach ($levels as $level) {
                if ($level['max_points'] < $level['min_points'] || $level['max_points'] > $criterion['max_points'] || $level['min_points'] < $previous) {
                    throw ValidationException::withMessages(['rubric' => 'Performance levels must have valid, non-overlapping ranges within their criterion points.']);
                }
                $previous = (float) $level['max_points'];
            }
        }
        return $data;
    }

    public function save(Question $question, array $data, int $userId): Rubric
    {
        $data = $this->validate($data, (float) $question->points);
        return DB::transaction(function () use ($question, $data, $userId) {
            $rubric = $question->rubric()->updateOrCreate([], [
                'title' => $data['title'], 'description' => $data['description'] ?? null,
                'total_points' => $data['total_points'], 'source' => $data['source'], 'created_by' => $userId,
            ]);
            $rubric->criteria()->delete();
            foreach ($data['criteria'] as $index => $criterion) {
                $saved = $rubric->criteria()->create([
                    'criterion' => $criterion['criterion'], 'description' => $criterion['description'],
                    'max_points' => $criterion['max_points'], 'order' => $index,
                ]);
                foreach ($criterion['levels'] as $order => $level) {
                    $saved->levels()->create([...$level, 'order' => $order]);
                }
            }
            return $rubric->load('criteria.levels');
        });
    }

    public function snapshot(Rubric $rubric): array
    {
        $rubric->loadMissing('criteria.levels');
        return [
            'id' => $rubric->id, 'title' => $rubric->title, 'source' => $rubric->source,
            'total_points' => (float) $rubric->total_points, 'created_by' => $rubric->created_by,
            'saved_at' => $rubric->updated_at?->toIso8601String(),
            'criteria' => $rubric->criteria->map(fn ($c) => [
                'id' => $c->id, 'criterion' => $c->criterion, 'description' => $c->description,
                'max_points' => (float) $c->max_points,
                'levels' => $c->levels->map(fn ($l) => [
                    'label' => $l->label, 'description' => $l->description,
                    'min_points' => (float) $l->min_points, 'max_points' => (float) $l->max_points,
                ])->all(),
            ])->all(),
        ];
    }

    public function evaluation(array $response, array $rubric): array
    {
        $data = Validator::make($response, [
            'criteria' => ['required', 'array'],
            'criteria.*.criterion_id' => ['required', 'integer', 'distinct'],
            'criteria.*.awarded_points' => ['required', 'numeric', 'min:0', 'decimal:0,2'],
            'criteria.*.feedback' => ['required', 'string', 'max:8000'],
            'overall_feedback' => ['required', 'string', 'max:8000'],
            'strengths' => ['present', 'array', 'max:20'], 'strengths.*' => ['string', 'max:2000'],
            'areas_for_improvement' => ['present', 'array', 'max:20'], 'areas_for_improvement.*' => ['string', 'max:2000'],
        ])->validate();
        if (count($data['criteria']) !== count($rubric['criteria'])) {
            throw ValidationException::withMessages(['criteria' => 'AI must evaluate every saved criterion exactly once.']);
        }
        $provided = collect($data['criteria'])->keyBy('criterion_id');
        $rows = [];
        $totalCents = 0;
        foreach ($rubric['criteria'] as $criterion) {
            $row = $provided->get($criterion['id']);
            if (!$row || !is_finite((float) $row['awarded_points']) || $row['awarded_points'] > $criterion['max_points']) {
                throw ValidationException::withMessages(['criteria' => 'Invalid or out-of-range criterion score.']);
            }
            $awarded = round((float) $row['awarded_points'], 2);
            $totalCents += (int) round($awarded * 100);
            $rows[] = [
                'criterion_id' => $criterion['id'], 'criterion_name' => $criterion['criterion'],
                'max_points' => $criterion['max_points'], 'awarded_points' => $awarded, 'feedback' => $row['feedback'],
            ];
        }
        return [
            'total_score' => $totalCents / 100, 'max_score' => $rubric['total_points'],
            'percentage' => round(($totalCents / 100) / $rubric['total_points'] * 100, 2),
            'criteria' => $rows, 'overall_feedback' => $data['overall_feedback'],
            'strengths' => $data['strengths'], 'areas_for_improvement' => $data['areas_for_improvement'],
        ];
    }
}
