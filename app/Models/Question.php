<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    use HasFactory;

    protected $hidden = ['reference_text', 'reference_file', 'rubric'];

    protected $fillable = [
        'assessment_id',
        'question_text',
        'type',
        'options',
        'correct_answer',
        'points',
        'order',
        'reference_lesson_id',
        'reference_text',
        'reference_file',
    ];

    protected function casts(): array
    {
        return [
            'options'             => 'array',
            'points'              => 'decimal:2',
            'reference_lesson_id' => 'integer',
            'reference_file' => 'array',
        ];
    }

    public function assessment()
    {
        return $this->belongsTo(Assessment::class);
    }

    public function answers()
    {
        return $this->hasMany(SubmissionAnswer::class);
    }

    /**
     * Matching pairs for matching-type questions.
     */
    public function matchingPairs()
    {
        return $this->hasMany(MatchingPair::class)->orderBy('order');
    }

    public function referenceLesson()
    {
        return $this->belongsTo(\App\Models\Lesson::class, 'reference_lesson_id');
    }

    public function rubric()
    {
        return $this->hasOne(Rubric::class);
    }
}
