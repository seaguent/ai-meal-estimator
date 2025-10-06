import os
import base64
import json
import logging
import io
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from google import genai
from PIL import Image
from dotenv import load_dotenv

# --------------------------------------------------
# Logging
# --------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

dotenv_path = Path(__file__).resolve().parent / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path=dotenv_path, override=False)

API_KEY = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
USE_MOCK_GEMINI = os.getenv("USE_MOCK_GEMINI", "0").lower() in {"1", "true", "yes"}
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()] or ["*"]

if not API_KEY and not USE_MOCK_GEMINI:
    logger.error("GEMINI_API_KEY not found and mock mode disabled. Create backend/.env with GEMINI_API_KEY=<your_key> or set USE_MOCK_GEMINI=1")
    raise RuntimeError("GEMINI_API_KEY not configured")
elif API_KEY:
    logger.info(f"Loaded GEMINI_API_KEY (len={len(API_KEY)}, tail={API_KEY[-4:]})")
else:
    logger.warning("Running without real Gemini key (mock mode enabled)")

client = None
if not USE_MOCK_GEMINI:
    try:
        client = genai.Client(api_key=API_KEY)
        logger.info("Gemini client initialized successfully")
    except Exception as e:  # pragma: no cover
        logger.error(f"Failed to initialize Gemini client: {e}")
        raise

app = FastAPI(
    title="AI Meal Estimator API",
    description="Powered by Google Gemini Vision for intelligent food analysis",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class Nutrition(BaseModel):
    calories: int
    protein: float
    carbs: float
    fat: float


class TopKItem(BaseModel):
    label: str
    confidence: float


class AnalysisResponse(BaseModel):
    food_name: str
    confidence: float = Field(ge=0, le=1)
    nutrition: Nutrition
    ai_insights: str
    portion_size: float = Field(gt=0)
    top_k: list[TopKItem]




MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10MB


def validate_image(image_data: bytes) -> bool:
    try:
        image = Image.open(io.BytesIO(image_data))
        image.verify()
        return True
    except Exception:  # pragma: no cover - simple validation
        return False


def analyze_food_with_gemini(image_data: bytes, portion: float) -> dict:
    """Return a normalized analysis dict used by the /analyze endpoint."""
    if USE_MOCK_GEMINI:
        base = {
            "food_name": "sample mock dish",
            "confidence": 0.87,
            "nutrition": {"calories": 250, "protein": 12.0, "carbs": 28.0, "fat": 9.0},
            "ai_insights": "This is a mock response. Add lean protein or vegetables to balance the meal.",
        }
        # Scale by portion (simple multiplier)
        for k in ["calories", "protein", "carbs", "fat"]:
            if k == "calories":
                base["nutrition"][k] = int(base["nutrition"][k] * portion)
            else:
                base["nutrition"][k] = round(base["nutrition"][k] * portion, 1)
        return base

    try:
        image_base64 = base64.b64encode(image_data).decode("utf-8")
        prompt = f"""Analyze this food image and return ONLY a JSON response with this exact structure (NO markdown fences):
{{
  \"food_name\": \"Name of the food item\",
  \"confidence\": 0.95,
  \"nutrition_per_100g\": {{
    \"calories\": 100,
    \"protein\": 5.0,
    \"carbs\": 20.0,
    \"fat\": 2.0
  }},
  \"health_insights\": \"Detailed health analysis and recommendations\"
}}

Portion size multiplier: {portion}x. Scale all numeric nutrition values by this factor.
Return ONLY raw JSON, no prose."""
        response = client.models.generate_content(
            model=MODEL,
            contents=[
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": image_base64}},
            ],
        )
        result_text = response.text.strip()
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        raw = json.loads(result_text)

        nutrition = raw.get("nutrition_per_100g") or {}
        for k in ["calories", "protein", "carbs", "fat"]:
            if k in nutrition:
                if k == "calories":
                    nutrition[k] = int(nutrition[k] * portion)
                else:
                    nutrition[k] = round(float(nutrition[k]) * portion, 1)

        return {
            "food_name": raw.get("food_name", "unknown"),
            "confidence": float(raw.get("confidence", 0.0)),
            "nutrition": nutrition,
            "ai_insights": raw.get("health_insights", "No insights available."),
        }
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:  # pragma: no cover
        logger.error(f"Gemini analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {e}")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/api/docs")


@app.get("/health")
def health():
    return {"status": "ok", "mock": USE_MOCK_GEMINI}


@app.get("/health/gemini")
def health_gemini():
    if USE_MOCK_GEMINI:
        return {"status": "ok", "mode": "mock"}
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized")
    try:
        # Lightweight ping: attempt trivial model invocation without image
        response = client.models.generate_content(
            model=MODEL,
            contents=[{"text": "ping"}],
        )
        ok = bool(response and response.text)
        return {"status": "ok" if ok else "degraded", "model": MODEL}
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Gemini check failed: {e}")


@app.post("/analyze")
async def analyze(file: UploadFile = File(...), portion: float = Form(1.0)):
    if portion <= 0:
        raise HTTPException(status_code=400, detail="Portion must be > 0")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")
    if not validate_image(data):
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file")

    analysis = analyze_food_with_gemini(data, portion)
    payload = {
        **analysis,
        "portion_size": portion,
        "top_k": [
            {"label": analysis.get("food_name", "unknown"), "confidence": analysis.get("confidence", 0)}
        ],
    }
    return AnalysisResponse(**payload)



