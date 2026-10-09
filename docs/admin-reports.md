# Admin academic reports

Open **Admin → Reports** (`/admin/reports`). The read-only, admin-authorized endpoint is `GET /api/admin/reports`.

## Filters and scope

- Optional query parameters: `course_id`, `instructor_id`, `from`, `to` (YYYY-MM-DD).
- Date filters select **assessment deadlines in UTC**, inclusively. Undated assessments are excluded when a date filter is supplied.
- Overview student/instructor/enrollment/course counts describe the selected courses' current membership; deadline filters affect assessment metrics, not membership counts.
- Only active enrollments belonging to active student-role accounts are included. Draft assessments, dropped enrollments, and abandoned/in-progress attempts are excluded.
- Students are unique in the overview, and appear once per course in the student table.

## Calculations

- Average score: mean of best **graded** percentage per student/assessment. Ungraded attempts are excluded, and no graded scores displays a dash rather than zero. This is an assessment-score average, not the weighted final course grade.
- Expected online submissions: published assessments already open to each enrolled student. Assessments with deadlines before their enrollment and paper-based assessments are excluded.
- Submission rate: distinct completed student/assessment pairs divided by expected pairs. Retakes cannot inflate the rate above 100%.
- Missing submissions: expected assessments with deadlines strictly before the report generation time and no completed attempt. Undated, future, and still-open deadlines are not missed.
- The default attention table shows averages below 70%, overdue missing submissions, or an AI risk flag. The checkbox displays all student/course results, including insufficient data and unavailable AI results.
- Grading summary counts submitted attempts (including retakes), separating pending work from grading errors. Essay counts are per answer; current AI grades and teacher overrides are separate. An overridden essay's original AI evaluation does not count as its current AI grade.

## AI risk

The page first fetches stored report data, then repeats the query with `include_risk=1` for predictions. The existing `AI_SERVICE_URL` and `/predict` endpoint are used; no new environment variables or migrations are required.

Risk inputs use best graded quiz scores, deduplicated online submission rates, expired missing tasks, and distinct submission days (the existing model's activity proxy, **not actual logins**). No student essays, reference documents, names, or emails are sent to AI. Without graded quiz data or eligible online assessments the result is `insufficient_data`. HTTP errors, timeouts, and invalid response shapes produce `unavailable`, never a safe classification. Successful predictions are cached for five minutes and requested concurrently in batches of 20.

## Export and rehearsal

CSV exports cover course comparisons, all student/course results, or overview/grading totals. They include applied filters, generation time, calculation notes, escaped CSV fields, and spreadsheet formula protection. Student CSV includes all results matching server filters, regardless of the attention-only checkbox/search. Printing uses the currently displayed report/table view and removes navigation and controls.

1. Log in as admin and select Reports.
2. Confirm overview membership counts against Users/Courses, accounting for students enrolled in multiple courses.
3. Select a course/instructor and apply filters; use a deadline range to narrow assessment metrics.
4. Check a student with multiple attempts: one completed assessment and the best graded score should be counted.
5. Confirm an open/future assessment is not overdue; inspect a genuinely expired missing assessment.
6. Toggle all student/course results to see insufficient data and AI status.
7. Export each CSV and check its filters/time. Print a report longer than one page.
8. With AI unavailable, stored report data remains visible and eligible predictions say AI unavailable.

Automated checks: `php vendor/phpunit/phpunit/phpunit`, `npm run lint`, `node --test tests/*.test.mjs`, `npm run build`, and `python -m unittest test_essay_grading.py` (the npm/node commands run in `frontend`; Python runs in `ai-service`). Laravel tests require a local test `APP_KEY` and use the configured in-memory SQLite database; never run them against production.
