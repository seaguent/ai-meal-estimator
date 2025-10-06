@echo off
:: Simple one-button launcher for AI Meal Estimator (mock mode by default)
:: Double-click or run from a terminal in the repo root.

set PORT=8000
if "%USE_MOCK_GEMINI%"=="" set USE_MOCK_GEMINI=1

Title AI Meal Estimator Dev

echo Starting backend on port %PORT% (mock mode=%USE_MOCK_GEMINI%) ...
start "backend" cmd /k "cd backend && uvicorn main:app --reload --port %PORT%"

echo Starting frontend (Vite) on 5173 ...
start "frontend" cmd /k "cd frontend-react && npm run dev"

echo --------------------------------------------------
echo Backend:  http://localhost:%PORT%
echo Frontend: http://localhost:5173

echo Both windows launched. Close them to stop.
