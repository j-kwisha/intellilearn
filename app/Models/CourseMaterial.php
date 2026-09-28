<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class CourseMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'created_by',
        'title',
        'type',
        'file_path',
        'url',
        'order',
        'extracted_text',
    ];

    protected $appends = ['file_url'];

    protected $hidden = ['extracted_text'];

    public function getFileUrlAttribute(): ?string
    {
        if ($this->file_path) {
            // If file_path is already a full URL (Cloudinary), return it directly
            if (str_starts_with($this->file_path, 'http')) {
                return $this->file_path;
            }
            return Storage::disk('public')->url($this->file_path);
        }
        return $this->url ?? null;
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

