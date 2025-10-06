# Security Policy

## Supported Versions
The main branch receives security-related fixes. No long-term maintenance branches currently.

## Reporting a Vulnerability
If you discover a security issue (credential leakage, injection vector, etc.):
1. Do **not** open a public GitHub issue.
2. Email the maintainer (add your contact channel here) with:
   - Description of the issue
   - Steps to reproduce / proof of concept
   - Potential impact
3. You will receive an acknowledgement within 5 business days.

## Secrets & Keys
- Backend expects `GEMINI_API_KEY` in `backend/.env` (never commit it).
- Mock mode (`USE_MOCK_GEMINI=1`) allows development without a real key.
- Rotate keys if you suspect exposure or after sharing the repository.

## Hardening Recommendations (Future)
- Add authentication and rate limiting if exposed publicly.
- Configure CORS to a restricted origin in production.
- Add request size limits at a reverse proxy layer (Nginx / Cloudflare) in addition to in-app checks.
- Implement structured audit logging if multi-user.

## Data Handling
Uploaded images are processed in-memory and not persisted. If persistence is added later, document retention and deletion policies.

## Dependency Management
- Keep `fastapi`, `uvicorn`, `Pillow`, and `google-genai` updated.
- Use `pip install -r requirements.txt --upgrade` periodically.

## Disclosure
Responsible disclosure is appreciated. Public exploits before a patch may lead to take-down of the affected deployment until fixed.
