<?php

namespace App\Http\Controllers;

use App\Models\CalendarEvent;
use App\Models\Course;
use App\Models\Enrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    /**
     * LIST EVENTS FOR A COURSE (or all enrolled courses for students)
     * GET /api/calendar?course_id=1&month=2026-04
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = CalendarEvent::with(['course:id,name,code', 'creator:id,first_name,last_name']);

        if ($request->has('course_id')) {
            $query->where('course_id', $request->course_id);
        } else {
            // Get events for all accessible courses
            if ($user->isStudent()) {
                $courseIds = Enrollment::where('user_id', $user->id)
                    ->where('status', 'active')
                    ->pluck('course_id');
                $query->whereIn('course_id', $courseIds);
            } elseif ($user->isInstructor()) {
                $query->whereHas('course', fn($q) => $q->where('instructor_id', $user->id));
            }
            // Admin sees all
        }

        // Optional month filter
        if ($request->has('month')) {
            $date = $request->month; // format: 2026-04
            $query->whereYear('start_date', substr($date, 0, 4))
                  ->whereMonth('start_date', substr($date, 5, 2));
        }

        $events = $query->orderBy('start_date')->get();

        return response()->json(['events' => $events]);
    }

    /**
     * CREATE A CALENDAR EVENT
     * POST /api/courses/{course}/calendar
     */
    public function store(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to create events.'], 403);
        }

        $validated = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'event_type'  => ['required', 'in:lesson,quiz,exam,activity,deadline,other'],
            'color'       => ['nullable', 'string', 'max:7'],
            'start_date'  => ['required', 'date'],
            'end_date'    => ['nullable', 'date', 'after_or_equal:start_date'],
            'all_day'     => ['nullable', 'boolean'],
        ]);

        $event = $course->calendarEvents()->create([
            ...$validated,
            'user_id' => $user->id,
        ]);

        return response()->json([
            'message' => 'Event created successfully.',
            'event'   => $event,
        ], 201);
    }

    /**
     * UPDATE A CALENDAR EVENT
     * PUT /api/calendar/{calendarEvent}
     */
    public function update(Request $request, CalendarEvent $calendarEvent): JsonResponse
    {
        $user = $request->user();
        $course = $calendarEvent->course;

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to edit events.'], 403);
        }

        $validated = $request->validate([
            'title'       => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'event_type'  => ['sometimes', 'in:lesson,quiz,exam,activity,deadline,other'],
            'color'       => ['nullable', 'string', 'max:7'],
            'start_date'  => ['sometimes', 'date'],
            'end_date'    => ['nullable', 'date'],
            'all_day'     => ['sometimes', 'boolean'],
        ]);

        $calendarEvent->update($validated);

        return response()->json([
            'message' => 'Event updated successfully.',
            'event'   => $calendarEvent,
        ]);
    }

    /**
     * DELETE A CALENDAR EVENT
     * DELETE /api/calendar/{calendarEvent}
     */
    public function destroy(Request $request, CalendarEvent $calendarEvent): JsonResponse
    {
        $user = $request->user();
        $course = $calendarEvent->course;

        if (! $this->canManageCourse($user, $course)) {
            return response()->json(['message' => 'You do not have permission to delete events.'], 403);
        }

        $calendarEvent->delete();

        return response()->json(['message' => 'Event deleted successfully.']);
    }

    private function canManageCourse($user, $course): bool
    {
        if ($user->isAdmin()) return true;
        if ($user->isInstructor() && $course->instructor_id === $user->id) return true;
        return false;
    }
}
