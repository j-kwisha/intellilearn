<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('course_id')->constrained()->onDelete('cascade');
            $table->decimal('quiz_average', 5, 2)->nullable();
            $table->decimal('exam_average', 5, 2)->nullable();
            $table->decimal('activity_average', 5, 2)->nullable();
            $table->decimal('recitation_average', 5, 2)->nullable();
            $table->decimal('overall_grade', 5, 2)->nullable();
            $table->string('remarks')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'course_id']);
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('content');
            $table->boolean('is_pinned')->default(false);
            $table->timestamps();

            $table->index(['course_id', 'created_at']);
        });

        Schema::create('calendar_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('event_type', ['lesson', 'quiz', 'exam', 'activity', 'deadline', 'other'])->default('other');
            $table->string('color', 7)->default('#3B82F6');
            $table->timestamp('start_date');
            $table->timestamp('end_date')->nullable();
            $table->boolean('all_day')->default(false);
            $table->timestamps();

            $table->index(['course_id', 'start_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_events');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('grades');
    }
};
