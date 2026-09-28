# IntelliLearn AI Features Implementation Summary

## Overview

This document summarizes the AI features implemented in the IntelliLearn LMS system as part of the thesis project.

## Architecture

- **Frontend:** React (Vite)
- **Backend:** Laravel (PHP)
- **AI Service:** FastAPI (Python)
- **Communication:** REST API (HTTP)

## Implemented AI Features

### 1. Predictive Analytics for At-Risk Students

**Purpose:** Identify students who may be falling behind academically.

**Implementation:**
- **Model:** Random Forest Classifier trained on student metrics
- **Features:** quiz_avg, login_count, submission_rate, missed_tasks
- **Output:** at_risk (boolean), risk_probability, reasons

**Integration:**
- **Student View:** `/student/risk-check` — Shows risk status for all enrolled courses using real DB data
- **Instructor View:** `/instructor/courses/{id}/ai-summary` — Shows risk analysis for all students in a course
- **Backend:** `AiController::myRisk()` and `AiController::courseRisk()` compute metrics from DB and call FastAPI

**Files:**
- `ai-service/app.py` — `/predict` endpoint
- `app/Http/Controllers/AiController.php` — Laravel integration
- `frontend/src/pages/student/StudentRiskCheckPage.jsx` — Student UI
- `frontend/src/pages/instructor/InstructorAiSummaryPage.jsx` — Instructor UI

---

### 2. Personalized Learning Path / Resource Recommendation

**Purpose:** Recommend supplemental materials when quiz performance is low.

**Implementation:**
- **Logic:** Rule-based (if quiz_avg < 70, show recommendations)
- **Resources:** Topic-specific materials (data_privacy, programming, networking, etc.)
- **Fallback:** Generic study tips if topic not mapped

**Integration:**
- **Trigger:** After quiz submission (can be extended to show on course page)
- **Backend:** `AiController::recommend()`
- **FastAPI:** `/recommend` endpoint

**Files:**
- `ai-service/app.py` — `/recommend` endpoint with `TOPIC_RESOURCES` dict
- `app/Http/Controllers/AiController.php` — `recommend()` method

---

### 3. Automated Quiz Feedback

**Purpose:** Provide instant feedback after quiz submission.

**Implementation:**
- **Logic:** Rule-based analysis of quiz results
- **Output:** Performance summary, weak topics, suggestions

**Integration:**
- **Trigger:** Automatically shown after quiz submission
- **UI:** `AiFeedbackPanel` component in `StudentQuizPage`
- **Backend:** `AiController::quizFeedback()` — analyzes submission data

**Files:**
- `app/Http/Controllers/AiController.php` — `quizFeedback()` method
- `frontend/src/pages/student/StudentQuizPage.jsx` — `AiFeedbackPanel` component

---

### 4. Course-Specific AI Chatbot

**Purpose:** Answer student questions about courses, grades, and LMS usage.

**Implementation:**
- **Logic:** Keyword-based intent matching
- **Scope:** Limited to course-related topics (grades, assessments, materials, enrollment, etc.)
- **Out-of-scope handling:** Directs students to contact instructor

**Integration:**
- **UI:** Floating chatbot widget on all student pages
- **Backend:** `AiController::chatbot()`
- **FastAPI:** `/chatbot` endpoint with `INTENTS` list

**Files:**
- `ai-service/app.py` — `/chatbot` endpoint
- `app/Http/Controllers/AiController.php` — `chatbot()` method
- `frontend/src/components/shared/AiChatbot.jsx` — Floating widget

---

### 5. Instructor AI Summary / Decision Support

**Purpose:** Help instructors quickly understand student status.

**Implementation:**
- **Data:** Aggregates risk predictions for all students in a course
- **Display:** Summary cards (total, at-risk, safe) + sortable student list
- **Metrics:** Shows quiz avg, logins, submission rate, missed tasks per student
- **Reasons:** Lists contributing factors (low quiz performance, low activity, etc.)

**Integration:**
- **Access:** Instructor clicks "AI Student Summary" button on course Students tab
- **Route:** `/instructor/courses/{id}/ai-summary`
- **Backend:** `AiController::courseRisk()` — computes metrics from DB for all students

**Files:**
- `app/Http/Controllers/AiController.php` — `courseRisk()` method
- `frontend/src/pages/instructor/InstructorAiSummaryPage.jsx` — Instructor UI
- `frontend/src/pages/instructor/InstructorCoursePage.jsx` — Button added to Students tab

---

## API Endpoints

### Laravel Backend (`routes/api.php`)

```
POST   /api/ai/predict                        Manual risk prediction (fallback form)
GET    /api/ai/my-risk                        Student's own risk status (all courses)
GET    /api/ai/courses/{course}/student-risk  Instructor views all students' risk
POST   /api/ai/recommend                      Learning recommendations
POST   /api/ai/quiz-feedback                  Quiz feedback after submission
POST   /api/ai/chatbot                        Chatbot assistant
```

### FastAPI Service (`ai-service/app.py`)

```
GET    /                Health check
GET    /health          Service status
POST   /predict         At-risk prediction
POST   /recommend       Learning recommendations
POST   /chatbot         Course assistant
```

---

## Database Integration

The system uses **real database metrics** for risk prediction:

**Computed Metrics (from `AiController::computeStudentMetrics()`):**
- `quiz_avg` — Average percentage from graded quiz submissions
- `submission_rate` — (submitted assessments / total assessments)
- `missed_tasks` — (total assessments - submitted assessments)
- `login_count` — Distinct submission days (proxy for activity)

**Data Sources:**
- `submissions` table — Quiz scores, submission status
- `assessments` table — Total published assessments
- `enrollments` table — Active course enrollments

---

## Key Design Decisions

1. **Rule-based where appropriate:** Recommendations and quiz feedback use deterministic logic instead of ML models (simpler, more explainable).

2. **Keyword-based chatbot:** Uses intent matching instead of NLP models (faster, no external API costs, easier to control scope).

3. **Real DB metrics:** Risk prediction uses actual student data from the database, not manual input (except for the fallback form).

4. **Modular architecture:** AI service is separate from Laravel backend, allowing independent scaling and updates.

5. **Beginner-friendly:** Code is simple, well-commented, and easy to explain in a thesis defense.

---

## Future Enhancements

- **Improved chatbot:** Integrate Rasa or Dialogflow for better NLP
- **More training data:** Expand `data.csv` with real student records
- **Topic mapping:** Link assessments to specific topics for better recommendations
- **Email alerts:** Notify instructors when students become at-risk
- **Dashboard widgets:** Show AI insights on main dashboard

---

## Running the Full System

1. **Start PostgreSQL** (or your DB)
2. **Start Laravel backend:**
   ```bash
   php artisan serve
   ```
3. **Start FastAPI AI service:**
   ```bash
   cd ai-service
   uvicorn app:app --reload --port 8001
   ```
4. **Start React frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

Access at: `http://localhost:5173`

---

## Testing the AI Features

### 1. At-Risk Prediction
- **Student:** Go to `/student/risk-check` — see your risk status for all courses
- **Instructor:** Go to any course → Students tab → click "AI Student Summary"

### 2. Recommendations
- Currently backend-only — can be triggered via API call or integrated into course page

### 3. Quiz Feedback
- **Student:** Take a quiz → submit → see AI feedback panel below results

### 4. Chatbot
- **Student:** Click the floating chat button (💬) on any student page
- Ask: "How do I check my grades?" or "What is the deadline?"

### 5. Instructor Summary
- **Instructor:** Go to any course → Students tab → click "🤖 AI Student Summary"
- See all students sorted by risk level with metrics and reasons

---

## Thesis Defense Talking Points

1. **Problem:** Students fall behind without early intervention; instructors lack tools to identify at-risk students.

2. **Solution:** AI-powered predictive analytics + personalized recommendations + instant feedback + chatbot assistant.

3. **Technology:** FastAPI for AI service, Laravel for backend logic, React for UI — clean separation of concerns.

4. **Model:** Random Forest trained on 4 key metrics (quiz avg, logins, submission rate, missed tasks).

5. **Real-world integration:** Uses actual database metrics, not simulated data.

6. **Simplicity:** Rule-based logic where appropriate (recommendations, feedback) — easier to explain and maintain.

7. **Scope control:** Chatbot limited to course topics — avoids hallucination and off-topic responses.

8. **Instructor value:** AI summary page provides actionable insights at a glance.

9. **Student value:** Risk check, instant feedback, and chatbot help students stay on track.

10. **Extensibility:** Modular design allows easy addition of new AI features.

---

## Conclusion

All 5 AI features from the thesis scope have been implemented and integrated into the existing IntelliLearn LMS. The system is functional, beginner-friendly, and ready for demonstration and defense.
