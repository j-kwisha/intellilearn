# Import an existing quiz PDF

In **Create Assessment**, choose **Paper-Based (Import quiz from PDF)**. The PDF is the source; the saved assessment is a normal digital `quiz`. Students answer it with the existing online assessment, submission and grading pages. Existing assessments that were already stored as `paper_based` retain their paper-answer file viewer.

1. Complete the assessment details, schedule and score visibility.
2. Select a text-based PDF (maximum 10 MB) and click **Extract Questions from PDF**.
3. Review the imported questions, choice order, types, correct answers and points against the original. The extracted source text is visible to the instructor for comparison. Headings/instructions are added to the assessment description and can be edited.
4. Supply missing answers and review the defaults. Multiple-choice and true/false questions need a correct answer. Short answers can retain a blank expected answer for existing instructor grading. Confirm the review, click **Save Questions**, then **Done** to finish/publish according to the selected settings.

The importer is deterministic and does not call the AI service. It copies existing wording; it does not generate questions, paraphrase prompts, or solve missing answers. Numbered questions such as `1.`, `1)` and `Question 1:` and lettered choices such as `A.` / `A)` are recognized. Wrapped choice text is preserved; choices on the same line need two spaces or a tab between labels. True/false and essay section headings are recognized. Other questions default to short answer for instructor review; matching tables need manual setup.

Only explicitly printed `Answer:` / `Correct answer:` lines or a separate **Answer Key**, **Correct Answers** or **Answers** section are mapped to answers. Repeated numbers, duplicate keys and unsupported key layouts require manual entry. Printed `(2 points)` / `(2 pts)` values are used; otherwise a visible warning explains the default of one point. Existing essay rubric/reference requirements still apply. The quiz PDF itself is not treated as an essay reference or used to invent a rubric.

Scans/image-only PDFs, diagrams, mathematical layouts, tables and multiple columns require a text-based source or instructor correction. Unnumbered or oversized content fails explicitly. Text beyond 200,000 characters or more than 200 detected questions is rejected rather than truncated. The instructor must check completeness before saving.

`POST /api/courses/{course}/assessments/{assessment}/import-pdf` accepts multipart `file` and returns `questions`, `instructions`, `extracted_text`, `warnings`, and `filename`. Only the course instructor or an admin can use it, and the assessment must belong to that course. It returns an unsaved draft; existing questions/publication are not changed. The source PDF and raw answer-key text are not stored on public storage or returned through student assessment endpoints. Reviewed questions are saved through the existing bulk-question endpoint, which hides correct answers from students.

No migration, new dependency, environment variable or AI deployment is required. Deploy Laravel and rebuild the frontend normally.
