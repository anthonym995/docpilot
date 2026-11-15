# Document Copilot — Implementation Checklist

Checklist to build the architecture in [docs/architecture.md](architecture.md) and satisfy the Driftwood Capital brief in [docs/client-brief.md](client-brief.md).

## Build Strategy: Backend-First with an Early Vertical Slice

Do **not** build the entire frontend or entire backend in isolation. Follow this sequence:

1. **Backend Foundation & Schema first** — Establish `app/config.py`, SQLAlchemy models, Alembic migrations, and `pgvector`/FTS tables as the single source of truth for data and types.
2. **Early Vertical Slice (Auth + Stubbed Streaming)** — Once FastAPI verifies Supabase JWTs and exposes a stubbed `POST /chat/stream`, scaffold the thin Vite React frontend (`pnpm`) and wire login + streaming end-to-end. This proves CORS, auth tokens, and the Vercel AI SDK wire protocol before adding LLM complexity.
3. **Backend Ingestion, Hybrid Retrieval & Grounding Core** — Build and unit-test HTML-to-Markdown parsing, page/section extraction, chunking, embeddings, `pgvector` + FTS + RRF retrieval, the PydanticAI agent, and `GroundingValidator`. Validate against the 10 benchmark analyst questions before polishing UI.
4. **Full Analyst UI, Verification UX & Deployment** — Build inline citations, one-click source passage inspection, thread history, error/refusal states, and deploy to Railway.

---

## Phase 0: Prerequisites & Workspace Hygiene

- [x] Fetch sample SEC EDGAR corpus (`25` 10-K filings for `AAPL`, `MSFT`, `NVDA`, `AMZN`, `GOOGL`, 2021–2025, in `data/downloads/` + `manifest.json`)
- [x] Resolve backend dependencies in `backend/pyproject.toml` and `backend/uv.lock`
- [x] Populate `backend/.env` and `frontend/.env` with Supabase, Postgres, and OpenAI values
- [x] Configure frontend supply-chain guard in `frontend/.npmrc` (`minimum-release-age=10080`)
- [ ] Clean up `.env` anomalies: remove the typo key `ATABASE_PASSWORD` from `backend/.env` and remove `DATABASE_PASSWORD` from `frontend/.env` (database credentials must never sit in frontend env files)
- [ ] Add `[build-system]` and `[tool.hatch.build.targets.wheel]` to `backend/pyproject.toml` (per [docs/guides/backend-setup.md](guides/backend-setup.md)) so `from app...` imports resolve across `uvicorn`, `pytest`, `alembic`, and scripts
- [ ] Verify Supabase project Auth settings: Email provider enabled (no Google/SSO), email confirmation disabled locally (re-enable before production), and verify direct/session `DATABASE_URL` (not transaction pooler) works for migrations

---

## Phase 1: Backend Core & Database Schema

- [x] **Settings & App Entrypoint**
  - [x] Create `backend/app/config.py` using `pydantic-settings` as the single source of truth for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL`, `OPENAI_EMBEDDING_DIMENSIONS`, and `ALLOWED_ORIGINS` (fail fast on missing required vars; mirror env vars if needed by SDKs; no `os.getenv`/`load_dotenv` elsewhere)
  - [x] Create `backend/app/main.py` with FastAPI app, `structlog` logging configuration, CORS middleware from `settings.ALLOWED_ORIGINS`, and `GET /health`
- [ ] **Database Models & Alembic Setup**
  - [x] Initialize Alembic in `backend/` (`uv run alembic init alembic`) and configure `backend/alembic/env.py` to import SQLAlchemy `Base.metadata` and read `settings.DATABASE_URL`
  - [ ] Create `backend/app/database/supabase.py` exposing user-scoped (bearer token + anon key) and privileged admin (service-role) Supabase clients
  - [x] Create modular models in `backend/app/database/` defining SQLAlchemy tables:
    - [x] `users` (keyed by Supabase `auth.users.id`, email, timestamps)
    - [x] `chat_threads` (id, `user_id`, title, timestamps)
    - [x] `chat_messages` (id, `thread_id`, `user_id`, role, content / AI SDK parts JSON, usage metadata, `created_at`)
    - [x] `message_citations` (id, `message_id`, `chunk_id`, `document_id`, label/index, excerpt, page, section, metadata)
    - [x] `source_documents` (id, ticker, company, cik, form, filing_date, report_date, fiscal_year, accession_number, source_url, normalized_markdown, metadata, timestamps)
    - [x] `document_chunks` (id, `document_id`, `chunk_index`, page, section, `chunk_text`, `embedding`, `search_vector`, `token_count`, metadata JSON)
- [ ] **Initial Migration & Postgres/Supabase Features**
  - [x] Generate initial migration with `uv run alembic revision --autogenerate -m "initial schema"`
  - [x] Review and add explicit `op.execute()` operations for Postgres/Supabase specifics:
    - [x] `CREATE EXTENSION IF NOT EXISTS vector;`
    - [x] `vector(1536)` embedding column on `document_chunks`
    - [x] Generated `tsvector` column (`search_vector`) on `document_chunks.chunk_text` with trigger update function
    - [x] HNSW index on `document_chunks.embedding` (`vector_cosine_ops`)
    - [x] GIN indexes on `document_chunks.search_vector` and metadata JSONB
  - [x] Apply migration against hosted Supabase via direct connection: `uv run alembic upgrade head`
  - [ ] Row-Level Security (RLS) enabled + policies (`users`, `chat_threads`, `chat_messages`, `message_citations` scoped to owning `auth.uid()`; read policy on `source_documents` and `document_chunks` for authenticated users) and role grants

---

## Phase 2: Auth & Streaming Vertical Slice (Backend + Thin Frontend)

- [ ] **Backend Auth & Chat Thread API**
  - [ ] Create `backend/app/auth/dependencies.py` with `get_current_user` verifying `Authorization: Bearer <token>` via Supabase Auth (`401` on missing/invalid/expired tokens) and deriving `user_id` + `email`
  - [ ] Create `backend/app/database/chats.py` for user-scoped thread CRUD, message listing, and citation persistence (`403` if thread belongs to another user, `404` if missing)
  - [ ] Create `backend/app/chat/messages.py` to translate AI SDK UI `messages` payloads to/from internal Pydantic models
  - [ ] Create `backend/app/chat/streaming.py` emitting AI SDK-compatible stream events (text deltas, structured data/citation parts, error events)
  - [ ] Create `backend/app/chat/orchestrator.py` and `backend/app/api/chat.py` with thread routes (`GET /threads`, `POST /threads`, `GET /threads/{thread_id}`, `DELETE /threads/{thread_id}`) and `POST /chat/stream` initially returning a stubbed streamed response + persisting user/assistant turns
  - [ ] Add unit tests in `backend/tests/auth/` and `backend/tests/chat/` (mocking Supabase boundary; verify `401`/`403`/`404` and AI SDK message/stream formatting)
- [ ] **Frontend SPA Scaffold & Auth Shell**
  - [ ] Scaffold Vite + React + TypeScript SPA in `frontend/` using `pnpm create vite . --template react-ts` (keep existing `.env`, `.env.example`, `.npmrc`, `AGENTS.md`)
  - [ ] Install core deps with `pnpm`: `react-router-dom`, `@supabase/supabase-js`, Vercel AI SDK React/UI packages (`@ai-sdk/react`, `ai`), and dev deps `tailwindcss`, `@tailwindcss/vite`; verify `pnpm-lock.yaml` only (never `npm` or `yarn`)
  - [ ] Initialize shadcn/ui (`pnpm dlx shadcn@latest init`) and configure `@/*` path alias + global theme tokens in `frontend/src/index.css`
  - [ ] Create `frontend/src/lib/env.ts` validating `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` at boot
  - [ ] Create `frontend/src/lib/supabase.ts` using anon key only (no service-role key, email auth only)
  - [ ] Create `frontend/src/lib/http.ts` and `frontend/src/lib/api.ts` wrapping native `fetch` with base URL, automatic Supabase bearer token injection, timeouts, and typed `ApiError` (with `isNetworkError`)
  - [ ] Build email sign-in / sign-up / sign-out routes and protected route guard in `frontend/src/App.tsx` and `frontend/src/pages/`
  - [ ] Build minimal chat page (`frontend/src/pages/chat/`) wired to `useChat` + `DefaultChatTransport` hitting FastAPI `POST /chat/stream`
  - [ ] Smoke test end-to-end in browser: sign in -> create thread -> send prompt -> receive stubbed stream -> reload and confirm thread/messages persist; run `pnpm tsc --noEmit` and `pnpm lint`

---

## Phase 3: SEC Filing Ingestion Pipeline

- [ ] **HTML-to-Markdown Parsing & Structure Extraction (`backend/ingest/`)**
  - [ ] Implement SEC EDGAR HTML parser that preserves prose and financial tables in clean Markdown (required for cross-year segment revenue, margins, and CapEx queries)
  - [ ] Extract filing page boundaries / page numbers and SEC Item/section headings (e.g. Item 1A Risk Factors, Item 7 MD&A, Item 8 Financial Statements) so every chunk carries verifiable page + section metadata
  - [ ] Define idempotent document upsert logic into `source_documents` keyed by `accession_number` (storing normalized Markdown, `source_url`, ticker, company, form, `filing_date`, `report_date`, `fiscal_year`)
- [ ] **Chunking & Embeddings**
  - [ ] Implement structure-aware Markdown chunker (`chunk_index`, `token_count`, section/table boundaries, overlap, and metadata JSON: `ticker`, `company`, `filing_type`, `filing_date`, `year`, `accession_number`, `page`, `section`, `source_offsets`)
  - [ ] Implement batched OpenAI embedding generator (`settings.OPENAI_EMBEDDING_MODEL`, `1536` dims) with retry/backoff and idempotent writes to `document_chunks`
  - [ ] Create `backend/app/database/documents.py` for source document & chunk queries (hydration, neighboring chunks, metadata lookup)
  - [ ] Build CLI ingestion runner (e.g., `uv run python -m ingest.run`) reading `data/downloads/manifest.json` and support both `10-K` and `10-Q` forms in `data/download.py` / ingestion metadata
  - [ ] Run ingestion on all 25 sample filings (`AAPL`, `MSFT`, `NVDA`, `AMZN`, `GOOGL`, 2021–2025) and verify `source_documents` and `document_chunks` counts + `search_vector` population in Supabase
  - [ ] Add unit tests in `backend/tests/ingest/` for HTML-to-Markdown table fidelity, page/section attribution, and chunking boundaries (no network/DB)

---

## Phase 4: Hybrid Retrieval (`pgvector` + FTS + RRF)

- [ ] Create `backend/app/retrieval/queries.py` implementing:
  - [ ] Semantic search over `document_chunks.embedding` via `pgvector` with optional metadata filters (`ticker`, `form`, `year` / `fiscal_year`)
  - [ ] Lexical full-text search over `document_chunks.search_vector` (`websearch_to_tsquery` / `ts_rank_cd`) with matching metadata filters
- [ ] Create `backend/app/retrieval/fusion.py` implementing Python Reciprocal Rank Fusion (RRF) over semantic + lexical ranked lists
- [ ] Create `backend/app/retrieval/retriever.py` (`DocumentRetriever`) to embed user queries, run hybrid search + RRF, hydrate `source_documents` metadata, and support `read_chunk` + `read_surrounding_chunks` (previous/next chunks for table or multi-paragraph continuity)
- [ ] Add unit tests in `backend/tests/retrieval/` covering RRF scoring, deduplication, filter propagation, and surrounding-chunk retrieval (no live DB/OpenAI calls)

---

## Phase 5: PydanticAI Agent, Grounding Policy & Real Streaming

- [ ] **Typed Agent & Instructions (`backend/app/assistant/`)**
  - [ ] Create `backend/app/assistant/deps.py` (`DocumentAgentDeps`: `user_id`, `thread_id`, `retriever`, `grounding_validator`)
  - [ ] Create `backend/app/assistant/outputs.py` (`GroundedAnswer`, `Citation`, `SourcePassage` with `chunk_id`, `document_id`, `company`, `ticker`, `form`, `filing_date`, `fiscal_year`, `page`, `section`, `excerpt`, `source_url`)
  - [ ] Author `backend/app/assistant/instructions.md` encoding the Driftwood trust contract:
    - [ ] Answer strictly from retrieved corpus passages — never invent facts
    - [ ] Cite every factual claim with filing + page
    - [ ] Explicitly state when corpus evidence is insufficient rather than extrapolating
    - [ ] Refuse stock picks, trading recommendations, and external non-corpus queries
  - [ ] Create `backend/app/assistant/agent.py` defining the PydanticAI agent with bounded retrieval tools (`search_filings`, `read_chunk`, `read_surrounding_chunks`) — no agent-generated SQL — returning `GroundedAnswer`
- [ ] **Grounding Enforcement & Live Orchestration**
  - [ ] Create `backend/app/grounding/validator.py` (`GroundingValidator`) enforcing invariants:
    - [ ] Every non-refusal answer has at least one citation
    - [ ] Every citation references a `chunk_id` retrieved in the current request turn
    - [ ] Cited passages include complete verification metadata (company, filing, date, page/section, excerpt)
    - [ ] Controlled failure if validation fails (never emit an ungrounded polished answer)
  - [ ] Update `backend/app/chat/orchestrator.py` and `backend/app/chat/streaming.py` to execute the PydanticAI agent, stream answer text deltas + validated citation/source-passage parts, and persist user message, assistant message, `message_citations`, and usage metadata only after run + validation succeed
  - [ ] Map failure modes cleanly: `401`, `403`, `404`, `422`, `502` (upstream OpenAI/Supabase errors), and `500`
  - [ ] Add unit tests in `backend/tests/grounding/` and `backend/tests/assistant/` covering grounding invariants, unretrieved citation rejection, insufficient-evidence refusal path, and prompt/output contracts; keep `uv run pytest -m "not integration"` green

---

## Phase 6: Analyst Chat UI, Citations & Source Verification

- [ ] **Thread Management & Chat Experience (`frontend/src/`)**
  - [ ] Build thread sidebar to create new threads, view past analyst conversations, switch threads, and delete/rename threads
  - [ ] Add starter prompt chips / empty state reflecting analyst workflows (e.g., cross-year revenue mix, risk-factor diffs, CapEx comparisons)
  - [ ] Render streaming Markdown + clean financial tables in `frontend/src/components/chat/` with in-flight streaming indicator and retry/error states
  - [ ] Render friendly error banners distinguishing network/CORS failures (`ApiError.isNetworkError`) from HTTP auth/server errors
- [ ] **Trust UX: Inline Citations & One-Click Passage Verification**
  - [ ] Render inline clickable citation badges in assistant messages (showing company/ticker, form, year/date, and page)
  - [ ] Build source-passage verification drawer/panel displaying the exact retrieved excerpt, surrounding context, section header, filing metadata, and direct SEC EDGAR `source_url` link in one click
  - [ ] Add distinct, clear presentation when the bot declines to extrapolate due to insufficient corpus evidence
- [ ] **Frontend Verification**
  - [ ] Run `pnpm tsc --noEmit`, `pnpm lint`, and `pnpm build` with zero errors
  - [ ] Manually verify full browser flow: email login, new thread, multi-turn follow-up, citation inspection, refusal case, sign-out, and re-login thread persistence

---

## Phase 7: Client-Brief Evaluation, Hardening & Railway Deployment

- [ ] **10-Question Analyst Benchmark & Trust Audit (`docs/client-brief.md`)**
  - [ ] Test all 10 benchmark questions from `docs/client-brief.md` (integration test or eval script marked `@pytest.mark.integration`):
    - [ ] Q1: Apple 2021–2025 revenue mix across iPhone, Services, Mac, iPad, Wearables
    - [ ] Q2: Amazon AWS vs North America & International operating income/margin (2021–2025)
    - [ ] Q3: NVIDIA Data Center demand drivers, customer concentration & supply constraints (FY21–FY25)
    - [ ] Q4: Microsoft Azure, AI infrastructure & cloud capacity constraint disclosures (2021–2025)
    - [ ] Q5: Alphabet segment trends (Search, YouTube ads, Network, Subscriptions/Platforms/Devices, Cloud)
    - [ ] Q6: Risk-factor additions/removals/material changes across the 5 companies (AI, cloud, export controls, supply chain, regulation)
    - [ ] Q7: Apple & NVIDIA supplier concentration / third-party manufacturing urgency shifts
    - [ ] Q8: CapEx & purchase commitments comparison across MSFT, AMZN, GOOGL, NVDA
    - [ ] Q9: Latest 10-K geographic revenue exposures & YoY shifts per company
    - [ ] Q10: Generative-AI margin impact — verify grounded evidence AND explicit refusal to extrapolate beyond filings
  - [ ] Test explicit out-of-scope prompts (stock picks, trading recommendations, external news) and verify principled refusals
- [ ] **Production Hardening & Railway Deployment**
  - [ ] Re-enable email confirmation (or configure Driftwood email invite/allowlist flow) in Supabase Auth
  - [ ] Audit frontend build output to ensure `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and `OPENAI_API_KEY` are absent from browser assets
  - [ ] Deploy `backend/` on Railway (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`, run `alembic upgrade head` on release, configure `ALLOWED_ORIGINS` + backend secrets)
  - [ ] Deploy `frontend/` static Vite build on Railway (configure SPA fallback routing for React Router paths and `VITE_*` env vars)
  - [ ] Run live smoke test on deployed Railway URLs (sign-up/sign-in, streaming query, citation drawer, reload persistence)
- [ ] **Pilot Readiness (Definition of Done)**
  - [ ] Confirm corpus expansion plan for S&P 500 `10-K` and `10-Q` filings (2020–2025) if moving beyond the 5-company sample
  - [ ] Onboard 5 senior Driftwood analysts for 1-week pilot and validate >= 3 hours/analyst/week time savings
