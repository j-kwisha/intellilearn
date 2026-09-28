<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class GradeController extends Controller
{
    /**
     * GET GRADES FOR A STUDENT IN A COURSE
     * GET /api/courses/{course}/grades
     *
     * Students see their own. Instructors see all students.
     */
    public function index(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if ($user->isStudent()) {
            $grade = Grade::where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->first();

            return response()->json(['grade' => $grade]);
        }

        // Instructor/Admin sees all
        $grades = Grade::where('course_id', $course->id)
            ->with('user:id,first_name,last_name,email')
            ->get();

        return response()->json(['grades' => $grades]);
    }

    /**
     * COMPUTE/RECOMPUTE GRADES FOR ALL STUDENTS IN A COURSE
     * POST /api/courses/{course}/grades/compute
     *
     * Calculates averages from graded submissions and saves to grades table.
     * Instructor/Admin only.
     */
    public function compute(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        if (! $user->isAdmin() && ! ($user->isInstructor() && $course->instructor_id === $user->id)) {
            return response()->json(['message' => 'You do not have permission to compute grades.'], 403);
        }

        // Get all enrolled students
        $enrollments = Enrollment::where('course_id', $course->id)
            ->where('status', 'active')
            ->get();

        $computed = [];

        foreach ($enrollments as $enrollment) {
            $studentId = $enrollment->user_id;

            // Get all graded submissions for this student in this course
            $submissions = Submission::where('user_id', $studentId)
                ->where('status', 'graded')
                ->whereHas('assessment', fn($q) => $q->where('course_id', $course->id))
                ->with('assessment:id,type')
                ->get();

            // Group by assessment type and calculate averages
            $quizScores = [];
            $examScores = [];
            $activityScores = [];

            foreach ($submissions as $sub) {
                if ($sub->percentage === null) continue;

                switch ($sub->assessment->type) {
                    case 'quiz':
                        $quizScores[] = $sub->percentage;
                        break;
                    case 'long_exam':
                        $examScores[] = $sub->percentage;
                        break;
                    case 'individual_activity':
                        $activityScores[] = $sub->percentage;
                        break;
                }
            }

            $quizAvg = count($quizScores) > 0 ? round(array_sum($quizScores) / count($quizScores), 2) : null;
            $examAvg = count($examScores) > 0 ? round(array_sum($examScores) / count($examScores), 2) : null;
            $activityAvg = count($activityScores) > 0 ? round(array_sum($activityScores) / count($activityScores), 2) : null;

            // Weighted average: quiz 40%, exam 40%, activity 20%
            $components = [];
            if ($quizAvg !== null) $components[] = ['avg' => $quizAvg, 'weight' => 0.40];
            if ($examAvg !== null) $components[] = ['avg' => $examAvg, 'weight' => 0.40];
            if ($activityAvg !== null) $components[] = ['avg' => $activityAvg, 'weight' => 0.20];

            $overall = null;
            if (count($components) > 0) {
                $totalWeight = array_sum(array_column($components, 'weight'));
                $weightedSum = 0;
                foreach ($components as $c) {
                    $weightedSum += $c['avg'] * $c['weight'];
                }
                $overall = round($weightedSum / $totalWeight, 2);
            }

            $remarks = null;
            if ($overall !== null) {
                $remarks = $overall >= 75 ? 'Passed' : 'Failed';
            }

            $grade = Grade::updateOrCreate(
                ['user_id' => $studentId, 'course_id' => $course->id],
                [
                    'quiz_average'       => $quizAvg,
                    'exam_average'       => $examAvg,
                    'activity_average'   => $activityAvg,
                    'overall_grade'      => $overall,
                    'remarks'            => $remarks,
                ]
            );

            $computed[] = $grade;
        }

        return response()->json([
            'message' => 'Grades computed for ' . count($computed) . ' students.',
            'grades'  => $computed,
        ]);
    }
}
