<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('rubrics', function (Blueprint $table) {
            $table->decimal('total_points', 10, 2)->nullable();
            $table->string('source')->default('manual');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
        });
        // Existing saved rubrics remain usable only when their totals match the question.
        DB::table('rubrics')->orderBy('id')->each(function ($rubric) {
            DB::table('rubrics')->where('id', $rubric->id)->update([
                'total_points' => DB::table('rubric_criteria')->where('rubric_id', $rubric->id)->sum('max_points'),
            ]);
        });
        Schema::create('rubric_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rubric_criterion_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->text('description');
            $table->decimal('min_points', 10, 2);
            $table->decimal('max_points', 10, 2);
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });
        Schema::table('questions', function (Blueprint $table) {
            $table->json('reference_file')->nullable();
        });
        Schema::table('submission_answers', function (Blueprint $table) {
            $table->json('rubric_snapshot')->nullable();
            $table->json('reference_snapshot')->nullable();
            $table->json('ai_evaluation')->nullable();
            $table->json('teacher_criterion_scores')->nullable();
            $table->foreignId('overridden_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('overridden_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('submission_answers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('overridden_by');
            $table->dropColumn(['rubric_snapshot', 'reference_snapshot', 'ai_evaluation', 'teacher_criterion_scores', 'overridden_at']);
        });
        Schema::table('questions', fn (Blueprint $table) => $table->dropColumn('reference_file'));
        Schema::dropIfExists('rubric_levels');
        Schema::table('rubrics', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['total_points', 'source']);
        });
    }
};
