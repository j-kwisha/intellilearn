<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonMaterial;
use App\Models\LessonProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser as PdfParser;

class LessonController extends Controller
{
    /**
     * LIST ALL LESSONS FOR A COURSE
     *
     * GET /api/courses/{course}/lessons
     *
     * - Instructors see all lessons (including unpublished drafts)
     * - Students see only published lessons, with their progress status
     */
    public function index(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $this->canAccessCourse($user, $course)) {
            return response()->json([
                'message' => 'You do not have access to this course.',
            ], 403);
        }

        $lessonsQuery = $course->lessons()->with('materials');

        // Students only see published lessons
        if ($user->isStudent()) {
            $lessonsQuery->where('is_published', true);
        }

        $lessons = $lessonsQuery->get();

        // If student, attach their progress to each lesson
        if ($user->isStudent()) {
            $progressRecords = LessonProgress::where('user_id', $user->id)
                ->whereIn('lesson_id', $lessons->pluck('id'))
                ->get()
                ->keyBy('lesson_id');

            $lessons->each(function ($lesson) use ($progressRecords) {
                $progress = $progressRecords->get($lesson->id);
                $lesson->my_progress = $progress ? $progress->status : 'pending';
                $lesson->time_spent_seconds = $progress ? $progress->time_spent_seconds : 0;
            });
        }

        return response()->json([
            'lessons' => $lessons,
        ]);
    }

    /**
     * CREATE A NEW LESSON
     *
     * POST /api/courses/{course}/lessons
     * Body: { title, description, topic, order, is_published, available_from, available_until }
     *
     * Only the course instructor or admin can create lessons.
     */
    public function store(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json([
                'message' => 'You do not have permission to create lessons for this course.',
            ], 403);
        }

        $validated = $request->validate([
            'title'           => ['required', 'string', 'max:255'],
            'description'     => ['nullable', 'string'],
            'topic'           => ['nullable', 'string', 'max:255'],
            'order'           => ['nullable', 'integer', 'min:0'],
            'is_published'    => ['nullable', 'boolean'],
            'available_from'  => ['nullable', 'date'],
            'available_until' => ['nullable', 'date', 'after:available_from'],
        ]);

        // Auto-set order to next position if not provided
        if (! isset($validated['order'])) {
            $validated['order'] = $course->lessons()->count();
        }

        $lesson = $course->lessons()->create($validated);

        return response()->json([
            'message' => 'Lesson created successfully.',
            'lesson'  => $lesson,
        ], 201);
    }

    /**
     * VIEW A SINGLE LESSON
     *
     * GET /api/courses/{course}/lessons/{lesson}
     *
     * Returns lesson with materials and progress (for students).
     */
    public function show(Request $request, Course $course, Lesson $lesson): JsonResponse
    {
        $user = $request->user();

        if (! $this->canAccessCourse($user, $course)) {
            return response()->json([
                'message' => 'You do not have access to this course.',
            ], 403);
        }

        // Make sure this lesson belongs to this course
        if ($lesson->course_id !== $course->id) {
            return response()->json([
                'message' => 'Lesson not found in this course.',
            ], 404);
        }

        // Students can't see unpublished lessons
        if ($user->isStudent() && ! $lesson->is_published) {
            return response()->json([
                'message' => 'This lesson is not available yet.',
            ], 403);
        }

        $lesson->load('materials');

        // Attach student's progress
        if ($user->isStudent()) {
            $progress = LessonProgress::where('user_id', $user->id)
                ->where('lesson_id', $lesson->id)
                ->first();

            $lesson->my_progress = $progress ? $progress->status : 'pending';
            $lesson->time_spent_seconds = $progress ? $progress->time_spent_seconds : 0;

            // Auto-create progress if first time viewing
            if (! $progress) {
                LessonProgress::create([
                    'user_id'    => $user->id,
                    'lesson_id'  => $lesson->id,
                    'status'     => 'in_progress',
                    'started_at' => now(),
                ]);
                $lesson->my_progress = 'in_progress';
            }
        }

        return response()->json([
            'lesson' => $lesson,
        ]);
    }

    /**
     * UPDATE A LESSON
     *
     * PUT /api/courses/{course}/lessons/{lesson}
     * Body: { title, description, topic, order, is_published, available_from, available_until }
     */
    public function update(Request $request, Course $course, Lesson $lesson): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json([
                'message' => 'You do not have permission to update lessons.',
            ], 403);
        }

        if ($lesson->course_id !== $course->id) {
            return response()->json([
                'message' => 'Lesson not found in this course.',
            ], 404);
        }

        $validated = $request->validate([
            'title'           => ['sometimes', 'string', 'max:255'],
            'description'     => ['nullable', 'string'],
            'topic'           => ['nullable', 'string', 'max:255'],
            'order'           => ['sometimes', 'integer', 'min:0'],
            'is_published'    => ['sometimes', 'boolean'],
            'available_from'  => ['nullable', 'date'],
            'available_until' => ['nullable', 'date'],
        ]);

        $lesson->update($validated);

        return response()->json([
            'message' => 'Lesson updated successfully.',
            'lesson'  => $lesson,
        ]);
    }

    /**
     * DELETE A LESSON
     *
     * DELETE /api/courses/{course}/lessons/{lesson}
     */
    public function destroy(Request $request, Course $course, Lesson $lesson): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json([
                'message' => 'You do not have permission to delete lessons.',
            ], 403);
        }

        if ($lesson->course_id !== $course->id) {
            return response()->json([
                'message' => 'Lesson not found in this course.',
            ], 404);
        }

        $lesson->delete();

        return response()->json([
            'message' => 'Lesson deleted successfully.',
        ]);
    }

    // =============================================================
    // LESSON MATERIALS (file uploads)
    // =============================================================

    /**
     * UPLOAD A MATERIAL TO A LESSON
     *
     * POST /api/courses/{course}/lessons/{lesson}/materials
     * Body (multipart/form-data): { title, type, file OR url }
     *
     * Accepts file uploads (PDF, PPT, video) or external URLs.
     */
    public function uploadMaterial(Request $request, Course $course, Lesson $lesson): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json([
                'message' => 'You do not have permission to upload materials.',
            ], 403);
        }

        if ($lesson->course_id !== $course->id) {
            return response()->json([
                'message' => 'Lesson not found in this course.',
            ], 404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type'  => ['required', 'in:pdf,docx,video,ppt,link,other'],
            'file'  => ['nullable', 'file', 'mimes:pdf,doc,docx,ppt,pptx,mp4,mov', 'max:102400'],
            'url'   => ['nullable', 'url'],
            'order' => ['nullable', 'integer', 'min:0'],
        ]);

        $filePath = null;
        $extractedText = null;

        // Handle file upload
        if ($request->hasFile('file')) {
            $file = $request->file('file');

            // Upload to Cloudinary via HTTP API
            $cloudName  = env('CLOUDINARY_CLOUD_NAME');
            $apiKey     = env('CLOUDINARY_API_KEY');
            $apiSecret  = env('CLOUDINARY_API_SECRET');

            $timestamp  = time();
            $folder     = "intellilearn/course_{$course->id}/lesson_{$lesson->id}";
            $signature  = sha1("folder={$folder}&timestamp={$timestamp}{$apiSecret}");

            $response = \Illuminate\Support\Facades\Http::attach(
                'file', file_get_contents($file->getRealPath()), $file->getClientOriginalName()
            )->post("https://api.cloudinary.com/v1_1/{$cloudName}/auto/upload", [
                'api_key'   => $apiKey,
                'timestamp' => $timestamp,
                'folder'    => $folder,
                'signature' => $signature,
            ]);

            if ($response->failed()) {
                return response()->json(['message' => 'File upload failed. Please try again.'], 500);
            }

            $filePath = $response->json('secure_url');

            // Extract text from PDF for AI chatbot
            if ($validated['type'] === 'pdf') {
                try {
                    $parser = new PdfParser();
                    $pdf = $parser->parseFile($file->getRealPath());
                    $extractedText = substr($pdf->getText(), 0, 8000);
                } catch (\Exception $e) {
                    $extractedText = null;
                }
            }
        }

        $material = LessonMaterial::create([
            'lesson_id'      => $lesson->id,
            'title'          => $validated['title'],
            'type'           => $validated['type'],
            'file_path'      => $filePath,
            'url'            => $validated['url'] ?? null,
            'order'          => $validated['order'] ?? $lesson->materials()->count(),
            'extracted_text' => $extractedText,
        ]);

        return response()->json([
            'message'  => 'Material uploaded successfully.',
            'material' => $material,
        ], 201);
    }

    /**
     * DELETE A MATERIAL
     *
     * DELETE /api/courses/{course}/lessons/{lesson}/materials/{material}
     */
    public function deleteMaterial(Request $request, Course $course, Lesson $lesson, LessonMaterial $material): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json([
                'message' => 'You do not have permission to delete materials.',
            ], 403);
        }

        if ($material->lesson_id !== $lesson->id) {
            return response()->json([
                'message' => 'Material not found in this lesson.',
            ], 404);
        }

        // Delete the actual file from storage if it exists
        if ($material->file_path) {
            Storage::disk('public')->delete($material->file_path);
        }

        $material->delete();

        return response()->json([
            'message' => 'Material deleted successfully.',
        ]);
    }

    // =============================================================
    // STUDENT PROGRESS
    // =============================================================

    /**
     * UPDATE LESSON PROGRESS
     *
     * PUT /api/courses/{course}/lessons/{lesson}/progress
     * Body: { status, time_spent_seconds }
     *
     * Students update their own progress — "done", "in_progress", etc.
     * Also records time spent (for predictive analytics).
     */
    public function updateProgress(Request $request, Course $course, Lesson $lesson): JsonResponse
    {
        $user = $request->user();

        if (! $user->isStudent()) {
            return response()->json([
                'message' => 'Only students can track lesson progress.',
            ], 403);
        }

        if ($lesson->course_id !== $course->id) {
            return response()->json([
                'message' => 'Lesson not found in this course.',
            ], 404);
        }

        $validated = $request->validate([
            'status'             => ['required', 'in:pending,in_progress,done,missing'],
            'time_spent_seconds' => ['nullable', 'integer', 'min:0'],
        ]);

        // Find or create progress record
        $progress = LessonProgress::firstOrCreate(
            [
                'user_id'   => $user->id,
                'lesson_id' => $lesson->id,
            ],
            [
                'started_at' => now(),
            ]
        );

        // Update status
        $progress->status = $validated['status'];

        // Add time spent (accumulates, doesn't replace)
        if (isset($validated['time_spent_seconds'])) {
            $progress->time_spent_seconds += $validated['time_spent_seconds'];
        }

        // Set completed_at if marking as done
        if ($validated['status'] === 'done' && ! $progress->completed_at) {
            $progress->completed_at = now();
        }

        $progress->save();

        return response()->json([
            'message'  => 'Progress updated successfully.',
            'progress' => $progress,
        ]);
    }

    /**
     * GET PROGRESS FOR ALL LESSONS IN A COURSE (instructor view)
     *
     * GET /api/courses/{course}/progress
     *
     * Returns all students' progress across all lessons.
     * Used by the instructor's progress tracking dashboard.
     */
    public function courseProgress(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json([
                'message' => 'You do not have permission to view course progress.',
            ], 403);
        }

        $progress = LessonProgress::whereHas('lesson', function ($query) use ($course) {
            $query->where('course_id', $course->id);
        })
        ->with([
            'user:id,first_name,last_name,email',
            'lesson:id,title,order',
        ])
        ->get();

        return response()->json([
            'progress' => $progress,
        ]);
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
