# IntelliLearn - Technology Stack

## Frontend
- **React 18 + Vite** - Builds the user interface that students and instructors see and interact with
- **Tailwind CSS** - Styles the interface to look modern and responsive on all devices
- **JavaScript/JSX** - Programming language used to create interactive features

## Backend
- **Laravel 11 (PHP 8.2+)** - Handles business logic, processes requests, and manages data flow
- **PostgreSQL** - Stores all system data (users, courses, grades, submissions)
- **RESTful API + Sanctum Auth** - Enables secure communication between frontend and backend with user authentication

## AI Service
- **Python FastAPI** - Runs the AI service that provides intelligent features
- **Groq API (Qwen 3.8 27B model)** - Powers essay grading, chatbot responses, and content analysis
- **scikit-learn** - Predicts which students are at risk of failing based on their activity

## Storage
- **Cloudinary (files)** - Stores uploaded course materials (PDFs, videos, images) in the cloud
- **PostgreSQL (data)** - Stores structured data like user profiles, grades, and assessment answers

## Deployment
- **Railway (all services)** - Cloud platform that hosts the entire system
- **Auto-deploy from GitHub** - Automatically updates the live system when code is pushed to GitHub

## Key Integrations
- **Smalot PdfParser** - Extracts text from PDF files so the AI chatbot can answer questions about course materials
- **Groq API** - Connects to AI model for intelligent grading and natural language understanding
- **Cloudinary API** - Handles file uploads and delivers course materials quickly via CDN
