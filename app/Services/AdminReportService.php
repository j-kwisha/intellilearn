<?php

namespace App\Services;

use App\Models\{Assessment, Course, Enrollment, Submission, User};
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\{Cache, Http, Log};

class AdminReportService
{
    public function build(array $filters, bool $includeRisk = false): array
    {
        $now = now();
        $allCourses = Course::with('instructor:id,first_name,last_name,role')->orderBy('name')->get();
        $courses = $allCourses->filter(fn ($course) =>
            (empty($filters['course_id']) || $course->id == $filters['course_id']) &&
            (empty($filters['instructor_id']) || $course->instructor_id == $filters['instructor_id']));
        $enrollments = Enrollment::whereIn('course_id', $courses->pluck('id'))->where('status', 'active')
            ->whereHas('user', fn ($q) => $q->where('role', 'student')->where('is_active', true))
            ->with('user:id,first_name,last_name,email')->get();
        // Date filters select assessment deadlines, not submission/grade timestamps.
        $assessments = Assessment::whereIn('course_id', $courses->pluck('id'))->where('is_published', true)
            ->when(!empty($filters['from']), fn ($q) => $q->where('due_date', '>=', $filters['from'].' 00:00:00'))
            ->when(!empty($filters['to']), fn ($q) => $q->where('due_date', '<=', $filters['to'].' 23:59:59'))
            ->get(['id', 'course_id', 'type', 'available_from', 'due_date']);
        $submissions = Submission::whereIn('assessment_id', $assessments->pluck('id'))
            ->whereIn('user_id', $enrollments->pluck('user_id'))->whereIn('status', ['submitted', 'graded'])
            ->with(['answers:id,submission_id,question_id,grading_status,points_earned,instructor_override,ai_evaluation',
                'answers.question:id,type'])
            ->get(['id', 'user_id', 'assessment_id', 'status', 'grading_status', 'percentage', 'created_at']);
        $grading = ['graded_submissions' => 0, 'pending_submissions' => 0, 'error_submissions' => 0,
            'ai_graded_essays' => 0, 'pending_essays' => 0, 'error_essays' => 0, 'teacher_overrides' => 0];
        $courseRows = [];
        $studentRows = [];

        foreach ($courses as $course) {
            $courseAssessments = $assessments->where('course_id', $course->id);
            $courseEnrollments = $enrollments->where('course_id', $course->id);
            $courseScores = [];
            $expected = $submitted = $missed = $pending = $errors = 0;
            foreach ($courseEnrollments as $enrollment) {
                $work = $submissions->where('user_id', $enrollment->user_id)
                    ->whereIn('assessment_id', $courseAssessments->pluck('id'));
                // One best graded score per student/assessment; retakes never inflate rates.
                $best = $work->where('status', 'graded')->whereNotNull('percentage')->groupBy('assessment_id')
                    ->map(fn ($attempts) => (float) $attempts->max('percentage'));
                $courseScores = array_merge($courseScores, $best->values()->all());
                $quizScores = $best->only($courseAssessments->where('type', 'quiz')->pluck('id')->all());
                $average = $best->isEmpty() ? null : round($best->avg(), 1);
                $quizAverage = $quizScores->isEmpty() ? null : round($quizScores->avg(), 2);
                $eligible = $courseAssessments->filter(fn ($a) => $a->type !== 'paper_based'
                    && (!$a->available_from || $a->available_from->lte($now))
                    && (!$a->due_date || $a->due_date->gte($enrollment->created_at)));
                $submittedIds = $work->pluck('assessment_id')->unique();
                $done = $eligible->whereIn('id', $submittedIds)->count();
                $overdue = $eligible->filter(fn ($a) => $a->due_date && $a->due_date->lt($now)
                    && !$submittedIds->contains($a->id))->count();
                $expected += $eligible->count();
                $submitted += $done;
                $missed += $overdue;
                $reasons = [];
                if ($average !== null && $average < 70) $reasons[] = 'Average score below 70%';
                if ($overdue > 0) $reasons[] = $overdue.' overdue missing submission(s)';
                $studentRows[] = [
                    'student_id' => $enrollment->user_id,
                    'student_name' => $enrollment->user->first_name.' '.$enrollment->user->last_name,
                    'email' => $enrollment->user->email, 'course_id' => $course->id, 'course_name' => $course->name,
                    'average_score' => $average, 'missed_assessments' => $overdue,
                    'submitted_count' => $done, 'expected_count' => $eligible->count(),
                    'submission_rate' => $eligible->isEmpty() ? null : round(100 * $done / $eligible->count(), 1),
                    'attention_reasons' => $reasons,
                    'risk_status' => $quizAverage === null || $eligible->isEmpty() ? 'insufficient_data' : 'not_requested',
                    'risk_probability' => null, 'risk_reasons' => [],
                    // The existing model uses distinct submission days as its activity proxy.
                    'risk_metrics' => ['quiz_avg' => $quizAverage,
                        'login_count' => $work->map(fn ($s) => $s->created_at->toDateString())->unique()->count(),
                        'submission_rate' => $eligible->isEmpty() ? 0 : round($done / $eligible->count(), 2),
                        'missed_tasks' => $overdue],
                ];
                foreach ($work as $submission) {
                    $hasError = $submission->grading_status === 'grading_error'
                        || $submission->answers->contains('grading_status', 'grading_error');
                    if ($hasError) { $grading['error_submissions']++; $errors++; }
                    elseif ($submission->status === 'graded') $grading['graded_submissions']++;
                    else { $grading['pending_submissions']++; $pending++; }
                    foreach ($submission->answers as $answer) {
                        if ($answer->question?->type !== 'essay') continue;
                        if ($answer->instructor_override) $grading['teacher_overrides']++;
                        elseif ($answer->grading_status === 'grading_error') $grading['error_essays']++;
                        elseif ($answer->grading_status === 'graded' && $answer->ai_evaluation !== null) $grading['ai_graded_essays']++;
                        elseif ($answer->points_earned === null) $grading['pending_essays']++;
                    }
                }
            }
            $courseRows[] = ['id' => $course->id, 'name' => $course->name, 'code' => $course->code,
                'status' => $course->status,
                'instructor_name' => $course->instructor ? $course->instructor->first_name.' '.$course->instructor->last_name : 'Unassigned',
                'student_count' => $courseEnrollments->count(),
                'average_score' => count($courseScores) ? round(array_sum($courseScores) / count($courseScores), 1) : null,
                'expected_count' => $expected, 'submitted_count' => $submitted,
                'submission_rate' => $expected ? round(100 * $submitted / $expected, 1) : null,
                'missed_assessments' => $missed, 'pending_grading' => $pending, 'grading_errors' => $errors];
        }

        if ($includeRisk) $studentRows = $this->predictRisk($studentRows);
        foreach ($studentRows as &$row) unset($row['risk_metrics']);
        unset($row);

        return [
            'generated_at' => $now->toIso8601String(),
            'filters' => array_intersect_key($filters, array_flip(['course_id', 'instructor_id', 'from', 'to'])),
            'options' => ['courses' => $allCourses->map(fn ($c) => ['id' => $c->id, 'name' => $c->name, 'instructor_id' => $c->instructor_id])->values(),
                'instructors' => User::where('role', 'instructor')->orderBy('last_name')->get(['id', 'first_name', 'last_name'])],
            'overview' => ['students' => $enrollments->pluck('user_id')->unique()->count(),
                'instructors' => $courses->filter(fn ($c) => $c->instructor?->role === 'instructor')->pluck('instructor_id')->unique()->count(),
                'active_courses' => $courses->where('status', 'active')->count(), 'enrollments' => $enrollments->count(),
                'pending_grading' => $grading['pending_submissions'], 'grading_errors' => $grading['error_submissions']],
            'courses' => $courseRows, 'students' => $studentRows, 'grading' => $grading,
        ];
    }

    private function predictRisk(array $rows): array
    {
        $url = rtrim((string) env('AI_SERVICE_URL', 'http://127.0.0.1:8001'), '/');
        $uncached = [];
        foreach ($rows as $index => &$row) {
            if ($row['risk_status'] === 'insufficient_data') continue;
            $key = 'admin-report-risk:'.hash('sha256', $url.json_encode($row['risk_metrics']));
            $cached = Cache::get($key);
            if ($cached) $row = array_merge($row, $cached);
            else $uncached[$index] = ['key' => $key, 'metrics' => $row['risk_metrics']];
        }
        unset($row);
        // Risk loads separately from the core report; outages cannot hide stored grades.
        foreach (array_chunk($uncached, 20, true) as $batch) {
            try {
                $responses = Http::pool(function (Pool $pool) use ($batch, $url) {
                    $requests = [];
                    foreach ($batch as $index => $item) {
                        $requests[] = $pool->as((string) $index)->connectTimeout(2)->timeout(4)->post($url.'/predict', $item['metrics']);
                    }
                    return $requests;
                });
            } catch (\Throwable $e) {
                Log::warning('Admin report risk prediction unavailable', ['exception_type' => get_class($e)]);
                $responses = [];
            }
            foreach ($batch as $index => $item) {
                $response = $responses[$index] ?? null;
                $prediction = $response instanceof \Illuminate\Http\Client\Response && $response->successful() ? $response->json() : null;
                $valid = is_array($prediction) && is_bool($prediction['at_risk'] ?? null)
                    && is_numeric($prediction['risk_probability'] ?? null)
                    && $prediction['risk_probability'] >= 0 && $prediction['risk_probability'] <= 1
                    && is_array($prediction['reasons'] ?? null)
                    && count(array_filter($prediction['reasons'], 'is_string')) === count($prediction['reasons']);
                $result = ['risk_status' => 'unavailable', 'risk_probability' => null, 'risk_reasons' => []];
                if ($valid) {
                    $result = ['risk_status' => $prediction['at_risk'] ? 'at_risk' : 'not_at_risk',
                        'risk_probability' => round(100 * $prediction['risk_probability'], 1), 'risk_reasons' => $prediction['reasons']];
                    Cache::put($item['key'], $result, now()->addMinutes(5));
                }
                $rows[$index] = array_merge($rows[$index], $result);
            }
        }
        return $rows;
    }
}
