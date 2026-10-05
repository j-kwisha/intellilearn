<?php
namespace Database\Seeders;
use Database\Seeders\Presentation\{PresentationData, PresentationUsersSeeder};
use Illuminate\Database\Seeder;
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Legacy entry point; account definitions live in one place.
        PresentationData::assertSafe();
        $this->call(PresentationUsersSeeder::class);
    }
}
