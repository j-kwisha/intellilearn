<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->date('birthday')->nullable();
            $table->string('year_level', 40)->nullable();
            $table->string('section', 80)->nullable();
            $table->string('student_id', 80)->nullable()->unique();
        });

        Schema::table('assessments', function (Blueprint $table) {
            $table->string('assessment_stage', 20)->default('regular')->index();
            $table->decimal('passing_score', 5, 2)->nullable();
            $table->boolean('allow_late_submissions')->default(false);
            $table->boolean('shuffle_questions')->default(false);
        });

        Schema::table('submissions', function (Blueprint $table) {
            $table->json('question_order')->nullable();
        });

        Schema::create('admin_login_challenges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->string('code_hash', 255);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });

        Schema::create('lesson_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('snapshot');
            $table->string('change_type', 20)->default('edit');
            $table->timestamps();
            $table->index(['lesson_id', 'created_at']);
        });

        Schema::create('assessment_reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('reminder_date');
            $table->timestamps();
            $table->unique(['assessment_id', 'user_id', 'reminder_date']);
        });

        Schema::create('practice_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('question_count')->default(0);
            $table->unsignedInteger('correct_count')->default(0);
            $table->decimal('percentage', 5, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('practice_attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('practice_attempt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->text('answer_text')->nullable();
            $table->boolean('is_correct')->default(false);
            $table->decimal('points_earned', 8, 2)->default(0);
            $table->timestamps();
            $table->unique(['practice_attempt_id', 'question_id']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check');
            DB::statement("ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type::text = ANY (ARRAY['multiple_choice'::text, 'true_false'::text, 'short_answer'::text, 'essay'::text, 'matching'::text, 'enumeration'::text]))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check');
            DB::statement("ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type::text = ANY (ARRAY['multiple_choice'::text, 'true_false'::text, 'short_answer'::text, 'essay'::text, 'matching'::text]))");
        }
        Schema::dropIfExists('lesson_versions');
        Schema::dropIfExists('practice_attempt_answers');
        Schema::dropIfExists('practice_attempts');
        Schema::dropIfExists('assessment_reminder_logs');
        Schema::dropIfExists('admin_login_challenges');
        Schema::table('submissions', fn (Blueprint $table) => $table->dropColumn('question_order'));
        Schema::table('assessments', fn (Blueprint $table) => $table->dropColumn(['assessment_stage', 'passing_score', 'allow_late_submissions', 'shuffle_questions']));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['birthday', 'year_level', 'section', 'student_id']));
    }
};
