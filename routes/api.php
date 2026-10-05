<?php

use App\Http\Controllers\AiController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\LessonController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\SubmissionController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\ProfileController;
use App\Models\CourseMaterial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Foundation\Auth\EmailVerificationRequest;

// =============================================================
// PUBLIC ROUTES
// =============================================================

// Health check for Railway
Route::get('/health', fn() => response()->json(['status' => 'ok']));

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// Google OAuth Routes
Route::get('/auth/google/redirect', [\App\Http\Controllers\SocialAuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [\App\Http\Controllers\SocialAuthController::class, 'handleGoogleCallback']);

Route::get('/verify-email/{id}/{hash}', function (Request $request, $id, $hash) {
    $user = \App\Models\User::findOrFail($id);
    $frontend = env('FRONTEND_URL', 'http://localhost:5173');

    // Validate the signed URL
    if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
        return redirect("{$frontend}/verify-email?status=error");
    }

    if (! $request->hasValidSignature()) {
        return redirect("{$frontend}/verify-email?status=error");
    }

    if ($user->hasVerifiedEmail()) {
        return redirect("{$frontend}/verify-email?status=already");
    }

    $user->markEmailAsVerified();

    return redirect("{$frontend}/verify-email?status=success");
})->middleware(['signed'])->name('verification.verify');


// =============================================================
// PROTECTED ROUTES
// =============================================================

Route::middleware('auth:sanctum')->group(function () {

    // --- AUTH ---
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/email/resend', [AuthController::class, 'resendVerification']);

    // --- PROFILE ---
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'changePassword']);

    // --- GOOGLE OAUTH (Protected) ---
    Route::get('/auth/google/link/redirect', [\App\Http\Controllers\SocialAuthController::class, 'redirectToGoogleLink']);
    Route::post('/auth/google/link', [\App\Http\Controllers\SocialAuthController::class, 'linkGoogleAccount']);
    Route::post('/auth/google/unlink', [\App\Http\Controllers\SocialAuthController::class, 'unlinkGoogleAccount']);

    // --- COURSES ---
    Route::get('/courses', [CourseController::class, 'index']);
    Route::post('/courses', [CourseController::class, 'store']);
    Route::post('/courses/join', [CourseController::class, 'joinByCode']);
    Route::get('/courses/{course}', [CourseController::class, 'show']);
    Route::put('/courses/{course}', [CourseController::class, 'update']);
    Route::delete('/courses/{course}', [CourseController::class, 'destroy']);
    Route::post('/courses/{course}/enroll', [CourseController::class, 'enroll']);
    Route::post('/courses/{course}/unenroll', [CourseController::class, 'unenroll']);
    Route::get('/courses/{course}/students', [CourseController::class, 'students']);
    Route::post('/courses/{course}/generate-code', [CourseController::class, 'generateCode']);
    Route::delete('/courses/{course}/join-code', [CourseController::class, 'revokeCode']);

    // --- COURSE MATERIALS ---
    Route::get('/courses/{course}/materials', [CourseController::class, 'getCourseMaterials']);
    Route::post('/courses/{course}/materials', [CourseController::class, 'uploadCourseMaterial']);
    Route::delete('/courses/{course}/materials/{material}', [CourseController::class, 'deleteCourseMaterial']);

    // --- LESSONS ---
    Route::get('/courses/{course}/lessons', [LessonController::class, 'index']);
    Route::post('/courses/{course}/lessons', [LessonController::class, 'store']);
    Route::get('/courses/{course}/lessons/{lesson}', [LessonController::class, 'show']);
    Route::put('/courses/{course}/lessons/{lesson}', [LessonController::class, 'update']);
    Route::delete('/courses/{course}/lessons/{lesson}', [LessonController::class, 'destroy']);

    // --- LESSON MATERIALS ---
    Route::post('/courses/{course}/lessons/{lesson}/materials', [LessonController::class, 'uploadMaterial']);
    Route::delete('/courses/{course}/lessons/{lesson}/materials/{material}', [LessonController::class, 'deleteMaterial']);

    // --- LESSON PROGRESS ---
    Route::put('/courses/{course}/lessons/{lesson}/progress', [LessonController::class, 'updateProgress']);
    Route::get('/courses/{course}/progress', [LessonController::class, 'courseProgress']);

    // --- ASSESSMENTS ---
    Route::get('/courses/{course}/assessments', [AssessmentController::class, 'index']);
    Route::post('/courses/{course}/assessments', [AssessmentController::class, 'store']);
    Route::get('/courses/{course}/assessments/{assessment}', [AssessmentController::class, 'show']);
    Route::put('/courses/{course}/assessments/{assessment}', [AssessmentController::class, 'update']);
    Route::delete('/courses/{course}/assessments/{assessment}', [AssessmentController::class, 'destroy']);
    Route::post('/courses/{course}/assessments/{assessment}/upload-file', [AssessmentController::class, 'uploadFile']);
    Route::post('/courses/{course}/upload-reference-text', [AssessmentController::class, 'uploadReferenceText']);
    Route::post('/courses/{course}/assessments/{assessment}/release-scores', [AssessmentController::class, 'releaseScores']);

    // --- QUESTIONS ---
    Route::post('/courses/{course}/assessments/{assessment}/questions', [AssessmentController::class, 'addQuestion']);
    Route::post('/courses/{course}/assessments/{assessment}/questions/bulk', [AssessmentController::class, 'addQuestionsBulk']);
    Route::put('/courses/{course}/assessments/{assessment}/questions/{question}', [AssessmentController::class, 'updateQuestion']);
    Route::delete('/courses/{course}/assessments/{assessment}/questions/{question}', [AssessmentController::class, 'deleteQuestion']);

    // --- RUBRICS ---
    Route::post('/courses/{course}/assessments/{assessment}/questions/{question}/rubric', [AssessmentController::class, 'saveRubric']);
    Route::get('/courses/{course}/assessments/{assessment}/questions/{question}/rubric', [AssessmentController::class, 'getRubric']);
    Route::delete('/courses/{course}/assessments/{assessment}/questions/{question}/rubric', [AssessmentController::class, 'deleteRubric']);

    // --- SUBMISSIONS & GRADING ---
    Route::post('/courses/{course}/assessments/{assessment}/start', [SubmissionController::class, 'start']);
    Route::post('/courses/{course}/assessments/{assessment}/submit', [SubmissionController::class, 'submit']);
    Route::get('/courses/{course}/assessments/{assessment}/submissions', [SubmissionController::class, 'index']);
    Route::get('/courses/{course}/assessments/{assessment}/submissions/{submission}', [SubmissionController::class, 'show']);
    Route::put('/courses/{course}/assessments/{assessment}/submissions/{submission}/grade', [SubmissionController::class, 'grade']);

    // --- ANNOUNCEMENTS ---
    Route::get('/courses/{course}/announcements', [AnnouncementController::class, 'index']);
    Route::post('/courses/{course}/announcements', [AnnouncementController::class, 'store']);
    Route::put('/courses/{course}/announcements/{announcement}', [AnnouncementController::class, 'update']);
    Route::delete('/courses/{course}/announcements/{announcement}', [AnnouncementController::class, 'destroy']);

    // --- CALENDAR ---
    Route::get('/calendar', [CalendarController::class, 'index']);
    Route::post('/courses/{course}/calendar', [CalendarController::class, 'store']);
    Route::put('/calendar/{calendarEvent}', [CalendarController::class, 'update']);
    Route::delete('/calendar/{calendarEvent}', [CalendarController::class, 'destroy']);

    // --- GRADES ---
    Route::get('/courses/{course}/grades', [GradeController::class, 'index']);
    Route::post('/courses/{course}/grades/compute', [GradeController::class, 'compute']);

    // --- STUDENT ACTIVITY FEED ---
    Route::get('/student/stats', function (\Illuminate\Http\Request $request) {
        $user = $request->user();
        if (! $user->isStudent()) {
            return response()->json(['message' => 'Students only.'], 403);
        }

        $courseIds = \App\Models\Enrollment::where('user_id', $user->id)
            ->where('status', 'active')->pluck('course_id');

        // Overall grade — average of all computed grades
        $grades = \App\Models\Grade::where('user_id', $user->id)
            ->whereIn('course_id', $courseIds)
            ->whereNotNull('overall_grade')
            ->pluck('overall_grade');
        $overallGrade = $grades->count() > 0
            ? round($grades->avg(), 1)
            : null;

        // Lessons done vs total
        $totalLessons = \App\Models\Lesson::whereIn('course_id', $courseIds)
            ->where('is_published', true)->count();
        $lessonsDone = \App\Models\LessonProgress::where('user_id', $user->id)
            ->whereHas('lesson', fn($q) => $q->whereIn('course_id', $courseIds))
            ->where('status', 'done')->count();

        // Pending tasks — published assessments not yet submitted
        $totalAssessments = \App\Models\Assessment::whereIn('course_id', $courseIds)
            ->where('is_published', true)->count();
        $submitted = \App\Models\Submission::where('user_id', $user->id)
            ->whereHas('assessment', fn($q) => $q->whereIn('course_id', $courseIds))
            ->whereIn('status', ['submitted', 'graded'])->count();
        $pendingTasks = max(0, $totalAssessments - $submitted);

        return response()->json([
            'overall_grade'  => $overallGrade,
            'lessons_done'   => $lessonsDone,
            'lessons_total'  => $totalLessons,
            'pending_tasks'  => $pendingTasks,
        ]);
    });

    Route::get('/student/ai-recommendations', function (\Illuminate\Http\Request $request) {
        $user = $request->user();
        if (! $user->isStudent()) {
            return response()->json(['message' => 'Students only.'], 403);
        }

        $courseIds = \App\Models\Enrollment::where('user_id', $user->id)
            ->where('status', 'active')->pluck('course_id');

        // Find the most recent graded quiz with a low score
        $lowQuiz = \App\Models\Submission::where('user_id', $user->id)
            ->whereHas('assessment', fn($q) => $q->whereIn('course_id', $courseIds)->where('type', 'quiz'))
            ->where('status', 'graded')
            ->where('percentage', '<', 75)
            ->with('assessment:id,title,topic')
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$lowQuiz) {
            return response()->json(null);
        }

        $topic = $lowQuiz->assessment->topic ?? 'the related topic';
        $score = $lowQuiz->percentage;
        $title = $lowQuiz->assessment->title;

        return response()->json([
            'description' => "Based on your {$title} score (" . round($score) . "%), IntelliLearn recommends reviewing these topics:",
            'topics' => [
                "Review lesson materials for: {$topic}",
                "Re-attempt {$title} after reviewing",
                "Ask your instructor for clarification on weak areas",
            ],
        ]);
    });

    Route::get('/student/feed', function (\Illuminate\Http\Request $request) {
        $user = $request->user();
        if (! $user->isStudent()) {
            return response()->json(['feed' => []]);
        }

        $courseIds = \App\Models\Enrollment::where('user_id', $user->id)
            ->where('status', 'active')
            ->pluck('course_id');

        $courses = \App\Models\Course::whereIn('id', $courseIds)
            ->pluck('name', 'id');

        $feed = collect();

        // Announcements
        \App\Models\Announcement::whereIn('course_id', $courseIds)
            ->orderBy('created_at', 'desc')->take(20)->get()
            ->each(fn($a) => $feed->push([
                'type'       => 'announcement',
                'title'      => $a->title,
                'body'       => $a->content,
                'course'     => $courses[$a->course_id] ?? '',
                'course_id'  => $a->course_id,
                'created_at' => $a->created_at,
            ]));

        // New assessments
        \App\Models\Assessment::whereIn('course_id', $courseIds)
            ->where('is_published', true)
            ->orderBy('created_at', 'desc')->take(20)->get()
            ->each(fn($a) => $feed->push([
                'type'       => 'assessment',
                'title'      => $a->title,
                'body'       => ucfirst(str_replace('_', ' ', $a->type)) . ' · ' . $a->total_points . ' pts',
                'course'     => $courses[$a->course_id] ?? '',
                'course_id'  => $a->course_id,
                'item_id'    => $a->id,
                'created_at' => $a->created_at,
            ]));

        // New lesson materials
        \App\Models\LessonMaterial::whereHas('lesson', fn($q) => $q->whereIn('course_id', $courseIds)->where('is_published', true))
            ->with('lesson:id,title,course_id')
            ->orderBy('created_at', 'desc')->take(20)->get()
            ->each(fn($m) => $feed->push([
                'type'       => 'material',
                'title'      => $m->title,
                'body'       => strtoupper($m->type) . ' uploaded to ' . ($m->lesson->title ?? ''),
                'course'     => $courses[$m->lesson->course_id ?? 0] ?? '',
                'course_id'  => $m->lesson->course_id ?? null,
                'lesson_id'  => $m->lesson_id,
                'created_at' => $m->created_at,
            ]));

        $sorted = $feed->sortByDesc('created_at')->values()->take(30);

        return response()->json(['feed' => $sorted]);
    });

    // --- AI / PREDICTIONS ---
    Route::post('/ai/predict', [AiController::class, 'predict']);
    Route::get('/ai/my-risk', [AiController::class, 'myRisk']);
    Route::get('/ai/courses/{course}/student-risk', [AiController::class, 'courseRisk']);
    Route::post('/ai/recommend', [AiController::class, 'recommend']);
    Route::post('/ai/quiz-feedback', [AiController::class, 'quizFeedback']);
    Route::post('/ai/chatbot', [AiController::class, 'chatbot']);
    Route::get('/ai/materials/{material}/context', [AiController::class, 'materialContext']);

    // --- INSTRUCTOR STATS ---
    Route::get('/instructor/stats', function (\Illuminate\Http\Request $request) {
        $user = $request->user();
        if (! $user->isInstructor() && ! $user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $courses = \App\Models\Course::where('instructor_id', $user->id)->withCount('students')->get();
        $courseIds = $courses->pluck('id');

        $totalStudents = $courses->sum('students_count');

        // Pending grading — submitted but not yet graded
        $pendingGrading = \App\Models\Submission::whereHas('assessment', fn($q) => $q->whereIn('course_id', $courseIds))
            ->where('status', 'submitted')->count();

        // Class average — average of all computed overall grades
        $grades = \App\Models\Grade::whereIn('course_id', $courseIds)->whereNotNull('overall_grade')->pluck('overall_grade');
        $classAverage = $grades->count() > 0 ? round($grades->avg(), 1) : null;

        // At-risk students count
        $atRiskCount = 0;
        foreach ($courses as $course) {
            $totalAssessments = \App\Models\Assessment::where('course_id', $course->id)->where('is_published', true)->count();
            $students = $course->students()->wherePivot('status', 'active')->get();
            foreach ($students as $student) {
                $submissions = \App\Models\Submission::where('user_id', $student->id)
                    ->whereHas('assessment', fn($q) => $q->where('course_id', $course->id)->where('type', 'quiz'))
                    ->where('status', 'graded')->get();
                $quizAvg = $submissions->count() > 0 ? $submissions->avg('percentage') : 0;
                $submitted = \App\Models\Submission::where('user_id', $student->id)
                    ->whereHas('assessment', fn($q) => $q->where('course_id', $course->id))
                    ->whereIn('status', ['submitted', 'graded'])->count();
                $submissionRate = $totalAssessments > 0 ? $submitted / $totalAssessments : 0;
                $missedTasks = max(0, $totalAssessments - $submitted);
                if ($quizAvg < 70 || $submissionRate < 0.6 || $missedTasks > 3) {
                    $atRiskCount++;
                }
            }
        }

        return response()->json([
            'my_courses'       => $courses->count(),
            'total_students'   => $totalStudents,
            'pending_grading'  => $pendingGrading,
            'class_average'    => $classAverage,
            'at_risk_students' => $atRiskCount,
        ]);
    });

    Route::get('/instructor/courses/{course}/stats', function (\Illuminate\Http\Request $request, \App\Models\Course $course) {
        $user = $request->user();
        if (! $user->isAdmin() && ! ($user->isInstructor() && $course->instructor_id === $user->id)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // Get active enrolled students
        $students = $course->students()->wherePivot('status', 'active')->get();
        $totalStudents = $students->count();

        // Pending grading for this course only
        $pendingGrading = \App\Models\Submission::where('status', 'submitted')
            ->whereHas('assessment', fn($q) => $q->where('course_id', $course->id))
            ->count();

        // Class average for this course only
        $grades = \App\Models\Grade::where('course_id', $course->id)
            ->whereNotNull('overall_grade')
            ->pluck('overall_grade');
        $classAverage = $grades->count() > 0 ? round($grades->avg(), 1) : null;

        // Quiz, Exam, Activity averages
        $quizGrades = \App\Models\Grade::where('course_id', $course->id)
            ->whereNotNull('quiz_average')
            ->pluck('quiz_average');
        $quizAverage = $quizGrades->count() > 0 ? round($quizGrades->avg(), 1) : null;

        $examGrades = \App\Models\Grade::where('course_id', $course->id)
            ->whereNotNull('exam_average')
            ->pluck('exam_average');
        $examAverage = $examGrades->count() > 0 ? round($examGrades->avg(), 1) : null;

        $activityGrades = \App\Models\Grade::where('course_id', $course->id)
            ->whereNotNull('activity_average')
            ->pluck('activity_average');
        $activityAverage = $activityGrades->count() > 0 ? round($activityGrades->avg(), 1) : null;

        // Pass rate for this course
        $passedCount = \App\Models\Grade::where('course_id', $course->id)
            ->where('remarks', 'Passed')
            ->count();
        $passRate = $totalStudents > 0 ? round(($passedCount / $totalStudents) * 100) : 0;

        // At-risk students for this course only
        $totalAssessments = \App\Models\Assessment::where('course_id', $course->id)
            ->where('is_published', true)->count();

        $atRiskCount = 0;
        foreach ($students as $student) {
            $submissions = \App\Models\Submission::where('user_id', $student->id)
                ->whereHas('assessment', fn($q) => $q->where('course_id', $course->id)->where('type', 'quiz'))
                ->where('status', 'graded')->get();
            $quizAvg = $submissions->count() > 0 ? $submissions->avg('percentage') : 0;
            $submitted = \App\Models\Submission::where('user_id', $student->id)
                ->whereHas('assessment', fn($q) => $q->where('course_id', $course->id))
                ->whereIn('status', ['submitted', 'graded'])->count();
            $submissionRate = $totalAssessments > 0 ? $submitted / $totalAssessments : 0;
            $missedTasks = max(0, $totalAssessments - $submitted);
            if ($quizAvg < 70 || $submissionRate < 0.6 || $missedTasks > 3) {
                $atRiskCount++;
            }
        }

        return response()->json([
            'total_students'   => $totalStudents,
            'pending_grading'  => $pendingGrading,
            'class_average'    => $classAverage,
            'quiz_average'     => $quizAverage,
            'exam_average'     => $examAverage,
            'activity_average' => $activityAverage,
            'pass_rate'        => $passRate,
            'at_risk_students' => $atRiskCount,
        ]);
    });

    // --- ADMIN USER MANAGEMENT ---
    Route::get('/admin/users', [AdminController::class, 'listUsers']);
    Route::post('/admin/users', [AdminController::class, 'createUser']);
    Route::put('/admin/users/{user}', [AdminController::class, 'updateUser']);
    Route::delete('/admin/users/{user}', [AdminController::class, 'deleteUser']);

});
