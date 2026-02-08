# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Meridian** is a self-learning AI support intelligence system built for the HackNation RealPage track. It's an "OpenEvidence for Support Agents" - a real-time copilot that provides evidence-grounded answers with full provenance tracing, plus a self-learning knowledge engine that automatically creates KB articles from resolved tickets.

### Core Concept
- Support agents receive recommendations with **provenance chains** - every answer traces back to source tickets, conversations, and scripts
- Knowledge gaps are automatically detected when tickets are resolved
- New KB articles are generated from gaps and queued for approval
- Once approved, articles enter the retrieval index, making the system smarter over time

## Architecture

The project is split into three major components, designed for a 3-person team:

### Person 1: Backend Intelligence Engine (`meridian/engine/`)
- **data_loader.py**: Loads dataset (10 Excel tabs), builds unified document corpus (4,321 docs: 3,207 KB + 714 scripts + 400 tickets)
- **vector_store.py**: TF-IDF retrieval engine with partitioned search (KB/SCRIPT/TICKET)
- **query_router.py**: Hybrid classifier (keyword + retrieval) routes queries to correct document type
- **provenance.py**: Resolves evidence chains linking KB articles → Tickets → Conversations → Scripts
- **gap_detector.py**: Detects knowledge gaps by comparing ticket resolutions against KB corpus
- **kb_generator.py**: LLM-powered KB article generation from tickets (with template fallback)
- **eval_harness.py**: Evaluation metrics (retrieval accuracy, classification, before/after learning loop)

### Person 2: Frontend UI (`meridian-ui/src/`)
- **CopilotView**: Two-panel interface (conversation + results with provenance badges)
- **DashboardView**: Knowledge health metrics, learning pipeline status, emerging issues, eval results
- **QAScoringView**: Quality assurance rubric evaluation interface
- Components use React 18 + Tailwind + Recharts, designed for mock-first development

### Person 3: API Integration (`meridian-api/`)
- FastAPI server wrapping Person 1's engine
- Endpoints for query, provenance, dashboard stats, QA scoring, KB approval workflow
- Demo orchestration and presentation materials

## Dataset Structure

**Source**: `SupportMind_Final_Data.xlsx` (10 tabs)

Key relationships:
- **Questions** (1,000 rows): Ground truth for evaluation with Answer_Type (SCRIPT/KB/TICKET_RESOLUTION) and Target_ID
- **Scripts_Master** (714 rows): Tier 3 backend fix scripts with placeholders
- **Knowledge_Articles** (3,207 rows): 3,046 seed articles + 161 synthetic (learned from tickets)
- **Tickets** (400 rows): Support cases with resolutions, 161 have Script_ID and Generated_KB_Article_ID
- **Conversations** (400 rows): Call/chat transcripts linked to tickets
- **KB_Lineage** (483 rows): Provenance mapping (KB → Ticket → Conversation → Script)
- **Learning_Events** (161 rows): Approval workflow records (134 approved, 27 rejected)

Critical join keys: `Ticket_Number`, `Script_ID`, `KB_Article_ID`, `Conversation_ID`

## Development Workflow

### Running the Backend Engine

```bash
# Boot and show stats
python -m meridian.main

# Run full evaluation (retrieval + classification + before/after)
python -m meridian.main --eval

# Query the engine
python -m meridian.main --query "advance property date backend script"
```

### Running the Frontend

```bash
cd meridian-ui
npm run dev
```

Frontend initially uses mock data (`USE_MOCK = true` in `src/lib/api.js`). Flip to `false` when API is ready.

### Running the API Server

```bash
cd meridian-api
uvicorn main:app --reload
```

## Key Implementation Details

### Document Types & Color Coding
- **SCRIPT** (amber/orange): Backend fixes requiring specific inputs (placeholders like `<DATABASE>`, `<SITE_NAME>`)
- **KB** (blue): Knowledge articles, split into SEED (no metadata) vs LEARNED (from tickets, has provenance)
- **TICKET** (emerald): Resolved support cases with tier/priority/resolution

### Provenance Chain Structure
Synthetic KB articles have exactly 3 lineage records:
1. **Ticket** (CREATED_FROM) - the source ticket that revealed the gap
2. **Conversation** (CREATED_FROM) - the call/chat transcript
3. **Script** (REFERENCES) - the backend fix script used in resolution

### Gap Detection Logic
- Threshold: 0.40 cosine similarity
- Compare ticket resolution text against all existing KB articles
- If max similarity < threshold → knowledge gap detected
- Cluster gaps by category+module to identify emerging issues

### Evaluation Metrics
- **Retrieval accuracy**: hit@k (1, 3, 5, 10) against 1,000 ground truth questions
- **Classification accuracy**: routing to correct document type
- **Before/after learning loop**: Proof that adding synthetic KB articles improves retrieval (remove 161 learned articles, re-run eval, restore, compare)

### TF-IDF Configuration
- max_features=30000, ngram_range=(1,2), stop_words="english", sublinear_tf=True
- Partitioned indices for targeted retrieval by doc_type
- Dynamic index mutation for before/after comparisons

## Demo Strategy

The winning demo flow (5-step sequence):
1. **Agent gets question** → copilot classifies and retrieves with evidence
2. **Case resolves** → gap detector flags missing KB coverage
3. **KB draft generated** → LLM creates structured article from ticket+transcript+script
4. **Human approval** → reviewer approves draft in dashboard
5. **Copilot retrieves it** → next similar question now has the answer

Critical metrics to emphasize:
- Self-learning loop improved hit@5 from 48% to 61% (+13pp)
- 134 knowledge gaps closed
- Full provenance tracing on all learned articles

## Environment Configuration

Required environment variables:
- `OPENAI_API_KEY`: For KB article generation and QA scoring (optional - falls back to template)
- `MERIDIAN_DATA`: Path to dataset (defaults to `SupportMind_Final_Data.xlsx`)

## Anti-Patterns to Avoid

- **Don't modify join keys or IDs**: All foreign keys resolve perfectly in the dataset
- **Don't skip provenance**: It's the differentiator - every recommendation needs evidence tracing
- **Don't fake the learning loop**: The before/after eval must use actual index mutation, not simulated numbers
- **Don't use dense embeddings**: This is TF-IDF only (works offline, no API dependencies for retrieval)
- **Don't create new KB article formats**: Match the exact structure of synthetic articles in the dataset

## Performance Targets

- Dataset load + index build: <10 seconds
- Single query retrieval: <100ms
- Full 1,000-question eval: <5 minutes
- UI mock data responses: instant

## File Naming Conventions

- Backend modules: snake_case (data_loader.py)
- React components: PascalCase (ProvenanceModal.jsx)
- Doc IDs: KB-{hash}, SCRIPT-{num}, CS-{num}, CONV-{hash}, LEARN-{num}, DRAFT-{num}
