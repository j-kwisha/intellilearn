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
        \App\Models\ActivityLog::record($user, 'lesson.created', $course, 'lesson', $lesson->id, ['title' => $lesson->title]);

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

        $this->snapshotLesson($lesson, $user->id, 'edit');
        $lesson->update($validated);
        \App\Models\ActivityLog::record($user, 'lesson.updated', $course, 'lesson', $lesson->id, ['title' => $lesson->title]);

        return response()->json([
            'message' => 'Lesson updated successfully.',
            'lesson'  => $lesson,
        ]);
    }

    public function versions(Request $request, Course $course, Lesson $lesson): JsonResponse
    {
        abort_unless($this->canManageCourse($request->user(), $course) && $lesson->course_id === $course->id, 403);
        $versions = \Illuminate\Support\Facades\DB::table('lesson_versions')->where('lesson_id', $lesson->id)
            ->orderByDesc('created_at')->get(['id', 'created_by', 'change_type', 'created_at']);
        return response()->json(['versions' => $versions]);
    }

    public function restoreVersion(Request $request, Course $course, Lesson $lesson, int $version): JsonResponse
    {
        abort_unless($this->canManageCourse($request->user(), $course) && $lesson->course_id === $course->id, 403);
        $record = \Illuminate\Support\Facades\DB::table('lesson_versions')->where('lesson_id', $lesson->id)->where('id', $version)->first();
        abort_unless($record, 404);
        $snapshot = json_decode($record->snapshot, true) ?: [];
        $this->snapshotLesson($lesson, $request->user()->id, 'before_restore');
        $lesson->update(collect($snapshot['lesson'] ?? [])->only(['title', 'description', 'topic', 'order', 'is_published', 'available_from', 'available_until'])->all());
        \Illuminate\Support\Facades\DB::transaction(function () use ($lesson, $snapshot) {
            $lesson->materials()->delete();
            foreach (($snapshot['materials'] ?? []) as $material) {
                $lesson->materials()->create(collect($material)->only(['title', 'type', 'file_path', 'original_filename', 'url', 'order', 'extracted_text', 'extraction_version'])->all());
            }
        });
        \App\Models\ActivityLog::record($request->user(), 'lesson.version_restored', $course, 'lesson', $lesson->id, [
            'title' => $lesson->title, 'version_id' => $record->id,
        ]);
        return response()->json(['message' => 'Lesson version restored.', 'lesson' => $lesson->fresh()->load('materials')]);
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

        try {
            \App\Models\ActivityLog::record($user, 'lesson.deleted', $course, 'lesson', $lesson->id, ['title' => $lesson->title]);
            // Delete lesson (materials and progress will cascade)
            $lesson->delete();

            return response()->json([
                'message' => 'Lesson deleted successfully.',
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to delete lesson', [
                'lesson_id' => $lesson->id,
                'course_id' => $course->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to delete lesson. Please try again.',
            ], 500);
        }
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
            'type'  => ['required', 'in:pdf,docx,video,ppt,pptx,link,other'],
            'file'  => ['nullable', 'file', 'max:512000'], // 500MB max � MIME validation relaxed for Office format compatibility
            'url'   => ['nullable', 'url'],
            'order' => ['nullable', 'integer', 'min:0'],
        ]);

        $filePath = null;
        $extractedText = null;
        $extractionVersion = null;

        // Handle file upload
        if ($request->hasFile('file')) {
            try {
                $file = $request->file('file');

                // Store all files locally for now - simpler and more reliable
                $folder = "materials/course_{$course->id}/lesson_{$lesson->id}";
                $stored = $file->store($folder, 'public');
                $filePath = $stored;
                
                // Extraction follows the actual Office/PDF extension, including PPTX uploads.
                if (in_array(strtolower($file->getClientOriginalExtension()), ['pdf', 'docx', 'pptx'], true)) {
                    try {
                        $extractedText = app(\App\Services\DocumentTextService::class)->extractMaterial($file);
                        $extractionVersion = \App\Services\DocumentTextService::MATERIAL_EXTRACTION_VERSION;
                    } catch (\Exception $e) {
                        $extractedText = null;
                    }
                }
            } catch (\Exception $e) {
                \Log::error('File upload error', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
                return response()->json(['message' => 'File upload failed. Please try again.'], 500);
            }
        }

        $this->snapshotLesson($lesson, $user->id, 'material_change');
        $material = LessonMaterial::create([
            'lesson_id'      => $lesson->id,
            'title'          => $validated['title'],
            'type'           => $validated['type'],
            'file_path'      => $filePath,
            'original_filename' => $request->hasFile('file') ? mb_substr(preg_replace('/[\x00-\x1F\x7F]/u', '', basename(str_replace('\\', '/', $request->file('file')->getClientOriginalName()))), 0, 255) : null,
            'url'            => $validated['url'] ?? null,
            'order'          => $validated['order'] ?? ($lesson->materials()->max('order') + 1),
            'extracted_text' => $extractedText,
            'extraction_version' => $extractionVersion,
        ]);
        \App\Models\ActivityLog::record($user, 'lesson_material.uploaded', $course, 'lesson_material', $material->id, [
            'lesson_title' => $lesson->title, 'title' => $material->title,
            'filename' => $material->original_filename, 'type' => $material->type,
        ]);

        return response()->json([
            'message'  => 'Material uploaded successfully.',
            'material' => $material,
        ], 201);
    }

    public function downloadMaterial(Request $request, Course $course, Lesson $lesson, LessonMaterial $material)
    {
        abort_unless($lesson->course_id === $course->id && $material->lesson_id === $lesson->id, 404);
        abort_unless($this->canAccessCourse($request->user(), $course), 403);
        abort_if($request->user()->isStudent() && !$lesson->is_published, 403);
        $path = $material->publicStoragePath();
        abort_if($path === null, 404);
        abort_unless(Storage::disk('public')->exists($path), 404);
        return Storage::disk('public')->download($path, $material->download_name);
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

        $this->snapshotLesson($lesson, $user->id, 'material_change');

        // Delete the actual file from storage if it exists
        if ($material->file_path) {
            // If it's a Cloudinary URL, skip local delete (Cloudinary files persist)
            if (!str_starts_with($material->file_path, 'http')) {
                Storage::disk('public')->delete($material->file_path);
            }
            // For locally stored files (fallback path without full URL)
            // The file_path stored is already the full URL from Storage::url(),
            // so we reconstruct the relative path for deletion
        }

        \App\Models\ActivityLog::record($user, 'lesson_material.deleted', $course, 'lesson_material', $material->id, [
            'lesson_title' => $lesson->title, 'title' => $material->title,
            'filename' => $material->original_filename, 'type' => $material->type,
        ]);
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

    private function snapshotLesson(Lesson $lesson, int $userId, string $changeType): void
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('lesson_versions')) return;
        $materials = $lesson->materials()->get()->map(fn ($material) => $material->only([
            'id', 'title', 'type', 'file_path', 'original_filename', 'url', 'order', 'extracted_text', 'extraction_version',
        ]))->all();
        $snapshot = [
            'lesson' => $lesson->only(['title', 'description', 'topic', 'order', 'is_published', 'available_from', 'available_until']),
            'materials' => $materials,
        ];
        $versionId = \Illuminate\Support\Facades\DB::table('lesson_versions')->insertGetId([
            'lesson_id' => $lesson->id, 'created_by' => $userId, 'snapshot' => json_encode($snapshot),
            'change_type' => $changeType, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $disk = Storage::disk('public');
        foreach ($snapshot['materials'] as &$material) {
            $relative = $material['file_path'] ? (new LessonMaterial($material))->publicStoragePath() : null;
            if (!$relative || !$disk->exists($relative)) continue;
            $archive = "lesson_versions/{$lesson->id}/{$versionId}/" . basename($relative);
            if ($disk->copy($relative, $archive)) $material['file_path'] = $archive;
        }
        unset($material);
        \Illuminate\Support\Facades\DB::table('lesson_versions')->where('id', $versionId)->update(['snapshot' => json_encode($snapshot)]);
    }
}
