# IntelliLearn Mock Defense Questions and Answers

The answers below are models. The proponents should restate them naturally rather than memorize them word for word.

## Architecture and backend

### 1. What is IntelliLearn's architecture?

It is a layered web architecture. React provides the browser interface. It communicates through REST endpoints with Laravel, which handles validation, permissions, business rules, and database access. PostgreSQL stores persistent records. A separate FastAPI service performs machine-learning and generative-AI work. The frontend is on Vercel; the backend services and database are on Railway.

### 2. Why did you separate the frontend and backend?

The separation gives each layer a clear responsibility. React focuses on presentation and user interaction. Laravel centrally enforces permissions and data rules for every client. It also lets the frontend and AI service change independently as long as the API contract stays compatible.

### 3. What is an API in your system?

It is the set of HTTP endpoints through which React communicates with Laravel and Laravel communicates with the AI service. Each endpoint defines a method, URL, expected input, authentication requirement, and response. The Laravel endpoint map is in `routes/api.php`.

### 4. What is the difference between a route and a controller?

A route matches an HTTP method and URL and forwards the request to a controller method. The controller handles that request by validating it, checking permissions, calling models or services, and returning a response.

### 5. What is the difference between a model and a migration?

A migration defines the database structure and how it changes over time. A model is the Laravel class used to work with records from a table and describe relationships, casts, and permitted fields.

### 6. Show where login is implemented.

The frontend calls login from `frontend/src/context/AuthContext.jsx`. The endpoints are declared in `routes/api.php`. The server implementation is `login` in `app/Http/Controllers/Auth/AuthController.php`, and it works with `app/Models/User.php` and Sanctum tokens.

### 7. Does the frontend access the database directly?

No. It calls the Laravel API. Direct database access from the browser would expose credentials and bypass validation and authorization. Laravel is the controlled gateway to PostgreSQL.

## Authentication and security

### 8. How does the backend know who is logged in?

After successful login, Laravel Sanctum issues a token. Axios attaches it as an `Authorization: Bearer` header. Sanctum resolves the user for protected routes, and controllers apply role, enrollment, and ownership checks.

### 9. Are passwords stored in plain text?

No. Laravel stores password hashes. During login, `Hash::check` compares the submitted password against the stored hash.

### 10. How is administrator login protected?

Correct credentials start a second step. Laravel generates a six-digit code and a random challenge token, stores hashed forms with a five-minute expiry and attempt limit, and sends the code through email. A Sanctum token is issued only after successful code verification.

### 11. Can a student call an instructor endpoint using developer tools?

They may attempt the HTTP request, but the backend still checks the authenticated user's role, course enrollment, and ownership. Hiding a button in React is only a user-interface measure; the Laravel check is the security control.

### 12. Where are API keys stored?

Production secrets such as the Groq and Resend keys are deployment environment variables. They must not be embedded in the React bundle or committed to source control.

### 13. Why do you validate in both frontend and backend?

Frontend validation gives faster feedback. Backend validation is authoritative because frontend checks can be bypassed. Laravel must reject invalid or unauthorized requests even if someone calls the endpoint manually.

## Database and assessments

### 14. How are students connected to courses?

Through the enrollments relationship. It connects a user to a course without duplicating the course or user record.

### 15. What happens when a student starts an assessment?

`StudentQuizPage.jsx` sends `POST` to the assessment's `/start` endpoint. `SubmissionController@start` checks role, enrollment, assessment ownership, publication, schedule, current attempt, attempt limit, and any per-student unlock. It creates an in-progress submission and stores its question order.

### 16. How does question randomization remain stable after refresh?

The backend creates and stores `question_order` on the submission. The student continues the same submission rather than generating a new order on each render.

### 17. How are multiple-choice options shuffled?

The assessment has a choice-shuffling setting. The student interface uses the assessment/question data to present a randomized answer order while preserving the underlying option identity needed for grading.

### 18. How does autosave work?

While an assessment is in progress, the frontend periodically sends the current answer to the `/autosave` endpoint. Laravel verifies that the attempt belongs to the student and is still editable, then creates or updates the corresponding submission answer. This allows recovery after weak connectivity or refresh.

### 19. Why is a submission locked after leaving or timing out?

For restricted attempts, locking prevents a student from reopening an incomplete or expired attempt without instructor approval. An instructor can grant access to a selected student, avoiding a global reopening for the class.

### 20. Where is a student's score stored?

The attempt and its calculated values are stored on the submission record, while individual responses are stored as submission answers. The assessment contains the questions and scoring configuration.

### 21. How do pre-tests and post-tests work?

They are stored assessment results used for comparison and knowledge-gain reporting, but their configured use excludes them from the regular course grade. The backend stores their stage/use and submissions for analysis.

### 22. How does the question bank work?

An instructor selects earlier assessments as sources and specifies a desired total. The system gathers eligible saved questions and distributes or samples the requested number into a reviewable draft. The instructor can edit or delete questions before completing the new assessment.

### 23. How are individual activities different from quizzes?

An individual activity can provide an instructor-uploaded PDF, DOCX, PPT, or PPTX for viewing or download. The student uploads completed work. Laravel validates and stores the submission file and metadata so the instructor can download and grade it.

## Files and documents

### 24. Are uploaded PDFs stored in PostgreSQL?

The database stores the material metadata, storage path, and extracted content needed by system features. The binary file itself is handled through Laravel storage. The production disk is controlled by deployment configuration.

### 25. How can the chatbot read a lesson file?

When a material is uploaded, `DocumentTextService` extracts readable content. When the student asks a question, Laravel authorizes access and `MaterialContextService` resolves the stored context. Laravel sends that trusted text to the FastAPI chatbot.

### 26. Why can a document display correctly but have no chatbot context?

Viewing and text extraction are different processes. A PDF or PPT may mainly contain scanned images, shapes, or complex rendering. The viewer can render those pages, but an extractor may find little machine-readable text. OCR would be a future improvement for scanned content.

## AI and analytics

### 27. What AI algorithms do you use?

The risk-check feature uses a scikit-learn Random Forest classifier. Generative language tasks use a model through Groq. Those are distinct: the Random Forest predicts from numeric student metrics, while the language model produces text from prompts and approved context.

### 28. Why did you choose Random Forest?

It handles nonlinear relationships and interactions between multiple numeric indicators, works well as a practical classifier, and provides probability output. For this project, its inputs are quiz average, login count, submission rate, and missed tasks. The limitation is that prediction quality depends heavily on the quality and representativeness of training data.

### 29. How was the model trained?

`ai-service/train_model.py` reads labeled data, selects the four features, creates an 80/20 train-test split, trains 100 decision trees with a fixed random seed, prints classification metrics, and saves the model as `model.pkl` for the FastAPI service.

### 30. Does AI decide a student's final grade?

Objective question types are graded by deterministic backend rules. Generative AI can assist with essay evaluation or drafts, but instructor review and release controls remain important. We do not describe an LLM suggestion as unquestionable grading truth.

### 31. How do you prevent the chatbot from hallucinating?

For lesson questions, the backend supplies authorized extracted material rather than accepting arbitrary frontend context. The AI service selects relevant evidence, limits history, and is instructed to answer from the source or report insufficient evidence. This reduces hallucination; it does not mathematically eliminate all language-model errors.

### 32. Why did the chatbot sometimes say a visible topic was absent?

The page viewer and extraction context can differ. Earlier extraction may have been incomplete, especially for image-heavy files. Grounding can also fail if relevant text is outside a truncated context. The system now resolves current server-side material text and retrieves relevant evidence, but unreadable image text still requires OCR.

### 33. Why require instructor approval for AI-generated quizzes?

AI can generate structurally valid but unclear, inaccurate, or unsuitable questions. Keeping the output as a draft gives the instructor academic control before students see it.

### 34. What happens when the Groq limit is reached?

FastAPI returns a controlled 503 response and retry timing when the provider supplies it or the system estimates it. The interface disables immediate retries and shows the countdown. Manual quiz creation remains available.

## Deployment and operations

### 35. Why use both Vercel and Railway?

Vercel is suited to serving the built React frontend and client-side routes. Railway runs persistent server processes, PostgreSQL, the Python AI service, and scheduled jobs. The platforms serve different runtime needs.

### 36. What is the role of Resend?

Resend is the delivery provider for application email, including administrator verification codes and deadline reminders. Laravel creates the message and calls the configured mail transport; Resend performs delivery.

### 37. How do deadline reminders work?

Railway runs a scheduled Laravel command using the cron configuration in `railway-reminders.json`. The command finds qualifying upcoming assessment deadlines, sends reminders, and uses reminder logs to avoid unintended duplicate sends.

### 38. What is a migration mismatch?

It occurs when deployed code expects a column or table that the production database has not created yet. The backend may then return a 500 error. The deployment startup and health process must apply migrations safely and logs must be checked.

### 39. What does a 500 error mean?

It means the request reached Laravel but an unhandled server-side exception occurred. We inspect the Network request and Railway logs to find the exact exception. It is a category of failure, so one universal repair button would be unsafe.

### 40. What does a 503 error mean in your project?

It indicates temporary service unavailability, such as AI provider rate limiting, AI-service timeout, or failure to send a required email. The response should be retryable and avoid exposing provider secrets.

### 41. How do you know a deployment succeeded?

We check more than the Git commit. We confirm the Vercel or Railway deployment status and logs, call the health endpoint, open the production site, and test an affected request. Each deployed service must be verified because frontend and backend versions can differ.

## Evaluation and limitations

### 42. What is the main contribution of IntelliLearn?

It combines common LMS workflows with material-grounded assistance, predictive risk indicators, practice support, controlled assessment workflows, instructor review, and administrative monitoring in one role-based platform.

### 43. What is your biggest technical limitation?

A strong answer is: the system depends on internet connectivity and third-party AI/email services, and its AI quality depends on extracted source text and training data. We mitigate those limits with autosave, controlled errors, retry timing, instructor review, and manual alternatives, but broader testing, OCR, monitoring, backups, and load testing remain future work.

### 44. Can this support thousands of simultaneous students?

The architecture can be scaled, but we should not claim a capacity that has not been load tested. Current hosting, database connections, file storage, and provider limits determine practical capacity. A production-scale rollout would require load tests, metrics, query optimization, queues, caching, and an explicit scaling plan.

### 45. Why should the panel trust the results?

We should separate deterministic system results from AI suggestions. Authentication, permissions, objective grading, attempts, timestamps, and stored records are enforced by backend rules. Predictive and generative outputs have documented inputs and limitations and are presented with human review where academic decisions are involved. Trust also requires systematic functional, security, usability, and model evaluation evidence.

## Rapid code-location drill

For each prompt, the proponent must name a file in under ten seconds:

1. API endpoint list -> `routes/api.php`
2. Browser routes -> `frontend/src/App.jsx`
3. API base URL/token -> `frontend/src/services/api.js`
4. Login -> `app/Http/Controllers/Auth/AuthController.php`
5. Quiz attempt -> `app/Http/Controllers/SubmissionController.php`
6. Assessment creation -> `app/Http/Controllers/AssessmentController.php`
7. File text extraction -> `app/Services/DocumentTextService.php`
8. AI gateway -> `app/Http/Controllers/AiController.php`
9. AI endpoints -> `ai-service/app.py`
10. Risk training -> `ai-service/train_model.py`

