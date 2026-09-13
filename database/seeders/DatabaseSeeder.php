<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Assessment;
use App\Models\CalendarEvent;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Lesson;
use App\Models\LessonMaterial;
use App\Models\LessonProgress;
use App\Models\Question;
use App\Models\Submission;
use App\Models\SubmissionAnswer;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;


class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // ── Users ────────────────────────────────────────────────────────────
        $admin = User::create([
            'first_name'        => 'Admin',
            'last_name'         => 'User',
            'email'             => 'admin@demo.com',
            'password'          => 'Admin123!',
            'role'              => 'admin',
            'is_active'         => true,
            'email_verified_at' => now(),
        ]);

        $instructor = User::create([
            'first_name'        => 'Jane',
            'last_name'         => 'Santos',
            'email'             => 'instructor@demo.com',
            'password'          => 'Admin123!',
            'role'              => 'instructor',
            'is_active'         => true,
            'email_verified_at' => now(),
        ]);

        $students = collect([
            ['first_name' => 'Juan',   'last_name' => 'Dela Cruz'],
            ['first_name' => 'Maria',  'last_name' => 'Reyes'],
            ['first_name' => 'Carlos', 'last_name' => 'Mendoza'],
            ['first_name' => 'Ana',    'last_name' => 'Garcia'],
        ])->map(fn ($s, $i) => User::create([
            'first_name'        => $s['first_name'],
            'last_name'         => $s['last_name'],
            'email'             => 'student' . ($i + 1) . '@demo.com',
            'password'          => 'Admin123!',
            'role'              => 'student',
            'is_active'         => true,
            'email_verified_at' => now(),
        ]));

        // ── Course ───────────────────────────────────────────────────────────
        $course = Course::create([
            'name'          => 'Introduction to Web Development',
            'code'          => 'WEB101',
            'description'   => 'Covers the fundamentals of HTML, CSS, JavaScript, and backend development.',
            'instructor_id' => $instructor->id,
            'semester'      => '1st Semester 2026',
            'section'       => 'A',
            'status'        => 'active',
        ]);

        // ── Enrollments ──────────────────────────────────────────────────────
        $students->each(fn ($student) => Enrollment::create([
            'user_id'   => $student->id,
            'course_id' => $course->id,
            'status'    => 'active',
        ]));

        // ── Announcements ────────────────────────────────────────────────────
        Announcement::create([
            'course_id' => $course->id,
            'user_id'   => $instructor->id,
            'title'     => 'Welcome to WEB101!',
            'content'   => 'Hello everyone! Please review the course syllabus before our first meeting.',
            'is_pinned' => true,
        ]);

        Announcement::create([
            'course_id' => $course->id,
            'user_id'   => $instructor->id,
            'title'     => 'Quiz 1 Schedule',
            'content'   => 'Quiz 1 covering HTML basics will be held next week. Good luck!',
            'is_pinned' => false,
        ]);

        // ── Lessons ──────────────────────────────────────────────────────────
        $lessons = collect([
            ['title' => 'HTML Fundamentals',   'topic' => 'HTML',       'order' => 1],
            ['title' => 'CSS Styling Basics',  'topic' => 'CSS',        'order' => 2],
            ['title' => 'JavaScript Intro',    'topic' => 'JavaScript', 'order' => 3],
        ])->map(fn ($l) => Lesson::create([
            'course_id'      => $course->id,
            'title'          => $l['title'],
            'topic'          => $l['topic'],
            'description'    => 'Learn the core concepts of ' . $l['topic'] . '.',
            'order'          => $l['order'],
            'is_published'   => true,
            'available_from' => now()->subDays(7),
        ]));

        // ── Lesson Materials ─────────────────────────────────────────────────
        LessonMaterial::create([
            'lesson_id' => $lessons[0]->id,
            'title'     => 'HTML Cheat Sheet',
            'type'      => 'pdf',
            'url'       => 'https://htmlcheatsheet.com',
            'order'     => 1,
        ]);

        LessonMaterial::create([
            'lesson_id' => $lessons[1]->id,
            'title'     => 'CSS Flexbox Guide',
            'type'      => 'link',
            'url'       => 'https://css-tricks.com/snippets/css/a-guide-to-flexbox',
            'order'     => 1,
        ]);

        // ── Lesson Progress ──────────────────────────────────────────────────
        $students->each(function ($student) use ($lessons) {
            LessonProgress::create([
                'user_id'            => $student->id,
                'lesson_id'          => $lessons[0]->id,
                'status'             => 'done',
                'time_spent_seconds' => rand(600, 1800),
                'started_at'         => now()->subDays(5),
                'completed_at'       => now()->subDays(4),
            ]);

            LessonProgress::create([
                'user_id'            => $student->id,
                'lesson_id'          => $lessons[1]->id,
                'status'             => 'in_progress',
                'time_spent_seconds' => rand(120, 600),
                'started_at'         => now()->subDays(2),
            ]);
        });

        // ── Assessment (Quiz) ────────────────────────────────────────────────
        $quiz = Assessment::create([
            'course_id'          => $course->id,
            'lesson_id'          => $lessons[0]->id,
            'title'              => 'Quiz 1: HTML Basics',
            'description'        => 'Test your knowledge of HTML fundamentals.',
            'type'               => 'quiz',
            'topic'              => 'HTML',
            'total_points'       => 30,
            'time_limit_minutes' => 30,
            'max_attempts'       => 2,
            'available_from'     => now()->subDays(5),
            'due_date'           => now()->addDays(2),
            'is_published'       => true,
        ]);

        // ── Questions ────────────────────────────────────────────────────────
        $q1 = Question::create([
            'assessment_id'  => $quiz->id,
            'question_text'  => 'What does HTML stand for?',
            'type'           => 'multiple_choice',
            'options'        => ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'],
            'correct_answer' => 'Hyper Text Markup Language',
            'points'         => 10,
            'order'          => 1,
        ]);

        $q2 = Question::create([
            'assessment_id'  => $quiz->id,
            'question_text'  => 'Which tag is used to create a hyperlink?',
            'type'           => 'multiple_choice',
            'options'        => ['<link>', '<a>', '<href>', '<url>'],
            'correct_answer' => '<a>',
            'points'         => 10,
            'order'          => 2,
        ]);

        $q3 = Question::create([
            'assessment_id'  => $quiz->id,
            'question_text'  => 'The <head> tag contains content visible to the user.',
            'type'           => 'true_false',
            'options'        => ['True', 'False'],
            'correct_answer' => 'False',
            'points'         => 10,
            'order'          => 3,
        ]);

        // ── Submissions & Answers ────────────────────────────────────────────
        $students->each(function ($student) use ($quiz, $q1, $q2, $q3) {
            $answers = [
                $q1->id => ['answer' => 'Hyper Text Markup Language', 'correct' => true,  'points' => 10],
                $q2->id => ['answer' => '<a>',                        'correct' => true,  'points' => 10],
                $q3->id => ['answer' => 'True',                       'correct' => false, 'points' => 0],
            ];

            $score = collect($answers)->sum('points');

            $submission = Submission::create([
                'user_id'        => $student->id,
                'assessment_id'  => $quiz->id,
                'attempt_number' => 1,
                'score'          => $score,
                'total_points'   => 30,
                'percentage'     => round(($score / 30) * 100, 2),
                'status'         => 'graded',
                'started_at'     => now()->subDays(3),
                'submitted_at'   => now()->subDays(3)->addMinutes(20),
                'graded_at'      => now()->subDays(2),
            ]);

            foreach ($answers as $questionId => $data) {
                SubmissionAnswer::create([
                    'submission_id' => $submission->id,
                    'question_id'   => $questionId,
                    'answer_text'   => $data['answer'],
                    'is_correct'    => $data['correct'],
                    'points_earned' => $data['points'],
                ]);
            }
        });

        // ── Assessment 2 (Open / Unanswered) ────────────────────────────────
        $quiz2 = Assessment::create([
            'course_id'          => $course->id,
            'lesson_id'          => $lessons[1]->id,
            'title'              => 'Quiz 2: CSS Fundamentals',
            'description'        => 'Test your understanding of CSS styling and the box model.',
            'type'               => 'quiz',
            'topic'              => 'CSS',
            'total_points'       => 40,
            'time_limit_minutes' => 20,
            'max_attempts'       => 1,
            'available_from'     => now()->subDays(1),
            'due_date'           => now()->addDays(7),
            'is_published'       => true,
        ]);

        Question::create([
            'assessment_id'  => $quiz2->id,
            'question_text'  => 'Which CSS property controls the text size?',
            'type'           => 'multiple_choice',
            'options'        => ['A' => 'font-size', 'B' => 'text-size', 'C' => 'font-weight', 'D' => 'text-style'],
            'correct_answer' => 'A',
            'points'         => 10,
            'order'          => 1,
        ]);

        Question::create([
            'assessment_id'  => $quiz2->id,
            'question_text'  => 'The CSS box model includes margin, border, padding, and content.',
            'type'           => 'true_false',
            'options'        => ['A' => 'True', 'B' => 'False'],
            'correct_answer' => 'A',
            'points'         => 10,
            'order'          => 2,
        ]);

        Question::create([
            'assessment_id'  => $quiz2->id,
            'question_text'  => 'Which property is used to make a flex container?',
            'type'           => 'multiple_choice',
            'options'        => ['A' => 'display: block', 'B' => 'display: flex', 'C' => 'position: flex', 'D' => 'flex: 1'],
            'correct_answer' => 'B',
            'points'         => 10,
            'order'          => 3,
        ]);

        Question::create([
            'assessment_id'  => $quiz2->id,
            'question_text'  => 'In your own words, explain the difference between margin and padding in CSS.',
            'type'           => 'essay',
            'options'        => null,
            'correct_answer' => null,
            'points'         => 10,
            'order'          => 4,
        ]);

        // ── Grades ───────────────────────────────────────────────────────────
        $students->each(fn ($student) => Grade::create([
            'user_id'            => $student->id,
            'course_id'          => $course->id,
            'quiz_average'       => rand(70, 95),
            'exam_average'       => rand(65, 90),
            'activity_average'   => rand(75, 98),
            'recitation_average' => rand(70, 95),
            'overall_grade'      => rand(72, 94),
            'remarks'            => 'Passed',
        ]));

        // ── Calendar Events ──────────────────────────────────────────────────
        CalendarEvent::create([
            'course_id'  => $course->id,
            'user_id'    => $instructor->id,
            'title'      => 'Quiz 1: HTML Basics',
            'event_type' => 'quiz',
            'color'      => '#F59E0B',
            'start_date' => now()->addDays(2),
            'all_day'    => true,
        ]);

        CalendarEvent::create([
            'course_id'  => $course->id,
            'user_id'    => $instructor->id,
            'title'      => 'Midterm Exam',
            'event_type' => 'exam',
            'color'      => '#EF4444',
            'start_date' => now()->addDays(14),
            'all_day'    => true,
        ]);
    }
}
