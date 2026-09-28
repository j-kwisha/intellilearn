<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rubric extends Model
{
    protected $fillable = [
        'question_id',
        'title',
        'description',
    ];

    public function question()
    {
        return $this->belongsTo(Question::class);
    }

    public function criteria()
    {
        return $this->hasMany(RubricCriterion::class)->orderBy('order');
    }
}
