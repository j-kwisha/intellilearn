<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubmissionAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'submission_id',
        'question_id',
        'answer_text',
        'is_correct',
        'points_earned',
        'ai_feedback',
    ];

    protected function casts(): array
    {
        return [
            'is_correct'    => 'boolean',
            'points_earned' => 'decimal:2',
        ];
    }

    public function submission()
    {
        return $this->belongsTo(Submission::class);
    }

    public function question()
    {
        return $this->belongsTo(Question::class);
    }
}
