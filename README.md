# Mirathi

Mirathi is an Arabic inheritance-calculation web app with:
- **Frontend:** Next.js + React + TypeScript
- **Backend:** FastAPI + Python
- **Features:** inheritance calculation engine, saved cases, shareable result URL, PDF export

## Project structure

```text
mirathi_fixed/
  backend/
  frontend/
```

## Local run

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env        # optional
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend default URL: `http://localhost:3000`
Backend default URL: `http://127.0.0.1:8000`

## Deployment recommendation

- Deploy **frontend** to **Vercel**
- Deploy **backend** to **Render** or **Railway**

### Frontend environment variables

- `NEXT_PUBLIC_API_BASE_URL=https://your-backend-url`

### Backend environment variables

- `FRONTEND_BASE_URL=https://your-frontend-url`
- `CORS_ALLOW_ORIGINS=https://your-frontend-url`
- `DB_PATH=/absolute/path/to/mirathi.db` (optional)

## Notes

- SQLite is fine for demo/testing. For production and multi-user stability, PostgreSQL is better.
- Do not commit `.env`, `.venv`, `.next`, `node_modules`, or `.db` files.
