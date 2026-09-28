<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->enum('score_visibility', ['immediate', 'instructor_release', 'hidden'])
                  ->default('immediate')
                  ->after('is_published');
            $table->timestamp('scores_released_at')->nullable()->after('score_visibility');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropColumn(['score_visibility', 'scores_released_at']);
        });
    }
};
