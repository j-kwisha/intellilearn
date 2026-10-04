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
        'total_points',
        'time_limit_minutes',
        'max_attempts',
        'available_from',
        'due_date',
        'is_published',
        'score_visibility',
        'scores_released_at',
    ];

    protected $appends = ['file_url'];

    public function getFileUrlAttribute(): ?string
    {
        if ($this->file_path) {
            if (str_starts_with($this->file_path, 'http')) {
                return $this->file_path;
            }
            return Storage::disk('public')->url($this->file_path);
        }
        return null;
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
}
