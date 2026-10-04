<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            // Instructor can pick a specific lesson whose materials the AI should use
            $table->foreignId('reference_lesson_id')
                ->nullable()
                ->after('order')
                ->constrained('lessons')
                ->onDelete('set null');

            // Instructor can paste/upload extracted reference text directly
            $table->longText('reference_text')->nullable()->after('reference_lesson_id');
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropForeign(['reference_lesson_id']);
            $table->dropColumn(['reference_lesson_id', 'reference_text']);
        });
    }
};
