<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Assessment extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'lesson_id',
        'title',
        'description',
        'type',
        'topic',
        'file_path',
        'original_filename',
        'total_points',
        'time_limit_minutes',
        'max_attempts',
        'available_from',
        'due_date',
        'is_published',
        'score_visibility',
        'scores_released_at',
        'assessment_stage',
        'passing_score',
        'allow_late_submissions',
        'shuffle_questions',
        'shuffle_choices',
    ];

    protected $appends = ['file_url'];

    public function getFileUrlAttribute(): ?string
    {
        if (!$this->file_path) return null;
        if (preg_match('#^https?://#i', $this->file_path) && $this->publicStoragePath() === null) {
            return $this->file_path;
        }
        $path = $this->publicStoragePath();
        return $path ? Storage::disk('public')->url($path) : null;
    }

    public function publicStoragePath(): ?string
    {
        $path = $this->file_path;
        if (!$path) return null;
        $storageUrl = parse_url(Storage::disk('public')->url(''));
        $prefix = rtrim($storageUrl['path'] ?? '/storage', '/') . '/';
        if (preg_match('#^https?://#i', $path)) {
            $url = parse_url($path);
            if (!$url || strcasecmp($url['host'] ?? '', $storageUrl['host'] ?? '') !== 0
                || ($url['port'] ?? null) !== ($storageUrl['port'] ?? null)) return null;
            $path = $url['path'] ?? '';
        }
        if (str_starts_with($path, $prefix)) $path = substr($path, strlen($prefix));
        $path = rawurldecode($path);
        if ($path === '' || str_contains($path, '..') || str_starts_with($path, '/')
            || str_contains($path, '\\') || preg_match('/[\x00-\x1F\x7F]/', $path)) return null;
        return $path;
    }

    public function downloadName(): string
    {
        if ($this->original_filename) return $this->original_filename;
        $extension = pathinfo(parse_url($this->file_path ?? '', PHP_URL_PATH) ?? '', PATHINFO_EXTENSION);
        $title = preg_replace('/[\x00-\x1F\x7F]/u', '_', str_replace(['\\', '/'], '_', $this->title ?: 'Activity file'));
        return $extension && !str_ends_with(strtolower($title), '.' . strtolower($extension))
            ? $title . '.' . $extension : $title;
    }

    protected function casts(): array
    {
        return [
            'total_points'       => 'decimal:2',
            'is_published'       => 'boolean',
            'available_from'     => 'datetime',
            'due_date'           => 'datetime',
            'scores_released_at' => 'datetime',
            'time_limit_minutes' => 'integer',
            'max_attempts'       => 'integer',
            'passing_score'      => 'decimal:2',
            'allow_late_submissions' => 'boolean',
            'shuffle_questions' => 'boolean',
            'shuffle_choices' => 'boolean',
        ];
    }

    // -------------------------------------------------------
    // RELATIONSHIPS
    // -------------------------------------------------------

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function lesson()
    {
        return $this->belongsTo(Lesson::class);
    }

    /**
     * All questions in this assessment.
     * Usage: $assessment->questions
     */
    public function questions()
    {
        return $this->hasMany(Question::class)->orderBy('order');
    }

    /**
     * All student submissions for this assessment.
     * Usage: $assessment->submissions
     */
    public function submissions()
    {
        return $this->hasMany(Submission::class);
    }

    public function calendarEvent()
    {
        return $this->hasOne(CalendarEvent::class);
    }
}
