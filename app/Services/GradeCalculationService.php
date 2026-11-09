<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Grade;
use App\Models\Submission;

class GradeCalculationService
{
    public function recalculateStudent(Course $course, int $studentId): Grade
    {
        $scores = ['quiz' => [], 'long_exam' => [], 'individual_activity' => []];
        $submissions = Submission::where('user_id', $studentId)->where('status', 'graded')
            ->whereHas('assessment', fn ($query) => $query->where('course_id', $course->id)
                ->where('assessment_stage', 'regular'))
            ->with('assessment:id,type,assessment_stage')->get();
        foreach ($submissions as $submission) {
            if ($submission->percentage !== null && isset($scores[$submission->assessment->type])) {
                $scores[$submission->assessment->type][] = (float) $submission->percentage;
            }
        }
        $average = fn (array $values) => $values ? round(array_sum($values) / count($values), 2) : null;
        $quiz = $average($scores['quiz']);
        $exam = $average($scores['long_exam']);
        $activity = $average($scores['individual_activity']);
        $weights = [[$quiz, 0.40], [$exam, 0.40], [$activity, 0.20]];
        $weightSum = 0;
        $weightedScore = 0;
        foreach ($weights as [$value, $weight]) {
            if ($value === null) continue;
            $weightSum += $weight;
            $weightedScore += $value * $weight;
        }
        $overall = $weightSum > 0 ? round($weightedScore / $weightSum, 2) : null;
        return Grade::updateOrCreate(
            ['user_id' => $studentId, 'course_id' => $course->id],
            [
                'quiz_average' => $quiz, 'exam_average' => $exam,
                'activity_average' => $activity, 'overall_grade' => $overall,
                'remarks' => $overall === null ? null : ($overall >= 75 ? 'Passed' : 'Failed'),
            ],
        );
    }
}
