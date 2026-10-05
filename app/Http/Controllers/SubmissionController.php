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
        $user = $request->user();

        if (! $user->isStudent()) {
            return response()->json(['message' => 'Only students can submit answers.'], 403);
        }

        $validated = $request->validate([
            'submission_id'           => ['required', 'exists:submissions,id'],
            'answers'                 => ['required', 'array', 'min:1'],
            'answers.*.question_id'   => ['required', 'exists:questions,id'],
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

        // Load all questions for this assessment (for auto-grading)
        $questions = $assessment->questions()->get()->keyBy('id');

        $totalScore = 0;
        $totalPoints = 0;
        $allAutoGradable = true;

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
            // Essay — auto-grade with AI
            else {
                $answerText = $answerData['answer_text'] ?? null;

                // Essays require reference material explicitly provided for the question.
                $referenceText = null;
                $course = $assessment->course;

                if ($question->reference_text && trim($question->reference_text)) {
                    // Instructor uploaded/pasted reference text directly on the question
                    $referenceText = substr($question->reference_text, 0, 6000);
                } elseif ($question->reference_lesson_id) {
                    // Instructor picked a specific lesson — CHECK IF IT STILL EXISTS
                    $lessonExists = \App\Models\Lesson::where('id', $question->reference_lesson_id)->exists();
                    
                    if (!$lessonExists) {
                        // Lesson has been deleted — skip AI grading, mark for manual review
                        SubmissionAnswer::updateOrCreate(
                            ['submission_id' => $submission->id, 'question_id' => $question->id],
                            [
                                'answer_text'      => $answerText,
                                'is_correct'       => null,
                                'points_earned'    => null,
                                'ai_feedback'      => null,
                                'criterion_scores' => null,
                            ]
                        );
                        $allAutoGradable = false;
                        $totalPoints += $question->points;
                        continue;
                    }
                    
                    $lessonMaterials = \App\Models\LessonMaterial::where('lesson_id', $question->reference_lesson_id)
                        ->whereNotNull('extracted_text')
                        ->orderBy('order')
                        ->get();
                    if ($lessonMaterials->isNotEmpty()) {
                        $referenceText = substr(
                            $lessonMaterials->pluck('extracted_text')->implode("\n\n---\n\n"),
                            0, 6000
                        );
                    }
                } elseif ($question->type !== 'essay') {
                    // Fallback: course-level materials, then assessment lesson materials
                    $courseMaterials = \App\Models\CourseMaterial::where('course_id', $course->id)
                        ->whereNotNull('extracted_text')
                        ->orderBy('order')
                        ->get();

                    if ($courseMaterials->isEmpty() && $assessment->lesson_id) {
                        $courseMaterials = \App\Models\LessonMaterial::where('lesson_id', $assessment->lesson_id)
                            ->whereNotNull('extracted_text')
                            ->orderBy('order')
                            ->get();
                    }

                    if ($courseMaterials->isNotEmpty()) {
                        $referenceText = substr(
                            $courseMaterials->pluck('extracted_text')->implode("\n\n---\n\n"),
                            0, 6000
                        );
                    }
                }

                // Without usable instructor-provided references, leave essays ungraded.
                if ($question->type === 'essay' && ! trim($referenceText ?? '')) {
                    SubmissionAnswer::updateOrCreate(
                        ['submission_id' => $submission->id, 'question_id' => $question->id],
                        [
                            'answer_text'      => $answerText,
                            'is_correct'       => null,
                            'points_earned'    => null,
                            'ai_feedback'      => null,
                            'criterion_scores' => null,
                        ]
                    );
                    $allAutoGradable = false;
                    $totalPoints += $question->points;
                    continue;
                }

                // Get rubric criteria if exists
                $rubricCriteria = [];
                $rubric = $question->rubric()->with('criteria')->first();
                if ($rubric && $rubric->criteria->isNotEmpty()) {
                    foreach ($rubric->criteria as $criterion) {
                        $rubricCriteria[] = [
                            'criterion'   => $criterion->criterion,
                            'description' => $criterion->description,
                            'max_points'  => $criterion->max_points,
                        ];
                    }
                }

                // Determine grading state
                $gradingState = 'pending_manual'; // default

                if (! $answerText || ! trim($answerText)) {
                    // Empty answer — 0 points
                    $pointsEarned = 0;
                    $isCorrect    = false;
                    $aiFeedback   = 'No answer was provided.';
                    $criterionScores = [];
                    $gradingState = 'graded';
                } else {
                    // Call AI service to grade the essay
                    try {
                        $payload = [
                            'question'         => $question->question_text,
                            'answer'           => $answerText,
                            'max_points'       => $question->points,
                            'reference_material' => $referenceText,
                            'rubric_criteria'  => $rubricCriteria,
                        ];

                        $aiResponse = \Illuminate\Support\Facades\Http::timeout(15)
                            ->post(env('AI_SERVICE_URL', 'http://127.0.0.1:8001') . '/grade-essay', $payload);

                        if ($aiResponse->successful()) {
                            $aiResult = $aiResponse->json();

                            // Check for explicit failure states from AI
                            if (isset($aiResult['status']) && $aiResult['status'] === 'ai_failed') {
                                $gradingState = 'ai_failed';
                                $aiFeedback   = $aiResult['feedback'] ?? 'AI grading failed. Pending instructor review.';
                                $criterionScores = [];
                            } else {
                                $pointsEarned = $aiResult['points_earned'] ?? null;
                                $aiFeedback   = $aiResult['feedback'] ?? null;
                                $criterionScores = $aiResult['criterion_scores'] ?? [];
                                $isCorrect    = $pointsEarned !== null && $pointsEarned >= ($question->points * 0.5);
                                $gradingState = 'graded';
                            }
                        } else {
                            $gradingState = 'ai_failed';
                            $aiFeedback   = 'AI grading service returned an error. Pending instructor review.';
                            $criterionScores = [];
                        }
                    } catch (\Exception $e) {
                        $gradingState = 'ai_failed';
                        $aiFeedback   = 'AI grading service is unavailable. Pending instructor review.';
                        $criterionScores = [];
                        \Log::warning("Essay grading AI failed: " . $e->getMessage());
                    }
                }

                // Only mark as auto-gradable if AI actually succeeded
                if ($gradingState !== 'graded' || $pointsEarned === null) {
                    $allAutoGradable = false;
                }

                SubmissionAnswer::updateOrCreate(
                    ['submission_id' => $submission->id, 'question_id' => $question->id],
                    [
                        'answer_text'      => $answerText,
                        'is_correct'       => $isCorrect ?? null,
                        'points_earned'    => $pointsEarned ?? null,
                        'ai_feedback'      => $aiFeedback,
                        'criterion_scores' => json_encode($criterionScores),
                    ]
                );

                if ($pointsEarned !== null) $totalScore += $pointsEarned;
                $totalPoints += $question->points;
                continue;
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
                $answer->makeHidden(['points_earned', 'is_correct']);
            });
        } elseif ($visibility === 'instructor_release') {
            // Scores exist but not visible until released
            $submission->makeHidden(['score', 'percentage', 'total_points']);
            $submission->answers->each(function ($answer) {
                $answer->makeHidden(['points_earned', 'is_correct']);
            });
        }

        return response()->json([
            'message'    => $allAutoGradable
                ? 'Assessment submitted and graded!'
                : 'Assessment submitted. Some answers are waiting to be graded by the instructor.',
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
        $user = $request->user();

        // Students can only see their own submissions
        if ($user->isStudent() && $submission->user_id !== $user->id) {
            return response()->json(['message' => 'You can only view your own submissions.'], 403);
        }

        if (! $user->isStudent() && ! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have access.'], 403);
        }

        $submission->load(['answers.question', 'user:id,first_name,last_name,email', 'assessment:id,score_visibility,scores_released_at']);

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
                    $answer->makeHidden(['points_earned', 'is_correct']);
                });
            } elseif ($visibility === 'instructor_release') {
                // Hide scores unless released
                if (!$assessment->scores_released_at) {
                    $submission->makeHidden(['score', 'percentage', 'total_points']);
                    $submission->answers->each(function ($answer) {
                        $answer->makeHidden(['points_earned', 'is_correct']);
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
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'Only instructors can grade submissions.'], 403);
        }

        if ($submission->assessment_id !== $assessment->id) {
            return response()->json(['message' => 'Submission not found for this assessment.'], 404);
        }

        $validated = $request->validate([
            'grades'                   => ['required', 'array', 'min:1'],
            'grades.*.question_id'     => ['required', 'exists:questions,id'],
            'grades.*.points_earned'   => ['required', 'numeric', 'min:0'],
            'grades.*.criterion_scores' => ['nullable', 'array'],
            'grades.*.ai_feedback'     => ['nullable', 'string'],
        ]);

        // Update each graded answer
        foreach ($validated['grades'] as $gradeData) {
            $answer = SubmissionAnswer::where('submission_id', $submission->id)
                ->where('question_id', $gradeData['question_id'])
                ->first();

            if ($answer) {
                $question = Question::find($gradeData['question_id']);
                $pointsEarned = min($gradeData['points_earned'], $question->points);
                
                // Prepare criterion scores if provided
                $criterionScores = null;
                if (isset($gradeData['criterion_scores']) && is_array($gradeData['criterion_scores'])) {
                    $criterionScores = json_encode($gradeData['criterion_scores']);
                }
                
                $answer->update([
                    'points_earned'    => $pointsEarned,
                    'is_correct'       => $pointsEarned > 0,
                    'ai_feedback'      => $gradeData['ai_feedback'] ?? null,
                    'criterion_scores' => $criterionScores,
                    'instructor_override' => true,
                ]);
            }
        }

        // Recalculate total score
        $totalEarned = $submission->answers()->sum('points_earned');
        $totalPoints = $assessment->questions()->sum('points');

        $submission->update([
            'score'        => $totalEarned,
            'total_points' => $totalPoints,
            'percentage'   => $totalPoints > 0
                ? round(($totalEarned / $totalPoints) * 100, 2)
                : 0,
            'status'       => 'graded',
            'graded_at'    => now(),
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
}
