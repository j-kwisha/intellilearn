from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import joblib
import numpy as np
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="IntelliLearn AI Service")
model = joblib.load("model.pkl")

# Configure Groq — key loaded from .env
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


class StudentData(BaseModel):
    quiz_avg: float
    login_count: int
    submission_rate: float
    missed_tasks: int


class RecommendRequest(BaseModel):
    quiz_avg: float
    topic: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    course_name: Optional[str] = None
    history: Optional[list] = []
    lesson_context: Optional[str] = None
    material_title: Optional[str] = None


@app.get("/")
def root():
    return {"message": "IntelliLearn AI Service is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/predict")
def predict(data: StudentData):
    features = np.array([[data.quiz_avg, data.login_count, data.submission_rate, data.missed_tasks]])
    prediction = model.predict(features)[0]
    probability = model.predict_proba(features)[0]
    reasons = []
    if data.quiz_avg < 70:
        reasons.append("Low quiz performance")
    if data.missed_tasks > 2:
        reasons.append("Missed multiple tasks")
    if data.submission_rate < 0.8:
        reasons.append("Low submission rate")
    if data.login_count < 5:
        reasons.append("Low platform activity")
    return {
        "at_risk": bool(prediction),
        "risk_probability": float(probability[1]),
        "safe_probability": float(probability[0]),
        "reasons": reasons
    }


TOPIC_RESOURCES = {
    "default": [
        {"title": "Review your course materials", "type": "tip", "reason": "Go back to the lessons related to your weak areas."},
        {"title": "Practice with past quizzes", "type": "tip", "reason": "Repetition helps reinforce concepts."},
        {"title": "Ask your instructor for help", "type": "tip", "reason": "Your instructor can clarify difficult topics."},
    ],
    "data_privacy": [
        {"title": "Data Privacy Act Overview", "type": "reading", "reason": "Covers the fundamentals of RA 10173."},
        {"title": "Privacy Principles Summary", "type": "reading", "reason": "Key principles you need to know for the quiz."},
    ],
    "programming": [
        {"title": "Review basic syntax", "type": "tip", "reason": "Make sure you understand variables, loops, and functions."},
        {"title": "Practice coding exercises", "type": "tip", "reason": "Hands-on practice is the best way to learn programming."},
    ],
    "networking": [
        {"title": "OSI Model Review", "type": "reading", "reason": "The OSI model is a common quiz topic."},
        {"title": "TCP/IP Basics", "type": "reading", "reason": "Understanding TCP/IP is essential for networking."},
    ],
}


@app.post("/recommend")
def recommend(data: RecommendRequest):
    if data.quiz_avg >= 70:
        return {"needs_recommendation": False, "message": "Great performance! Keep it up.", "recommendations": []}
    topic_key = (data.topic or "").lower().replace(" ", "_")
    resources = TOPIC_RESOURCES.get(topic_key, TOPIC_RESOURCES["default"])
    return {
        "needs_recommendation": True,
        "message": f"Your quiz average is {data.quiz_avg:.1f}%. Here are some resources to help you improve.",
        "recommendations": resources
    }


INTENTS = [
    {"keywords": ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy"],
     "response": "Hello! I am your IntelliLearn course assistant. I can help you with grades, lessons, assessments, deadlines, enrollment, and course topics. What do you need help with?"},
    {"keywords": ["thank", "thanks", "thank you", "ty"],
     "response": "You are welcome! Let me know if you have any other questions."},
    {"keywords": ["bye", "goodbye", "see you"],
     "response": "Goodbye! Good luck with your studies. Feel free to come back anytime!"},
    {"keywords": ["what can you do", "how do you work", "what are you", "who are you", "ai help"],
     "response": "I am the IntelliLearn course assistant! I can help you with grades, lessons, assessments, deadlines, enrollment codes, risk status, announcements, and academic topics."},
    {"keywords": ["intellilearn", "platform", "lms", "what is this system", "about this app"],
     "response": "IntelliLearn is an AI-powered Learning Management System. It helps students track progress, take assessments, view lesson materials, and get personalized feedback."},
    {"keywords": ["grade", "score", "result", "mark", "gpa", "passing", "failed", "passed", "my grade"],
     "response": "You can view your grades by going to your course page and checking the Grades section. Your instructor computes grades based on quizzes, exams, activities, and recitations."},
    {"keywords": ["quiz", "assessment", "exam", "long exam", "recitation", "take a test", "take a quiz"],
     "response": "Quizzes and assessments are listed under each course. Click on a course, then go to the Assessments tab to see available items."},
    {"keywords": ["lesson", "module", "view lesson"],
     "response": "Lesson materials are available inside each course under the Lessons tab. Click on the lesson title to open it."},
    {"keywords": ["material", "file", "pdf", "download", "resource", "attachment"],
     "response": "Files and materials are uploaded by your instructor under each lesson. Go to your course, open the Lessons tab, and click on a lesson to see its attached files."},
    {"keywords": ["deadline", "due date", "late", "missing", "overdue"],
     "response": "Check your course announcements and assessments for deadlines. If you missed a deadline, contact your instructor."},
    {"keywords": ["submit", "submission", "how to submit", "submitted"],
     "response": "To submit an assessment, open the course, go to Assessments, click on the assessment, and click Start. Answer all questions and click Submit when done."},
    {"keywords": ["enroll", "join", "join code", "course code", "how to join"],
     "response": "To join a course, go to My Courses and click Join with Code. Enter the 8-character code provided by your instructor or admin."},
    {"keywords": ["forgot password", "change password", "reset password"],
     "response": "To change your password, go to the Profile page in the sidebar. If you forgot your password, use the Forgot Password link on the login page."},
    {"keywords": ["profile", "account", "update profile", "edit profile", "my account"],
     "response": "You can update your profile information from the Profile page in the sidebar."},
    {"keywords": ["at risk", "risk status", "am i at risk", "risk check", "struggling"],
     "response": "Your risk status is based on your quiz average, login activity, submission rate, and missed tasks. Go to the Risk Check page in the sidebar to see your current status."},
    {"keywords": ["announcement", "notice", "posted by instructor"],
     "response": "Course announcements are posted by your instructor under the Announcements tab inside each course."},
    {"keywords": ["what is python", "python language", "python programming", "learn python", "python basics"],
     "response": "Python is a beginner-friendly, high-level programming language known for its simple syntax. Key concepts: variables, loops (for/while), functions (def), lists, dictionaries, and classes."},
    {"keywords": ["what is html", "html language", "learn html", "html basics", "html introduction"],
     "response": "HTML (HyperText Markup Language) is the standard language for creating web pages. It uses tags to structure content."},
    {"keywords": ["what is css", "css basics", "learn css", "css introduction"],
     "response": "CSS (Cascading Style Sheets) controls the visual appearance of HTML elements. Common properties: color, font-size, margin, padding, background, display."},
    {"keywords": ["what is javascript", "javascript basics", "learn javascript", "js language"],
     "response": "JavaScript is a programming language that adds interactivity to web pages. It runs in the browser and can manipulate HTML/CSS and handle user events."},
    {"keywords": ["object oriented", "oop", "what is oop", "class and object", "inheritance", "encapsulation"],
     "response": "OOP organizes code into classes and objects. Key concepts: Encapsulation, Inheritance, Polymorphism, Abstraction."},
    {"keywords": ["what is sql", "sql basics", "learn sql", "sql query", "select statement"],
     "response": "SQL manages relational databases. Key commands: SELECT, INSERT INTO, UPDATE, DELETE, JOIN."},
    {"keywords": ["what is networking", "networking basics", "osi model", "tcp ip", "network layers"],
     "response": "Networking connects computers to share data. The OSI model has 7 layers. TCP/IP is the internet foundation."},
    {"keywords": ["data privacy", "privacy act", "ra 10173", "personal data", "data protection"],
     "response": "The Data Privacy Act of 2012 (RA 10173) protects personal information. Key principles: transparency, legitimate purpose, and proportionality."},
]


@app.post("/chatbot")
def chatbot(data: ChatRequest):
    message_lower = data.message.lower().strip()

    if not data.lesson_context:
        for intent in INTENTS:
            if any(kw in message_lower for kw in intent["keywords"]):
                return {"response": intent["response"], "in_scope": True}

    try:
        if data.lesson_context:
            system_prompt = (
                f"You are an AI tutor helping a student understand a lesson titled '{data.material_title or 'this lesson'}'.\n"
                f"Answer their questions directly based on the content below.\n"
                f"FORMATTING RULES — always follow these:\n"
                f"- Break your answer into short sections, never one long paragraph\n"
                f"- Use numbered lists (1. 2. 3.) for steps, sequences, or ordered items\n"
                f"- Use bullet points (- ) for features, facts, or unordered items\n"
                f"- Keep each paragraph to 2-3 sentences max\n"
                f"- Add a short bold label before each section when covering multiple topics (e.g. 'History:', 'Features:')\n"
                f"- End with a one-line summary if the answer is long\n"
                f"If the answer is not in the content, say: 'That topic is not covered in this lesson.'\n\n"
                f"--- LESSON CONTENT ---\n{data.lesson_context[:6000]}\n--- END ---"
            )
        else:
            system_prompt = (
                "You are IntelliLearn's course assistant — an AI tutor for students. "
                "You help with academic topics, course content, and learning questions. "
                "FORMATTING RULES — always follow these:\n"
                "- Never write one long paragraph\n"
                "- Use bullet points or numbered lists when listing multiple items\n"
                "- Keep each paragraph to 2-3 sentences max\n"
                "- Use short bold labels to separate sections when needed\n"
                "Do NOT ask clarifying questions — give direct answers. "
                "If the question is completely unrelated to education, say it is outside your coverage. "
                f"Course context: {data.course_name or 'General'}"
            )

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": data.message}
            ],
            max_tokens=500,
            temperature=0.7,
        )
        answer = response.choices[0].message.content.strip()
        return {"response": answer, "in_scope": True}

    except Exception as e:
        print(f"Groq error: {str(e)}")
        return {"response": "I'm sorry, I couldn't process that request. Please try asking something else.", "in_scope": False}
