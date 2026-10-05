<?php
namespace Database\Seeders\Presentation;
use App\Models\{Assessment, Course, Question};
use App\Services\RubricService;
use Illuminate\Database\Seeder;

class PresentationAssessmentsSeeder extends Seeder
{
    public function run(): void
    {
        PresentationData::assertSafe();
        foreach (PresentationData::courses() as $code => $data) {
            $course = Course::where('code', $code)->firstOrFail();
            $lessons = $course->lessons()->orderBy('order')->get();
            $plans = [
                ['Foundations Check', 'quiz', -23, -21, 0],
                ['Applied Concepts Quiz', 'quiz', -16, -14, 1],
                ['Midterm Examination', 'long_exam', -10, -8, 2],
                ['Case Analysis and Reflection', 'individual_activity', -5, -2, 3],
                ['Integration Review', 'quiz', -1, 7, 3],
            ];
            foreach ($plans as $number => [$suffix, $type, $open, $due, $lessonIndex]) {
                $assessment = Assessment::updateOrCreate(['course_id' => $course->id, 'title' => $data['title'] . ': ' . $suffix], [
                    'lesson_id' => $lessons[$lessonIndex]->id, 'type' => $type, 'topic' => $lessons[$lessonIndex]->topic,
                    'description' => $type === 'individual_activity' ? 'Apply the assigned reading to the case and justify your proposed approach. The instructor reviews the personal reflection.' : 'Use the course concepts to answer each question. Read all choices carefully.',
                    'total_points' => $type === 'individual_activity' ? 20 : 100,
                    'time_limit_minutes' => $type === 'long_exam' ? 60 : ($type === 'quiz' ? 25 : null),
                    'max_attempts' => 1, 'available_from' => PresentationData::date()->addDays($open)->setHour(8),
                    'due_date' => PresentationData::date()->addDays($due)->setHour(23),
                    'is_published' => false, 'score_visibility' => $number === 2 ? 'instructor_release' : 'immediate',
                    'scores_released_at' => $number === 2 ? PresentationData::date()->subDays(6) : null,
                    'created_at' => PresentationData::date()->addDays($open - 1),
                ]);
                if ($type === 'individual_activity') {
                    foreach ([$data['essay'], $data['reflection']] as $order => $prompt) {
                        $question = Question::updateOrCreate(['assessment_id' => $assessment->id, 'order' => $order], [
                            'question_text' => $prompt, 'type' => 'essay', 'points' => 10,
                            'reference_lesson_id' => $order === 0 ? $lessons[3]->id : null,
                            'created_at' => $assessment->created_at,
                        ]);
                        $rubric = self::rubric($order === 0);
                        app(RubricService::class)->validate($rubric, 10);
                        if (!$question->rubric) app(RubricService::class)->save($question, $rubric, $course->instructor_id);
                        $question->fresh()->rubric->update(['created_at' => $assessment->created_at]);
                        app(RubricService::class)->validate(app(RubricService::class)->snapshot($question->fresh()->rubric), 10);
                    }
                } else {
                    foreach ($data['questions'] as $order => [$prompt, $options, $correct]) {
                        $rotation = ($order + $number) % count($options);
                        $options = array_merge(array_slice($options, $rotation), array_slice($options, 0, $rotation));
                        $values = ['question_text' => $prompt, 'type' => 'multiple_choice', 'points' => 20, 'options' => $options, 'correct_answer' => $correct];
                        if ($number === 2 && $order === 2) $values = ['question_text' => $data['statement'], 'type' => 'true_false', 'points' => 20, 'options' => ['True', 'False'], 'correct_answer' => $data['truth']];
                        if ($number === 2 && $order === 3) $values = ['question_text' => $data['short'][0], 'type' => 'short_answer', 'points' => 20, 'correct_answer' => $data['short'][1]];
                        if ($number === 2 && $order === 4) $values = ['question_text' => 'Match each concept with its meaning.', 'type' => 'matching', 'points' => 20];
                        $question = Question::updateOrCreate(['assessment_id' => $assessment->id, 'order' => $order], $values + ['created_at' => $assessment->created_at]);
                        if ($question->type === 'matching') foreach ($data['pairs'] as $pairOrder => [$left, $right]) {
                            $question->matchingPairs()->updateOrCreate(['order' => $pairOrder], ['left_item' => $left, 'right_item' => $right, 'correct_match' => $right]);
                        }
                    }
                }
                if ((float) $assessment->questions()->sum('points') !== (float) $assessment->total_points) throw new \RuntimeException('Assessment points do not match question points.');
                $assessment->update(['is_published' => true]);
            }
        }
    }

    public static function rubric(bool $sourceBased): array
    {
        return ['title' => $sourceBased ? 'Case Analysis Rubric' : 'Reflective Reasoning Rubric', 'source' => 'manual', 'total_points' => 10,
            'criteria' => array_map(fn ($row) => ['criterion' => $row[0], 'description' => $row[1], 'max_points' => 5,
                'levels' => [
                    ['label' => 'Developing', 'description' => 'Relevant ideas with limited explanation.', 'min_points' => 0, 'max_points' => 2],
                    ['label' => 'Proficient', 'description' => 'Clear explanation with appropriate application.', 'min_points' => 2, 'max_points' => 4],
                    ['label' => 'Accomplished', 'description' => 'Accurate, justified and complete application.', 'min_points' => 4, 'max_points' => 5],
                ]], $sourceBased ? [['Concept accuracy', 'Explain the three requested concepts using the assigned reading.'], ['Application and justification', 'Relate each concept to the university case and justify the safeguards.']]
                : [['Reflective reasoning', 'Explain a clear decision and its rationale.'], ['Evaluation plan', 'Propose an observable way to evaluate the decision.']]),
        ];
    }
}
