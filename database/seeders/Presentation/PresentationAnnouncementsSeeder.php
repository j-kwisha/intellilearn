<?php
namespace Database\Seeders\Presentation;
use App\Models\{Announcement, CalendarEvent, Course};
use Illuminate\Database\Seeder;

class PresentationAnnouncementsSeeder extends Seeder
{
    public function run(): void
    {
        PresentationData::assertSafe();
        foreach (PresentationData::courses() as $code => $data) {
            $course = Course::where('code', $code)->firstOrFail();
            foreach ([
                ['Learning Plan and Course Expectations', 'Read the four lesson notes in sequence. Explain your reasoning clearly, cite assigned concepts, and ask for clarification during consultation.', true],
                ['Integration Review Reminder', 'The integration review closes on ' . PresentationData::date()->addDays(7)->format('F j') . '. Review the midterm feedback and complete the published practice questions before the deadline.', false],
                ['Consultation and Feedback Clinic', 'Bring a specific question about your case analysis or assessment feedback. Consultation is scheduled for ' . PresentationData::date()->addDays(3)->format('F j') . ' at 2:00 PM.', false],
            ] as $order => [$title, $content, $pinned]) {
                Announcement::updateOrCreate(['course_id' => $course->id, 'title' => $title], ['user_id' => $course->instructor_id,
                    'content' => $content, 'is_pinned' => $pinned, 'created_at' => PresentationData::date()->subDays(3 - $order)->setHour(9)]);
            }
            foreach ([['Consultation and Feedback Clinic', 'other', 3, 14], ['Integration Review Deadline', 'quiz', 7, 23], ['Collaborative Design Discussion', 'lesson', 5, 10]] as [$title, $type, $day, $hour]) {
                CalendarEvent::updateOrCreate(['course_id' => $course->id, 'title' => $title], [
                    'user_id' => $course->instructor_id, 'description' => 'Prepare your notes for ' . $data['title'] . '.',
                    'event_type' => $type, 'start_date' => PresentationData::date()->addDays($day)->setHour($hour),
                    'end_date' => PresentationData::date()->addDays($day)->setHour($hour)->addHour(),
                    'all_day' => false, 'color' => $type === 'quiz' ? '#7655D9' : '#2F6E56',
                ]);
            }
        }
    }
}
