# Backend — Document Copilot

FastAPI service for Document Copilot.

## Quickstart

Navigate to the `backend` directory first:

```powershell
cd backend
```

### 1. Environment Setup

Ensure your `.env` file exists and is populated (copy from `.env.example` if needed):

```powershell
cp .env.example .env
```

Install dependencies with [`uv`](https://docs.astral.sh/uv/):

```powershell
uv sync
```

### 2. Run the Development Server

Start the FastAPI application with reload enabled:

```powershell
uv run uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://127.0.0.1:8000`.
- Health check: `http://127.0.0.1:8000/health`
- Interactive Swagger docs: `http://127.0.0.1:8000/docs`

### 3. Database Migrations

Apply Alembic migrations to the database:

```powershell
uv run alembic upgrade head
```

Create a new migration after updating models:

```powershell
uv run alembic revision --autogenerate -m "describe changes"
```

### 4. Testing & Code Quality

Run tests:

```powershell
uv run pytest
```

Lint and format checks:

```powershell
uv run ruff check .
uv run ruff format --check .
```

