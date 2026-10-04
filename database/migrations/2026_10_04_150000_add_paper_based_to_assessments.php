<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add file_path column for paper-based assessments
        Schema::table('assessments', function (Blueprint $table) {
            $table->string('file_path', 1000)->nullable()->after('topic');
        });

        // Update PostgreSQL CHECK constraint to include paper_based
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_type_check");
            DB::statement("ALTER TABLE assessments ADD CONSTRAINT assessments_type_check CHECK (type::text = ANY (ARRAY['quiz'::text, 'long_exam'::text, 'individual_activity'::text, 'paper_based'::text]))");
        }
    }

    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropColumn('file_path');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_type_check");
            DB::statement("ALTER TABLE assessments ADD CONSTRAINT assessments_type_check CHECK (type::text = ANY (ARRAY['quiz'::text, 'long_exam'::text, 'individual_activity'::text]))");
        }
    }
};
