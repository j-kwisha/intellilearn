<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    use HasFactory;

    protected $fillable = [
        'assessment_id',
        'question_text',
        'type',
        'options',
        'correct_answer',
        'points',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',    // Auto-converts JSON ↔ PHP array
            'points'  => 'decimal:2',
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

    public function rubric()
    {
        return $this->hasOne(Rubric::class);
    }
}
