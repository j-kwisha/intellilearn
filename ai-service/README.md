# IntelliLearn AI Service

FastAPI service providing AI-powered features for the IntelliLearn LMS.

## Features

### 1. At-Risk Student Prediction
Predicts whether a student is at risk of falling behind based on:
- Quiz average
- Login count
- Submission rate
- Missed tasks

**Endpoint:** `POST /predict`

### 2. Personalized Learning Recommendations
Suggests supplemental materials when quiz performance is below 70%.

**Endpoint:** `POST /recommend`

### 3. Course-Specific Chatbot
Keyword-based assistant that answers questions about:
- Grades and assessments
- Course materials
- Deadlines and submissions
- Enrollment and login

**Endpoint:** `POST /chatbot`

## Setup

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # Mac/Linux
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Train the model:**
   ```bash
   python train_model.py
   ```

4. **Run the service:**
   ```bash
   uvicorn app:app --reload --port 8001
   ```

## API Documentation

Interactive docs available at: `http://localhost:8001/docs`

## Integration with Laravel

The Laravel backend (`AiController.php`) calls these endpoints:
- `/predict` — Manual or auto risk prediction
- `/recommend` — Learning path suggestions
- `/chatbot` — Student assistant

## Model Details

- **Algorithm:** Random Forest Classifier
- **Training data:** 20 sample records in `data.csv`
- **Features:** quiz_avg, login_count, submission_rate, missed_tasks
- **Output:** at_risk (boolean), risk_probability, safe_probability, reasons

## Adding New Intents (Chatbot)

Edit the `INTENTS` list in `app.py`:

```python
{
    "keywords": ["your", "keywords", "here"],
    "response": "Your response text here."
}
```

## Adding New Recommendations

Edit the `TOPIC_RESOURCES` dict in `app.py`:

```python
"topic_name": [
    {"title": "Resource Title", "type": "reading", "reason": "Why this helps."},
]
```

## Production Notes

- For production, use a real database for training data
- Consider using a proper NLP model for the chatbot (e.g., Rasa, Dialogflow)
- Add authentication/API keys if exposing publicly
- Use gunicorn or similar for deployment
