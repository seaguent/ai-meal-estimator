# AI Meal Estimator 

![CI](https://github.com/seaguent/ai-meal-estimator/actions/workflows/ci.yml/badge.svg)

Vision‑AI web application for nutritional inference from food images.

Powered by **Google Gemini Vision**, this project performs multimodal image→text reasoning to estimate calories, macronutrients, and generate concise health insights.

**Architecture:** FastAPI (Python) backend orchestrates inference, validation, and mock mode; React + Vite + Tailwind frontend handles drag‑and‑drop & real‑time camera capture. Deployed on **Render** (API) + **Vercel** (frontend) with GitHub Actions CI and pinned Python runtime for reproducibility.

**Modes:**
- Real model inference (production)
- Deterministic mock inference (`USE_MOCK_GEMINI=1`) for local development & onboarding without an API key

## Live Deployment

Frontend (Vercel): https://ai-meal-estimator.vercel.app  
Backend (Render base URL): https://ai-meal-estimator.onrender.com  
API Docs: https://ai-meal-estimator.onrender.com/api/docs  
Health: https://ai-meal-estimator.onrender.com/health  
Gemini Health: https://ai-meal-estimator.onrender.com/health/gemini

Frontend is built with Vite; the base API URL is baked at build time from `VITE_API_BASE`. If you later change backend domain:
1. Update `VITE_API_BASE` in Vercel project settings.
2. Redeploy frontend.
3. Update `ALLOWED_ORIGINS` on Render to include the new frontend origin (remove old one when no longer needed).

If you add a custom domain, list it here and rotate `ALLOWED_ORIGINS` accordingly.

## Current Features

| Category | Highlights |
|----------|------------|
| Inference | Gemini Vision food recognition & confidence + top_k |
| Nutrition | Portion-scaled macro + calorie estimates |
| Insights  | Short health recommendation text (mock or real) |
| UX        | Drag & drop, camera capture, responsive UI |
| Dev Mode  | Deterministic mock (`USE_MOCK_GEMINI=1`) without API calls |
| Validation| Image type/size/integrity + positive portion enforcement |
| Types     | Pydantic response schemas for structured consumption |
| Deployment| Render (API) + Vercel (frontend), CI with GitHub Actions |

## Quick Start

### Prerequisites

- Python 3.11 (recommended) or 3.10 (3.13 is very new; some libs may lag)
- Node.js 16+
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ai-meal-estimator
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd frontend-react
   npm install
   ```

4. **Set up API Key**
   - Get your Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Copy `backend/.env.example` to `backend/.env` and set `GEMINI_API_KEY=your_key`
   - The backend loads this lazily; restart the backend after editing `.env`

### Running the Application

Manual startup (backend + frontend in two terminals):
```powershell
# Terminal 1 - Backend
cd backend
python -m uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd ..\frontend-react
npm run dev
```

#### One-Button Launch (Windows)

Use the provided helper scripts from the project root:

```powershell
./dev.ps1          # Starts backend (mock mode if USE_MOCK_GEMINI not set) + frontend
./dev.ps1 -Real    # Force real mode (set USE_MOCK_GEMINI=0, requires GEMINI_API_KEY)
```

Or double‑click `dev.bat` in Explorer. It opens two terminals (backend & frontend). Close those windows to stop.

If PowerShell blocks script execution, allow local scripts once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Access Points

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/api/docs
- Health: http://localhost:8000/health
- Gemini health: http://localhost:8000/health/gemini

## Project Structure

```
ai-meal-estimator/
├── backend/
│   ├── main.py              # FastAPI backend server
│   └── requirements.txt     # Python dependencies
├── frontend-react/
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── index.css       # Global styles
│   │   └── main.jsx        # React entry point
│   ├── package.json        # Node.js dependencies
│   └── vite.config.js      # Vite configuration
└── README.md              # Project documentation
```

## API Endpoints

### Health & Status
- `GET /` redirect to docs
- `GET /health` fast internal health
- `GET /health/gemini` Gemini connectivity (skipped logic in mock mode)

### Food Analysis
`POST /analyze`

Multipart form fields:
- `file`: image binary (jpeg/png)
- `portion`: positive float (scales output)

Example (mock) response (note field removed):
```json
{
   "food_name": "sample mock dish",
   "confidence": 0.87,
   "nutrition": { "calories": 250, "protein": 12.0, "carbs": 28.0, "fat": 9.0 },
   "ai_insights": "This is a mock response. Add lean protein or vegetables to balance the meal.",
   "portion_size": 1.0,
   "top_k": [ { "label": "sample mock dish", "confidence": 0.87 } ]
}
```

## Environment Variables

Backend (`backend/.env` dev example):
```
GEMINI_API_KEY=your_real_key
GEMINI_MODEL=gemini-2.0-flash
ALLOWED_ORIGINS=http://localhost:5173
USE_MOCK_GEMINI=0
```
Production example:
```
GEMINI_API_KEY=prod_key_here
ALLOWED_ORIGINS=https://ai-meal-estimator.vercel.app
USE_MOCK_GEMINI=0
```
Set `USE_MOCK_GEMINI=1` to run without a real key (returns deterministic mock output). Always **restrict** `ALLOWED_ORIGINS` in production.

Frontend (`frontend-react/.env`):
```
VITE_API_BASE=http://localhost:8000
```

## Development

Accessibility: The custom styled file input uses a hidden `<input type="file">` and a label surrogate. Add `aria-label="Food image upload"` (or wrap it with visible text) if you further customize for screen readers.

## Limitations
- Estimates only (not medical grade).  
- Visual ambiguity & plating variance impact accuracy.  
- Simple linear portion scaling (no volumetric/weight inference).  
- No auth / rate limiting yet (not hardened for public abuse).  
- Mock mode ≠ real model variability.

## Deployment Notes
- Pin Python via `.python-version` (3.11.x) to avoid wheel build failures.  
- Set `ALLOWED_ORIGINS` (comma-separated) instead of `*`.  
- Frontend must be rebuilt if `VITE_API_BASE` changes.  
- Consider a reverse proxy (nginx/caddy) for TLS, compression, size limiting.  
- Add rate limiting & logging before opening to broad traffic.

### Backend Development
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### Frontend Development
```bash
cd frontend-react
npm run dev
```

### Adding New Features
1. Backend changes go in `backend/main.py`
2. Frontend changes go in `frontend-react/src/App.jsx`
3. Test both servers after changes
4. Update this README if needed

## Security Notes
- Never commit real `.env` / API keys.  
- Rotate keys if exposed in terminals, screenshots, or issue text.  
- Prefer mock mode for demos & onboarding.  
- Add auth / rate limiting & request logging before scaling.  
- Log only key tail (already implemented).

## Future Improvements (Backlog)
- Ingredient segmentation for mixed plates.
- Optional manual macro override & per-ingredient editing.
- Rate limiting & API key auth layer.
- Structured logging + request ID + basic analytics.
- Dockerfile for portable local + container deploy.
- Better nutrition normalization via a canonical food database.

## Troubleshooting

### Common Issues

1. **"Could not import module 'main'"**
   - Make sure you're running uvicorn from the `backend/` directory
   - Check that `main.py` exists in the backend folder

2. **"npm error code ENOENT"**
   - Make sure you're running npm from the `frontend-react/` directory
   - Check that `package.json` exists

3. **"Backend server is not running"**
   - Check that the backend is running on port 8000
   - Verify the health endpoint: http://localhost:8000/health

4. **Nutrition values showing as dashes**
   - Check browser console for errors
   - Verify the API response format matches frontend expectations

5. **CI fails with `ModuleNotFoundError: No module named 'httpx'`**
   - Ensure `httpx` (and `pytest` if running tests) is listed in `backend/requirements.txt`
   - Re-run workflow after pushing the change
   - FastAPI's TestClient depends on httpx through Starlette

### Logs
- Backend logs appear in the terminal where uvicorn is running
- Frontend logs appear in browser console (F12)

## License

This project is open source and available under the MIT License.

## Support / Issues

- Review troubleshooting section above.
- Check API docs: http://localhost:8000/api/docs
- Inspect browser console (frontend) & backend terminal logs.

---

Built with React, FastAPI, and Google Gemini.