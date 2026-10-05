<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubmissionAnswer extends Model
{
    use HasFactory;

    protected $hidden = ['rubric_snapshot', 'reference_snapshot', 'ai_evaluation', 'teacher_criterion_scores', 'overridden_by', 'overridden_at', 'criterion_scores'];

    protected $fillable = [
        'submission_id',
        'question_id',
        'answer_text',
        'grading_status',
        'grading_error_code',
        'file_url',
        'is_correct',
        'points_earned',
        'ai_feedback',
        'criterion_scores',
        'instructor_override',
        'rubric_snapshot',
        'reference_snapshot',
        'ai_evaluation',
        'teacher_criterion_scores',
        'overridden_by',
        'overridden_at',
    ];

    protected function casts(): array
    {
        return [
            'is_correct'    => 'boolean',
            'points_earned' => 'decimal:2',
            'rubric_snapshot' => 'array',
            'reference_snapshot' => 'array',
            'ai_evaluation' => 'array',
            'teacher_criterion_scores' => 'array',
            'instructor_override' => 'boolean',
            'overridden_at' => 'datetime',
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
