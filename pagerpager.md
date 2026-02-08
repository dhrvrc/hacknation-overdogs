# SupportMind — Build Plan
### RealPage Hackathon: Self-Learning AI System for Support
**Team Size:** 3 · **Deliverables:** Deployed App + GitHub + Slides + Live Demo

---

## 1. What We're Building

**One product, three connected surfaces.** Think "OpenEvidence for support agents" — every recommendation is evidence-grounded with full provenance, and the system gets smarter from every resolved ticket.

### Surface 1: Agent Copilot (the front door)
A real-time side panel for support agents. As a customer describes their issue, the copilot:
- **Classifies** the issue (KB article needed? Script needed? Escalation?)
- **Retrieves** the best matching resource via RAG (3,207 KB articles + 714 scripts)
- **Shows provenance** — every answer traces back to its source: ticket → conversation → script → KB article
- **Renders script placeholders** — if a Tier 3 script is needed, highlights the inputs required (using Placeholder_Dictionary)
- **QA nudges** — passive flags if the agent misses steps (didn't confirm issue, didn't ask clarifying questions, etc.)

### Surface 2: Self-Learning Engine (the brain)
After a ticket resolves, the system:
- Compares the resolution against existing KB articles (similarity threshold)
- **Detects knowledge gaps** — no existing article covers this resolution well
- **Auto-drafts** a new KB article from ticket + conversation + script, with full lineage
- Submits for **human review** (approve/reject workflow)
- Approved articles enter the retrieval corpus — copilot gets smarter
- **Emerging issue detection** — clusters of unmatched tickets flagged as potential new recurring problems

### Surface 3: QA & Insights Dashboard (the trust layer)
- **QA Scoring** — feed any transcript + ticket pair through the provided QA rubric → structured scores across 20 parameters with red flag detection
- **Agent Performance** — trends by agent, category, time period
- **Knowledge Health** — which articles are retrieved most, which have low match rates, which categories lack coverage
- **Emerging Issues** — visualization of new ticket clusters that don't match existing knowledge

---

## 2. The Demo (5 minutes)

This is the story we tell judges. Everything we build serves a moment in this flow.

### Act 1: "An agent gets a hard question" (60s)
→ Type a real question from the Questions dataset into the Copilot
→ System classifies it, retrieves the right script/KB article
→ Show the provenance chain: "This answer comes from KB-XYZ, created from ticket CS-38908386, referencing SCRIPT-0293"
→ If it's a script, show the placeholder inputs the agent needs to collect

### Act 2: "But what happens when there's no good answer?" (90s)
→ Show a new/synthetic ticket where the resolution doesn't match any existing KB article
→ System flags: "Knowledge gap detected — no article above 0.75 similarity threshold"
→ Auto-generates a draft KB article from the ticket + conversation + script
→ Show the full lineage: source ticket, source conversation, referenced script

### Act 3: "The loop closes" (60s)
→ Reviewer approves the draft KB article
→ Show it entering the live corpus
→ Go back to the Copilot, ask a similar question
→ **Now it retrieves the new article.** The system learned.

### Act 4: "Every interaction is governed" (45s)
→ Show the QA dashboard for the same ticket
→ Structured scores, tracking items, coaching recommendations
→ Show agent performance trends and knowledge health metrics

### Act 5: "Here's the proof" (45s)
→ Retrieval accuracy: hit@k against the 1,000 ground-truth questions
→ Learning pipeline stats: 134 approved, 27 rejected out of 161 proposals
→ Before/after: retrieval quality improvement after learning loop adds articles

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │ Agent Copilot │ │ Knowledge    │ │ QA & Insights    │ │
│  │              │ │ Ops Panel    │ │ Dashboard        │ │
│  └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘ │
└─────────┼────────────────┼──────────────────┼───────────┘
          │                │                  │
┌─────────▼────────────────▼──────────────────▼───────────┐
│                    API LAYER (FastAPI)                    │
│                                                          │
│  /copilot/query     → classify + retrieve + provenance   │
│  /learning/detect   → gap detection on resolved tickets  │
│  /learning/draft    → generate KB article from ticket    │
│  /learning/review   → approve/reject draft               │
│  /qa/score          → run QA rubric on transcript+ticket │
│  /insights/trends   → agent stats, emerging issues       │
│  /eval/accuracy     → hit@k against ground truth         │
└─────────┬────────────────┬──────────────────┬───────────┘
          │                │                  │
┌─────────▼────────────────▼──────────────────▼───────────┐
│                    INTELLIGENCE LAYER                     │
│                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────────────┐ │
│  │ Vector Store │ │ LLM Layer   │ │ Classification     │ │
│  │ (Chroma /   │ │ (Claude /   │ │ (Answer_Type       │ │
│  │  Pinecone)  │ │  GPT-4o)    │ │  routing)          │ │
│  │             │ │             │ │                    │ │
│  │ KB articles │ │ KB drafting │ │ SCRIPT / KB /      │ │
│  │ Scripts     │ │ QA scoring  │ │ TICKET_RESOLUTION  │ │
│  │ Tickets     │ │ Summaries   │ │                    │ │
│  └─────────────┘ └─────────────┘ └────────────────────┘ │
└─────────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────┐
│                    DATA LAYER                             │
│                                                          │
│  Knowledge_Articles (3,207) ← grows via learning loop    │
│  Scripts_Master (714)                                    │
│  Tickets (400) + Conversations (400)                     │
│  KB_Lineage (483) ← provenance chain                     │
│  Learning_Events (161) ← approval workflow log           │
│  Questions (1,000) ← evaluation ground truth             │
│  QA_Evaluation_Prompt ← scoring rubric                   │
│  Placeholder_Dictionary (25) ← script input definitions  │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Frontend | **React + Tailwind** | Fast to build, clean UI for demo |
| Backend | **FastAPI (Python)** | Quick API dev, native async, good LLM lib support |
| Vector DB | **ChromaDB** (local) or **Pinecone** (cloud) | Chroma for dev speed, Pinecone if deploying |
| Embeddings | **OpenAI text-embedding-3-small** or **Voyage** | Best price/performance for retrieval |
| LLM | **Claude Sonnet 4** or **GPT-4o** | KB generation, QA scoring, classification |
| Database | **SQLite** or **Postgres** | Tickets, lineage, learning events, approval state |
| Deployment | **Vercel (FE)** + **Railway/Render (BE)** | Free tier, fast deploy |
| Eval | **Custom Python scripts** | hit@k, similarity metrics against ground truth |

---

## 5. Workstream Split (3 People)

### Person A: Retrieval & Intelligence Pipeline
**Owns:** The brain — everything from raw data to ranked results.

Phase 1 — Data & Embeddings:
- [ ] Parse all Excel tabs into structured data (SQLite or in-memory)
- [ ] Embed all KB articles (3,207) and scripts (714) into vector store
- [ ] Build retrieval pipeline: query → embed → search → rerank → return with metadata

Phase 2 — Classification & Routing:
- [ ] Build Answer_Type classifier (SCRIPT vs KB vs TICKET_RESOLUTION)
- [ ] Route queries to correct corpus based on classification
- [ ] Implement provenance chain: for each result, trace back through KB_Lineage

Phase 3 — Self-Learning Loop:
- [ ] Gap detection: compare new ticket resolution against existing KB (similarity threshold)
- [ ] KB draft generation: LLM call with ticket + conversation + script → new KB article
- [ ] Lineage tracking: auto-generate KB_Lineage entries for new articles
- [ ] Emerging issue detection: cluster unmatched tickets by similarity

Phase 4 — Evaluation:
- [ ] Build eval harness: hit@k against 1,000 ground-truth Questions
- [ ] Before/after comparison: accuracy with vs. without learning-loop articles
- [ ] Generate eval metrics for the demo

### Person B: Frontend & Product
**Owns:** Everything the user sees and touches.

Phase 1 — Copilot Interface:
- [ ] Two-panel layout: conversation/query on left, recommendations on right
- [ ] Query input → shows classified type + top results
- [ ] Provenance badges on each result (source ticket, KB article, script)
- [ ] Script viewer with placeholder highlighting (using Placeholder_Dictionary)
- [ ] QA nudge indicators (passive coaching flags)

Phase 2 — Knowledge Ops Panel:
- [ ] Knowledge gap list: tickets flagged as having no KB match
- [ ] Draft KB article viewer with lineage visualization
- [ ] Approve/reject workflow UI
- [ ] Status indicators: pending → approved → live in corpus

Phase 3 — QA & Insights Dashboard:
- [ ] Single-case QA scorer: input transcript + ticket → structured score output
- [ ] Agent performance cards (scores by agent name)
- [ ] Knowledge health: article retrieval frequency, coverage gaps by category
- [ ] Emerging issues: visual cluster of new unmatched ticket types

Phase 4 — Polish:
- [ ] Loading states, transitions, responsive layout
- [ ] Demo mode: pre-loaded examples for smooth live demo walkthrough
- [ ] Dark/light theme (optional but looks good)

### Person C: API Layer, QA Engine & Deployment
**Owns:** The glue — APIs, QA scoring, deployment, and the slide deck.

Phase 1 — API Scaffolding:
- [ ] FastAPI project setup with all endpoint stubs
- [ ] `/copilot/query` — accepts question, returns classification + ranked results + provenance
- [ ] `/learning/detect` — accepts ticket_number, returns gap analysis
- [ ] `/learning/draft` — accepts ticket_number, returns generated KB draft
- [ ] `/learning/review` — accepts KB_Article_ID + decision, updates corpus
- [ ] `/qa/score` — accepts transcript + ticket, returns structured QA JSON
- [ ] `/insights/trends` — returns aggregated stats

Phase 2 — QA Scoring Engine:
- [ ] Implement the full QA_Evaluation_Prompt as an LLM-powered scorer
- [ ] Parse QA JSON output into structured data
- [ ] Red flag detection and autozero logic
- [ ] Batch scoring capability (run across multiple tickets for dashboard data)

Phase 3 — Integration:
- [ ] Connect Person A's retrieval pipeline to the API endpoints
- [ ] Connect Person B's frontend to the API
- [ ] End-to-end testing: query → retrieve → display → learn → retrieve again

Phase 4 — Deployment & Presentation:
- [ ] Deploy backend (Railway/Render)
- [ ] Deploy frontend (Vercel)
- [ ] GitHub repo cleanup, README with setup instructions
- [ ] Slide deck (problem → solution → demo → architecture → metrics → impact)
- [ ] Backup: pre-recorded demo video in case of live demo issues

---

## 6. Data Notes (Know Before You Build)

**Strengths to leverage:**
- Join integrity is perfect — all foreign keys resolve
- 1,000 ground-truth questions with Answer_Type + Target_ID = measurable eval
- KB_Lineage gives complete provenance chains for 161 synthetic articles
- QA_Evaluation_Prompt is production-quality, use verbatim as LLM system prompt
- Learning_Events gives realistic approval workflow data (134 approved, 27 rejected)

**Limitations to work around:**
- Single product (PropertySuite Affordable) — don't pretend there's product diversity
- Only 3 root causes, 18 unique resolution texts — root cause "mining" is trivially solved
- Seed KB articles (3,046) have NO metadata (Tags, Module, Category, dates are all NaN)
- Transcripts are templated — tone/empathy analysis won't find much variation
- All 400 tickets are Closed — no open/pending workflow states

**Synthetic data we should create:**
- 5-8 tickets for a NEW issue category (e.g., "Report Export Failure") to demo emerging issue detection
- 2-3 transcripts with intentional QA failures (missed greeting, no resolution confirmation) to demo QA scoring contrast

---

## 7. Evaluation Criteria Mapping

| Criterion | How We Hit It |
|-----------|---------------|
| **Learning Capability** | Self-learning loop: gap detection → KB draft → review → corpus update → improved retrieval |
| **Compliance & Safety** | QA rubric with red flag detection, autozero enforcement, tracking items library |
| **Accuracy & Consistency** | hit@k eval against 1,000 ground truth questions, provenance on every answer |
| **Automation & Scalability** | RAG pipeline handles the full corpus, batch QA scoring, auto-draft generation |
| **Clarity of Demo** | 5-act demo flow: question → answer → gap → learn → smarter answer |
| **Enterprise Readiness** | Approval workflow, audit trail via KB_Lineage, role-based review (Tier 3 vs Ops) |

---

## 8. What We're NOT Building

- ❌ Speech-to-text (transcripts are already text)
- ❌ Standalone root cause mining (only 3 causes, trivially discoverable)
- ❌ Salesforce integration (mock the UI, don't build a real connector)
- ❌ Full compliance system (no actual violations in data — QA scoring covers this)
- ❌ Multi-tenant / auth (hackathon scope — single demo user)

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| RAG retrieval accuracy is low | Start with eval harness early, iterate on chunking/embedding strategy |
| LLM-generated KB articles are generic | Use rich context: full ticket + conversation + script + existing KB for contrast |
| Demo breaks live | Pre-record backup video, pre-load demo examples in the UI |
| Judges don't understand the loop | Slide deck explicitly walks through the cycle with a diagram |
| Scope creep | Everything serves the 5-minute demo. If it's not in the demo, don't build it. |