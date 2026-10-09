<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class LessonMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'lesson_id',
        'title',
        'type',
        'file_path',
        'original_filename',
        'url',
        'order',
        'extracted_text',
    ];

    protected $appends = ['file_url', 'download_name'];

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

    public function getDownloadNameAttribute(): string
    {
        if ($this->original_filename) return $this->original_filename;
        $extension = pathinfo(parse_url($this->file_path ?? '', PHP_URL_PATH) ?? '', PATHINFO_EXTENSION);
        $title = preg_replace('/[\\\\\/\x00-\x1F\x7F]/u', '_', $this->title ?: 'Lesson material');
        return $extension && !str_ends_with(strtolower($title), '.' . strtolower($extension))
            ? $title . '.' . $extension : $title;
    }

    public function lesson()
    {
        return $this->belongsTo(Lesson::class);
    }
}
