<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Question;
use App\Models\Submission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LearningFeatureController extends Controller
{
    public function knowledgeGain(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();
        if (!$user->isAdmin() && !($user->isInstructor() && $course->instructor_id === $user->id)) {
            return response()->json(['message' => 'You cannot view this course report.'], 403);
        }
        $submissions = Submission::where('status', 'graded')->whereNotNull('percentage')
            ->whereHas('assessment', fn ($q) => $q->where('course_id', $course->id)->whereIn('assessment_stage', ['pre_test', 'post_test']))
            ->with(['user:id,first_name,last_name,email,section,year_level', 'assessment:id,title,topic,assessment_stage'])
            ->get();
        $students = $submissions->groupBy('user_id')->map(function ($rows) {
            $topicKey = fn ($row) => trim((string) $row->assessment->topic) !== '' ? mb_strtolower(trim($row->assessment->topic)) : '__untagged__';
            $pre = $rows->filter(fn ($row) => $row->assessment->assessment_stage === 'pre_test')->groupBy($topicKey);
            $post = $rows->filter(fn ($row) => $row->assessment->assessment_stage === 'post_test')->groupBy($topicKey);
            $pairedTopics = $pre->keys()->intersect($post->keys());
            $preTopicAverages = $pairedTopics->map(fn ($topic) => $pre[$topic]->avg('percentage'));
            $postTopicAverages = $pairedTopics->map(fn ($topic) => $post[$topic]->avg('percentage'));
            $preAverage = $preTopicAverages->isNotEmpty() ? round($preTopicAverages->avg(), 2) : null;
            $postAverage = $postTopicAverages->isNotEmpty() ? round($postTopicAverages->avg(), 2) : null;
            return [
                'student' => $rows->first()->user,
                'pre_test_average' => $preAverage,
                'post_test_average' => $postAverage,
                'gain' => $preAverage !== null && $postAverage !== null ? round($postAverage - $preAverage, 2) : null,
                'pre_test_count' => $pre->flatten(1)->count(), 'post_test_count' => $post->flatten(1)->count(),
                'paired_topic_count' => $pairedTopics->count(),
            ];
        })->values();
        $paired = $students->whereNotNull('gain');
        return response()->json([
            'students' => $students,
            'cohort_average_gain' => $paired->isNotEmpty() ? round($paired->avg('gain'), 2) : null,
            'paired_student_count' => $paired->count(),
            'note' => 'Gain compares each student’s average graded pre-test and post-test percentage. Only students with both are included in the cohort average.',
        ]);
    }

    public function questionAnalysis(Request $request, Course $course, Assessment $assessment): JsonResponse
    {
        $user = $request->user();
        if ($assessment->course_id !== $course->id || (!$user->isAdmin() && !($user->isInstructor() && $course->instructor_id === $user->id))) {
            return response()->json(['message' => 'You cannot view this assessment analysis.'], 403);
        }
        $rows = $assessment->questions()->with(['answers' => fn ($q) => $q->whereNotNull('is_correct')])->get()->map(function ($question) {
            $answers = $question->answers;
            $attempts = $answers->count();
            $correct = $answers->where('is_correct', true)->count();
            $rate = $attempts ? round($correct / $attempts * 100, 1) : null;
            return [
                'question_id' => $question->id, 'question_text' => $question->question_text,
                'type' => $question->type, 'attempts' => $attempts, 'correct_count' => $correct,
                'percent_correct' => $rate,
                'difficulty' => $rate === null ? 'No data' : ($rate < 35 ? 'Difficult' : ($rate > 85 ? 'Easy' : 'Balanced')),
                'reliable_sample' => $attempts >= 5,
            ];
        });
        return response()->json(['questions' => $rows, 'minimum_reliable_attempts' => 5]);
    }

    public function practiceSet(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isStudent()) return response()->json(['message' => 'Students only.'], 403);
        $courseId = $request->integer('course_id') ?: null;
        $enrolled = Enrollment::where('user_id', $user->id)->where('status', 'active')->pluck('course_id');
        if ($courseId && !$enrolled->contains($courseId)) return response()->json(['message' => 'You are not enrolled in this course.'], 403);
        $missedIds = DB::table('submission_answers')->where('is_correct', false)
            ->whereIn('submission_id', Submission::where('user_id', $user->id)->where('status', 'graded')->select('id'))
            ->pluck('question_id')->unique();
        $questions = Question::whereIn('id', $missedIds)->whereIn('type', ['multiple_choice', 'true_false', 'short_answer', 'enumeration'])
            ->whereHas('assessment', fn ($q) => $q->where('is_published', true)->where('assessment_stage', 'regular')
                ->whereIn('course_id', $courseId ? [$courseId] : $enrolled))
            ->with('assessment:id,title,course_id,topic')->inRandomOrder()->limit(15)->get()
            ->map(fn ($question) => [
                'id' => $question->id, 'question_text' => $question->question_text, 'type' => $question->type,
                'options' => $question->options, 'points' => $question->points,
                'assessment_title' => $question->assessment->title, 'course_id' => $question->assessment->course_id,
                'topic' => $question->assessment->topic,
            ]);
        return response()->json(['questions' => $questions]);
    }

    public function submitPractice(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isStudent()) return response()->json(['message' => 'Students only.'], 403);
        $data = $request->validate([
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'answers' => ['required', 'array', 'min:1', 'max:15'],
            'answers.*.question_id' => ['required', 'integer', 'distinct', 'exists:questions,id'],
            'answers.*.answer_text' => ['nullable', 'string', 'max:50000'],
        ]);
        abort_unless(Enrollment::where('user_id', $user->id)->where('course_id', $data['course_id'])->where('status', 'active')->exists(), 403);
        $missedIds = DB::table('submission_answers')->where('is_correct', false)
            ->whereIn('submission_id', Submission::where('user_id', $user->id)->where('status', 'graded')->select('id'))
            ->pluck('question_id')->unique();
        $questions = Question::whereIn('id', collect($data['answers'])->pluck('question_id'))
            ->whereIn('id', $missedIds)->whereIn('type', ['multiple_choice', 'true_false', 'short_answer', 'enumeration'])
            ->whereHas('assessment', fn ($q) => $q->where('course_id', $data['course_id'])->where('assessment_stage', 'regular'))
            ->get()->keyBy('id');
        if ($questions->count() !== count($data['answers'])) throw ValidationException::withMessages(['answers' => 'Practice can only include questions you previously missed in this course.']);
        $outcomes = [];
        foreach ($data['answers'] as $answer) {
            $question = $questions->get($answer['question_id']);
            $given = $answer['answer_text'] ?? '';
            if ($question->type === 'enumeration') {
                $expected = array_filter(array_map(fn ($x) => mb_strtolower(trim($x)), preg_split('/[\r\n;,]+/', (string) $question->correct_answer)));
                $entries = json_decode($given, true);
                if (!is_array($entries)) $entries = preg_split('/[\r\n;,]+/', $given);
                $correct = count(array_intersect($expected, array_unique(array_map(fn ($x) => mb_strtolower(trim((string) $x)), $entries)))) === count($expected);
            } else {
                $correct = mb_strtolower(trim($given)) === mb_strtolower(trim((string) $question->correct_answer));
            }
            $outcomes[] = ['question_id' => $question->id, 'answer_text' => $given, 'is_correct' => $correct,
                'points_earned' => $correct ? (float) $question->points : 0, 'points' => (float) $question->points];
        }
        $attempt = DB::transaction(function () use ($user, $data, $outcomes) {
            $total = count($outcomes); $correct = collect($outcomes)->where('is_correct', true)->count();
            $id = DB::table('practice_attempts')->insertGetId([
                'user_id' => $user->id, 'course_id' => $data['course_id'], 'question_count' => $total,
                'correct_count' => $correct, 'percentage' => $total ? round($correct / $total * 100, 2) : 0,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            foreach ($outcomes as $item) DB::table('practice_attempt_answers')->insert([
                'practice_attempt_id' => $id, 'question_id' => $item['question_id'], 'answer_text' => $item['answer_text'],
                'is_correct' => $item['is_correct'], 'points_earned' => $item['points_earned'], 'created_at' => now(), 'updated_at' => now(),
            ]);
            return ['id' => $id, 'question_count' => $total, 'correct_count' => $correct,
                'percentage' => $total ? round($correct / $total * 100, 2) : 0];
        });
        return response()->json(['attempt' => $attempt, 'answers' => $outcomes]);
    }
}
