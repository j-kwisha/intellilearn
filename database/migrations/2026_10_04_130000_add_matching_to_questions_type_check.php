<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // Drop existing check constraint and re-add with 'matching' included
            DB::statement("ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check");
            DB::statement("ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type::text = ANY (ARRAY['multiple_choice'::text, 'true_false'::text, 'short_answer'::text, 'essay'::text, 'matching'::text]))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check");
            DB::statement("ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type::text = ANY (ARRAY['multiple_choice'::text, 'true_false'::text, 'short_answer'::text, 'essay'::text]))");
        }
    }
};
