# IntelliLearn - Technical Architecture

## System Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│   React + Vite  │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────────────────────────┐
│   Backend API                       │
│   Laravel 11 (PHP 8.2+)            │
└────────┬────────────────────────────┘
         │
         ├──────────────┬──────────────┬─────────────┐
         │              │              │             │
    ┌───▼────┐    ┌────▼─────┐   ┌───▼──────┐  ┌──▼─────────┐
    │Database│    │File Store│   │AI Service│  │Web Services│
    │PostgreSQL   │Cloudinary│   │FastAPI   │  │Groq API    │
    └────────┘    └──────────┘   └──────────┘  └────────────┘
```

---

## Frontend

**What it does:** Provides the user interface where students and instructors interact with the system through web browsers, displaying courses, lessons, assessments, and grades in a responsive, modern interface.

### Technology Stack
- **Framework:** React 18 - Component-based UI library for building interactive interfaces
- **Build Tool:** Vite - Fast development server and build tool for modern web apps
- **Language:** JavaScript (JSX) - Programming language with XML-like syntax for building UI
- **Styling:** Tailwind CSS 3 - Utility-first CSS framework for rapid styling
- **Routing:** React Router v6 - Client-side routing for single-page application navigation
- **HTTP Client:** Axios - Promise-based HTTP client for making API requests
- **State Management:** React Context + Hooks - Built-in React tools for managing application state

### Key Libraries
- `react-router-dom` - Client-side routing for navigation between pages without page reloads
- `axios` - API communication library for sending HTTP requests to the backend
- `lucide-react` - Icon library providing consistent visual elements across the interface
- `date-fns` - Date manipulation library for formatting and displaying dates/times

### Deployment
- **Platform:** Railway - Cloud platform that automatically deploys the frontend from GitHub
- **Build Command:** `npm run build` - Compiles React code into optimized static files
- **Start Command:** `npm run preview` - Serves the built application to users
- **Port:** 3000 - Network port where the frontend application runs

---

## Backend API

**What it does:** Handles all business logic, data processing, user authentication, and serves as the central hub connecting the frontend, database, AI service, and file storage.

### Technology Stack
- **Framework:** Laravel 11 - PHP web framework for building robust APIs
- **Language:** PHP 8.2+ - Server-side scripting language
- **Architecture:** RESTful API - Standard API design for HTTP-based communication
- **Authentication:** Laravel Sanctum (Token-based) - API authentication system for single-page applications
- **Database ORM:** Eloquent - Object-relational mapper for database interactions

### Key Features
- Role-based access control (Admin, Instructor, Student) - Ensures users can only access features appropriate to their role
- File upload handling - Processes and stores uploaded course materials
- PDF text extraction (Smalot\PdfParser) - Extracts text from PDF files for AI chatbot context
- Automatic grading system - Instantly grades multiple choice, true/false, and short answer questions
- Grade computation - Calculates weighted averages and final grades automatically

### API Endpoints
```
Authentication:
POST /api/register
POST /api/login
POST /api/logout

Courses:
GET    /api/courses
POST   /api/courses
GET    /api/courses/{id}
PUT    /api/courses/{id}
DELETE /api/courses/{id}

Assessments:
GET    /api/courses/{course}/assessments
POST   /api/courses/{course}/assessments
POST   /api/courses/{course}/assessments/{assessment}/start
POST   /api/courses/{course}/assessments/{assessment}/submit

AI Features:
POST   /api/ai/chatbot
POST   /api/ai/predict
GET    /api/ai/my-risk
POST   /api/ai/quiz-feedback
```

### Composer Dependencies
```json
{
  "laravel/framework": "^11.0",      // Core framework for building the API
  "laravel/sanctum": "^4.0",          // API authentication and token management
  "smalot/pdfparser": "^2.0"          // Extracts text content from PDF files
}
```

### Deployment
- **Platform:** Railway - Cloud hosting platform with automatic deployments
- **Environment:** Production - Live environment serving actual users
- **Database:** PostgreSQL (Railway managed) - Integrated database with automatic backups

---

## Database

**What it does:** Stores all system data including users, courses, lessons, assessments, submissions, grades, and extracted text from uploaded materials in a structured, relational format.

### System
- **DBMS:** PostgreSQL 15+ - Advanced open-source relational database system
- **Hosting:** Railway managed database - Automated database hosting with backups
- **Backup:** Automatic daily backups - Ensures data recovery and protection

### Main Tables
```
users
├── id, email, password, role, first_name, last_name
├── Roles: admin, instructor, student

courses
├── id, name, code, instructor_id, description

enrollments
├── id, user_id, course_id, status

lessons
├── id, course_id, title, content, order

lesson_materials
├── id, lesson_id, title, type, file_path, url
├── extracted_text (for AI chatbot)

assessments
├── id, course_id, lesson_id, title, type
├── Types: quiz, long_exam, individual_activity
├── total_points, time_limit_minutes, max_attempts

questions
├── id, assessment_id, question_text, type
├── Types: multiple_choice, true_false, short_answer, essay
├── options, correct_answer, points

submissions
├── id, user_id, assessment_id, score, percentage
├── status: in_progress, submitted, graded

submission_answers
├── id, submission_id, question_id, answer_text
├── is_correct, points_earned, ai_feedback

grades
├── id, user_id, course_id
├── quiz_average, exam_average, activity_average
├── overall_grade, remarks

calendar_events
announcements
```

---

## AI Service

**What it does:** Provides artificial intelligence capabilities including automatic essay grading, student risk prediction, personalized chatbot assistance, and learning recommendations using machine learning models.

### Technology Stack
- **Framework:** FastAPI (Python 3.10+) - Modern, high-performance Python web framework for building APIs
- **Language:** Python - Programming language optimized for AI and data processing
- **ML Library:** scikit-learn, joblib - Machine learning library for predictive models and model persistence
- **LLM Provider:** Groq API - Cloud service for fast AI model inference
- **Model:** Qwen 3.8 27B (Alibaba) - Large language model for natural language understanding and generation

### Features
1. **At-Risk Prediction**
   - Algorithm: Random Forest Classifier
   - Input: quiz_avg, login_count, submission_rate, missed_tasks
   - Output: at_risk (boolean), probability, reasons

2. **Essay Grading**
   - Model: qwen/qwen3.8-27b
   - Uses reference material from lesson PDFs
   - Returns: points_earned, feedback, score_percentage

3. **Chatbot**
   - Model: qwen/qwen3.8-27b
   - Context-aware (uses extracted lesson text)
   - Intent-based fallback responses

4. **Learning Recommendations**
   - Rule-based system
   - Topic-specific resource suggestions

### Python Dependencies
```
fastapi
uvicorn
pydantic
joblib
numpy
groq
python-dotenv
```

### API Endpoints
```
GET  /health
POST /predict           - Student risk prediction
POST /recommend         - Learning recommendations
POST /chatbot          - AI assistant
POST /grade-essay      - Essay auto-grading
```

### Deployment
- **Platform:** Railway
- **Port:** 8001
- **URL:** https://astonishing-enchantment-production-e2fc.up.railway.app

---

## File Storage

**What it does:** Stores and delivers all uploaded files (PDFs, documents, videos, images) through a cloud CDN, providing fast access to course materials from anywhere in the world.

### Service
- **Provider:** Cloudinary - Cloud-based media management platform
- **Plan:** Free tier - No-cost plan with sufficient storage for educational use
- **Storage:** Images, PDFs, documents, videos - Supports multiple file types for course materials

### Configuration
```
Cloud Name: zjahbnyw
Upload Folder Structure:
  intellilearn/
    ├── course_{id}/
    │   └── lesson_{id}/
    │       └── files...
```

### Features
- Direct HTTP API upload
- Public access mode
- Automatic URL generation
- CDN delivery

---

## AI Model Provider

**What it does:** Powers all AI features by providing access to a 27-billion parameter language model that can understand questions, grade essays, and generate human-like responses in real-time.

### Service
- **Provider:** Groq - AI inference cloud platform for ultra-fast model execution
- **Model:** qwen/qwen3.8-27b (Alibaba Qwen 3.8 27B) - Advanced large language model
- **API:** REST API - Standard HTTP-based interface for making AI requests

### Model Specifications
- **Parameters:** 27 billion
- **Context Window:** 131,072 tokens
- **Architecture:** Hybrid attention (Gated DeltaNet + full attention)
- **Capabilities:** Text generation, reasoning, multilingual

### Usage
```python
# Essay Grading
model="qwen/qwen3.8-27b"
temperature=0.2
max_tokens=300

# Chatbot
model="qwen/qwen3.8-27b"
temperature=0.7
max_tokens=500
```

### API Pricing
- Input: ~$0.50/1M tokens
- Output: ~$2.00/1M tokens

---

## Development Environment

### Prerequisites
```bash
# Backend
PHP 8.2+
Composer 2.x
PostgreSQL 15+

# Frontend
Node.js 18+
npm 9+

# AI Service
Python 3.10+
pip
```

### Local Setup
```bash
# 1. Clone repository
git clone https://github.com/j-kwisha/intellilearn.git

# 2. Backend setup
cd intellilearn
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve

# 3. Frontend setup
cd frontend
npm install
npm run dev

# 4. AI Service setup
cd ai-service
pip install -r requirements.txt
python train_model.py
uvicorn app:app --reload --port 8001
```

### Environment Variables
```env
# Backend (.env)
APP_URL=http://localhost:8000
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=intellilearn
DB_USERNAME=postgres
DB_PASSWORD=your_password

CLOUDINARY_CLOUD_NAME=zjahbnyw
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

AI_SERVICE_URL=http://127.0.0.1:8001

# AI Service (.env)
GROQ_API_KEY=your_groq_api_key
```

---

## Deployment Architecture

### Platform: Railway

**Services:**
1. **Backend** (Laravel)
   - Auto-deploy from GitHub (main branch)
   - Environment: Production
   - PostgreSQL database attached

2. **Frontend** (React)
   - Auto-deploy from GitHub (main branch)
   - Build: `npm run build`
   - Serve: `npm run preview`

3. **AI Service** (FastAPI)
   - Auto-deploy from GitHub (main branch)
   - Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`

**Automatic Deployments:**
- Push to main branch → Railway auto-deploys
- Zero-downtime deployments
- Automatic SSL certificates

---

## Security

### Authentication
- Laravel Sanctum token-based auth
- HTTP-only cookies (optional)
- CSRF protection
- Password hashing (bcrypt)

### Authorization
- Role-based access control (RBAC)
- Middleware protection
- Route-level permissions

### Data Protection
- SQL injection prevention (Eloquent ORM)
- XSS protection (React escaping)
- Input validation (Laravel Form Requests)
- File type validation

---

## Performance

### Optimization
- Database indexing on foreign keys
- Eager loading (N+1 query prevention)
- Frontend code splitting
- CDN for file delivery (Cloudinary)
- API response caching

### Scalability
- Horizontal scaling ready (Railway)
- Stateless API design
- Separate AI service (microservice)
- Database connection pooling

---

## Monitoring & Logs

### Backend
- Laravel logs (storage/logs)
- Railway deployment logs
- Database query monitoring

### AI Service
- FastAPI logs
- Python print statements
- Error tracking

---

## Version Control

- **Repository:** GitHub
- **Branch:** main
- **Commit Convention:** Conventional Commits
  - `feat:` New features
  - `fix:` Bug fixes
  - `refactor:` Code refactoring
  - `docs:` Documentation

---

## System Requirements

### Server
- **CPU:** 1+ cores
- **RAM:** 512MB minimum (2GB recommended)
- **Storage:** 10GB minimum
- **OS:** Linux (Ubuntu/Debian recommended)

### Client
- **Browser:** Modern browser (Chrome, Firefox, Safari, Edge)
- **Connection:** Broadband internet
- **Device:** Desktop, tablet, or mobile

---

**Last Updated:** September 21, 2026
