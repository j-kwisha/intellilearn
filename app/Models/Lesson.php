<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lesson extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'title',
        'description',
        'topic',
        'order',
        'is_published',
        'available_from',
        'available_until',
    ];

    protected function casts(): array
    {
        return [
            'is_published'    => 'boolean',
            'available_from'  => 'datetime',
            'available_until' => 'datetime',
        ];
    }

    // -------------------------------------------------------
    // RELATIONSHIPS
    // -------------------------------------------------------

    /**
     * The course this lesson belongs to.
     * Usage: $lesson->course->name
     */
    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * All materials (files) attached to this lesson.
     * Usage: $lesson->materials
     */
    public function materials()
    {
        return $this->hasMany(LessonMaterial::class)->orderBy('order');
    }

    /**
     * All student progress records for this lesson.
     * Usage: $lesson->progress
     */
    public function progress()
    {
        return $this->hasMany(LessonProgress::class);
    }

    /**
     * Assessments linked to this lesson.
     * Usage: $lesson->assessments
     */
    public function assessments()
    {
        return $this->hasMany(Assessment::class);
    }
}
