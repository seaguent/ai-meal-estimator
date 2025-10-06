Param(
  [int]$Port = 8000,
  [switch]$Real
)

Write-Host "=== AI Meal Estimator Dev Launcher ===" -ForegroundColor Cyan

if (-not $env:USE_MOCK_GEMINI) {
  if ($Real) { $env:USE_MOCK_GEMINI = '0' } else { $env:USE_MOCK_GEMINI = '1' }
}

$mode = if ($env:USE_MOCK_GEMINI -eq '1') { 'MOCK' } else { 'REAL' }
Write-Host "Mode: $mode" -ForegroundColor Yellow

Write-Host "Starting backend on port $Port ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoLogo","-Command","cd backend; uvicorn main:app --reload --port $Port" | Out-Null

Write-Host "Starting frontend (Vite) on 5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoLogo","-Command","cd frontend-react; npm run dev" | Out-Null

Write-Host "Backend:  http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Close the spawned windows to stop." -ForegroundColor DarkGray
