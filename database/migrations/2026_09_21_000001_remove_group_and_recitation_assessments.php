<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Remove recitation_average column from grades table
        Schema::table('grades', function (Blueprint $table) {
            $table->dropColumn('recitation_average');
        });

        // Delete any existing group_activity or recitation assessments
        DB::table('assessments')
            ->whereIn('type', ['group_activity', 'recitation'])
            ->delete();

        // Note: We cannot modify enum in a simple way with Laravel migrations on all databases.
        // PostgreSQL: We need to use raw SQL to alter the enum type
        // For PostgreSQL, we'll recreate the constraint
        
        if (DB::getDriverName() === 'pgsql') {
            // Drop the old constraint
            DB::statement("ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_type_check");
            
            // Add new constraint with only the 3 types
            DB::statement("ALTER TABLE assessments ADD CONSTRAINT assessments_type_check CHECK (type::text = ANY (ARRAY['quiz'::character varying, 'long_exam'::character varying, 'individual_activity'::character varying]::text[]))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Add back recitation_average column
        Schema::table('grades', function (Blueprint $table) {
            $table->decimal('recitation_average', 5, 2)->nullable()->after('activity_average');
        });

        // Restore the original enum constraint for PostgreSQL
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_type_check");
            DB::statement("ALTER TABLE assessments ADD CONSTRAINT assessments_type_check CHECK (type::text = ANY (ARRAY['quiz'::character varying, 'long_exam'::character varying, 'individual_activity'::character varying, 'group_activity'::character varying, 'recitation'::character varying]::text[]))");
        }
    }
};
