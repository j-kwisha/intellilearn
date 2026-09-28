<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Submission extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'assessment_id',
        'attempt_number',
        'score',
        'total_points',
        'percentage',
        'status',
        'ai_feedback',
        'started_at',
        'submitted_at',
        'graded_at',
    ];

    protected function casts(): array
    {
        return [
            'score'        => 'decimal:2',
            'total_points' => 'decimal:2',
            'percentage'   => 'decimal:2',
            'started_at'   => 'datetime',
            'submitted_at' => 'datetime',
            'graded_at'    => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function assessment()
    {
        return $this->belongsTo(Assessment::class);
    }

    /**
     * All individual answers in this submission.
     */
    public function answers()
    {
        return $this->hasMany(SubmissionAnswer::class);
    }
}
