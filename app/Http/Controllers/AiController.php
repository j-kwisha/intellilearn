<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LessonMaterial;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    private string $aiServiceUrl;

    public function __construct()
    {
        $this->aiServiceUrl = env('AI_SERVICE_URL', 'http://127.0.0.1:8001');
    }

    // ─────────────────────────────────────────────
    // 1. AT-RISK PREDICTION (manual input)
    // ─────────────────────────────────────────────

    /**
     * POST /api/ai/predict
     * Manual input prediction (fallback form)
     */
    public function predict(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'quiz_avg'        => ['required', 'numeric', 'min:0', 'max:100'],
            'login_count'     => ['required', 'integer', 'min:0'],
            'submission_rate' => ['required', 'numeric', 'min:0', 'max:1'],
            'missed_tasks'    => ['required', 'integer', 'min:0'],
        ]);

        $response = Http::timeout(5)->post("{$this->aiServiceUrl}/predict", $validated);

        if ($response->failed()) {
            return response()->json(['message' => 'AI service is unavailable.'], 503);
        }

        return response()->json($response->json());
    }

    // ─────────────────────────────────────────────
    // 2. AT-RISK PREDICTION (auto — from DB metrics)
    // ─────────────────────────────────────────────

    /**
     * GET /api/ai/courses/{course}/student-risk
     * Instructor views risk for all students in a course (uses real DB data)
     */
    public function courseRisk(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $user->isAdmin() && ! ($user->isInstructor() && $course->instructor_id === $user->id)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $students = $course->students()->wherePivot('status', 'active')
            ->select('users.id', 'first_name', 'last_name', 'email')
            ->get();

        $totalAssessments = Assessment::where('course_id', $course->id)
            ->where('is_published', true)->count();

        $results = [];

        foreach ($students as $student) {
            $metrics = $this->computeStudentMetrics($student->id, $course->id, $totalAssessments);

            // Don't predict if student has no data yet
            if ($this->hasInsufficientData($metrics, $totalAssessments)) {
                $results[] = [
                    'student'          => $student,
                    'metrics'          => $metrics,
                    'at_risk'          => null,
                    'risk_probability' => null,
                    'status'           => 'not_assessed',
                    'reasons'          => [],
                ];
                continue;
            }

            $aiResponse = Http::timeout(5)->post("{$this->aiServiceUrl}/predict", $metrics);

            $prediction = $aiResponse->successful()
                ? $aiResponse->json()
                : ['at_risk' => null, 'risk_probability' => null, 'safe_probability' => null, 'reasons' => []];

            $results[] = [
                'student'          => $student,
                'metrics'          => $metrics,
                'at_risk'          => $prediction['at_risk'],
                'risk_probability' => $prediction['risk_probability'],
                'status'           => 'assessed',
                'reasons'          => $prediction['reasons'] ?? [],
            ];
        }

        return response()->json(['results' => $results]);
    }

    /**
     * GET /api/ai/my-risk
     * Student views their own risk result (uses real DB data)
     */
    public function myRisk(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isStudent()) {
            return response()->json(['message' => 'Only students can use this endpoint.'], 403);
        }

        // Get all active enrollments
        $enrollments = Enrollment::where('user_id', $user->id)
            ->where('status', 'active')
            ->with('course:id,name,code')
            ->get();

        $results = [];

        foreach ($enrollments as $enrollment) {
            $course = $enrollment->course;
            $totalAssessments = Assessment::where('course_id', $course->id)
                ->where('is_published', true)->count();

            $metrics = $this->computeStudentMetrics($user->id, $course->id, $totalAssessments);

            // Don't predict if student has no data yet
            if ($this->hasInsufficientData($metrics, $totalAssessments)) {
                $results[] = [
                    'course'           => $course,
                    'metrics'          => $metrics,
                    'at_risk'          => null,
                    'risk_probability' => null,
                    'status'           => 'not_assessed',
                    'reasons'          => [],
                ];
                continue;
            }

            $aiResponse = Http::timeout(5)->post("{$this->aiServiceUrl}/predict", $metrics);

            $prediction = $aiResponse->successful()
                ? $aiResponse->json()
                : ['at_risk' => null, 'risk_probability' => null, 'safe_probability' => null, 'reasons' => []];

            $results[] = [
                'course'           => $course,
                'metrics'          => $metrics,
                'at_risk'          => $prediction['at_risk'],
                'risk_probability' => $prediction['risk_probability'],
                'status'           => 'assessed',
                'reasons'          => $prediction['reasons'] ?? [],
            ];
        }

        return response()->json(['results' => $results]);
    }

    // ─────────────────────────────────────────────
    // 3. LEARNING RECOMMENDATIONS
    // ─────────────────────────────────────────────

    /**
     * POST /api/ai/recommend
     * Body: { quiz_avg, topic }
     */
    public function recommend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'quiz_avg' => ['required', 'numeric', 'min:0', 'max:100'],
            'topic'    => ['nullable', 'string', 'max:100'],
        ]);

        $response = Http::timeout(5)->post("{$this->aiServiceUrl}/recommend", $validated);

        if ($response->failed()) {
            return response()->json(['message' => 'AI service is unavailable.'], 503);
        }

        return response()->json($response->json());
    }

    // ─────────────────────────────────────────────
    // 4. QUIZ FEEDBACK (rule-based, no AI call needed)
    // ─────────────────────────────────────────────

    /**
     * POST /api/ai/quiz-feedback
     * Body: { submission_id }
     * Generates instant feedback after quiz submission.
     */
    public function quizFeedback(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'submission_id' => ['required', 'exists:submissions,id'],
        ]);

        $submission = Submission::where('id', $validated['submission_id'])
            ->where('user_id', $user->id)
            ->with(['answers.question', 'assessment'])
            ->first();

        if (! $submission) {
            return response()->json(['message' => 'Submission not found.'], 404);
        }

        $percentage = $submission->percentage ?? 0;
        $incorrectAnswers = $submission->answers->filter(fn($a) => $a->is_correct === false);

        // Performance summary
        $summary = match(true) {
            $percentage >= 90 => 'Excellent work! You have a strong understanding of this topic.',
            $percentage >= 75 => 'Good job! You passed, but there is still room to improve.',
            $percentage >= 60 => 'You are close to passing. Review the topics below to improve.',
            default           => 'You need to review this topic more carefully before the next attempt.',
        };

        // Weak areas from incorrect answers
        $weakTopics = $incorrectAnswers
            ->map(fn($a) => $a->question?->topic ?? null)
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        // Suggestions
        $suggestions = [];
        if ($percentage < 75) {
            $suggestions[] = 'Review the lesson materials related to your incorrect answers.';
            $suggestions[] = 'Try re-reading the topics before your next attempt.';
        }
        if (count($weakTopics) > 0) {
            $suggestions[] = 'Focus on these topics: ' . implode(', ', $weakTopics) . '.';
        }
        if ($submission->assessment?->max_attempts > 1 && $percentage < 75) {
            $suggestions[] = 'You have remaining attempts — use them after reviewing.';
        }

        return response()->json([
            'score'       => $submission->score,
            'total'       => $submission->total_points,
            'percentage'  => $percentage,
            'summary'     => $summary,
            'weak_topics' => $weakTopics,
            'suggestions' => $suggestions,
        ]);
    }

    // ─────────────────────────────────────────────
    // 5. CHATBOT
    // ─────────────────────────────────────────────

    /**
     * POST /api/ai/chatbot
     * Body: { message, course_name, lesson_context, material_title }
     */
    public function chatbot(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message'        => ['required', 'string', 'max:500'],
            'course_name'    => ['nullable', 'string', 'max:255'],
            'lesson_context' => ['nullable', 'string'],
            'material_title' => ['nullable', 'string', 'max:255'],
        ]);

        $response = Http::timeout(10)->post("{$this->aiServiceUrl}/chatbot", $validated);

        if ($response->failed()) {
            return response()->json([
                'response' => 'The assistant is currently unavailable. Please try again later.',
                'in_scope' => false,
            ]);
        }

        return response()->json($response->json());
    }

    /**
     * GET /api/ai/materials/{material}/context
     * Returns extracted text for a material (used by PDF chatbot)
     */
    public function materialContext(Request $request, LessonMaterial $material): JsonResponse
    {
        return response()->json([
            'material_id'    => $material->id,
            'title'          => $material->title,
            'extracted_text' => $material->extracted_text,
            'has_text'       => !empty($material->extracted_text),
        ]);
    }

    // ─────────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────────

    private function hasInsufficientData(array $metrics, int $totalAssessments): bool
    {
        // No assessments in the course yet — can't assess
        if ($totalAssessments === 0) return true;

        // Student has made no submissions at all
        $hasNoSubmissions = $metrics['login_count'] === 0
            && $metrics['submission_rate'] === 0
            && $metrics['quiz_avg'] === 0;

        return $hasNoSubmissions;
    }

    private function computeStudentMetrics(int $studentId, int $courseId, int $totalAssessments): array
    {
        // Quiz average from graded submissions
        $submissions = Submission::where('user_id', $studentId)
            ->where('status', 'graded')
            ->whereHas('assessment', fn($q) => $q->where('course_id', $courseId)->where('type', 'quiz'))
            ->get();

        $quizAvg = $submissions->count() > 0
            ? round($submissions->avg('percentage'), 2)
            : 0;

        // Submission rate
        $submittedCount = Submission::where('user_id', $studentId)
            ->whereHas('assessment', fn($q) => $q->where('course_id', $courseId))
            ->whereIn('status', ['submitted', 'graded'])
            ->count();

        $submissionRate = $totalAssessments > 0
            ? round($submittedCount / $totalAssessments, 2)
            : 0;

        // Missed tasks
        $missedTasks = max(0, $totalAssessments - $submittedCount);

        // Login count (approximate: number of distinct submission days as proxy)
        $loginCount = Submission::where('user_id', $studentId)
            ->whereHas('assessment', fn($q) => $q->where('course_id', $courseId))
            ->selectRaw('COUNT(DISTINCT DATE(created_at)) as days')
            ->value('days') ?? 0;

        return [
            'quiz_avg'        => $quizAvg,
            'login_count'     => (int) $loginCount,
            'submission_rate' => $submissionRate,
            'missed_tasks'    => $missedTasks,
        ];
    }
}
