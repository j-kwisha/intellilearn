# IntelliLearn LMS - Complete System Overview

## 📋 Table of Contents
1. [System Introduction](#system-introduction)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Core Features](#core-features)
7. [AI Features](#ai-features)
8. [API Endpoints](#api-endpoints)
9. [Frontend Pages](#frontend-pages)
10. [File Storage](#file-storage)
11. [Authentication & Security](#authentication--security)
12. [Development & Deployment](#development--deployment)

---

## System Introduction

**IntelliLearn** is an intelligent Learning Management System (LMS) designed for educational institutions. It combines traditional LMS functionality with AI-powered features to enhance student learning outcomes and instructor decision-making.

### Purpose
- Enable instructors to create and manage courses, lessons, and assessments
- Provide students with a centralized learning platform
- Identify at-risk students early through predictive analytics
- Offer personalized learning recommendations
- Automate quiz feedback and provide AI-assisted support

### Current Status
✅ **Production-ready** with all core LMS features and 5 AI capabilities implemented

---

## Technology Stack

### Backend
- **Framework:** Laravel 13 (PHP 8.3)
- **API:** RESTful API with Laravel Sanctum authentication
- **Database:** PostgreSQL (compatible with MySQL/SQLite)
- **Email:** Resend API for transactional emails
- **File Storage:** AWS S3 (configurable to local storage)
- **PDF Processing:** smalot/pdfparser for text extraction

### Frontend
- **Framework:** React 19.2 with Vite 8
- **UI Library:** Material-UI (MUI) 7.3
- **Routing:** React Router DOM 7
- **HTTP Client:** Axios 1.13
- **Styling:** Tailwind CSS 4 + Emotion CSS-in-JS
- **Animations:** Animate.css

### AI Service
- **Framework:** FastAPI (Python)
- **Server:** Uvicorn ASGI
- **ML Model:** scikit-learn Random Forest Classifier
- **LLM Integration:** Groq API (for advanced chatbot - optional)
- **Data Processing:** pandas, numpy
- **Model Persistence:** joblib

### Development Tools
- **Package Manager:** Composer (PHP), npm (JS), pip/uv (Python)
- **Process Management:** concurrently for multi-service startup
- **Code Quality:** Laravel Pint (PHP), ESLint (JS)
- **Testing:** PHPUnit, Mockery

---

## System Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│                   http://localhost:5173                      │
│  - Student Dashboard, Course Pages, Quiz Interface           │
│  - Instructor Dashboard, Content Management                  │
│  - Admin User Management                                     │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API (JSON)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                BACKEND (Laravel + PostgreSQL)                │
│                   http://localhost:8000                      │
│  - Authentication & Authorization                            │
│  - Course, Lesson, Assessment Management                     │
│  - Enrollment, Submissions, Grading                          │
│  - File Storage (S3 or Local)                                │
│  - Business Logic Layer                                      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP API Calls
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                AI SERVICE (FastAPI + Python)                 │
│                   http://localhost:8001                      │
│  - At-Risk Student Prediction (Random Forest)                │
│  - Learning Recommendations (Rule-based)                     │
│  - Quiz Feedback Generation (Rule-based)                     │
│  - Course Chatbot (Keyword-based)                            │
│  - Material Context Extraction                               │
└─────────────────────────────────────────────────────────────┘
```

### Communication Flow
1. **User → Frontend:** Browser interacts with React SPA
2. **Frontend → Backend:** Axios makes authenticated API calls (JWT tokens)
3. **Backend → Database:** Laravel Eloquent ORM queries PostgreSQL
4. **Backend → AI Service:** HTTP requests for predictions/recommendations
5. **AI Service → Backend:** Returns JSON responses
6. **Backend → Frontend:** JSON data rendered in React components

---

## Database Schema

### Core Tables

#### **users**
- `id`, `first_name`, `last_name`, `email`, `password`
- `role` (student, instructor, admin)
- `email_verified_at`, `google_id`, `avatar`
- `is_active`, `last_login_at`

#### **courses**
- `id`, `instructor_id`, `name`, `description`, `code`
- `join_code` (6-char alphanumeric for student enrollment)
- `is_published`, `start_date`, `end_date`
- `thumbnail`

#### **enrollments**
- `id`, `user_id`, `course_id`
- `status` (active, inactive, dropped)
- `enrolled_at`

#### **lessons**
- `id`, `course_id`, `title`, `description`, `content` (Markdown)
- `order`, `is_published`, `duration_minutes`

#### **lesson_materials**
- `id`, `lesson_id`, `title`, `type` (pdf, video, link)
- `file_path`, `url`, `file_size`
- `extracted_text` (for PDF text extraction)

#### **lesson_progress**
- `id`, `user_id`, `lesson_id`
- `status` (not_started, in_progress, done)
- `time_spent`, `last_accessed_at`

#### **assessments**
- `id`, `course_id`, `title`, `description`
- `type` (quiz, exam, activity)
- `total_points`, `passing_score`
- `duration_minutes`, `max_attempts`
- `is_published`, `due_date`
- `randomize_questions`, `show_answers_after_submit`

#### **questions**
- `id`, `assessment_id`, `question_text`, `order`
- `type` (multiple_choice, true_false, identification, essay)
- `options` (JSON array for choices)
- `correct_answer`, `points`

#### **submissions**
- `id`, `user_id`, `assessment_id`
- `status` (started, submitted, graded)
- `started_at`, `submitted_at`, `graded_at`
- `score`, `percentage`, `feedback`, `graded_by`
- `attempt_number`, `time_spent`

#### **submission_answers**
- `id`, `submission_id`, `question_id`
- `answer_text`, `is_correct`, `points_earned`

#### **grades**
- `id`, `user_id`, `course_id`
- `quiz_average`, `exam_average`, `activity_average`
- `overall_grade`, `remarks`

#### **announcements**
- `id`, `course_id`, `user_id`, `title`, `content`
- `is_pinned`

#### **calendar_events**
- `id`, `course_id`, `user_id`, `title`, `description`
- `event_type` (lesson, quiz, exam, activity, deadline, other)
- `start_date`, `end_date`, `all_day`, `color`

### Relationships
- One **user** can have many **courses** (as instructor)
- Many **users** can enroll in many **courses** (via **enrollments**)
- One **course** has many **lessons**, **assessments**, **announcements**
- One **lesson** has many **materials** and **progress** records
- One **assessment** has many **questions** and **submissions**
- One **submission** has many **submission_answers**

---

## User Roles & Permissions

### **Student**
✅ Can:
- Enroll in courses (via join code or direct enrollment)
- View published lessons, materials, and assessments
- Submit assignments and quizzes
- Track lesson progress
- View grades and calendar events
- Access AI features (risk check, chatbot, recommendations)

❌ Cannot:
- Create courses or content
- Grade submissions
- View other students' submissions
- Access instructor/admin pages

### **Instructor**
✅ Can:
- Create and manage courses
- Create lessons, materials, and assessments
- Publish/unpublish content
- Grade submissions (manual scoring)
- Generate grade reports
- Post announcements
- Create calendar events
- View AI student risk analysis
- Manage course enrollments

❌ Cannot:
- Access other instructors' courses (unless enrolled)
- Manage system users (admin only)

### **Admin**
✅ Can:
- All instructor permissions
- Create, update, delete users
- Manage all courses across the system
- Access admin dashboard

---

## Core Features

### 1. **Course Management**
- Create courses with title, description, code, dates
- Generate join codes for student enrollment
- Publish/unpublish courses
- Track enrollment status (active, inactive, dropped)

### 2. **Lesson & Content Delivery**
- Rich text lessons with Markdown support
- Attach materials (PDF, video, external links)
- Track student progress (not started, in progress, done)
- PDF text extraction for AI analysis

### 3. **Assessments & Quizzes**
- Multiple assessment types (quiz, exam, activity)
- Question types: multiple choice, true/false, identification, essay
- Auto-grading for objective questions
- Manual grading for essays
- Time limits, attempt limits, due dates
- Show/hide answers after submission
- Randomize question order

### 4. **Grading System**
- Separate averages for quiz, exam, activity
- Overall grade computation (configurable weights)
- Grade reports per course
- Pass/fail remarks

### 5. **Announcements & Calendar**
- Course-specific announcements
- Pin important announcements
- Calendar events with color coding
- Event types (lesson, quiz, exam, activity, deadline)

### 6. **Student Dashboard**
- Overall grade average
- Lessons completed vs. total
- Pending tasks count
- Activity feed (recent announcements, new assessments, materials)
- AI-powered recommendations for low quiz scores

### 7. **Instructor Dashboard**
- Total courses and students
- Pending grading count
- Class average grade
- At-risk students count
- Course-specific analytics

---

## AI Features

### 1. **Predictive Analytics (At-Risk Student Detection)**

**Model:** Random Forest Classifier

**Features Used:**
- `quiz_avg` — Average quiz score (%)
- `login_count` — Activity frequency (distinct submission days)
- `submission_rate` — (submitted assessments / total assessments)
- `missed_tasks` — (total assessments - submitted assessments)

**Output:**
- `at_risk` (boolean)
- `risk_probability` (0-1)
- `reasons` (list of contributing factors)

**Implementation:**
- **Student View:** `/student/risk-check` — Shows risk status for all enrolled courses
- **Instructor View:** `/instructor/courses/{id}/ai-summary` — Shows all students' risk status

**Endpoints:**
- `GET /api/ai/my-risk` — Student's own risk status
- `GET /api/ai/courses/{course}/student-risk` — Instructor views all students

**Files:**
- `ai-service/app.py` → `/predict` endpoint
- `app/Http/Controllers/AiController.php` → `myRisk()`, `courseRisk()`
- `frontend/src/pages/student/StudentRiskCheckPage.jsx`
- `frontend/src/pages/instructor/InstructorAiSummaryPage.jsx`

---

### 2. **Personalized Learning Recommendations**

**Logic:** Rule-based (if quiz score < 70%, recommend topic review)

**Resources:** Topic-specific study materials (data_privacy, programming, networking, etc.)

**Trigger:** After quiz submission or on student dashboard

**Endpoint:** `POST /api/ai/recommend`

**Files:**
- `ai-service/app.py` → `/recommend` endpoint
- `app/Http/Controllers/AiController.php` → `recommend()`

---

### 3. **Automated Quiz Feedback**

**Logic:** Rule-based analysis of quiz results

**Output:**
- Performance summary (excellent, good, needs improvement, poor)
- Weak topics identified
- Actionable suggestions

**Trigger:** Automatically shown after quiz submission

**Endpoint:** `POST /api/ai/quiz-feedback`

**Files:**
- `app/Http/Controllers/AiController.php` → `quizFeedback()`
- `frontend/src/pages/student/StudentQuizPage.jsx` → `AiFeedbackPanel` component

---

### 4. **Course Chatbot Assistant**

**Logic:** Keyword-based intent matching

**Supported Intents:**
- Grades/scores
- Assessments/quizzes
- Lessons/materials
- Deadlines/due dates
- Enrollment/joining courses
- Technical issues
- General help

**Out-of-scope:** Redirects to instructor for course-specific questions

**UI:** Floating chatbot widget on all student pages

**Endpoint:** `POST /api/ai/chatbot`

**Files:**
- `ai-service/app.py` → `/chatbot` endpoint
- `app/Http/Controllers/AiController.php` → `chatbot()`
- `frontend/src/components/shared/AiChatbot.jsx`

---

### 5. **Instructor AI Summary (Decision Support)**

**Purpose:** Help instructors quickly understand student status

**Data Display:**
- Summary cards (total students, at-risk, safe)
- Sortable student list with risk probability
- Key metrics per student (quiz avg, logins, submission rate, missed tasks)
- Reasons for at-risk classification

**Access:** Instructor clicks "AI Student Summary" button on course Students tab

**Endpoint:** `GET /api/ai/courses/{course}/student-risk`

**Files:**
- `app/Http/Controllers/AiController.php` → `courseRisk()`
- `frontend/src/pages/instructor/InstructorAiSummaryPage.jsx`

---

## API Endpoints

### Authentication
- `POST /api/register` — Register new user
- `POST /api/login` — Login and get token
- `POST /api/logout` — Logout (revoke token)
- `GET /api/me` — Get current user info
- `POST /api/forgot-password` — Request password reset
- `POST /api/reset-password` — Reset password with token
- `GET /api/verify-email/{id}/{hash}` — Verify email address
- `POST /api/email/resend` — Resend verification email

### Profile
- `PUT /api/profile` — Update profile info
- `PUT /api/profile/password` — Change password

### Courses
- `GET /api/courses` — List user's courses
- `POST /api/courses` — Create course (instructor)
- `GET /api/courses/{course}` — View course details
- `PUT /api/courses/{course}` — Update course
- `DELETE /api/courses/{course}` — Delete course
- `POST /api/courses/join` — Join course by code
- `POST /api/courses/{course}/enroll` — Enroll student
- `POST /api/courses/{course}/unenroll` — Unenroll student
- `GET /api/courses/{course}/students` — List enrolled students
- `POST /api/courses/{course}/generate-code` — Generate join code
- `DELETE /api/courses/{course}/join-code` — Revoke join code

### Lessons
- `GET /api/courses/{course}/lessons` — List lessons
- `POST /api/courses/{course}/lessons` — Create lesson
- `GET /api/courses/{course}/lessons/{lesson}` — View lesson
- `PUT /api/courses/{course}/lessons/{lesson}` — Update lesson
- `DELETE /api/courses/{course}/lessons/{lesson}` — Delete lesson

### Lesson Materials
- `POST /api/courses/{course}/lessons/{lesson}/materials` — Upload material
- `DELETE /api/courses/{course}/lessons/{lesson}/materials/{material}` — Delete material

### Lesson Progress
- `PUT /api/courses/{course}/lessons/{lesson}/progress` — Update progress
- `GET /api/courses/{course}/progress` — Get course progress

### Assessments
- `GET /api/courses/{course}/assessments` — List assessments
- `POST /api/courses/{course}/assessments` — Create assessment
- `GET /api/courses/{course}/assessments/{assessment}` — View assessment
- `PUT /api/courses/{course}/assessments/{assessment}` — Update assessment
- `DELETE /api/courses/{course}/assessments/{assessment}` — Delete assessment

### Questions
- `POST /api/courses/{course}/assessments/{assessment}/questions` — Add question
- `POST /api/courses/{course}/assessments/{assessment}/questions/bulk` — Add multiple questions
- `PUT /api/courses/{course}/assessments/{assessment}/questions/{question}` — Update question
- `DELETE /api/courses/{course}/assessments/{assessment}/questions/{question}` — Delete question

### Submissions & Grading
- `POST /api/courses/{course}/assessments/{assessment}/start` — Start assessment
- `POST /api/courses/{course}/assessments/{assessment}/submit` — Submit assessment
- `GET /api/courses/{course}/assessments/{assessment}/submissions` — List submissions
- `GET /api/courses/{course}/assessments/{assessment}/submissions/{submission}` — View submission
- `PUT /api/courses/{course}/assessments/{assessment}/submissions/{submission}/grade` — Grade submission

### Announcements
- `GET /api/courses/{course}/announcements` — List announcements
- `POST /api/courses/{course}/announcements` — Create announcement
- `PUT /api/courses/{course}/announcements/{announcement}` — Update announcement
- `DELETE /api/courses/{course}/announcements/{announcement}` — Delete announcement

### Calendar
- `GET /api/calendar` — Get user's calendar events
- `POST /api/courses/{course}/calendar` — Create event
- `PUT /api/calendar/{calendarEvent}` — Update event
- `DELETE /api/calendar/{calendarEvent}` — Delete event

### Grades
- `GET /api/courses/{course}/grades` — Get course grades
- `POST /api/courses/{course}/grades/compute` — Compute overall grades

### AI Features
- `POST /api/ai/predict` — Manual risk prediction (fallback)
- `GET /api/ai/my-risk` — Student's own risk status
- `GET /api/ai/courses/{course}/student-risk` — Instructor views student risk
- `POST /api/ai/recommend` — Get learning recommendations
- `POST /api/ai/quiz-feedback` — Get quiz feedback
- `POST /api/ai/chatbot` — Chatbot interaction
- `GET /api/ai/materials/{material}/context` — Get material context for AI

### Stats & Analytics
- `GET /api/student/stats` — Student dashboard stats
- `GET /api/student/ai-recommendations` — AI-powered recommendations
- `GET /api/student/feed` — Student activity feed
- `GET /api/instructor/stats` — Instructor dashboard stats

### Admin
- `GET /api/admin/users` — List all users
- `POST /api/admin/users` — Create user
- `PUT /api/admin/users/{user}` — Update user
- `DELETE /api/admin/users/{user}` — Delete user

### Health Check
- `GET /api/health` — API health status

---

## Frontend Pages

### Authentication
- `/` — Landing page
- `/login` — Login form
- `/register` — Registration form
- `/verify-email` — Email verification status
- `/forgot-password` — Password reset request
- `/reset-password` — Password reset form

### Student Pages
- `/student/dashboard` — Student dashboard (stats, feed, recommendations)
- `/student/courses` — List enrolled courses
- `/student/courses/:id` — Course overview (lessons, assessments, announcements)
- `/student/courses/:courseId/lessons/:lessonId` — Lesson content viewer
- `/student/courses/:courseId/materials/:materialId` — Material viewer (PDF, video)
- `/student/courses/:courseId/assessments/:assessmentId` — Quiz/assessment taking page
- `/student/calendar` — Personal calendar
- `/student/profile` — Profile settings
- `/student/risk-check` — AI risk status for all courses

### Instructor Pages
- `/instructor/dashboard` — Instructor dashboard (stats, courses)
- `/instructor/courses` — List created courses
- `/instructor/courses/create` — Create new course
- `/instructor/courses/:id` — Course management (lessons, assessments, students, announcements)
- `/instructor/courses/:id/lessons/create` — Create lesson
- `/instructor/courses/:id/assessments/create` — Create assessment
- `/instructor/courses/:courseId/assessments/:assessmentId` — View/edit assessment
- `/instructor/courses/:courseId/assessments/:assessmentId/submissions` — Grade submissions
- `/instructor/courses/:id/students` — Manage enrollments
- `/instructor/courses/:id/grades` — View/compute grades
- `/instructor/courses/:id/ai-summary` — AI student risk analysis

### Admin Pages
- `/admin/users` — User management

---

## File Storage

### AWS S3 Integration
**Configuration:**
- `.env` → `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_BUCKET`
- `config/filesystems.php` → S3 disk configuration

**Stored Files:**
- User avatars
- Course thumbnails
- Lesson materials (PDFs, videos, documents)
- Submission attachments (future enhancement)

**Fallback:** Local storage (`storage/app/public`) if S3 not configured

**Access:**
- Public files: `Storage::disk('s3')->url($path)`
- Private files: Signed URLs with expiration

---

## Authentication & Security

### Laravel Sanctum
- Token-based authentication for SPA
- Tokens stored in `personal_access_tokens` table
- Token expiration configurable in `config/sanctum.php`

### Password Security
- Bcrypt hashing for passwords
- Password reset via email (Resend API)
- Email verification required for new accounts

### Authorization
- Middleware: `auth:sanctum` for protected routes
- Role-based access control (RBAC)
- Policy-based authorization (future enhancement)

### CORS
- Configured in `config/cors.php`
- Frontend origin whitelisted

### Input Validation
- Form requests for complex validation
- Server-side validation for all API endpoints

---

## Development & Deployment

### Local Development

**Prerequisites:**
- PHP 8.3+
- Composer 2.x
- Node.js 20.19+
- PostgreSQL 14+ (or MySQL 8+)
- Python 3.9+

**Setup:**
```bash
# Backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link

# Frontend
cd frontend
npm install

# AI Service
cd ai-service
pip install -r requirements.txt
python train_model.py  # Train initial model
```

**Run Development Servers:**
```bash
# Option 1: All services at once (from root)
npm run start

# Option 2: Individual services
php artisan serve                          # Backend (port 8000)
cd frontend && npm run dev                 # Frontend (port 5173)
cd ai-service && uvicorn app:app --reload # AI Service (port 8001)
```

### Environment Variables

**Laravel (.env):**
```env
APP_NAME=IntelliLearn
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=intellilearn
DB_USERNAME=postgres
DB_PASSWORD=secret

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=

RESEND_API_KEY=

AI_SERVICE_URL=http://localhost:8001
```

**AI Service (.env in ai-service/):**
```env
GROQ_API_KEY=your_groq_key_here  # Optional, for advanced chatbot
```

### Deployment

**Backend (Laravel):**
- Deploy to Railway, Heroku, or VPS
- Run migrations: `php artisan migrate --force`
- Build frontend assets: `npm run build` (in frontend/)
- Set `APP_ENV=production`, `APP_DEBUG=false`

**Frontend (React):**
- Build: `npm run build` (creates `dist/` folder)
- Deploy to Vercel, Netlify, or serve via Laravel

**AI Service:**
- Deploy to Railway, Render, or Docker container
- Install dependencies: `pip install -r requirements.txt`
- Run with Gunicorn: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app`

---

## Summary of Current System State

### ✅ **Fully Implemented**
- User authentication (email/password, email verification, password reset)
- Course management (create, edit, join via code)
- Lesson content delivery with materials (PDF, video, links)
- Assessment system (quiz, exam, activity) with 4 question types
- Auto-grading for objective questions
- Manual grading for essays
- Grade computation system
- Announcements & calendar
- Student dashboard with activity feed
- Instructor dashboard with analytics
- AI at-risk prediction (real-time, database-driven)
- AI learning recommendations
- AI quiz feedback
- AI chatbot assistant
- AI instructor summary page

### 🚧 **Partially Implemented**
- File upload (works, but could add progress indicators)
- PDF text extraction (implemented but not fully utilized yet)

### 📋 **Future Enhancements**
- Real-time notifications (WebSockets)
- Discussion forums
- Peer review system
- Advanced analytics dashboard
- Mobile app (React Native)
- Video conferencing integration
- Plagiarism detection
- Bulk student import (CSV)
- Grade export (CSV/PDF)
- LTI integration for external tools

---

## Key System Metrics

**Database Tables:** 15 core tables + 3 Laravel system tables
**API Endpoints:** 60+ RESTful endpoints
**Frontend Pages:** 20+ pages across 3 user roles
**Backend Controllers:** 11 controllers
**Eloquent Models:** 13 models
**React Components:** 50+ components (pages + shared)
**AI Endpoints:** 5 AI-powered features
**Lines of Code:** ~15,000+ (estimated across all services)

---

## Documentation Files
- `AI_FEATURES_SUMMARY.md` — Detailed AI features documentation
- `ASSESSMENT_TYPES_UPDATE.md` — Assessment type changes (removed group/recitation)
- `AI_SERVICE_FIX_SUMMARY.md` — AI service troubleshooting guide
- `ALPHA_TEST_FIXES.md` — Alpha testing bug fixes log
- `.env.example` — Environment variables template
- `README.md` — Project setup instructions

---

## Contact & Support
For questions or issues with the IntelliLearn system, contact the development team or refer to the documentation files listed above.

---

**Last Updated:** September 26, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
