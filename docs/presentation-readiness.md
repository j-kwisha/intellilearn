# Presentation readiness audit

Scope: presentation-prep only. Phase 2 commit `87559e5` was pushed and verified
against origin/presentation-prep. No production deployment or data replacement.

## Verified flows

Automated API checks cover presentation admin/instructor/student password login,
admin account listing, instructor and student dashboards, student course listing,
lessons, announcements, calendar, starting the upcoming integration review and
submitting correct answers for a 100% grade. Seed checks cover grade recomputation,
PDF extraction, valid essay rubrics, missing-source manual review, performance
variation, stable repeat seeding, counts and role relationships.

The audit fixed two access-control gaps: extracted lesson text now requires admin,
owning instructor, or active enrollment in a published lesson; a calendar course
filter no longer bypasses authorization. Cross-course access is regression tested.
CSS font imports were moved before Tailwind so their rules are valid and the
frontend build no longer drops them for import-order violations.

## Presentation walkthrough

1. Use the isolated presentation database setup in `presentation-dataset.md`.
   Set PRESENTATION_PASSWORD outside the repository; serve the public storage link.
   Confirm VITE_API_URL points to that backend (including `/api`) and AI_SERVICE_URL
   points to the intended AI service. Never point this setup at production data.
2. Sign in as `marisol.reyes@intellilearn.edu`: show the 13 accounts and three courses.
3. Sign in as `adrian.mendoza@intellilearn.edu`: show Web Systems and Database
   Management, the lesson PDFs, announcements, assessment questions and grades.
4. Compare Isabella Santos (high performing), Sofia Ramos (improving), and Alyssa
   Dela Cruz (at risk). Explain that risk labels come from the AI service and that
   distinct submission days are the application's activity proxy.
5. Open Camille Torres's pending Case Analysis and Reflection submission. The
   source-based answer has a teacher score; the source-free reflection awaits
   teacher review. Show the saved rubric, then grade the reflection manually.
6. As `isabella.santos@intellilearn.edu`, open a lesson PDF and complete the upcoming
   Integration Review. Show immediate results, updated grades and course navigation.
7. As `lara.villanueva@intellilearn.edu`, show Software Engineering and its calendar.

These actions change the isolated dataset. Reset only that dedicated database if
you need the original counts for another rehearsal. Use an unpinned presentation
date, or reseed with the rehearsal date, to keep upcoming events current.

## Outstanding checks and findings

- Phase 3.5 resolves the frontend lint gate without disabling rules. Unused
  bindings were removed, hooks use correct dependencies, avatars render directly,
  and context hooks live separately from provider components for Fast Refresh.
  Verification status derives from URL parameters; calendar loading derives from
  the requested month. The duplicate student grades request no longer races with
  the correct response. Lesson completion runs outside a state updater.
- Vite reports a JavaScript bundle over 500 kB and several large image assets.
  Test load times on the actual presentation connection before rehearsal.
- Browser-level appearance, mobile layout, PDF embedding, Google OAuth redirects,
  Resend delivery and live AI predictions need rehearsal in the intended environment.
  Passing API tests and a build do not verify these external/browser integrations.
- Assessment start/resume and submission now enforce availability and deadlines
  on the server, including the exact closing boundary. Closed attempts are
  preserved without grading late answers. Undated assessments remain usable.
  The start button explains why an assessment is closed/not yet open, and resumed
  attempts restore saved answers. API regression tests cover these boundaries.
- Historical graded essays are clearly recorded as teacher reviews, not AI results.
  Live AI grading needs a new source-backed essay submission in the rehearsal database.
- Presentation seeding refuses production, even with `--force`. Configure a separate
  local/testing environment for rehearsal; do not change real deployment credentials.

No frontend account password, real email credential, or API key is added. Historical
SQL dumps and existing automated tests are retained. See the final audit response
for the final test results and local commit status.

## Phase 3.5 rehearsal date checks

The dataset is unchanged. Its Integration Review opens one day before the configured
presentation date and closes seven days after it; historical assessments stay closed.
Check PRESENTATION_DATE before rehearsal. An old pinned date will correctly prevent
new attempts after their deadline. To refresh, follow the isolated-database seed
procedure in presentation-dataset.md with the actual rehearsal date (or leave the
date unset so it uses the seeding day). Do not reseed a real production database.

Run frontend lint/build, the complete Laravel suite, and the Python essay suite
before pushing. No migration or environment variable additions are required.
Browser and external-service rehearsals remain required; bundle optimization is
deferred because the production build succeeds. No deployment is performed.

## Phase 3.5 final verification

- Frontend ESLint: 0 errors, 0 warnings.
- Frontend production build: passes; existing >500 kB chunk warning remains.
- Laravel: 57 tests, 1,119 assertions pass.
- Python AI essay suite: 8 tests pass.
- Dataset/seeders, credentials, migrations and other branches are unchanged.
- Material navigation/reload requests now follow the selected material and ignore
  stale responses so a different document cannot replace its current context.
- No confirmed code blocker remains in the audited flows. Rehearse PDF rendering,
  OAuth redirects, email delivery and live AI in the actual browser/environment.

Changed files (30):

- `app/Http/Controllers/SubmissionController.php`
- `docs/presentation-readiness.md`
- `frontend/src/App.jsx`
- `frontend/src/components/layout/AdminLayout.jsx`
- `frontend/src/components/layout/DashboardLayout.jsx`
- `frontend/src/components/layout/InstructorLayout.jsx`
- `frontend/src/components/shared/AiChatbot.jsx`
- `frontend/src/components/shared/ProtectedRoute.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/context/AuthContextStore.js`
- `frontend/src/context/NavigationGuardContext.jsx`
- `frontend/src/context/NavigationGuardContextStore.js`
- `frontend/src/pages/admin/AdminDashboard.jsx`
- `frontend/src/pages/auth/LoginPage.jsx`
- `frontend/src/pages/auth/RegisterPage.jsx`
- `frontend/src/pages/auth/VerifyEmailPage.jsx`
- `frontend/src/pages/instructor/InstructorAnalyticsPage.jsx`
- `frontend/src/pages/instructor/InstructorAssessmentPage.jsx`
- `frontend/src/pages/instructor/InstructorCoursePage.jsx`
- `frontend/src/pages/instructor/InstructorCoursesListPage.jsx`
- `frontend/src/pages/instructor/InstructorDashboard.jsx`
- `frontend/src/pages/instructor/InstructorGradePage.jsx`
- `frontend/src/pages/student/StudentCalendarPage.jsx`
- `frontend/src/pages/student/StudentDashboard.jsx`
- `frontend/src/pages/student/StudentGradesPage.jsx`
- `frontend/src/pages/student/StudentLessonPage.jsx`
- `frontend/src/pages/student/StudentMaterialViewerPage.jsx`
- `frontend/src/pages/student/StudentProfilePage.jsx`
- `frontend/src/pages/student/StudentQuizPage.jsx`
- `tests/Feature/PresentationSeederTest.php`
