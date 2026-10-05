# Essay rubrics and source-based grading

IntelliLearn now uses its existing `Rubric`, `RubricCriterion`, `Question` and
`SubmissionAnswer` architecture. A saved teacher rubric and usable question reference
are required for AI essay grading. Missing/deleted references leave points and feedback
null with `grading_status=pending`. Invalid rubrics, failed extraction, provider failures
and invalid AI responses retain the answer with `grading_status=grading_error`.

## Teacher workflow

In the essay section of all question creation forms and the question edit modal:

1. Select a lesson, upload a reference, or paste reference text.
2. Create a rubric manually, choose the optional default template, or generate an AI draft.
3. Review the title, criteria, points and performance levels. Criteria can be reordered.
4. Save the question to approve and activate the rubric. AI generation alone never saves it.
5. Publish only after every essay has a saved valid rubric.

The template is optional and scaled to the question maximum. It never silently replaces
an existing rubric. References remain optional for manual grading; a rubric is required
for publication. Existing published essays without valid rubrics remain available but
their new answers report a rubric configuration error until an instructor supplies a valid rubric.

## Files and architecture

| Area | Files |
| --- | --- |
| Laravel endpoints | `app/Http/Controllers/AssessmentController.php`, `SubmissionController.php`, `LessonController.php`, `routes/api.php` |
| Existing models extended | `app/Models/Rubric.php`, `RubricCriterion.php`, `Question.php`, `SubmissionAnswer.php` |
| New normalized level model | `app/Models/RubricLevel.php` |
| Rubric validation, persistence and score calculation | `app/Services/RubricService.php` |
| Existing question reference resolution | `app/Services/EssayReferenceService.php` |
| PDF/DOCX/TXT extraction | `app/Services/DocumentTextService.php` |
| Grading orchestration and audit snapshots | `app/Services/EssayGradingService.php` |
| Python endpoints | `ai-service/app.py` |
| Structured AI prompts, JSON and score validators | `ai-service/essay_grading.py` |
| Shared rubric, reference and results UI | `frontend/src/components/RubricEditor.jsx`, `EssayQuestionFields.jsx`, `EssayGradingDetails.jsx` |
| Client validation | `frontend/src/services/rubric.js` |
| Existing UI integrations | `frontend/src/pages/instructor/InstructorAssessmentPage.jsx`, `InstructorCreateAssessmentPage.jsx`, `InstructorCoursePage.jsx`, `InstructorGradePage.jsx` |
| Regression tests | `tests/Feature/EssayRubricTest.php`, `ai-service/test_essay_grading.py` |

## Migration

`database/migrations/2026_10_06_000001_extend_essay_rubrics_and_grading_audit.php`:

- Adds rubric `total_points`, `source` and `created_by`; backfills old totals from criteria.
- Adds normalized `rubric_levels` with labels, descriptions, point ranges and order.
- Adds question `reference_file` metadata for uploaded filename and content hash.
- Adds answer `rubric_snapshot`, `reference_snapshot`, `ai_evaluation`,
  `teacher_criterion_scores`, `overridden_by` and `overridden_at`.

Existing question `reference_text` retains extracted text; selected lessons reuse
`lesson_materials.extracted_text`. No duplicate document or grading tables are introduced.

## APIs

All Laravel routes require Sanctum authentication and instructor ownership/admin access.
Rubric endpoints also check course/assessment/question nesting. Students cannot retrieve
rubric configuration or mutate it.

| Method | Route | Behavior |
| --- | --- | --- |
| POST | `/api/courses/{course}/assessments/{assessment}/rubric/generate` | New: returns a validated unsaved rubric draft from the question, instructions, optional learning objective and explicit source |
| POST | `/api/courses/{course}/assessments/{assessment}/questions/{question}/rubric` | Existing: validates and saves title, source, total and criteria with levels transactionally |
| GET / DELETE | Same question rubric route | Existing: instructor-only retrieval; unpublish before deleting an active essay rubric |
| POST / PUT | Existing question and bulk question routes | Accept nested `rubric` and `reference_file`; save the question/rubric together; bulk validation prevents partial writes |
| PUT | Existing assessment route | Blocks publication if any essay rubric is missing or invalid |
| POST | Existing `/upload-reference-text` route | Reuses extraction pipeline; supports readable PDF, DOCX and TXT; rejects extraction failure instead of returning fake reference text |
| POST | Existing assessment `/submit` route | Grades criteria using approved rubric/reference; saves audits and distinguishes pending from grading errors |
| PUT | Existing submission `/grade` route | Accepts overall final points/feedback, or `criterion_scores` keyed by snapshot criterion ID; preserves original AI audit |
| POST | AI service `/generate-rubric` | New: JSON rubric generation with validation |
| POST | AI service `/grade-essay` | Changed: requires saved rubric, reference, question and answer; returns every criterion's score and feedback |

Rubric criterion names keep the existing `criterion` field and ordering keeps the existing
`order` field. A level uses `label`, `description`, `min_points` and `max_points`.

## AI behavior and authoritative scoring

The existing Groq model `qwen/qwen3.8-27b` is used with JSON object output, temperature
0.1 and instruct mode. These modes are documented in [Groq's model documentation](https://console.groq.com/docs/model/qwen/qwen3.8-27b).
Generation and grading responses are independently validated in Python and Laravel.

The grading request includes the essay question, assessment instructions, student response,
explicit reference content, and a saved rubric snapshot with criterion IDs, descriptions,
point maxima and performance levels. The prompt treats answers/source content as data,
requires source-grounded semantic evaluation, and prohibits invented criteria, changed
weights, or deductions for unrequested extra examples.

Laravel requires exactly one bounded score for each saved criterion. It replaces AI names
and maxima with snapshot values, ignores the model's total/percentage, and calculates:

```
total_score = sum(validated criterion awarded_points)
percentage = total_score / rubric.total_points * 100
```

Scores use hundredths of a point. Negative, nonfinite, overly precise, unknown, duplicated,
missing or over-maximum scores are rejected. Rubric criterion maxima must sum exactly to
question points; ranges must be ordered, non-overlapping and within criterion maxima.

Failures retain the student answer and record `grading_error` with a safe error code. A later successful essay cannot
finalize a submission containing an ungraded answer. Blank essays receive zero only when
both valid rubric and usable reference are present.

`2026_10_06_000002_add_essay_grading_states.php` adds answer `grading_status` and
`grading_error_code`, plus submission `grading_status`. The existing submission lifecycle
`status` remains `submitted` until all answers have scores. Clients display `grading_status`
to distinguish errors from instructor review. Teacher overrides clear grading errors.
FastAPI rejects missing prerequisites with HTTP 422 and grading failures with HTTP 502.
Diagnostics log IDs, metadata paths, extracted text lengths, HTTP status and validation
outcomes, never essay/reference content or provider response bodies. Uploads return extracted
text and filename/hash metadata; question save persists it in `questions.reference_text`.
There is no separately stored upload path to retrieve; grading uses the saved text.

## Audit and overrides

Snapshots retain the rubric version, criterion IDs/levels, source text/hash, selected lesson
and material IDs, and uploaded reference filename/hash. `ai_evaluation` retains per-criterion
scores/feedback, original total/percentage, overall feedback, strengths, improvement areas,
model and timestamp. Student text remains in the existing `answer_text`.

In both instructor grading views, teachers can inspect the evaluation, change criterion scores,
or choose an overall override and edit final feedback. Final points remain `points_earned`;
teacher criterion adjustments use `teacher_criterion_scores`. Original `ai_evaluation`,
criterion scores and snapshots are never overwritten by a teacher override. Later live rubric
edits do not change historical grading IDs or maxima. Partial teacher grading stays pending
while any answer remains ungraded.

Audit/source/rubric internals are omitted from student responses. Hidden or unreleased scores
also hide AI feedback so scores cannot leak through text.

## Configuration, deployment and tests

No new environment variables or credentials are required:

- Laravel uses existing `AI_SERVICE_URL`.
- The AI service uses existing `GROQ_API_KEY`.
- DOCX extraction needs PHP ZIP, already listed in `nixpacks.toml`.

Deploy Laravel, the React frontend and the AI service from the same commit. Railway's existing
Laravel start command already runs `php artisan migrate --force`. During a staggered rollout,
an older AI service response will fail validation and answers report a grading error.

After installing locked Composer/npm dependencies:

```sh
php artisan migrate --force
php vendor/phpunit/phpunit/phpunit --filter EssayRubricTest
python -B -m unittest discover -s ai-service -p test_essay_grading.py
npm --prefix frontend run build
```

On this Windows environment, SQLite is enabled for the test process only:

```sh
php -d extension=pdo_sqlite -d extension=sqlite3 vendor/phpunit/phpunit/phpunit --filter EssayRubricTest
```

The feature tests use the actual relevant migrations with in-memory SQLite; unrelated
PostgreSQL-only migrations are excluded. They mock Groq service responses and do not send
real student answers or consume production AI credits. Live model judgment and production
deployment status still require a production smoke test.

Reference extraction and prompts support up to 24,000 characters. Selected lessons containing
more text are explicitly marked truncated in the audit. Uploaded/pasted sources use the same
limit. Legacy binary DOC and image-only/scanned PDF documents need conversion/OCR or pasted
readable content; extraction errors never become grading references.
