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

- The frontend builds, but full ESLint currently fails: 44 errors and 8 warnings.
  Existing findings include unused variables, components declared during rendering,
  hook dependencies, and hook rules. This audit does not suppress rules or refactor
  the entire frontend. The project is not ready to claim a fully green lint gate.
- Vite reports a JavaScript bundle over 500 kB and several large image assets.
  Test load times on the actual presentation connection before rehearsal.
- Browser-level appearance, mobile layout, PDF embedding, Google OAuth redirects,
  Resend delivery and live AI predictions need rehearsal in the intended environment.
  Passing API tests and a build do not verify these external/browser integrations.
- The existing assessment start path does not enforce availability/due dates.
  A student may resume an abandoned attempt after the deadline. This is an existing
  assessment policy issue, not changed by the dataset or this focused audit.
- Historical graded essays are clearly recorded as teacher reviews, not AI results.
  Live AI grading needs a new source-backed essay submission in the rehearsal database.
- Presentation seeding refuses production, even with `--force`. Configure a separate
  local/testing environment for rehearsal; do not change real deployment credentials.

No frontend account password, real email credential, or API key is added. Historical
SQL dumps and existing automated tests are retained. See the final audit response
for the final test results and local commit status.
