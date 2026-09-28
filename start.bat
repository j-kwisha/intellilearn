@echo off
echo Starting IntelliLearn...

start "Laravel" cmd /k "php -d upload_max_filesize=100M -d post_max_size=100M artisan serve"
start "Frontend" cmd /k "cd frontend && npm run dev"
start "AI Service" cmd /k "cd ai-service && venv\Scripts\activate && uvicorn app:app --reload --port 8001"

echo.
echo All services started:
echo   Laravel   -^> http://localhost:8000
echo   Frontend  -^> http://localhost:5173
echo   AI Service-^> http://localhost:8001
echo.
echo Close the individual terminal windows to stop each service.
 