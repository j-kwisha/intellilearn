<?php
namespace Database\Seeders\Presentation;
use App\Models\{Course, Enrollment, User};
use Illuminate\Database\Seeder;

class PresentationCoursesSeeder extends Seeder
{
    public function run(): void
    {
        PresentationData::assertSafe();
        foreach (PresentationData::courses() as $code => $data) {
            $teacher = User::where('email', $data['teacher'] . '@intellilearn.edu')->where('role', 'instructor')->firstOrFail();
            $course = Course::updateOrCreate(['code' => $code], [
                'name' => $data['title'], 'description' => $data['description'], 'instructor_id' => $teacher->id,
                'semester' => 'First Semester ' . PresentationData::date()->year . '-' . (PresentationData::date()->year + 1),
                'section' => 'BSIT 3A', 'status' => 'active', 'join_code' => $data['join'],
                'created_at' => PresentationData::date()->subDays(40),
            ]);
            foreach (array_slice(PresentationData::USERS, 3) as $index => $person) {
                if ($code === 'IT 323' && !in_array($index, [0, 1, 2, 4, 6, 8], true)) continue;
                $student = User::where('email', $person[2] . '@intellilearn.edu')->where('role', 'student')->firstOrFail();
                Enrollment::updateOrCreate(['course_id' => $course->id, 'user_id' => $student->id], ['status' => 'active', 'created_at' => PresentationData::date()->subDays(35)]);
            }
        }
    }
}
