<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class ActivityLog extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'course_id', 'action', 'subject_type', 'subject_id', 'details', 'created_at'];

    protected function casts(): array
    {
        return ['details' => 'array', 'created_at' => 'datetime'];
    }

    public static function record($actor, string $action, $course = null, ?string $subjectType = null, ?int $subjectId = null, array $details = []): void
    {
        if (!$actor || !$actor->isInstructor() || !Schema::hasTable('activity_logs')) return;

        static::create([
            'user_id' => $actor->id,
            'course_id' => $course?->id,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'details' => ['actor_name' => trim($actor->first_name.' '.$actor->last_name)] + $details,
            'created_at' => now(),
        ]);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }
}
