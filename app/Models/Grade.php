<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Grade extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'course_id',
        'quiz_average',
        'exam_average',
        'activity_average',
        'overall_grade',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'quiz_average'       => 'decimal:2',
            'exam_average'       => 'decimal:2',
            'activity_average'   => 'decimal:2',
            'overall_grade'      => 'decimal:2',
        ];
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
