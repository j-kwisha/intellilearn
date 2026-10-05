<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RubricLevel extends Model
{
    protected $fillable = ['rubric_criterion_id', 'label', 'description', 'min_points', 'max_points', 'order'];

    protected function casts(): array
    {
        return ['min_points' => 'decimal:2', 'max_points' => 'decimal:2'];
    }

    public function criterion()
    {
        return $this->belongsTo(RubricCriterion::class, 'rubric_criterion_id');
    }
}
