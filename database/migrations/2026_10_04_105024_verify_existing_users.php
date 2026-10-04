<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Auto-verify all existing users who were created before
     * email verification was introduced. New registrations
     * will go through the proper verification flow.
     */
    public function up(): void
    {
        DB::table('users')
            ->whereNull('email_verified_at')
            ->update(['email_verified_at' => now()]);
    }

    public function down(): void
    {
        // Cannot reverse — don't unverify accounts
    }
};
