# IntelliLearn Defense Cheat Sheet

## 30-second architecture

IntelliLearn uses a React frontend hosted on Vercel, a Laravel REST API hosted on Railway, a Railway PostgreSQL database, and a separate Python FastAPI AI service. React sends authenticated JSON requests to Laravel. Laravel validates permissions and business rules, reads or writes PostgreSQL records, and calls the AI service or Resend when needed. The AI service uses a saved Random Forest model for risk prediction and Groq for generative features.

## Never confuse these

| Item | Correct meaning |
|---|---|
| React | Browser interface |
| Laravel | Main backend and business rules |
| API | Communication contract between applications |
| PostgreSQL | Relational database |
| FastAPI | Python AI-service web API |
| Random Forest | At-risk prediction algorithm |
| Groq | External inference provider for generative AI |
| Sanctum | Laravel API-token authentication |
| Resend | Email delivery provider |
| Vercel | Frontend hosting |
| Railway | Backend, AI, database, and cron hosting |

## Most important files

| Question | Start here |
|---|---|
| What browser pages exist? | `frontend/src/App.jsx` |
| How does frontend call backend? | `frontend/src/services/api.js` |
| How is login state managed? | `frontend/src/context/AuthContext.jsx` |
| What API endpoints exist? | `routes/api.php` |
| Where is login handled? | `app/Http/Controllers/Auth/AuthController.php` |
| Where are assessments created? | `app/Http/Controllers/AssessmentController.php` |
| Where are attempts submitted? | `app/Http/Controllers/SubmissionController.php` |
| Where are materials uploaded? | `app/Http/Controllers/LessonController.php` |
| How is document text extracted? | `app/Services/DocumentTextService.php` |
| How is material access/context resolved? | `app/Services/MaterialContextService.php` |
| Where are AI API calls coordinated? | `app/Http/Controllers/AiController.php` |
| Where is Python AI logic? | `ai-service/app.py` |
| How was the risk model trained? | `ai-service/train_model.py` |
| How is chatbot evidence selected? | `ai-service/material_retrieval.py` |
| How is DB structure created? | `database/migrations/` |
| How does Laravel deploy? | `railway.json`, `scripts/start-backend.sh` |
| How do reminders run? | `railway-reminders.json` |

## Feature tracing formula

> **Frontend component** sends **HTTP method + endpoint**. `routes/api.php` maps it to **controller method**. The controller validates **permissions and input**, uses **models/services**, reads or writes **database records/files**, and returns **JSON** to the frontend.

## Four flows to memorize

### Login

`AuthContext.jsx` -> `POST /api/login` -> `AuthController@login` -> `User` -> password/account checks -> Sanctum token. Admins receive a Resend OTP challenge before the token is issued.

### Quiz attempt

`StudentQuizPage.jsx` -> `/start`, `/autosave`, `/submit` -> `SubmissionController` -> `Assessment`, `Question`, `Submission`, `SubmissionAnswer` -> score/result.

### Material upload

Instructor page -> multipart upload -> `LessonController@uploadMaterial` -> storage + `DocumentTextService` -> `LessonMaterial` -> viewer/download/chat context.

### Material chatbot

`AiChatbot.jsx` -> `POST /api/ai/chatbot` -> `AiController@chatbot` -> authorization + `MaterialContextService` -> FastAPI `/chatbot` -> relevant evidence + Groq -> grounded response.

## Database relationships

- One instructor has many courses.
- Users join courses through enrollments.
- One course has many lessons and assessments.
- One lesson has many lesson materials.
- One assessment has many questions and submissions.
- One submission belongs to one student and contains many submission answers.

## Security answer

Passwords are hashed. API routes use Sanctum bearer-token authentication. Controllers check roles, enrollment, and ownership. Requests and file uploads are validated on the backend. Admin login adds a time-limited emailed code. Sensitive keys are stored as deployment environment variables. High-cost endpoints are rate limited.

## AI answer

Risk prediction and generative AI are separate. A scikit-learn Random Forest predicts risk from quiz average, login count, submission rate, and missed tasks. Groq supports natural-language generation. Lesson chatbot responses receive server-authorized extracted material text and selected evidence. AI drafts require instructor review, and insufficient evidence produces a controlled response.

## Status codes

- `401`: not authenticated
- `403`: authenticated but not allowed
- `404`: route or record missing
- `422`: invalid input
- `423`: attempt locked
- `429`: rate limit reached
- `500`: backend exception
- `502/503`: dependent service failed or is temporarily unavailable

## Safe answer when unsure

> I do not want to guess. Based on the architecture, that behavior belongs to the **[layer]**. I would locate the frontend API call, match it in `routes/api.php`, then inspect its controller and model to confirm the exact implementation.

## Defense rule

Explain the purpose first, flow second, and file names third. Do not read code aloud unless the panel asks for a specific line.

