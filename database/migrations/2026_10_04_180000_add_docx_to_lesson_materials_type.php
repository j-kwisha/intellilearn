<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // PostgreSQL requires dropping and recreating the constraint
        DB::statement("ALTER TABLE lesson_materials DROP CONSTRAINT lesson_materials_type_check");
        DB::statement("ALTER TABLE lesson_materials ADD CONSTRAINT lesson_materials_type_check CHECK (type IN ('pdf', 'video', 'ppt', 'docx', 'pptx', 'xlsx', 'link', 'other'))");
    }

    public function down(): void
    {
        // Revert to original constraint
        DB::statement("ALTER TABLE lesson_materials DROP CONSTRAINT lesson_materials_type_check");
        DB::statement("ALTER TABLE lesson_materials ADD CONSTRAINT lesson_materials_type_check CHECK (type IN ('pdf', 'video', 'ppt', 'link', 'other'))");
    }
};