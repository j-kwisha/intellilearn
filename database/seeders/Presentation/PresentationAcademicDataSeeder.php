<?php
namespace Database\Seeders\Presentation;
use App\Models\{Course, Grade, LessonProgress, Submission, SubmissionAnswer, User};
use App\Services\{EssayReferenceService, RubricService};
use Illuminate\Database\Seeder;

class PresentationAcademicDataSeeder extends Seeder
{
    public function run(): void
    {
        PresentationData::assertSafe();
        foreach (PresentationData::courses() as $code => $data) {
            $course = Course::where('code', $code)->firstOrFail();
            $assessments = $course->assessments()->orderBy('available_from')->get();
            foreach (array_slice(PresentationData::USERS, 3) as $index => $person) {
                $student = User::where('email', $person[2] . '@intellilearn.edu')->where('role', 'student')->firstOrFail();
                if (!$course->enrollments()->where('user_id', $student->id)->exists()) continue;
                $profile = PresentationData::PROFILES[$index];
                foreach ($assessments->take(4) as $number => $assessment) {
                    $abandoned = $index === 8 && $number === 1;
                    if ($profile[$number] === null && !$abandoned) continue;
                    $pending = $number === 3 && $profile[4] === null;
                    $submitted = $assessment->available_from->toImmutable()->addDay()->setHour(10);
                    $submission = Submission::updateOrCreate(['user_id' => $student->id, 'assessment_id' => $assessment->id, 'attempt_number' => 1], [
                        'status' => $abandoned ? 'in_progress' : ($pending ? 'submitted' : 'graded'),
                        'grading_status' => $abandoned ? null : ($pending ? 'pending' : 'graded'),
                        'total_points' => $assessment->total_points, 'score' => null, 'percentage' => null,
                        'created_at' => $submitted->subMinutes(25), 'started_at' => $submitted->subMinutes(25),
                        'submitted_at' => $abandoned ? null : $submitted, 'graded_at' => $pending || $abandoned ? null : $submitted->addDay(),
                    ]);
                    if ($abandoned) continue;
                    $total = 0;
                    foreach ($assessment->questions()->orderBy('order')->get() as $order => $question) {
                        if ($question->type === 'essay') {
                            $points = $profile[3 + $order];
                            $snapshot = app(RubricService::class)->snapshot($question->rubric()->with('criteria.levels')->firstOrFail());
                            $snapshot['saved_at'] = $submitted->toIso8601String();
                            $reference = app(EssayReferenceService::class)->resolve($question->getAttributes(), $course->id, true);
                            $scores = $points === null ? null : [
                                $snapshot['criteria'][0]['id'] => (int) ceil($points / 2),
                                $snapshot['criteria'][1]['id'] => (int) floor($points / 2),
                            ];
                            $reflection = match ($code) {
                                'IT 321' => 'I would label each control, use a logical focus order and visible focus indicators. I would observe keyboard-only task completion and compare errors before and after the changes.',
                                'IT 322' => 'I would confirm how the registrar handles course transfers and repeated enrollments. I would review the student-course relationships and verify the schema using enrollment scenarios with the registrar.',
                                'IT 323' => 'I would ask each stakeholder to state the outcome they need, compare the priorities, and agree on observable acceptance criteria. I would review a small prototype together to verify the shared decision.',
                            };
                            $values = [
                                'answer_text' => $order === 0 ? ($points >= 8 ? $data['answer'] : $data['partial']) : $reflection,
                                'points_earned' => $points, 'is_correct' => $points === null ? null : $points >= 5,
                                'grading_status' => $points === null ? 'pending' : 'graded',
                                'rubric_snapshot' => $snapshot, 'reference_snapshot' => $reference,
                                'teacher_criterion_scores' => $scores, 'ai_evaluation' => null,
                                'instructor_override' => $points !== null,
                                'overridden_by' => $points === null ? null : $course->instructor_id,
                                'overridden_at' => $points === null ? null : $submitted->addDay(),
                                'ai_feedback' => $points === null ? null : 'Instructor review: ' . ($points >= 8 ? 'Clear reasoning and relevant application.' : 'Develop the omitted concept and justify each proposed action.'),
                            ];
                        } else {
                            $correct = $order < $profile[$number];
                            $answer = $question->correct_answer;
                            if ($question->type === 'multiple_choice' && !$correct) $answer = collect($question->options)->first(fn ($option) => $option !== $question->correct_answer);
                            elseif ($question->type === 'true_false' && !$correct) $answer = $answer === 'True' ? 'False' : 'True';
                            elseif ($question->type === 'short_answer' && !$correct) $answer = match ($code) { 'IT 321' => 'HTTP', 'IT 322' => 'COMMIT', 'IT 323' => 'Sprint schedule' };
                            elseif ($question->type === 'matching') {
                                $pairs = $question->matchingPairs()->orderBy('order')->get();
                                $mapping = [];
                                foreach ($pairs as $i => $pair) $mapping[$pair->id] = $correct ? $pair->correct_match : $pairs[($i + 1) % $pairs->count()]->correct_match;
                                $answer = json_encode($mapping);
                            }
                            $values = ['answer_text' => $answer, 'is_correct' => $correct, 'points_earned' => $correct ? 20 : 0, 'grading_status' => 'graded'];
                        }
                        SubmissionAnswer::updateOrCreate(['submission_id' => $submission->id, 'question_id' => $question->id], $values + ['created_at' => $submitted]);
                        $total += $values['points_earned'] ?? 0;
                    }
                    $submission->update(['score' => $total, 'percentage' => $pending ? null : round($total / (float) $assessment->total_points * 100, 2)]);
                }
                foreach ($course->lessons()->orderBy('order')->get() as $order => $lesson) {
                    $done = $index < 2 || ($index < 8 && $order < 3) || ($index >= 8 && $order === 0);
                    $status = $done ? 'done' : ($index >= 8 && $order > 1 ? 'missing' : 'in_progress');
                    $start = PresentationData::date()->subDays(28 - $order * 5)->setHour(9);
                    LessonProgress::updateOrCreate(['user_id' => $student->id, 'lesson_id' => $lesson->id], [
                        'status' => $status, 'time_spent_seconds' => $done ? ($index >= 8 ? 420 : 1800 + $order * 300) : ($status === 'missing' ? 0 : 300),
                        'started_at' => $status === 'missing' ? null : $start,
                        'completed_at' => $done ? $start->addMinutes(40) : null,
                    ]);
                }
                $this->grade($student, $course);
            }
        }
    }

    private function grade(User $student, Course $course): void
    {
        $submissions = Submission::where('user_id', $student->id)->where('status', 'graded')
            ->whereHas('assessment', fn ($q) => $q->where('course_id', $course->id))->with('assessment')->get();
        $fields = ['quiz' => ['quiz_average', .4], 'long_exam' => ['exam_average', .4], 'individual_activity' => ['activity_average', .2]];
        $values = []; $weighted = 0; $weight = 0;
        foreach ($fields as $type => [$field, $factor]) {
            $scores = $submissions->filter(fn ($s) => $s->assessment->type === $type)->pluck('percentage');
            $values[$field] = $scores->isEmpty() ? null : round($scores->avg(), 2);
            if ($values[$field] !== null) { $weighted += $values[$field] * $factor; $weight += $factor; }
        }
        // Same 40/40/20 normalized weighting as GradeController::compute.
        $overall = $weight ? round($weighted / $weight, 2) : null;
        Grade::updateOrCreate(['user_id' => $student->id, 'course_id' => $course->id], $values + [
            'overall_grade' => $overall, 'remarks' => $overall === null ? null : ($overall >= 75 ? 'Passed' : 'Failed'),
        ]);
    }
}
