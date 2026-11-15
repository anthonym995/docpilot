# Document Copilot — Implementation Checklist

Checklist to build the architecture in [docs/architecture.md](architecture.md) and satisfy the Driftwood Capital brief in [docs/client-brief.md](client-brief.md).

## Build Strategy: Backend-First with an Early Vertical Slice

1. **Backend Foundation & Schema First** — `app/config.py`, SQLAlchemy models, Alembic migrations, and `pgvector`/FTS tables.
2. **Auth & Stubbed Streaming Vertical Slice** — Supabase JWT verification on FastAPI, auth shell on React, and stubbed `POST /chat/stream` with AI SDK wire protocol.
3. **Ingestion & Retrieval Pipeline** — HTML-to-Markdown parsing, chunking with section metadata, OpenAI embeddings, and hybrid (`pgvector` + FTS + RRF) search.
4. **PydanticAI Grounding Core & Full Analyst UX** — Grounding validator, citations drawer, refusal states, and Railway deployment.

---

## Phase 0: Prerequisites & Workspace Hygiene

- [x] Fetch sample SEC EDGAR corpus (25 10-K filings for AAPL, MSFT, NVDA, AMZN, GOOGL in `data/downloads/` + `manifest.json`)
- [x] Resolve backend dependencies in `backend/pyproject.toml` and `backend/uv.lock`
- [x] Populate `backend/.env` and `frontend/.env` with Supabase, Postgres, and OpenAI credentials
- [x] Configure frontend supply-chain guard in `frontend/.npmrc` (`minimum-release-age=10080`)
- [x] Add hatchling build-system configuration to `backend/pyproject.toml`

---

## Phase 1: Backend Core & Database Schema

- [x] **Settings & App Entrypoint**
  - [x] Create `backend/app/config.py` using `pydantic-settings` (single source of truth for env)
  - [x] Create `backend/app/main.py` with FastAPI app, CORS middleware, and `GET /health`
- [x] **Database Models & Alembic Setup**
  - [x] Initialize Alembic and wire `backend/alembic/env.py` to `settings.DATABASE_URL`
  - [x] Create `backend/app/database/supabase.py` (admin and user-scoped clients)
  - [x] Create SQLAlchemy models: `users`, `chat_threads`, `chat_messages`, `message_citations`, `source_documents`, `document_chunks`
- [x] **Initial Migration & Postgres Features**
  - [x] Migration with `vector` extension, `vector(1536)` column, HNSW index, and generated `tsvector` with GIN index
  - [x] Apply migrations to hosted Supabase: `uv run alembic upgrade head`
- [ ] Row-Level Security (RLS) policies migration (`users`, `chat_threads`, `chat_messages`, `message_citations` scoped to `auth.uid()`)

---

## Phase 2: Auth Foundation & Verification

- [x] **Backend Auth**
  - [x] Create `backend/app/auth/dependencies.py` with `get_current_user` verifying Supabase JWT (`401` on invalid/expired/missing)
  - [x] Add test authenticated endpoint `GET /auth/me` on FastAPI
  - [x] Unit tests in `backend/tests/auth/` (mocking Supabase boundary, testing all 401 cases and valid token extraction)
- [x] **Frontend Auth Shell**
  - [x] Scaffold Vite + React + TypeScript SPA with Tailwind CSS v4 and shadcn/ui primitives
  - [x] Create `frontend/src/lib/env.ts` validating env vars at boot
  - [x] Create `frontend/src/lib/supabase.ts` with anon key
  - [x] Create `frontend/src/lib/http.ts` and `frontend/src/lib/api.ts` with automatic Bearer token injection and typed `ApiError`
  - [x] Auth context, email sign-in / sign-up forms, and `ProtectedRoute` guard in `frontend/src/App.tsx`
  - [x] Verify: sign up, sign in, token reaches backend on test authenticated endpoint (`GET /auth/me`)

---

## Phase 3: Chat Shell (Vertical Slice, Stubbed)

**Goal:** End-to-end chat UI streaming from FastAPI, no real retrieval yet.

### Backend
- [ ] Chat thread CRUD: list threads, create thread, load message history (`backend/app/database/chats.py` and `backend/app/api/chat.py`)
- [ ] `POST /chat/stream` — accepts AI SDK message format, streams a stubbed assistant reply (`backend/app/chat/streaming.py`)
- [ ] Persist user + assistant messages to `chat_messages` after stream completes
- [ ] Enforce 403 when user accesses another user's thread (404 if missing)

### Frontend
- [ ] React Router: login, chat list, chat thread routes (`/`, `/c/:threadId`)
- [ ] AI SDK chat primitives pointed at `POST /chat/stream` with Supabase bearer token
- [ ] Thread sidebar (past conversations)
- [ ] Basic message list + input + streaming indicator
- [ ] Verify: create thread, send message, see streamed stub response, reload and see history

---

## Phase 4: SEC Filing Ingestion Pipeline

- [ ] SEC EDGAR HTML-to-Markdown parser preserving prose and financial tables
- [ ] Page boundary and SEC Item/section heading extraction for verifiable metadata
- [ ] Idempotent document upsert into `source_documents` keyed by `accession_number`
- [ ] Structure-aware Markdown chunker (`chunk_index`, token bounds, overlap, section metadata)
- [ ] Batched OpenAI embeddings generator (`text-embedding-3-small`, 1536 dims) with retry/backoff
- [ ] CLI ingestion runner (`uv run python -m ingest.run`) executing across all 25 sample filings
- [ ] Ingestion unit tests (`backend/tests/ingest/` for parsing, page extraction, and chunking)

---

## Phase 5: Hybrid Retrieval (`pgvector` + FTS + RRF)

- [ ] Semantic vector search over `document_chunks.embedding` with metadata filters (ticker, form, year)
- [ ] Lexical full-text search over `document_chunks.search_vector` (`websearch_to_tsquery` / `ts_rank_cd`)
- [ ] Reciprocal Rank Fusion (RRF) in Python combining semantic + lexical ranked lists
- [ ] `DocumentRetriever` supporting query embedding, hybrid search, hydration, and surrounding-chunk expansion
- [ ] Unit tests (`backend/tests/retrieval/` covering RRF scoring, deduplication, and filter logic)

---

## Phase 6: PydanticAI Agent, Grounding Policy & Real Streaming

- [ ] PydanticAI agent with bounded retrieval tools (`search_filings`, `read_chunk`, `read_surrounding_chunks`)
- [ ] System prompt encoding Driftwood trust contract: strict corpus-only facts, citation of filing + page, refuse extrapolation
- [ ] `GroundingValidator` enforcing invariants: every claim cited, chunks retrieved in current turn, complete metadata
- [ ] Update `POST /chat/stream` to execute agent, stream answer deltas + citation parts, and persist validated turns
- [ ] Unit tests (`backend/tests/grounding/` and `backend/tests/assistant/` for grounding contract and refusals)

---

## Phase 7: Analyst Trust UX, Citations & Source Verification

- [ ] Thread management UI: switch threads, delete/rename threads, starter prompt chips
- [ ] Financial table rendering + in-flight streaming indicators in chat UI
- [ ] Inline clickable citation badges (company, form, fiscal year, page)
- [ ] Source-passage verification drawer showing retrieved excerpt, section context, and SEC EDGAR link
- [ ] Distinct visual styling for evidence-gap refusals

---

## Phase 8: Client-Brief Evaluation, Hardening & Railway Deployment

- [ ] Benchmark test suite verifying all 10 analyst questions from `docs/client-brief.md`
- [ ] Security audit: frontend asset bundle contains no server secrets; email confirmation restored for prod
- [ ] Deploy backend on Railway (`uvicorn app.main:app`, release migration `alembic upgrade head`)
- [ ] Deploy frontend static SPA build on Railway
- [ ] End-to-end smoke test on production URLs
