<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Question;
use App\Models\Rubric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssessmentController extends Controller
{
    /**
     * LIST ALL ASSESSMENTS FOR A COURSE
     *
     * GET /api/courses/{course}/assessments
     * Optional query params: ?type=quiz (filter by type)
     *
     * Students see published only. Instructors/admins see all.
     */
    public function index(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $this->canAccessCourse($user, $course)) {
            return response()->json(['message' => 'You do not have access to this course.'], 403);
        }

        $query = $course->assessments()->withCount('questions');

        // Students only see published assessments
        if ($user->isStudent()) {
            $query->where('is_published', true);
        }

        // Optional filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $assessments = $query->orderBy('created_at', 'desc')->get();

        // For students, attach their submission count and best score
        if ($user->isStudent()) {
            $assessments->each(function ($assessment) use ($user) {
                $submissions = $assessment->submissions()
                    ->where('user_id', $user->id)
                    ->get();

                $visibility = $assessment->score_visibility ?? 'immediate';
                $scoresVisible = $visibility === 'immediate' ||
                    ($visibility === 'instructor_release' && $assessment->scores_released_at !== null);

                $assessment->my_attempts   = $submissions->count();
                $assessment->my_best_score = $scoresVisible ? $submissions->max('percentage') : null;
                $assessment->can_retake    = $submissions->count() < $assessment->max_attempts;
            });
        }

        return response()->json(['assessments' => $assessments]);
    }

    /**
     * CREATE AN ASSESSMENT
     *
     * POST /api/courses/{course}/assessments
     * Body: { title, description, type, topic, total_points,
     *         time_limit_minutes, max_attempts, available_from,
     *         due_date, is_published }
     */
    public function store(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to create assessments.'], 403);
        }

        $validated = $request->validate([
            'title'              => ['required', 'string', 'max:255'],
            'description'        => ['nullable', 'string'],
            'type'               => ['required', 'in:quiz,long_exam,individual_activity'],
            'topic'              => ['nullable', 'string', 'max:255'],
            'lesson_id'          => ['nullable', 'exists:lessons,id'],
            'time_limit_minutes' => ['nullable', 'integer', 'min:1'],
            'max_attempts'       => ['required', 'integer', 'min:1'],
            'available_from'     => ['nullable', 'date'],
            'due_date'           => ['nullable', 'date', 'after:available_from'],
            'is_published'       => ['nullable', 'boolean'],
            'score_visibility'   => ['nullable', 'in:immediate,instructor_release,hidden'],
        ]);

        // Total points will be calculated from questions, set to 0 initially
        $validated['total_points'] = 0;

        $assessment = $course->assessments()->create($validated);

        return response()->json([
            'message'    => 'Assessment created successfully.',
            'assessment' => $assessment,
        ], 201);
    }

    /**
     * VIEW A SINGLE ASSESSMENT WITH QUESTIONS
     *
     * GET /api/courses/{course}/assessments/{assessment}
     *
     * Students see questions WITHOUT correct answers.
     * Instructors see questions WITH correct answers.
     */
    public function show(Request $request, Course $course, Assessment $assessment): JsonResponse
    {
        $user = $request->user();

        if (! $this->canAccessCourse($user, $course)) {
            return response()->json(['message' => 'You do not have access to this course.'], 403);
        }

        if ($assessment->course_id !== $course->id) {
            return response()->json(['message' => 'Assessment not found in this course.'], 404);
        }

        if ($user->isStudent() && ! $assessment->is_published) {
            return response()->json(['message' => 'This assessment is not available yet.'], 403);
        }

        $assessment->load('questions.matchingPairs');

        // Hide correct answers from students
        if ($user->isStudent()) {
            $assessment->questions->each(function ($question) {
                $question->makeHidden('correct_answer');
                // For matching questions, hide correct_match from students
                if ($question->type === 'matching' && $question->matchingPairs) {
                    $question->matchingPairs->each(function ($pair) {
                        $pair->makeHidden('correct_match');
                    });
                }
            });
        }

        return response()->json(['assessment' => $assessment]);
    }

    /**
     * UPDATE AN ASSESSMENT
     *
     * PUT /api/courses/{course}/assessments/{assessment}
     */
    public function update(Request $request, Course $course, Assessment $assessment): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to update assessments.'], 403);
        }

        if ($assessment->course_id !== $course->id) {
            return response()->json(['message' => 'Assessment not found in this course.'], 404);
        }

        $validated = $request->validate([
            'title'              => ['sometimes', 'string', 'max:255'],
            'description'        => ['nullable', 'string'],
            'type'               => ['sometimes', 'in:quiz,long_exam,individual_activity'],
            'topic'              => ['nullable', 'string', 'max:255'],
            'lesson_id'          => ['nullable', 'exists:lessons,id'],
            'time_limit_minutes' => ['nullable', 'integer', 'min:1'],
            'max_attempts'       => ['sometimes', 'integer', 'min:1'],
            'available_from'     => ['nullable', 'date'],
            'due_date'           => ['nullable', 'date'],
            'is_published'       => ['sometimes', 'boolean'],
            'score_visibility'   => ['sometimes', 'in:immediate,instructor_release,hidden'],
        ]);

        $assessment->update($validated);
        
        // Recalculate total_points from questions
        $totalPoints = $assessment->questions()->sum('points');
        $assessment->update(['total_points' => $totalPoints]);

        return response()->json([
            'message'    => 'Assessment updated successfully.',
            'assessment' => $assessment,
        ]);
    }

    /**
     * DELETE AN ASSESSMENT
     *
     * DELETE /api/courses/{course}/assessments/{assessment}
     */
    public function destroy(Request $request, Course $course, Assessment $assessment): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to delete assessments.'], 403);
        }

        if ($assessment->course_id !== $course->id) {
            return response()->json(['message' => 'Assessment not found in this course.'], 404);
        }

        $assessment->delete();

        return response()->json(['message' => 'Assessment deleted successfully.']);
    }

    // =============================================================
    // QUESTIONS
    // =============================================================

    /**
     * ADD A QUESTION TO AN ASSESSMENT
     *
     * POST /api/courses/{course}/assessments/{assessment}/questions
     * Body: { question_text, type, options, correct_answer, points, order }
     */
    public function addQuestion(Request $request, Course $course, Assessment $assessment): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to add questions.'], 403);
        }

        if ($assessment->course_id !== $course->id) {
            return response()->json(['message' => 'Assessment not found in this course.'], 404);
        }

        $validated = $request->validate([
            'question_text'  => ['required', 'string'],
            'type'           => ['required', 'in:multiple_choice,true_false,short_answer,essay,matching'],
            'options'        => ['nullable', 'array'],
            'options.*'      => ['string'],
            'correct_answer' => ['nullable', 'string'],
            'points'         => ['nullable', 'numeric', 'min:0.01'],
            'order'          => ['nullable', 'integer', 'min:0'],
            'matching_pairs'                 => ['nullable', 'array', 'min:2'],
            'matching_pairs.*.left_item'     => ['required_with:matching_pairs', 'string'],
            'matching_pairs.*.right_item'    => ['required_with:matching_pairs', 'string'],
            'matching_pairs.*.correct_match' => ['required_with:matching_pairs', 'string'],
        ]);

        // Require options for multiple choice
        if ($validated['type'] === 'multiple_choice') {
            if (empty($validated['options']) || count($validated['options']) < 2) {
                return response()->json(['message' => 'Multiple choice questions require at least 2 options.'], 422);
            }
            if (empty($validated['correct_answer'])) {
                return response()->json(['message' => 'Multiple choice questions require a correct answer.'], 422);
            }
        }

        // Require pairs for matching
        if ($validated['type'] === 'matching') {
            if (empty($validated['matching_pairs']) || count($validated['matching_pairs']) < 2) {
                return response()->json(['message' => 'Matching questions require at least 2 pairs.'], 422);
            }
        }

        // Auto-set order if not provided
        if (! isset($validated['order'])) {
            $validated['order'] = $assessment->questions()->count();
        }

        $question = $assessment->questions()->create($validated);

        // Create matching pairs if this is a matching question
        if ($validated['type'] === 'matching' && !empty($validated['matching_pairs'])) {
            foreach ($validated['matching_pairs'] as $index => $pairData) {
                $question->matchingPairs()->create([
                    'left_item'     => $pairData['left_item'],
                    'right_item'    => $pairData['right_item'],
                    'correct_match' => $pairData['correct_match'],
                    'order'         => $index,
                ]);
            }
            // Reload pairs for the response
            $question->load('matchingPairs');
        }

        // Recalculate assessment total_points
        $assessment->update(['total_points' => $assessment->questions()->sum('points')]);

        return response()->json([
            'message'  => 'Question added successfully.',
            'question' => $question,
        ], 201);
    }

    /**
     * ADD MULTIPLE QUESTIONS AT ONCE (BULK)
     *
     * POST /api/courses/{course}/assessments/{assessment}/questions/bulk
     * Body: { questions: [ { question_text, type, options, correct_answer, points }, ... ] }
     *
     * Faster than adding one at a time when creating a full quiz.
     */
    public function addQuestionsBulk(Request $request, Course $course, Assessment $assessment): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to add questions.'], 403);
        }

        if ($assessment->course_id !== $course->id) {
            return response()->json(['message' => 'Assessment not found in this course.'], 404);
        }

        $validated = $request->validate([
            'questions'                  => ['required', 'array', 'min:1'],
            'questions.*.question_text'  => ['required', 'string'],
            'questions.*.type'           => ['required', 'in:multiple_choice,true_false,short_answer,essay,matching'],
            'questions.*.options'        => ['nullable', 'array'],
            'questions.*.correct_answer' => ['nullable', 'string'],
            'questions.*.points'         => ['nullable', 'numeric', 'min:0.01'],
            'questions.*.matching_pairs'                 => ['nullable', 'array', 'min:2'],
            'questions.*.matching_pairs.*.left_item'     => ['required_with:questions.*.matching_pairs', 'string'],
            'questions.*.matching_pairs.*.right_item'    => ['required_with:questions.*.matching_pairs', 'string'],
            'questions.*.matching_pairs.*.correct_match' => ['required_with:questions.*.matching_pairs', 'string'],
        ]);

        $startOrder = $assessment->questions()->count();
        $created = [];

        foreach ($validated['questions'] as $index => $questionData) {
            $questionData['order'] = $startOrder + $index;
            
            // Extract matching pairs if present
            $matchingPairs = $questionData['matching_pairs'] ?? null;
            unset($questionData['matching_pairs']);
            
            $question = $assessment->questions()->create($questionData);
            
            // Create matching pairs if this is a matching question
            if ($question->type === 'matching' && !empty($matchingPairs)) {
                foreach ($matchingPairs as $pairIndex => $pairData) {
                    $question->matchingPairs()->create([
                        'left_item'     => $pairData['left_item'],
                        'right_item'    => $pairData['right_item'],
                        'correct_match' => $pairData['correct_match'],
                        'order'         => $pairIndex,
                    ]);
                }
                // Reload pairs for the response
                $question->load('matchingPairs');
            }
            
            $created[] = $question;
        }

        // Recalculate assessment total_points
        $assessment->update(['total_points' => $assessment->questions()->sum('points')]);

        return response()->json([
            'message'   => count($created) . ' questions added successfully.',
            'questions' => $created,
        ], 201);
    }

    /**
     * UPDATE A QUESTION
     *
     * PUT /api/courses/{course}/assessments/{assessment}/questions/{question}
     */
    public function updateQuestion(Request $request, Course $course, Assessment $assessment, Question $question): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to update questions.'], 403);
        }

        if ($question->assessment_id !== $assessment->id) {
            return response()->json(['message' => 'Question not found in this assessment.'], 404);
        }

        $validated = $request->validate([
            'question_text'  => ['sometimes', 'string'],
            'type'           => ['sometimes', 'in:multiple_choice,true_false,short_answer,essay,matching'],
            'options'        => ['nullable', 'array'],
            'correct_answer' => ['nullable', 'string'],
            'points'         => ['sometimes', 'numeric', 'min:0.01'],
            'order'          => ['sometimes', 'integer', 'min:0'],
            'matching_pairs'                 => ['nullable', 'array', 'min:2'],
            'matching_pairs.*.left_item'     => ['required_with:matching_pairs', 'string'],
            'matching_pairs.*.right_item'    => ['required_with:matching_pairs', 'string'],
            'matching_pairs.*.correct_match' => ['required_with:matching_pairs', 'string'],
        ]);

        $question->update($validated);

        // Update matching pairs if provided and this is a matching question
        if (isset($validated['matching_pairs']) && $question->type === 'matching') {
            // Delete existing pairs
            $question->matchingPairs()->delete();
            
            // Create new pairs
            foreach ($validated['matching_pairs'] as $index => $pairData) {
                $question->matchingPairs()->create([
                    'left_item'     => $pairData['left_item'],
                    'right_item'    => $pairData['right_item'],
                    'correct_match' => $pairData['correct_match'],
                    'order'         => $index,
                ]);
            }
            
            // Reload pairs for the response
            $question->load('matchingPairs');
        }

        // Recalculate assessment total_points
        $question->assessment->update(['total_points' => $question->assessment->questions()->sum('points')]);

        return response()->json([
            'message'  => 'Question updated successfully.',
            'question' => $question,
        ]);
    }

    /**
     * DELETE A QUESTION
     *
     * DELETE /api/courses/{course}/assessments/{assessment}/questions/{question}
     */
    public function deleteQuestion(Request $request, Course $course, Assessment $assessment, Question $question): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to delete questions.'], 403);
        }

        if ($question->assessment_id !== $assessment->id) {
            return response()->json(['message' => 'Question not found in this assessment.'], 404);
        }

        $assessmentId = $question->assessment_id;
        $question->delete();

        // Recalculate assessment total_points
        $assessment = Assessment::find($assessmentId);
        if ($assessment) {
            $assessment->update(['total_points' => $assessment->questions()->sum('points')]);
        }

        return response()->json(['message' => 'Question deleted successfully.']);
    }

    /**
     * RELEASE SCORES FOR AN ASSESSMENT
     *
     * POST /api/courses/{course}/assessments/{assessment}/release-scores
     *
     * Releases scores for assessments with 'instructor_release' visibility.
     */
    public function releaseScores(Request $request, Course $course, Assessment $assessment): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to release scores.'], 403);
        }

        if ($assessment->course_id !== $course->id) {
            return response()->json(['message' => 'Assessment not found in this course.'], 404);
        }

        if ($assessment->score_visibility !== 'instructor_release') {
            return response()->json([
                'message' => 'This assessment does not have instructor_release visibility.',
            ], 422);
        }

        if ($assessment->scores_released_at) {
            return response()->json([
                'message' => 'Scores have already been released for this assessment.',
            ], 422);
        }

        $assessment->update([
            'scores_released_at' => now(),
        ]);

        return response()->json([
            'message'    => 'Scores released successfully.',
            'assessment' => $assessment,
        ]);
    }

    /**
     * CREATE OR UPDATE RUBRIC FOR AN ESSAY QUESTION
     *
     * POST /api/courses/{course}/assessments/{assessment}/questions/{question}/rubric
     * Body: { title?, description?, criteria: [{ criterion, description, max_points }] }
     *
     * Creates or updates grading rubric for essay questions.
     */
    public function saveRubric(Request $request, Course $course, Assessment $assessment, Question $question): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to manage rubrics.'], 403);
        }

        if ($question->assessment_id !== $assessment->id || $assessment->course_id !== $course->id) {
            return response()->json(['message' => 'Question not found in this assessment.'], 404);
        }

        if ($question->type !== 'essay') {
            return response()->json(['message' => 'Rubrics can only be created for essay questions.'], 422);
        }

        $validated = $request->validate([
            'title'       => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'criteria'    => ['required', 'array', 'min:1'],
            'criteria.*.criterion'   => ['required', 'string', 'max:255'],
            'criteria.*.description' => ['required', 'string'],
            'criteria.*.max_points'  => ['required', 'numeric', 'min:0.01'],
        ]);

        // Delete existing rubric if it exists
        $question->rubric()?->delete();

        // Create new rubric
        $rubric = \App\Models\Rubric::create([
            'question_id' => $question->id,
            'title'       => $validated['title'] ?? null,
            'description' => $validated['description'] ?? null,
        ]);

        // Create criteria
        foreach ($validated['criteria'] as $index => $criterionData) {
            $rubric->criteria()->create([
                'criterion'   => $criterionData['criterion'],
                'description' => $criterionData['description'],
                'max_points'  => $criterionData['max_points'],
                'order'       => $index,
            ]);
        }

        $rubric->load('criteria');

        return response()->json([
            'message' => 'Rubric saved successfully.',
            'rubric'  => $rubric,
        ], 201);
    }

    /**
     * GET RUBRIC FOR A QUESTION
     *
     * GET /api/courses/{course}/assessments/{assessment}/questions/{question}/rubric
     */
    public function getRubric(Request $request, Course $course, Assessment $assessment, Question $question): JsonResponse
    {
        $user = $request->user();

        if (! $this->canAccessCourse($user, $course)) {
            return response()->json(['message' => 'You do not have access to this course.'], 403);
        }

        if ($question->assessment_id !== $assessment->id || $assessment->course_id !== $course->id) {
            return response()->json(['message' => 'Question not found in this assessment.'], 404);
        }

        $rubric = $question->rubric()?->with('criteria')->first();

        if (! $rubric) {
            return response()->json(null);
        }

        return response()->json($rubric);
    }

    /**
     * DELETE RUBRIC FOR A QUESTION
     *
     * DELETE /api/courses/{course}/assessments/{assessment}/questions/{question}/rubric
     */
    public function deleteRubric(Request $request, Course $course, Assessment $assessment, Question $question): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to delete rubrics.'], 403);
        }

        if ($question->assessment_id !== $assessment->id || $assessment->course_id !== $course->id) {
            return response()->json(['message' => 'Question not found in this assessment.'], 404);
        }

        $rubric = $question->rubric()?->first();

        if (! $rubric) {
            return response()->json(['message' => 'No rubric found for this question.'], 404);
        }

        $rubric->delete();

        return response()->json(['message' => 'Rubric deleted successfully.']);
    }

    // -------------------------------------------------------
    // HELPER METHODS
    // -------------------------------------------------------

    private function canAccessCourse($user, $course): bool
    {
        if ($user->isAdmin()) return true;
        if ($user->isInstructor() && $course->instructor_id === $user->id) return true;
        if ($user->isStudent()) {
            return Enrollment::where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->where('status', 'active')
                ->exists();
        }
        return false;
    }

    private function canManageCourse($user, $course): bool
    {
        if ($user->isAdmin()) return true;
        if ($user->isInstructor() && $course->instructor_id === $user->id) return true;
        return false;
    }
}
