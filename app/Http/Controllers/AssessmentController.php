<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Question;
use App\Models\Rubric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\RubricService;
use App\Services\EssayReferenceService;
use App\Services\DocumentTextService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

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
            'type'               => ['required', 'in:quiz,long_exam,individual_activity,paper_based'],
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

        // Handle file upload for paper_based assessments
        if ($validated['type'] === 'paper_based' && $request->hasFile('file')) {
            $filePath = $this->uploadAssessmentFile($request->file('file'), $course->id, $assessment->id);
            if ($filePath) {
                $assessment->update(['file_path' => $filePath]);
            }
        }

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

        if (!$user->isStudent()) {
            $assessment->load('questions.rubric.criteria.levels');
            $assessment->questions->each(fn ($q) => $q->makeVisible(['reference_text', 'reference_file', 'rubric']));
        }

        // Hide correct answers from students
        if ($user->isStudent()) {
            $assessment->questions->each(function ($question) {
                $question->makeHidden(['correct_answer', 'reference_text', 'reference_file', 'rubric']);
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
            'type'               => ['sometimes', 'in:quiz,long_exam,individual_activity,paper_based'],
            'topic'              => ['nullable', 'string', 'max:255'],
            'lesson_id'          => ['nullable', 'exists:lessons,id'],
            'time_limit_minutes' => ['nullable', 'integer', 'min:1'],
            'max_attempts'       => ['sometimes', 'integer', 'min:1'],
            'available_from'     => ['nullable', 'date'],
            'due_date'           => ['nullable', 'date'],
            'is_published'       => ['sometimes', 'boolean'],
            'score_visibility'   => ['sometimes', 'in:immediate,instructor_release,hidden'],
        ]);

        if ($validated['is_published'] ?? false) {
            foreach ($assessment->questions()->where('type', 'essay')->with('rubric.criteria.levels')->get() as $essay) {
                if (!$essay->rubric) {
                    throw ValidationException::withMessages(['rubric' => 'Save a grading rubric for every essay before publishing.']);
                }
                app(RubricService::class)->validate(app(RubricService::class)->snapshot($essay->rubric), (float) $essay->points);
            }
        }
        $assessment->update($validated);

        // Handle file upload for paper_based assessments
        if ($request->hasFile('file')) {
            $filePath = $this->uploadAssessmentFile($request->file('file'), $course->id, $assessment->id);
            if ($filePath) {
                $assessment->update(['file_path' => $filePath]);
            }
        }

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
            'reference_lesson_id'            => ['nullable', 'exists:lessons,id'],
            'reference_text'                 => ['nullable', 'string', 'max:24000'],
            'reference_file' => ['nullable', 'array'],
            'rubric' => ['nullable', 'array'],
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

        $rubricData = $this->questionRubric($validated, $assessment);
        unset($validated['rubric']);
        $question = DB::transaction(function () use ($assessment, $validated, $rubricData, $user) {
            $question = $assessment->questions()->create($validated);
            if ($rubricData) app(RubricService::class)->save($question, $rubricData, $user->id);
            return $question;
        });

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
            'questions.*.matching_pairs.*.left_item'     => ['nullable', 'string'],
            'questions.*.matching_pairs.*.right_item'    => ['nullable', 'string'],
            'questions.*.matching_pairs.*.correct_match' => ['nullable', 'string'],
            'questions.*.reference_lesson_id'            => ['nullable', 'exists:lessons,id'],
            'questions.*.reference_text'                 => ['nullable', 'string', 'max:24000'],
            'questions.*.reference_file' => ['nullable', 'array'],
            'questions.*.rubric' => ['nullable', 'array'],
        ]);

        // Validate the entire batch before creating any question.
        foreach ($validated['questions'] as &$data) {
            $data['rubric'] = $this->questionRubric($data, $assessment);
        }
        unset($data);
        $created = DB::transaction(function () use ($validated, $assessment, $user) {
            $startOrder = $assessment->questions()->count();
            $created = [];
            foreach ($validated['questions'] as $index => $questionData) {
                $questionData['order'] = $startOrder + $index;
                $pairs = $questionData['matching_pairs'] ?? [];
                $rubric = $questionData['rubric'];
                unset($questionData['matching_pairs'], $questionData['rubric']);
                $question = $assessment->questions()->create($questionData);
                if ($rubric) app(RubricService::class)->save($question, $rubric, $user->id);
                if ($question->type === 'matching') {
                    foreach ($pairs as $order => $pair) {
                        $question->matchingPairs()->create([
                            'left_item' => $pair['left_item'], 'right_item' => $pair['right_item'],
                            'correct_match' => $pair['correct_match'] ?? $pair['right_item'], 'order' => $order,
                        ]);
                    }
                    $question->load('matchingPairs');
                }
                $created[] = $question;
            }
            return $created;
        });

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

        if ($question->assessment_id !== $assessment->id || $assessment->course_id !== $course->id) {
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
            'reference_lesson_id'            => ['nullable', 'exists:lessons,id'],
            'reference_text'                 => ['nullable', 'string', 'max:24000'],
            'reference_file' => ['nullable', 'array'],
            'rubric' => ['nullable', 'array'],
        ]);

        $effective = array_merge($question->getAttributes(), $validated);
        $effective['reference_file'] = $validated['reference_file'] ?? $question->reference_file;
        if (!array_key_exists('rubric', $validated) && $question->rubric) {
            $effective['rubric'] = app(RubricService::class)->snapshot($question->rubric);
        }
        $rubric = $this->questionRubric($effective, $assessment);
        $saveRubric = array_key_exists('rubric', $validated);
        unset($validated['rubric']);
        DB::transaction(function () use ($question, $validated, $rubric, $saveRubric, $user) {
            $question->update($validated);
            if ($saveRubric && $rubric) app(RubricService::class)->save($question, $rubric, $user->id);
            elseif ($saveRubric || $question->type !== 'essay') $question->rubric()->delete();
        });


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
     * UPLOAD FILE FOR PAPER-BASED ASSESSMENT
     */
    public function uploadFile(Request $request, Course $course, Assessment $assessment): JsonResponse
    {
        if (! $this->canManageCourse($request->user(), $course)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        $request->validate(['file' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:102400']]);
        $filePath = $this->uploadAssessmentFile($request->file('file'), $course->id, $assessment->id);
        if (! $filePath) {
            return response()->json(['message' => 'File upload failed.'], 500);
        }
        $assessment->update(['file_path' => $filePath]);
        return response()->json(['file_url' => $assessment->fresh()->file_url]);
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
     * GENERATE AN EDITABLE RUBRIC DRAFT (does not save it)
     *
     * POST /api/courses/{course}/assessments/{assessment}/rubric/generate
     *
     * Only the teacher's subsequent save activates the rubric.
     */
    public function generateRubric(Request $request, Course $course, Assessment $assessment): JsonResponse
    {
        if (!$this->canManageCourse($request->user(), $course)) abort(403);
        if ($assessment->course_id !== $course->id) abort(404);
        $data = $request->validate([
            'question_text' => ['required', 'string', 'max:10000'],
            'points' => ['required', 'numeric', 'min:0.01', 'max:999.99'],
            'reference_text' => ['nullable', 'string', 'max:24000'],
            'reference_lesson_id' => ['nullable', 'integer'],
            'instructions' => ['nullable', 'string', 'max:4000'],
            'learning_objective' => ['nullable', 'string', 'max:4000'],
        ]);
        $reference = app(EssayReferenceService::class)->resolve($data, $course->id);
        if (trim($reference['text']) === '') {
            throw ValidationException::withMessages(['reference' => 'Attach readable reference content before generating a rubric.']);
        }
        try {
            $response = Http::timeout(60)->post(rtrim(env('AI_SERVICE_URL', 'http://127.0.0.1:8001'), '/') . '/generate-rubric', [
                'question' => $data['question_text'], 'max_points' => $data['points'],
                'reference_material' => $reference['text'],
                'instructions' => $data['instructions'] ?? $assessment->description ?? '',
                'learning_objective' => $data['learning_objective'] ?? '',
            ])->throw()->json();
            $response['source'] = 'ai_generated';
            $draft = app(RubricService::class)->validate($response, (float) $data['points']);
            // A generated draft is never saved or activated until the teacher saves it.
            return response()->json(['rubric' => $draft, 'reference_truncated' => $reference['truncated']]);
        } catch (\Throwable $e) {
            \Log::warning('Rubric generation failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'AI could not generate a valid rubric. Try again or create one manually.'], 502);
        }
    }

    private function questionRubric(array $data, Assessment $assessment): ?array
    {
        app(EssayReferenceService::class)->resolve($data, $assessment->course_id);
        if (($data['type'] ?? '') !== 'essay') return null;
        if (!empty($data['rubric'])) {
            return app(RubricService::class)->validate($data['rubric'], (float) ($data['points'] ?? 1));
        }
        if ($assessment->is_published) {
            throw ValidationException::withMessages(['rubric' => 'Save a rubric before adding an essay to a published assessment.']);
        }
        return null;
    }

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

        $data = $request->all();
        $rubric = app(RubricService::class)->save($question, $data, $user->id);

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

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have access to this course.'], 403);
        }

        if ($question->assessment_id !== $assessment->id || $assessment->course_id !== $course->id) {
            return response()->json(['message' => 'Question not found in this assessment.'], 404);
        }

        $rubric = $question->rubric()?->with('criteria.levels')->first();

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

        if ($assessment->is_published && $question->type === 'essay') {
            throw ValidationException::withMessages(['rubric' => 'Unpublish the assessment before removing its essay rubric.']);
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

    /**
     * Upload a PDF/DOCX file for a paper-based assessment to Cloudinary.
     * Returns the file URL on success, null on failure.
     */
    private function uploadAssessmentFile($file, int $courseId, int $assessmentId): ?string
    {
        try {
            // Store locally for reliability  
            $folder = "assessments/course_{$courseId}/assessment_{$assessmentId}";
            $stored = $file->store($folder, 'public');
            return \Illuminate\Support\Facades\Storage::disk('public')->url($stored);
        } catch (\Exception $e) {
            \Log::error('Assessment file upload failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * UPLOAD REFERENCE FILE FOR ESSAY QUESTIONS
     *
     * POST /api/courses/{course}/upload-reference-text
     * Body: { reference_file }
     *
     * Uploads file, extracts text, and returns extracted text for AI grading reference.
     */
    public function uploadReferenceText(Request $request, Course $course): JsonResponse
    {
        try {
            \Log::info('uploadReferenceText: Request received', [
                'course_id' => $course->id,
                'user_id' => $request->user()->id,
                'has_file' => $request->hasFile('reference_file')
            ]);

            $user = $request->user();

            if (!$this->canManageCourse($user, $course)) {
                \Log::warning('uploadReferenceText: Unauthorized user');
                return response()->json(['message' => 'Only instructors can upload reference files.'], 403);
            }

            \Log::info('uploadReferenceText: Starting file validation');
            $validated = $request->validate([
                'reference_file' => ['required', 'file', 'mimes:pdf,doc,docx,txt', 'max:10240'], // 10MB max
            ]);
            \Log::info('uploadReferenceText: File validation passed');

            $file = $validated['reference_file'];
            \Log::info('uploadReferenceText: File details', [
                'name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'mime' => $file->getMimeType(),
                'extension' => $file->getClientOriginalExtension()
            ]);

            $extractedText = app(DocumentTextService::class)->extract($file);

            \Log::info('uploadReferenceText: Preparing response');
            return response()->json([
                'success' => true,
                'extracted_text' => $extractedText,
                'filename' => $file->getClientOriginalName(),
                'reference_file' => ['filename' => $file->getClientOriginalName(), 'sha256' => hash_file('sha256', $file->getRealPath())],
                'file_size' => $file->getSize(),
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('uploadReferenceText: Validation exception', [
                'errors' => $e->errors(),
                'message' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'File validation failed',
                'debug_error' => $e->getMessage(),
                'debug_errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            // Force logging to stderr for Railway capture
            error_log("LARAVEL EXCEPTION: uploadReferenceText failed");
            error_log("Exception Class: " . get_class($e));
            error_log("Exception Message: " . $e->getMessage());
            error_log("Exception File: " . $e->getFile() . ":" . $e->getLine());
            error_log("Exception Trace: " . $e->getTraceAsString());
            
            \Log::error('uploadReferenceText: General exception', [
                'error' => $e->getMessage(),
                'class' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to extract text from file. Please try again or paste text manually.',
                'debug_error' => $e->getMessage(),
                'debug_class' => get_class($e),
                'debug_location' => $e->getFile() . ':' . $e->getLine()
            ], 500);
        }
    }
}
