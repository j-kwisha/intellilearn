<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Question;
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

                $assessment->my_attempts = $submissions->count();
                $assessment->my_best_score = $submissions->max('percentage');
                $assessment->can_retake = $submissions->count() < $assessment->max_attempts;
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
            'total_points'       => ['nullable', 'numeric', 'min:1'],
            'time_limit_minutes' => ['nullable', 'integer', 'min:1'],
            'max_attempts'       => ['nullable', 'integer', 'min:1'],
            'available_from'     => ['nullable', 'date'],
            'due_date'           => ['nullable', 'date', 'after:available_from'],
            'is_published'       => ['nullable', 'boolean'],
        ]);

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

        $assessment->load('questions');

        // Hide correct answers from students
        if ($user->isStudent()) {
            $assessment->questions->each(function ($question) {
                $question->makeHidden('correct_answer');
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
            'total_points'       => ['sometimes', 'numeric', 'min:1'],
            'time_limit_minutes' => ['nullable', 'integer', 'min:1'],
            'max_attempts'       => ['sometimes', 'integer', 'min:1'],
            'available_from'     => ['nullable', 'date'],
            'due_date'           => ['nullable', 'date'],
            'is_published'       => ['sometimes', 'boolean'],
        ]);

        $assessment->update($validated);

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
            'type'           => ['required', 'in:multiple_choice,true_false,short_answer,essay'],
            'options'        => ['nullable', 'array'],
            'options.*'      => ['string'],
            'correct_answer' => ['nullable', 'string'],
            'points'         => ['nullable', 'numeric', 'min:0.01'],
            'order'          => ['nullable', 'integer', 'min:0'],
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

        // Auto-set order if not provided
        if (! isset($validated['order'])) {
            $validated['order'] = $assessment->questions()->count();
        }

        $question = $assessment->questions()->create($validated);

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
            'questions.*.type'           => ['required', 'in:multiple_choice,true_false,short_answer,essay'],
            'questions.*.options'        => ['nullable', 'array'],
            'questions.*.correct_answer' => ['nullable', 'string'],
            'questions.*.points'         => ['nullable', 'numeric', 'min:0.01'],
        ]);

        $startOrder = $assessment->questions()->count();
        $created = [];

        foreach ($validated['questions'] as $index => $questionData) {
            $questionData['order'] = $startOrder + $index;
            $created[] = $assessment->questions()->create($questionData);
        }

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
            'type'           => ['sometimes', 'in:multiple_choice,true_false,short_answer,essay'],
            'options'        => ['nullable', 'array'],
            'correct_answer' => ['nullable', 'string'],
            'points'         => ['sometimes', 'numeric', 'min:0.01'],
            'order'          => ['sometimes', 'integer', 'min:0'],
        ]);

        $question->update($validated);

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

        $question->delete();

        return response()->json(['message' => 'Question deleted successfully.']);
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
