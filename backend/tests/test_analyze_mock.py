import os
import io
from fastapi.testclient import TestClient

# Ensure mock mode before importing app
os.environ['USE_MOCK_GEMINI'] = '1'
from backend.main import app  # noqa: E402

client = TestClient(app)

def test_health_basic():
    r = client.get('/health')
    assert r.status_code == 200
    data = r.json()
    assert data['status'] == 'ok'
    assert data['mock'] is True

def test_analyze_mock_jpeg():
    # Create a tiny in-memory JPEG
    from PIL import Image
    img = Image.new('RGB', (10, 10), color='red')
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    buf.seek(0)

    files = {'file': ('test.jpg', buf.getvalue(), 'image/jpeg')}
    data = {'portion': '2'}
    r = client.post('/analyze', files=files, data=data)
    assert r.status_code == 200, r.text
    payload = r.json()
    assert payload['portion_size'] == 2
    assert payload['nutrition']['calories'] >= 1
    # note field removed from response schema
