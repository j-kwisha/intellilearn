# Material chatbot grounding

The material assistant searches the complete readable text of the authorized lesson file before answering. Previously, extraction stored only 24,000 characters and the AI prompt then used only its first 6,000; later topics were unavailable to the model. The previous prompt incorrectly instructed it to treat missing evidence as proof that a topic was absent from the whole module.

## Data flow

1. Lesson uploads use `DocumentTextService::extractMaterial()`. PDFs retain physical `[Page N]` markers; PowerPoint retains slide order and `Slide N` labels. DOCX/TXT retain all readable text. Image-only documents need OCR outside this feature. Modules over 1,000,000 extracted characters fail explicitly rather than silently truncating. Existing essay-reference extraction retains its 24,000-character limit.
2. A nullable `lesson_materials.extraction_version` marks complete extractions. Opening an older local material refreshes its legacy cached prefix once, from the original stored file. Missing/unreadable files cannot fall back to old text or general-purpose chat.
3. The browser sends `material_id`, the question, and up to six recent conversation turns. Laravel checks course access and publication, loads the full source itself, and ignores client-supplied material text/title. Legacy requests supplying text without a material ID must reopen the material.
4. Python splits the complete text into overlapping excerpts and selects relevant evidence within a bounded prompt budget. Explicit topic/page selectors and recent user questions help follow-ups. Prior assistant claims are not treated as evidence. Broad summaries sample sections throughout the document and are described as summaries of available excerpts.
5. The model uses lower temperature and source-only instructions. Answers can cite the supplied page/slide/excerpt labels. The UI also displays the source excerpts supplied for the response; this does not imply independent verification of every generated claim. No lexical evidence produces an honest search limitation without a provider request. Retrieval and prompting reduce hallucinations, but cannot guarantee factual accuracy or recover unreadable images.
6. Changing materials resets the chat and cancels in-flight requests. Duplicate sends are blocked, and transient errors preserve the question for retry.

## Deployment

Deploy both the Laravel backend and the separate Python AI service, then the frontend. The backend start script already runs `php artisan migrate --force`; the additive migration is `2026_10_28_000001_add_extraction_version_to_lesson_materials.php`. For a manual deployment, run that migration and clear cached configuration with `php artisan optimize:clear`. The persistent lesson files must remain mounted and `php artisan storage:link` must resolve correctly.

Rebuild the frontend with its existing `VITE_API_URL`. No new dependencies, secrets, environment variables, presentation accounts, or course data are required. The existing AI service URL and Groq key remain unchanged. Old material caches are upgraded on access; no bulk document-processing command is required.

Smoke-test a later topic beyond the first 6,000 characters, a passage beyond 24,000 characters, a topic correction after an earlier question, an absent search term, a summary, unreadable/missing files, and navigation during an outstanding reply. Check `/api/health` and AI `/health`. Diagnostics may record material IDs, extraction versions, text lengths and exception types; do not log full module text, student questions, provider payloads, or credentials.
