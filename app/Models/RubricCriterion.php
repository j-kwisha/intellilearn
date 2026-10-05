<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RubricCriterion extends Model
{
    protected $fillable = [
        'rubric_id',
        'criterion',
        'description',
        'max_points',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'max_points' => 'decimal:2',
        ];
    }

    public function rubric()
    {
        return $this->belongsTo(Rubric::class);
    }

    public function levels()
    {
        return $this->hasMany(RubricLevel::class)->orderBy('order');
    }
}
