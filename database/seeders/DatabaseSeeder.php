<?php
namespace Database\Seeders;
use Database\Seeders\Presentation\{PresentationData, PresentationUsersSeeder, PresentationCoursesSeeder, PresentationLessonsSeeder, PresentationAssessmentsSeeder, PresentationAnnouncementsSeeder, PresentationAcademicDataSeeder};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        PresentationData::assertSafe();
        DB::transaction(fn () => $this->call([
            PresentationUsersSeeder::class, PresentationCoursesSeeder::class,
            PresentationLessonsSeeder::class, PresentationAssessmentsSeeder::class,
            PresentationAnnouncementsSeeder::class, PresentationAcademicDataSeeder::class,
        ]));
    }
}
