<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->string('original_filename')->nullable();
        });
        Schema::table('submissions', function (Blueprint $table) {
            $table->string('file_path')->nullable();
            $table->string('original_filename')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            $table->dropColumn(['file_path', 'original_filename']);
        });
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropColumn('original_filename');
        });
    }
};
