# Meridian

**A self-improving OpenEvidence for customer support** — built for the HackNation RealPage track.

Meridian is a real-time copilot for support agents that provides evidence-grounded answers with full provenance tracing, and a self-learning knowledge engine that automatically creates KB articles from resolved tickets. Every recommendation traces back to its source, inspired by how OpenEvidence links medical guidance to clinical studies.

## What It Does

1. **Agent asks a question** — the copilot classifies the intent and retrieves evidence from KB articles, backend scripts, and past tickets
2. **Every answer has a provenance chain** — traces back to the source ticket, conversation transcript, and script
3. **Ticket resolves** — the gap detector checks if the KB already covers this resolution
4. **Knowledge gap found** — the system drafts a new article from the ticket, transcript, and script
5. **Human approves** — the article is embedded and indexed immediately, no batch job
6. **Next agent gets the answer** — the learning loop closes

## Architecture

```
meridian-ui/          React 18 + Next.js frontend (Copilot, Dashboard, QA Scoring, Demo)
meridian/server/      FastAPI server (24 endpoints, Pydantic contracts)
meridian/engine/      Python intelligence engine
  data_loader.py        Loads dataset (10 Excel tabs → 4,321 documents)
  vector_store.py       ChromaDB + OpenAI text-embedding-3-large (3,072 dims)
  query_router.py       Hybrid classifier (40% keyword + 60% retrieval)
  provenance.py         Builds evidence chains (KB → Ticket → Conversation → Script)
  gap_detector.py       Detects knowledge gaps (cosine similarity threshold)
  kb_generator.py       LLM-powered KB article generation with template fallback
  eval_harness.py       Retrieval accuracy, classification metrics, before/after learning loop
tests/                Contract validation + live smoke tests (43 tests)
scripts/              Verification and utility scripts
```

## Quick Start

### Prerequisites

- Python 3.13+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) package manager
- OpenAI API key

### Setup

```bash
# Clone the repo
git clone https://github.com/your-org/hacknation-overdogs.git
cd hacknation-overdogs

# Create .env file with your API key
echo OPENAI_API_KEY=sk-your-key-here > .env

# Install Python dependencies
uv sync

# Install frontend dependencies
cd meridian-ui
npm install
cd ..
```

### Run the Backend

```bash
uv run python run_server.py
```

The server starts on `http://localhost:8000`. First boot takes ~30-40 seconds to load the dataset and build the embedding index. Subsequent starts are fast (< 5 seconds) thanks to ChromaDB persistence.

The server gracefully degrades: if the engine fails to boot (e.g., no API key), it returns stub JSON responses so the frontend still loads.

### Run the Frontend

```bash
cd meridian-ui
npm run dev
```

Opens on `http://localhost:3000`. The frontend connects to the backend at `localhost:8000`.

### Run Tests

```bash
# Contract tests (no server needed)
uv run pytest tests/test_contracts.py -v

# Smoke tests (requires running server)
uv run pytest tests/test_smoke.py -v

# All tests
uv run pytest tests/ -v

# Integration verification
uv run python scripts/verify_integration.py
```

## Dataset

**Source**: `SupportMind_Final_Data.xlsx` (10 tabs)

| Tab | Records | Description |
|-----|---------|-------------|
| Knowledge_Articles | 3,207 | 3,046 seed + 161 learned from tickets |
| Scripts_Master | 714 | Tier 3 backend fix scripts with placeholders |
| Tickets | 400 | Support cases with resolutions |
| Conversations | 400 | Call/chat transcripts linked to tickets |
| Questions | 1,000 | Ground truth for evaluation |
| KB_Lineage | 483 | Provenance mapping (KB → Ticket → Conversation → Script) |
| Learning_Events | 161 | Approval workflow records |

## Key Technical Decisions

| Decision | What we chose | Why |
|----------|--------------|-----|
| Embeddings | OpenAI text-embedding-3-large (3,072 dims) | Retrieval quality over speed; upgraded from keyword-based retrieval mid-build |
| Vector store | ChromaDB with persistent storage | Persists to disk so we don't re-embed 4,321 docs on every restart |
| Classification | Hybrid (40% keyword + 60% retrieval) | Fast classification without an LLM call per query |
| KB generation | OpenAI LLM with template fallback | Real article quality when API available, never fails without it |
| Gap threshold | 0.60 cosine similarity | Conservative: catches more gaps, human reviewer filters false positives |
| API contracts | Pydantic response models on every endpoint | Prevents frontend crashes from schema drift |
| Frontend | Live API calls (USE_MOCK=false) | Copilot, dashboard, QA scoring, and demo pipeline all call real backend |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (required) | OpenAI API key for embeddings and LLM |
| `MERIDIAN_DATA` | `SupportMind_Final_Data.xlsx` | Path to the dataset |
| `MERIDIAN_CHROMADB_DIR` | `.chromadb_store` | ChromaDB persistence directory |

## API Endpoints

24 endpoints total. Key frontend-consumed endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/query` | Copilot search (classify + retrieve + provenance) |
| GET | `/api/provenance/{doc_id}` | Full evidence chain for a document |
| GET | `/api/dashboard/stats` | Knowledge health, learning pipeline, eval results |
| POST | `/api/qa/score` | QA rubric evaluation (LLM or template) |
| POST | `/api/gap/check` | Check a ticket for knowledge gaps |
| POST | `/api/kb/generate` | Generate KB draft from a resolved ticket |
| POST | `/api/kb/approve/{draft_id}` | Approve draft and add to index |
| POST | `/api/eval/run` | Run full evaluation harness |
| POST | `/api/demo/*` | 8 demo pipeline endpoints (inject, detect, draft, approve, verify) |

## Evaluation Results

Measured against 1,000 ground truth questions:

- **Self-learning loop**: hit@5 improved from 48% to 61% (+13 percentage points)
- **Knowledge gaps closed**: 134 out of 161 detected gaps resolved
- **Retrieval**: hit@1, hit@3, hit@5, hit@10 across all document types
- **Classification**: precision, recall, F1 per class (SCRIPT, KB, TICKET)
- **Before/after test**: removes 161 learned articles, re-runs eval, restores, compares

## Team

Built by the Overdogs for HackNation 2026 (RealPage track).
