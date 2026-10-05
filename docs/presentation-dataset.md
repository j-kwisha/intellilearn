# Presentation dataset

Run only on a dedicated local/testing database. The default DatabaseSeeder now
orchestrates the Presentation seeders; AdminSeeder delegates account creation to
the same users seeder. Existing unrelated data is refused, never deleted automatically.
No production data migration or deployment is part of this setup.

Set `APP_ENV=local` (or `testing`) and configure the dedicated database connection.
Set `PRESENTATION_PASSWORD` to one presentation-only password of at least eight
characters containing an uppercase letter and a digit. No password is stored in
frontend code or supplied as a production credential. All 13 accounts share this
configured password; email addresses are listed in `PresentationData::USERS` with
the `@intellilearn.edu` suffix. These addresses are presentation fixtures, not
mail destinations. Accounts are active and verified without sending email.

Optionally set `PRESENTATION_DATE=YYYY-MM-DD` to reproduce a fixed timeline.
Without it, dates are anchored to the current day. After confirming the database
is dedicated to this presentation:

```sh
php artisan config:clear
php artisan migrate:fresh --seed
php artisan storage:link
```

`migrate:fresh` deletes all tables in its target database. Never run it against
production or a database containing records you need to retain. A plain
`php artisan db:seed` repeat run preserves stable IDs and does not duplicate records.
Generated lesson PDFs live under `storage/app/public/presentation/lessons` and
use the real PDF extraction pipeline. Serve the public storage link to view them.

## Dataset

- 1 admin, 2 instructors, 10 students: realistic Filipino-style names.
- 3 courses, 4 lessons each, 12 readable PDF lesson notes.
- 5 assessments per course: 2 completed quizzes, a midterm exam, a two-essay
  activity, and an upcoming integration review (15 total; 66 questions).
- Exams include multiple-choice, true/false, short answer and matching questions.
- Activities have saved, validated rubrics. The case-analysis essay references
  the fourth lesson. The personal reflection deliberately has no source and
  awaits instructor review when not manually graded.
- 9 announcements, 9 upcoming calendar events, 26 enrollments, 104 lesson progress records.
- 94 submissions: 88 graded, 3 awaiting reflection review, 3 abandoned attempts.
- 26 course grades calculated from graded submissions using the application's
  normalized quiz/exam/activity weights of 40/40/20.

The student order defines two high-performing, four average, two improving, and
two at-risk profiles. Everyone takes Web Systems and Database Management;
six students also take Software Engineering. Scores, dates, completion, and
answer selection are deterministic. Secure password hash salts are intentionally
not fixed. Historical essay grades are transparent teacher reviews with rubric
and reference snapshots, not fabricated AI output. Seeding makes no AI requests.

Risk inputs come from real submission history, including distinct submission days
as the existing login-activity proxy. The two at-risk students have low quiz marks,
missing work, and fewer active days. Actual risk classification still requires the
configured AI service; labels are not hardcoded. Upcoming work remains unsubmitted
even for strong students. No paper-based assessment is seeded without a real exam
file; the existing paper-based functionality is unchanged.

Historical SQL dumps and automated tests are retained. Seeders do not clean an
already populated demo database; use a dedicated fresh database for exact counts.
