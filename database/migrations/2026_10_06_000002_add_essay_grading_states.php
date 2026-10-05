<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('submission_answers', function (Blueprint $table) {
            $table->string('grading_status')->nullable();
            $table->string('grading_error_code')->nullable();
        });
        Schema::table('submissions', fn (Blueprint $table) => $table->string('grading_status')->nullable());
    }
    public function down(): void
    {
        Schema::table('submission_answers', fn (Blueprint $table) => $table->dropColumn(['grading_status', 'grading_error_code']));
        Schema::table('submissions', fn (Blueprint $table) => $table->dropColumn('grading_status'));
    }
};
