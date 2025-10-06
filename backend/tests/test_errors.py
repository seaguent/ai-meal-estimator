import os
import io
import sys
from pathlib import Path
from fastapi.testclient import TestClient

os.environ['USE_MOCK_GEMINI'] = '1'

repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from backend.main import app  # noqa: E402

client = TestClient(app)

def _jpeg_bytes():
    try:
        from PIL import Image
    except ImportError:  # Should be present but guard anyway
        return b""
    import tempfile
    img = Image.new('RGB', (5, 5), color='blue')
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()

def test_invalid_portion():
    img = _jpeg_bytes()
    files = {'file': ('x.jpg', img, 'image/jpeg')}
    r = client.post('/analyze', files=files, data={'portion': '-1'})
    assert r.status_code == 400
    assert 'Portion must be > 0' in r.text

def test_non_image_file():
    files = {'file': ('x.txt', b'notanimage', 'text/plain')}
    r = client.post('/analyze', files=files, data={'portion': '1'})
    assert r.status_code == 400
    assert 'File must be an image' in r.text

def test_mock_health_mode():
    r = client.get('/health')
    assert r.status_code == 200
    assert r.json().get('mock') is True
