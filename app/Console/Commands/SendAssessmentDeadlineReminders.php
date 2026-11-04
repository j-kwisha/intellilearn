<?php

namespace App\Console\Commands;

use App\Models\Assessment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendAssessmentDeadlineReminders extends Command
{
    protected $signature = 'assessments:send-deadline-reminders';
    protected $description = 'Email enrolled students about assessments due within the next 24 hours';

    public function handle(): int
    {
        $windowStart = now();
        $windowEnd = now()->addHours(24);
        $assessments = Assessment::where('is_published', true)->whereNotNull('due_date')
            ->whereBetween('due_date', [$windowStart, $windowEnd])->with('course.enrollments.user')->get();
        foreach ($assessments as $assessment) {
            foreach ($assessment->course->enrollments->where('status', 'active') as $enrollment) {
                $student = $enrollment->user;
                if (!$student || !$student->isStudent() || !$student->is_active) continue;
                if ($assessment->submissions()->where('user_id', $student->id)->whereIn('status', ['submitted', 'graded'])->exists()) continue;
                $alreadySent = DB::table('assessment_reminder_logs')->where('assessment_id', $assessment->id)
                    ->where('user_id', $student->id)->where('reminder_date', now()->toDateString())->exists();
                if ($alreadySent) continue;
                try {
                    Mail::raw("{$assessment->title} in {$assessment->course->name} is due {$assessment->due_date->timezone(config('app.timezone'))->format('M j, Y g:i A')}. Sign in to IntelliLearn to complete it.",
                        fn ($message) => $message->to($student->email, $student->full_name)->subject('IntelliLearn assessment deadline reminder'));
                    DB::table('assessment_reminder_logs')->insertOrIgnore([
                        'assessment_id' => $assessment->id, 'user_id' => $student->id,
                        'reminder_date' => now()->toDateString(), 'created_at' => now(), 'updated_at' => now(),
                    ]);
                } catch (\Throwable $error) {
                    Log::warning('Assessment reminder email failed', ['assessment_id' => $assessment->id, 'user_id' => $student->id, 'exception_type' => get_class($error)]);
                }
            }
        }
        $this->info("Processed {$assessments->count()} upcoming assessment(s).");
        return self::SUCCESS;
    }
}
