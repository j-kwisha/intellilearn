<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Course;
use App\Models\Enrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /**
     * LIST ANNOUNCEMENTS FOR A COURSE
     * GET /api/courses/{course}/announcements
     */
    public function index(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $this->canAccessCourse($user, $course)) {
            return response()->json(['message' => 'You do not have access to this course.'], 403);
        }

        $announcements = $course->announcements()
            ->with('author:id,first_name,last_name')
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['announcements' => $announcements]);
    }

    /**
     * CREATE AN ANNOUNCEMENT
     * POST /api/courses/{course}/announcements
     */
    public function store(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to post announcements.'], 403);
        }

        $validated = $request->validate([
            'title'     => ['required', 'string', 'max:255'],
            'content'   => ['required', 'string'],
            'is_pinned' => ['nullable', 'boolean'],
        ]);

        $announcement = $course->announcements()->create([
            ...$validated,
            'user_id' => $user->id,
        ]);

        $announcement->load('author:id,first_name,last_name');

        return response()->json([
            'message'      => 'Announcement posted successfully.',
            'announcement' => $announcement,
        ], 201);
    }

    /**
     * UPDATE AN ANNOUNCEMENT
     * PUT /api/courses/{course}/announcements/{announcement}
     */
    public function update(Request $request, Course $course, Announcement $announcement): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to edit announcements.'], 403);
        }

        if ($announcement->course_id !== $course->id) {
            return response()->json(['message' => 'Announcement not found in this course.'], 404);
        }

        $validated = $request->validate([
            'title'     => ['sometimes', 'string', 'max:255'],
            'content'   => ['sometimes', 'string'],
            'is_pinned' => ['sometimes', 'boolean'],
        ]);

        $announcement->update($validated);

        return response()->json([
            'message'      => 'Announcement updated successfully.',
            'announcement' => $announcement,
        ]);
    }

    /**
     * DELETE AN ANNOUNCEMENT
     * DELETE /api/courses/{course}/announcements/{announcement}
     */
    public function destroy(Request $request, Course $course, Announcement $announcement): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to delete announcements.'], 403);
        }

        if ($announcement->course_id !== $course->id) {
            return response()->json(['message' => 'Announcement not found in this course.'], 404);
        }

        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted successfully.']);
    }

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
