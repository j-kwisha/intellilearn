<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MatchingPair extends Model
{
    use HasFactory;

    protected $fillable = [
        'question_id',
        'left_item',
        'right_item',
        'correct_match',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
        ];
    }

    /**
     * The question this matching pair belongs to.
     */
    public function question()
    {
        return $this->belongsTo(Question::class);
    }
}
