<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\CourseMaterial;
use App\Models\Enrollment;
use App\Models\Question;
use App\Models\Submission;
use App\Models\SubmissionAnswer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\EssayGradingService;
use App\Services\RubricService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmissionController extends Controller
{
    /**
     * START AN ASSESSMENT ATTEMPT
     *
     * POST /api/courses/{course}/assessments/{assessment}/start
     *
     * Creates a new submission record with status "in_progress".
     * Checks if student has attempts remaining.
     */
    public function start(Request $request, Course $course, Assessment $assessment): JsonResponse
    {
        $user = $request->user();

        if (! $user->isStudent()) {
            return response()->json(['message' => 'Only students can take assessments.'], 403);
        }

        if (! $this->isEnrolled($user, $course)) {
            return response()->json(['message' => 'You are not enrolled in this course.'], 403);
        }

        if ($assessment->course_id !== $course->id) {
            return response()->json(['message' => 'Assessment not found in this course.'], 404);
        }

        if (! $assessment->is_published) {
            return response()->json(['message' => 'This assessment is not available yet.'], 403);
        }

        if ($message = $this->assessmentDateError($assessment)) {
            return response()->json(['message' => $message], 403);
        }

        // Check if student has an in-progress attempt
        $existingAttempt = Submission::where('user_id', $user->id)
            ->where('assessment_id', $assessment->id)
            ->where('status', 'in_progress')
            ->first();

        if ($existingAttempt) {
            // Return the existing attempt so they can continue
            $existingAttempt->load('answers');
            return response()->json([
                'message'    => 'You have an in-progress attempt.',
                'submission' => $existingAttempt,
            ]);
        }

        // Check max attempts
        $attemptCount = Submission::where('user_id', $user->id)
            ->where('assessment_id', $assessment->id)
            ->count();

        if ($attemptCount >= $assessment->max_attempts) {
            return response()->json([
                'message' => 'You have used all ' . $assessment->max_attempts . ' attempt(s) for this assessment.',
            ], 422);
        }

        // Create new submission
        $submission = Submission::create([
            'user_id'        => $user->id,
            'assessment_id'  => $assessment->id,
            'attempt_number' => $attemptCount + 1,
            'status'         => 'in_progress',
            'started_at'     => now(),
        ]);

        return response()->json([
            'message'    => 'Assessment started. Good luck!',
            'submission' => $submission,
        ], 201);
    }

    /**
     * SUBMIT ANSWERS
     *
     * POST /api/courses/{course}/assessments/{assessment}/submit
     * Body: { submission_id, answers: [ { question_id, answer_text }, ... ] }
     *
     * Auto-grades MC and T/F questions immediately.
     * Essay and short answer are left for instructor/AI grading.
     */
    public function submit(Request $request, Course $course, Assessment $assessment): JsonResponse
    {
        if ($assessment->course_id !== $course->id) abort(404);
        $user = $request->user();

        if (! $user->isStudent()) {
            return response()->json(['message' => 'Only students can submit answers.'], 403);
        }

        $validated = $request->validate([
            'submission_id'           => ['required', 'exists:submissions,id'],
            'answers'                 => ['required', 'array', 'min:1'],
            'answers.*.question_id'   => ['required', 'exists:questions,id', 'distinct'],
            'answers.*.answer_text'   => ['nullable', 'string'],
        ]);

        // Find the submission and verify ownership
        $submission = Submission::where('id', $validated['submission_id'])
            ->where('user_id', $user->id)
            ->where('assessment_id', $assessment->id)
            ->where('status', 'in_progress')
            ->first();

        if (! $submission) {
            return response()->json([
                'message' => 'No active submission found. Start the assessment first.',
            ], 404);
        }

        if ($message = $this->assessmentDateError($assessment)) {
            return response()->json(['message' => $message], 403);
        }

        // Load all questions for this assessment (for auto-grading)
        $questions = $assessment->questions()->get()->keyBy('id');

        $totalScore = 0;
        $totalPoints = 0;
        $allAutoGradable = true;

        $provided = collect($validated['answers'])->keyBy('question_id');
        foreach ($provided as $id => $answer) {
            if (!$questions->has($id)) throw ValidationException::withMessages(['answers' => 'A question does not belong to this assessment.']);
        }
        $validated['answers'] = $questions->map(fn ($question) => $provided->get($question->id, [
            'question_id' => $question->id, 'answer_text' => null,
        ]))->values()->all();

        // Process each answer
        foreach ($validated['answers'] as $answerData) {
            $question = $questions->get($answerData['question_id']);

            if (! $question) continue;

            $isCorrect = null;
            $pointsEarned = null;

            // Auto-grade MC and T/F
            if (in_array($question->type, ['multiple_choice', 'true_false'])) {
                $isCorrect = strtolower(trim($answerData['answer_text'] ?? ''))
                          === strtolower(trim($question->correct_answer ?? ''));
                $pointsEarned = $isCorrect ? $question->points : 0;
            }
            // Auto-grade short answer (exact match, case-insensitive)
            elseif ($question->type === 'short_answer' && $question->correct_answer) {
                $isCorrect = strtolower(trim($answerData['answer_text'] ?? ''))
                          === strtolower(trim($question->correct_answer));
                $pointsEarned = $isCorrect ? $question->points : 0;
            }
            // Auto-grade matching questions
            elseif ($question->type === 'matching') {
                // Load matching pairs for this question
                $matchingPairs = \App\Models\MatchingPair::where('question_id', $question->id)->get();
                
                if ($matchingPairs->isEmpty()) {
                    // No pairs defined, skip grading
                    $allAutoGradable = false;
                    continue;
                }
                
                // Parse student's answer (expected as JSON)
                $studentMatches = json_decode($answerData['answer_text'] ?? '{}', true);
                
                if (!is_array($studentMatches)) {
                    $studentMatches = [];
                }
                
                // Grade each pair
                $correctCount = 0;
                $totalPairs = $matchingPairs->count();
                
                foreach ($matchingPairs as $pair) {
                    $studentAnswer = $studentMatches[$pair->id] ?? null;
                    if ($studentAnswer && strtolower(trim($studentAnswer)) === strtolower(trim($pair->correct_match))) {
                        $correctCount++;
                    }
                }
                
                // Calculate points: proportional to correct matches
                $pointsEarned = $totalPairs > 0 
                    ? round(($correctCount / $totalPairs) * $question->points, 2)
                    : 0;
                    
                $isCorrect = $correctCount === $totalPairs;
            }
            elseif ($question->type === 'essay') {
                $graded = app(EssayGradingService::class)->grade($question, $answerData['answer_text'] ?? null);
                SubmissionAnswer::updateOrCreate(
                    ['submission_id' => $submission->id, 'question_id' => $question->id], $graded
                );
                if ($graded['points_earned'] === null) $allAutoGradable = false;
                else $totalScore += $graded['points_earned'];
                $totalPoints += $question->points;
                continue;
            } else {
                // Short answers without an expected answer await the instructor.
                $allAutoGradable = false;
            }

            // Save the answer
            SubmissionAnswer::updateOrCreate(
                [
                    'submission_id' => $submission->id,
                    'question_id'   => $question->id,
                ],
                [
                    'answer_text'   => $answerData['answer_text'] ?? null,
                    'is_correct'    => $isCorrect,
                    'points_earned' => $pointsEarned,
                ]
            );

            if ($pointsEarned !== null) {
                $totalScore += $pointsEarned;
            }
            $totalPoints += $question->points;
        }

        // Update submission status
        $submission->submitted_at = now();
        $submission->total_points = $totalPoints;
        $submission->grading_status = $submission->answers()->where('grading_status', 'grading_error')->exists()
            ? 'grading_error' : ($allAutoGradable ? 'graded' : 'pending');

        if ($allAutoGradable) {
            // Everything was auto-graded — mark as graded
            $submission->status = 'graded';
            $submission->score = $totalScore;
            $submission->percentage = $totalPoints > 0
                ? round(($totalScore / $totalPoints) * 100, 2)
                : 0;
            $submission->graded_at = now();
        } else {
            // Has essays — mark as submitted, waiting for grading
            $submission->status = 'submitted';
            // Store partial score from auto-graded questions
            $submission->score = $totalScore;
        }

        $submission->save();

        // Auto-compute grades for this student in this course
        try {
            $totalAssessments = Assessment::where('course_id', $course->id)
                ->where('is_published', true)->count();
            $submissions = Submission::where('user_id', $user->id)
                ->where('status', 'graded')
                ->whereHas('assessment', fn($q) => $q->where('course_id', $course->id))
                ->with('assessment:id,type')
                ->get();

            $quizScores = []; $examScores = []; $activityScores = [];
            foreach ($submissions as $sub) {
                if ($sub->percentage === null) continue;
                match($sub->assessment->type) {
                    'quiz'                => $quizScores[] = $sub->percentage,
                    'long_exam'           => $examScores[] = $sub->percentage,
                    'individual_activity' => $activityScores[] = $sub->percentage,
                    default               => null,
                };
            }

            $avg = fn($arr) => count($arr) > 0 ? round(array_sum($arr) / count($arr), 2) : null;
            $quizAvg       = $avg($quizScores);
            $examAvg       = $avg($examScores);
            $activityAvg   = $avg($activityScores);

            $components = [];
            if ($quizAvg !== null)       $components[] = ['avg' => $quizAvg,       'weight' => 0.40];
            if ($examAvg !== null)       $components[] = ['avg' => $examAvg,       'weight' => 0.40];
            if ($activityAvg !== null)   $components[] = ['avg' => $activityAvg,   'weight' => 0.20];

            $overall = null;
            if (count($components) > 0) {
                $totalWeight = array_sum(array_column($components, 'weight'));
                $weightedSum = array_sum(array_map(fn($c) => $c['avg'] * $c['weight'], $components));
                $overall = round($weightedSum / $totalWeight, 2);
            }

            \App\Models\Grade::updateOrCreate(
                ['user_id' => $user->id, 'course_id' => $course->id],
                [
                    'quiz_average'       => $quizAvg,
                    'exam_average'       => $examAvg,
                    'activity_average'   => $activityAvg,
                    'overall_grade'      => $overall,
                    'remarks'            => $overall !== null ? ($overall >= 75 ? 'Passed' : 'Failed') : null,
                ]
            );
        } catch (\Exception $e) {
            // Grade auto-compute failed — not critical
        }

        // Load answers for the response
        $submission->load('answers.question');

        // Enforce score visibility for students in response
        $visibility = $assessment->score_visibility ?? 'immediate';
        
        if ($visibility === 'hidden') {
            $submission->makeHidden(['score', 'percentage', 'total_points']);
            $submission->answers->each(function ($answer) {
                $answer->makeHidden(['points_earned', 'is_correct', 'ai_feedback']);
            });
        } elseif ($visibility === 'instructor_release') {
            // Scores exist but not visible until released
            $submission->makeHidden(['score', 'percentage', 'total_points']);
            $submission->answers->each(function ($answer) {
                $answer->makeHidden(['points_earned', 'is_correct', 'ai_feedback']);
            });
        }

        return response()->json([
            'message'    => $submission->grading_status === 'grading_error'
                ? 'Assessment submitted. Automatic essay grading encountered an error; contact the instructor.'
                : ($allAutoGradable
                ? 'Assessment submitted and graded!'
                : 'Assessment submitted. Some answers are waiting to be graded by the instructor.'),
            'submission' => $submission,
        ]);
    }

    /**
     * VIEW SUBMISSION RESULTS
     *
     * GET /api/courses/{course}/assessments/{assessment}/submissions/{submission}
     *
     * Students see their own results. Instructors see any student's results.
     * Score visibility is enforced based on assessment settings.
     */
    public function show(Request $request, Course $course, Assessment $assessment, Submission $submission): JsonResponse
    {
        if ($assessment->course_id !== $course->id) abort(404);
        if ($submission->assessment_id !== $assessment->id) abort(404);
        $user = $request->user();

        // Students can only see their own submissions
        if ($user->isStudent() && $submission->user_id !== $user->id) {
            return response()->json(['message' => 'You can only view your own submissions.'], 403);
        }

        if (! $user->isStudent() && ! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have access.'], 403);
        }

        $submission->load(['answers.question', 'user:id,first_name,last_name,email', 'assessment:id,score_visibility,scores_released_at']);

        if (!$user->isStudent()) {
            $submission->answers->each(fn ($answer) => $answer->makeVisible([
                'rubric_snapshot', 'reference_snapshot', 'ai_evaluation', 'teacher_criterion_scores',
                'overridden_by', 'overridden_at', 'criterion_scores',
            ]));
        }

        // Students see correct answers only AFTER grading
        if ($user->isStudent() && $submission->status !== 'graded') {
            $submission->answers->each(function ($answer) {
                $answer->question->makeHidden('correct_answer');
            });
        }

        // Enforce score visibility for students
        if ($user->isStudent()) {
            $visibility = $assessment->score_visibility ?? 'immediate';
            
            if ($visibility === 'hidden') {
                // Hide all score-related fields
                $submission->makeHidden(['score', 'percentage', 'total_points']);
                $submission->answers->each(function ($answer) {
                    $answer->makeHidden(['points_earned', 'is_correct', 'ai_feedback']);
                });
            } elseif ($visibility === 'instructor_release') {
                // Hide scores unless released
                if (!$assessment->scores_released_at) {
                    $submission->makeHidden(['score', 'percentage', 'total_points']);
                    $submission->answers->each(function ($answer) {
                        $answer->makeHidden(['points_earned', 'is_correct', 'ai_feedback']);
                    });
                }
            }
            // 'immediate' - show scores (default behavior)
        }

        return response()->json(['submission' => $submission]);
    }

    /**
     * LIST ALL SUBMISSIONS FOR AN ASSESSMENT (instructor view)
     *
     * GET /api/courses/{course}/assessments/{assessment}/submissions
     *
     * Shows all student submissions with scores.
     */
    public function index(Request $request, Course $course, Assessment $assessment): JsonResponse
    {
        if ($assessment->course_id !== $course->id) abort(404);
        $user = $request->user();

        if ($user->isStudent()) {
            // Students see only their own submissions
            $submissions = Submission::where('user_id', $user->id)
                ->where('assessment_id', $assessment->id)
                ->orderBy('attempt_number')
                ->get();
            
            // Enforce score visibility for students
            $visibility = $assessment->score_visibility ?? 'immediate';
            
            if ($visibility === 'hidden') {
                $submissions->each(function ($submission) {
                    $submission->makeHidden(['score', 'percentage', 'total_points']);
                });
            } elseif ($visibility === 'instructor_release') {
                if (!$assessment->scores_released_at) {
                    $submissions->each(function ($submission) {
                        $submission->makeHidden(['score', 'percentage', 'total_points']);
                    });
                }
            }
        } else {
            if (! $this->canManageCourse($user, $course)) {
                return response()->json(['message' => 'You do not have access.'], 403);
            }

            $submissions = $assessment->submissions()
                ->with('user:id,first_name,last_name,email')
                ->orderBy('created_at', 'desc')
                ->get();
        }

        return response()->json(['submissions' => $submissions]);
    }

    /**
     * GRADE AN ESSAY / MANUAL GRADING (instructor)
     *
     * PUT /api/courses/{course}/assessments/{assessment}/submissions/{submission}/grade
     * Body: { grades: [ { question_id, points_earned, ai_feedback }, ... ] }
     *
     * Instructor grades essay questions and provides feedback.
     */
    public function grade(Request $request, Course $course, Assessment $assessment, Submission $submission): JsonResponse
    {
        if ($assessment->course_id !== $course->id) abort(404);
        if ($submission->assessment_id !== $assessment->id) abort(404);
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'Only instructors can grade submissions.'], 403);
        }

        if ($submission->assessment_id !== $assessment->id) {
            return response()->json(['message' => 'Submission not found for this assessment.'], 404);
        }

        $validated = $request->validate([
            'grades'                   => ['required', 'array', 'min:1'],
            'grades.*.question_id'     => ['required', 'exists:questions,id', 'distinct'],
            'grades.*.points_earned'   => ['required', 'numeric', 'min:0', 'decimal:0,2'],
            'grades.*.criterion_scores' => ['nullable', 'array'],
            'grades.*.criterion_scores.*' => ['required', 'numeric', 'min:0', 'decimal:0,2'],
            'grades.*.ai_feedback'     => ['nullable', 'string'],
        ]);

        $updates = [];
        foreach ($validated['grades'] as $gradeData) {
            $answer = $submission->answers()->with('question')->where('question_id', $gradeData['question_id'])->first();
            if (!$answer || $answer->question->assessment_id !== $assessment->id) {
                throw ValidationException::withMessages(['grades' => 'An answer does not belong to this submission.']);
            }
            $max = $answer->rubric_snapshot['total_points'] ?? (float) $answer->question->points;
            $points = (float) $gradeData['points_earned'];
            $criteria = $points === (float) $answer->points_earned ? $answer->teacher_criterion_scores : null;
            if (isset($gradeData['criterion_scores'])) {
                $snapshot = $answer->rubric_snapshot;
                if (!$snapshot) throw ValidationException::withMessages(['criteria' => 'No grading rubric snapshot is available for this answer.']);
                $rows = [];
                foreach ($gradeData['criterion_scores'] as $id => $score) {
                    $rows[] = ['criterion_id' => $id, 'awarded_points' => $score, 'feedback' => 'Teacher override.'];
                }
                $evaluation = app(RubricService::class)->evaluation([
                    'criteria' => $rows, 'overall_feedback' => trim($gradeData['ai_feedback'] ?? '') ?: 'Teacher override.',
                    'strengths' => [], 'areas_for_improvement' => [],
                ], $snapshot);
                $points = $evaluation['total_score'];
                $criteria = array_column($evaluation['criteria'], 'awarded_points', 'criterion_id');
            }
            if (!is_finite($points) || $points > $max) {
                throw ValidationException::withMessages(['grades' => 'A teacher score exceeds the maximum points.']);
            }
            $updates[] = [$answer, [
                'points_earned' => $points, 'is_correct' => $points > 0,
                'grading_status' => 'graded', 'grading_error_code' => null,
                'ai_feedback' => $gradeData['ai_feedback'] ?? null,
                'teacher_criterion_scores' => $criteria, 'instructor_override' => true,
                'overridden_by' => $user->id, 'overridden_at' => now(),
                // ai_evaluation, criterion_scores and snapshots remain immutable.
            ]];
        }
        DB::transaction(function () use ($updates) {
            foreach ($updates as [$answer, $values]) $answer->update($values);
        });

        // Recalculate total score
        $totalEarned = $submission->answers()->sum('points_earned');
        $totalPoints = $submission->total_points ?? $assessment->questions()->sum('points');

        $hasPending = $submission->answers()->whereNull('points_earned')->exists();
        $submission->update([
            'score'        => $totalEarned,
            'grading_status' => $submission->answers()->where('grading_status', 'grading_error')->exists() ? 'grading_error' : ($hasPending ? 'pending' : 'graded'),
            'total_points' => $totalPoints,
            'percentage'   => $totalPoints > 0
                && !$hasPending ? round(($totalEarned / $totalPoints) * 100, 2)
                : null,
            'status'       => $hasPending ? 'submitted' : 'graded',
            'graded_at'    => $hasPending ? null : now(),
        ]);

        $submission->load('answers.question');

        return response()->json([
            'message'    => 'Submission graded successfully.',
            'submission' => $submission,
        ]);
    }

    // -------------------------------------------------------
    // HELPER METHODS
    // -------------------------------------------------------

    private function isEnrolled($user, $course): bool
    {
        return Enrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->where('status', 'active')
            ->exists();
    }

    private function canManageCourse($user, $course): bool
    {
        if ($user->isAdmin()) return true;
        if ($user->isInstructor() && $course->instructor_id === $user->id) return true;
        return false;
    }

    private function assessmentDateError(Assessment $assessment): ?string
    {
        $currentTime = now();
        if ($assessment->available_from && $currentTime->lt($assessment->available_from)) {
            return 'This assessment is not open yet.';
        }
        if ($assessment->due_date && $currentTime->gte($assessment->due_date)) {
            return 'The deadline for this assessment has passed.';
        }
        return null;
    }
}
