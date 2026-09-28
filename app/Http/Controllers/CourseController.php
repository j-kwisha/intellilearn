<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseMaterial;
use App\Models\Enrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Smalot\PdfParser\Parser as PdfParser;

class CourseController extends Controller
{
    /**
     * LIST ALL COURSES
     *
     * GET /api/courses
     *
     * - Students see only their enrolled courses
     * - Instructors see only courses they teach
     * - Admins see all courses
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            // Admin sees everything
            $courses = Course::with('instructor:id,first_name,last_name,email')
                ->withCount('students')
                ->get();
        } elseif ($user->isInstructor()) {
            // Instructor sees only their courses
            $courses = Course::where('instructor_id', $user->id)
                ->with('instructor:id,first_name,last_name,email')
                ->withCount('students')
                ->get();
        } else {
            // Student sees only enrolled courses
            $courses = Course::whereHas('enrollments', function ($query) use ($user) {
                $query->where('user_id', $user->id)
                      ->where('status', 'active');
            })
            ->with('instructor:id,first_name,last_name,email')
            ->get();
        }

        return response()->json([
            'courses' => $courses,
        ]);
    }

    /**
     * CREATE A NEW COURSE
     *
     * POST /api/courses
     * Body: { name, code, description, instructor_id (admin only), semester, section }
     *
     * Admins can create courses for any instructor.
     * Instructors can create their own courses (instructor_id is auto-set).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isAdmin() && ! $user->isInstructor()) {
            return response()->json([
                'message' => 'Only administrators and instructors can create courses.',
            ], 403);
        }

        $rules = [
            'name'        => ['required', 'string', 'max:255'],
            'code'        => ['required', 'string', 'max:50', 'unique:courses'],
            'description' => ['nullable', 'string'],
            'semester'    => ['required', 'string', 'max:100'],
            'section'     => ['nullable', 'string', 'max:50'],
        ];

        // Only admins can assign a different instructor
        if ($user->isAdmin()) {
            $rules['instructor_id'] = ['required', 'exists:users,id'];
        }

        $validated = $request->validate($rules);

        // Instructors always own their own course
        if ($user->isInstructor()) {
            $validated['instructor_id'] = $user->id;
        }

        $course = Course::create($validated);
        $course->load('instructor:id,first_name,last_name,email');

        return response()->json([
            'message' => 'Course created successfully.',
            'course'  => $course,
        ], 201);
    }

    /**
     * VIEW A SINGLE COURSE
     *
     * GET /api/courses/{id}
     *
     * Returns course details with instructor info and student count.
     */
    public function show(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        // Check access: admin sees all, instructor sees own, student sees enrolled
        if (! $this->canAccessCourse($user, $course)) {
            return response()->json([
                'message' => 'You do not have access to this course.',
            ], 403);
        }

        $course->load('instructor:id,first_name,last_name,email');
        $course->loadCount('students');

        return response()->json([
            'course' => $course,
        ]);
    }

    /**
     * UPDATE A COURSE
     *
     * PUT /api/courses/{id}
     * Body: { name, code, description, instructor_id, semester, section, status }
     *
     * Only admins can update courses.
     */
    public function update(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $user->isAdmin()) {
            return response()->json([
                'message' => 'Only administrators can update courses.',
            ], 403);
        }

        $validated = $request->validate([
            'name'          => ['sometimes', 'string', 'max:255'],
            'code'          => ['sometimes', 'string', 'max:50', 'unique:courses,code,' . $course->id],
            'description'   => ['nullable', 'string'],
            'instructor_id' => ['sometimes', 'exists:users,id'],
            'semester'      => ['sometimes', 'string', 'max:100'],
            'section'       => ['nullable', 'string', 'max:50'],
            'status'        => ['sometimes', 'in:active,archived'],
        ]);

        $course->update($validated);
        $course->load('instructor:id,first_name,last_name,email');

        return response()->json([
            'message' => 'Course updated successfully.',
            'course'  => $course,
        ]);
    }

    /**
     * DELETE A COURSE
     *
     * DELETE /api/courses/{id}
     *
     * Admins can delete any course.
     * Instructors can delete their own courses.
     */
    public function destroy(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        // Check if user is admin or the course instructor
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            return response()->json([
                'message' => 'You do not have permission to delete this course.',
            ], 403);
        }

        $course->delete();

        return response()->json([
            'message' => 'Course deleted successfully.',
        ]);
    }

    /**
     * ENROLL A STUDENT IN A COURSE
     *
     * POST /api/courses/{id}/enroll
     * Body: { user_id }
     *
     * Admins and instructors (of this course) can enroll students.
     */
    public function enroll(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        // Only admin or the course instructor can enroll students
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            return response()->json([
                'message' => 'You do not have permission to enroll students in this course.',
            ], 403);
        }

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
        ]);

        // Check if already enrolled
        $existing = Enrollment::where('user_id', $validated['user_id'])
            ->where('course_id', $course->id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Student is already enrolled in this course.',
            ], 422);
        }

        $enrollment = Enrollment::create([
            'user_id'   => $validated['user_id'],
            'course_id' => $course->id,
            'status'    => 'active',
        ]);

        return response()->json([
            'message'    => 'Student enrolled successfully.',
            'enrollment' => $enrollment,
        ], 201);
    }

    /**
     * UNENROLL A STUDENT FROM A COURSE
     *
     * POST /api/courses/{id}/unenroll
     * Body: { user_id }
     *
     * Sets enrollment status to 'dropped' instead of deleting.
     */
    public function unenroll(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            return response()->json([
                'message' => 'You do not have permission to manage enrollments.',
            ], 403);
        }

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
        ]);

        $enrollment = Enrollment::where('user_id', $validated['user_id'])
            ->where('course_id', $course->id)
            ->first();

        if (! $enrollment) {
            return response()->json([
                'message' => 'Student is not enrolled in this course.',
            ], 404);
        }

        $enrollment->update(['status' => 'dropped']);

        return response()->json([
            'message' => 'Student unenrolled successfully.',
        ]);
    }

    /**
     * LIST ALL STUDENTS IN A COURSE
     *
     * GET /api/courses/{id}/students
     *
     * Returns all actively enrolled students.
     */
    public function students(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $this->canAccessCourse($user, $course)) {
            return response()->json([
                'message' => 'You do not have access to this course.',
            ], 403);
        }

        $students = $course->students()
            ->wherePivot('status', 'active')
            ->select('users.id', 'first_name', 'last_name', 'email')
            ->get();

        return response()->json([
            'students' => $students,
        ]);
    }

    /**
     * GENERATE A JOIN CODE FOR A COURSE
     *
     * POST /api/courses/{id}/generate-code
     *
     * Admin or the course instructor can generate/regenerate the code.
     */
    public function generateCode(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        do {
            $code = strtoupper(Str::random(8));
        } while (Course::where('join_code', $code)->exists());

        $course->update(['join_code' => $code]);

        return response()->json([
            'message'   => 'Join code generated.',
            'join_code' => $course->join_code,
        ]);
    }

    /**
     * REVOKE THE JOIN CODE FOR A COURSE
     *
     * DELETE /api/courses/{id}/join-code
     */
    public function revokeCode(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $course->update(['join_code' => null]);

        return response()->json(['message' => 'Join code revoked.']);
    }

    /**
     * JOIN A COURSE BY CODE
     *
     * POST /api/courses/join
     * Body: { code }
     *
     * Students use this to self-enroll via a join code.
     */
    public function joinByCode(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isStudent()) {
            return response()->json(['message' => 'Only students can join courses by code.'], 403);
        }

        $validated = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $course = Course::where('join_code', strtoupper(trim($validated['code'])))
            ->where('status', 'active')
            ->first();

        if (! $course) {
            return response()->json(['message' => 'Invalid or expired join code.'], 404);
        }

        $existing = Enrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->first();

        if ($existing) {
            if ($existing->status === 'active') {
                return response()->json(['message' => 'You are already enrolled in this course.'], 422);
            }
            $existing->update(['status' => 'active']);
            $course->load('instructor:id,first_name,last_name,email');
            return response()->json([
                'message' => 'Successfully re-enrolled in ' . $course->name . '.',
                'course'  => $course,
            ]);
        }

        Enrollment::create([
            'user_id'   => $user->id,
            'course_id' => $course->id,
            'status'    => 'active',
        ]);

        $course->load('instructor:id,first_name,last_name,email');

        return response()->json([
            'message' => 'Successfully joined ' . $course->name . '.',
            'course'  => $course,
        ], 201);
    }

    // -------------------------------------------------------
    // HELPER METHODS
    // -------------------------------------------------------

    /**
     * LIST COURSE MATERIALS
     *
     * GET /api/courses/{course}/materials
     *
     * All enrolled students and the instructor can view course materials.
     */
    public function getCourseMaterials(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        // Check if user has access to the course
        if (! $this->canAccessCourse($user, $course)) {
            return response()->json([
                'message' => 'You do not have access to this course.',
            ], 403);
        }

        $materials = $course->materials()
            ->with('creator:id,first_name,last_name,email')
            ->orderBy('order')
            ->get();

        return response()->json([
            'materials' => $materials,
        ]);
    }

    /**
     * UPLOAD COURSE MATERIAL
     *
     * POST /api/courses/{course}/materials
     * Body: { title, type, file?, url?, order? }
     *
     * Instructors can upload PDFs, docs, sheets, presentations, and text files
     * to the course level for all students to access.
     */
    public function uploadCourseMaterial(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        // Only instructor of the course can upload materials
        if ($course->instructor_id !== $user->id) {
            return response()->json([
                'message' => 'You do not have permission to upload materials to this course.',
            ], 403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type'  => ['required', 'in:pdf,doc,docx,ppt,pptx,xls,xlsx,txt'],
            'file'  => ['nullable', 'file', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,txt', 'max:102400'],
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
            $folder     = "intellilearn/course_{$course->id}/materials";
            $signature  = sha1("access_mode=public&folder={$folder}&timestamp={$timestamp}{$apiSecret}");

            $response = \Illuminate\Support\Facades\Http::attach(
                'file', file_get_contents($file->getRealPath()), $file->getClientOriginalName()
            )->post("https://api.cloudinary.com/v1_1/{$cloudName}/auto/upload", [
                'api_key'     => $apiKey,
                'timestamp'   => $timestamp,
                'folder'      => $folder,
                'signature'   => $signature,
                'access_mode' => 'public',
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

        $material = CourseMaterial::create([
            'course_id'      => $course->id,
            'created_by'     => $user->id,
            'title'          => $validated['title'],
            'type'           => $validated['type'],
            'file_path'      => $filePath,
            'url'            => $validated['url'] ?? null,
            'order'          => $validated['order'] ?? $course->materials()->count(),
            'extracted_text' => $extractedText,
        ]);

        return response()->json([
            'message'  => 'Material uploaded successfully.',
            'material' => $material,
        ], 201);
    }

    /**
     * DELETE COURSE MATERIAL
     *
     * DELETE /api/courses/{course}/materials/{material}
     *
     * Only the instructor can delete course materials.
     */
    public function deleteCourseMaterial(Request $request, Course $course, CourseMaterial $material): JsonResponse
    {
        $user = $request->user();

        // Only instructor of the course can delete materials
        if ($course->instructor_id !== $user->id) {
            return response()->json([
                'message' => 'You do not have permission to delete materials from this course.',
            ], 403);
        }

        // Verify material belongs to this course
        if ($material->course_id !== $course->id) {
            return response()->json([
                'message' => 'Material not found in this course.',
            ], 404);
        }

        $material->delete();

        return response()->json([
            'message' => 'Material deleted successfully.',
        ]);
    }

    /**
     * Check if a user has access to a course.
     */
    private function canAccessCourse($user, $course): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isInstructor() && $course->instructor_id === $user->id) {
            return true;
        }

        if ($user->isStudent()) {
            return Enrollment::where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->where('status', 'active')
                ->exists();
        }

        return false;
    }
}
