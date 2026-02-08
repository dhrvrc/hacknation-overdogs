# PERSON 3 (INTEGRATION + DEMO) — MASTER PROMPT BREAKDOWN

This document contains **5 sequential prompts** for a coding agent building the API server, live demo pipeline, and presentation for a hackathon project called **Meridian** ("OpenEvidence for Support Agents").

Hand each prompt to the agent in order. Each is self-contained. The agent has access to the dataset file `SupportMind_Final_Data.xlsx` and the project brief.

---

## CONTEXT: WHAT THE OTHER TWO PEOPLE BUILT

You are Person 3. Before you start, here is what already exists:

### Person 1 built the backend intelligence engine:

```
meridian/
├── engine/
│   ├── data_loader.py       ← Loads all 10 Excel tabs, builds a unified corpus of 4,321 Documents
│   ├── vector_store.py      ← TF-IDF retrieval engine (build_index, retrieve, add/remove docs)
│   ├── query_router.py      ← Classifies queries as SCRIPT/KB/TICKET, routes retrieval
│   ├── provenance.py        ← Resolves evidence chains (KB → Ticket → Conversation → Script)
│   ├── gap_detector.py      ← Checks if ticket resolutions are covered by existing KB
│   ├── kb_generator.py      ← LLM-powered KB article drafting with template fallback
│   └── eval_harness.py      ← Retrieval accuracy, classification accuracy, before/after learning loop
├── config.py
└── main.py                  ← Boots everything, CLI interface
```

**Key imports and function signatures you will use:**

```python
# Boot the engine (returns all modules ready to use)
from meridian.main import boot
ds, vs, prov, gap, gen, evl = boot()
# ds  = DataStore (all raw DataFrames + document corpus + lookup maps)
# vs  = VectorStore (TF-IDF index, retrieve(), add_documents(), remove_documents())
# prov = ProvenanceResolver (resolve(doc_id) → ProvenanceChain)
# gap  = GapDetector (check_ticket(), scan_all_tickets(), detect_emerging_issues(), before_after_comparison())
# gen  = KBGenerator (generate_draft(), get_pending_drafts(), approve_draft(), reject_draft())
# evl  = EvalHarness (eval_retrieval(), eval_classification(), eval_before_after(), run_all())

# Query routing (the main copilot function)
from meridian.engine.query_router import route_and_retrieve, classify_query
result = route_and_retrieve(query_text, vs, top_k=5)
# Returns:
# {
#     "query": str,
#     "predicted_type": "SCRIPT" | "KB" | "TICKET",
#     "confidence_scores": {"SCRIPT": float, "KB": float, "TICKET": float},
#     "primary_results": [RetrievalResult, ...],
#     "secondary_results": {"KB": [...], "SCRIPT": [...]}  # only the OTHER two types
# }

# RetrievalResult fields:
# .doc_id, .doc_type, .title, .body, .score, .metadata, .provenance, .rank

# Provenance resolution
chain = prov.resolve("KB-SYN-0001")
# Returns ProvenanceChain with: .kb_article_id, .kb_title, .sources (list), .learning_event (dict|None), .has_provenance (bool)
# Each source: .source_type, .source_id, .relationship, .evidence_snippet, .detail (dict)

# Gap detection
gap_result = gap.check_ticket("CS-38908386")
# Returns GapDetectionResult with: .ticket_number, .is_gap, .resolution_similarity, .best_matching_kb_id, etc.
emerging = gap.detect_emerging_issues(gap.scan_all_tickets(), min_cluster_size=3)
# Returns list of dicts: {category, module, ticket_count, ticket_numbers, avg_similarity, sample_resolution}

# KB generation
draft = gen.generate_draft("CS-38908386")
# Returns KBDraft with: .draft_id, .title, .body, .tags, .source_ticket, etc.
doc = gen.approve_draft(draft.draft_id)
# Returns a Document object ready to add to vector store
vs.add_documents([doc])  # Now it's retrievable

# Eval
results = evl.run_all()
# Returns dict with: retrieval, classification, before_after sections
```

### Person 2 built the React frontend:

```
meridian-ui/
├── src/
│   ├── App.jsx              ← 4 tabs: Copilot, Dashboard, QA Scoring, About
│   ├── views/
│   │   ├── CopilotView.jsx  ← Two-panel copilot (conversation + results)
│   │   ├── DashboardView.jsx ← Knowledge health, learning pipeline, eval metrics
│   │   └── QAScoringView.jsx ← QA rubric evaluation
│   ├── components/          ← ScriptCard, KBCard, TicketCard, ProvenanceBadge, etc.
│   ├── mock/
│   │   └── mockData.js      ← Hardcoded JSON matching the API response shapes below
│   └── lib/
│       └── api.js           ← USE_MOCK toggle — flip to false when your API is live
```

**The frontend calls your API.** When `USE_MOCK = false`, every function in `api.js` hits your FastAPI server. The response shapes are LOCKED — the frontend is already built against them. Your job is to serve exactly these shapes.

---
---

## PROMPT 1 OF 5 — THE NORTH STAR + FASTAPI SERVER

You are a senior backend engineer and integration specialist building the API server and demo pipeline for a hackathon-winning product called **Meridian** — an "OpenEvidence for Support Agents."

You are Person 3 of a 3-person team. Person 1 built the backend intelligence engine (Python modules for retrieval, classification, provenance, gap detection, KB generation, and evaluation). Person 2 built the React frontend. You are the bridge: you build the API that connects them, you build the live demo pipeline that will make judges say "wow," and you own the final presentation.

### THE PRODUCT IN ONE PARAGRAPH

A support agent gets a customer question. The engine classifies it (script needed? KB article? past ticket resolution?), retrieves the best matches from 4,321 documents, and displays them with **provenance badges** — every recommendation traces back to its source ticket, conversation, and script. When a ticket gets resolved and no existing KB article covers the resolution, the system detects the gap, generates a draft KB article, and queues it for human approval. Once approved, it enters the retrieval corpus and gets surfaced for similar future questions. The eval harness proves this with before/after metrics.

### YOUR THREE DELIVERABLES

1. **FastAPI server** (Prompts 1-2) — wraps Person 1's engine modules, serves Person 2's frontend
2. **Live demo pipeline** (Prompts 3-4) — the killer feature: synthetic "novel issue" injection that shows the system learning something it's never seen before, in real time, during the demo
3. **Presentation deck + demo script** (Prompt 5) — the 5-minute narrative that wins

### WHY THE LIVE DEMO PIPELINE MATTERS — READ THIS CAREFULLY

The before/after eval (Person 1's eval_harness) already proves the self-learning loop works on HISTORICAL data: remove 161 synthetic KB articles → retrieval degrades → re-add them → retrieval improves. That's powerful, but it's replaying history. The judges could think: "OK, you pre-loaded knowledge and showed it works. Of course it does."

The live demo pipeline proves something much stronger: **the system can learn from something it has NEVER seen before, in real time.**

Here is how it works:

1. You create 5-8 synthetic support tickets about a **completely novel problem** that does NOT exist anywhere in the current dataset. The dataset covers three issue categories: "Advance Property Date," "HAP/Voucher," and "Certifications/Compliance." Your synthetic tickets will be about a FOURTH category: **"Report Export Failure"** — users trying to export reports from PropertySuite and getting corrupted/blank/errored output.

2. During the demo, you feed these tickets into the system one by one via an API endpoint.

3. For each ticket, the gap detector runs and confirms: "No existing KB article covers this resolution" (because nothing about Report Export Failure exists in the knowledge base).

4. After 3+ tickets about the same novel issue, the emerging issue detector clusters them: **"ALERT: 5 unmatched tickets about Report Export Failure detected in the last batch. No KB coverage exists."**

5. The KB generator creates a draft article about Report Export Failure based on the ticket data.

6. A reviewer (the presenter) approves the draft live on stage.

7. The approved article enters the retrieval corpus.

8. The presenter asks a question about Report Export Failure → the copilot now retrieves the article that was JUST created.

**This is the demo moment that wins.** In 90 seconds, the judges see a system go from "I don't know about this" to "Here's an evidence-grounded answer with full provenance." No other team will show this because it requires the gap detector, KB generator, approval workflow, and vector store mutation all working together in a choreographed flow.

### WHAT YOU ARE BUILDING (5 modules, in order)

```
meridian/
├── server/
│   ├── app.py               ← PROMPT 1 (this prompt) — FastAPI server, all endpoints
│   ├── qa_scorer.py          ← PROMPT 2 — LLM-powered QA scoring using the rubric
│   ├── synthetic_tickets.py  ← PROMPT 3 — the 5-8 synthetic Report Export Failure tickets
│   ├── demo_pipeline.py      ← PROMPT 4 — live injection + emerging issue + learning loop orchestration
│   └── demo_state.py         ← PROMPT 4 — in-memory state tracking for the demo flow
├── engine/                   ← Person 1's modules (already built, DO NOT MODIFY)
├── config.py
└── main.py
```

### NOW BUILD: app.py (FastAPI Server)

Create `meridian/server/app.py` — the FastAPI server that wraps Person 1's engine and serves Person 2's frontend.

**Server setup:**
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time, logging

app = FastAPI(title="Meridian API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Boot the engine ONCE at startup
from meridian.main import boot
ds, vs, prov, gap, gen, evl = boot()
```

**Endpoints to implement (10 total):**

**1. `POST /api/query`** — the main copilot endpoint
```python
class QueryRequest(BaseModel):
    query: str
    top_k: int = 5

@app.post("/api/query")
def query_engine(req: QueryRequest):
    """
    1. Call route_and_retrieve(req.query, vs, top_k=req.top_k)
    2. Get provenance for all primary results via prov.resolve_for_results()
    3. Get provenance for all secondary results
    4. Convert RetrievalResult objects to dicts matching the exact JSON shape below
    5. Return the complete response
    """
```

**Response shape (Person 2's frontend expects EXACTLY this):**
```json
{
  "query": "advance property date backend script fails",
  "predicted_type": "SCRIPT",
  "confidence_scores": {"SCRIPT": 0.82, "KB": 0.31, "TICKET": 0.15},
  "primary_results": [
    {
      "doc_id": "SCRIPT-0293",
      "doc_type": "SCRIPT",
      "title": "Accounting / Date Advance - Advance Property Date",
      "body": "use <DATABASE>\ngo\n...",
      "score": 0.74,
      "metadata": {"purpose": "...", "inputs": "...", "module": "...", "category": "..."},
      "provenance": [],
      "rank": 1
    }
  ],
  "secondary_results": {
    "KB": [{"doc_id": "...", "doc_type": "KB", ...}],
    "TICKET": [{"doc_id": "...", "doc_type": "TICKET", ...}]
  }
}
```

**CRITICAL:** The `provenance` field on each result must be the inline provenance array (from the Document's provenance list or from prov.resolve()). For KB-SYN articles, this should have 3 items (Ticket, Conversation, Script). For seed KB articles and other doc types, this should be an empty array `[]`.

**How to convert RetrievalResult to dict:**
```python
def result_to_dict(r: RetrievalResult, provenance_chain=None) -> dict:
    prov_list = []
    if provenance_chain and provenance_chain.has_provenance:
        prov_list = [
            {
                "source_type": s.source_type,
                "source_id": s.source_id,
                "relationship": s.relationship,
                "evidence_snippet": s.evidence_snippet
            }
            for s in provenance_chain.sources
        ]
    return {
        "doc_id": r.doc_id,
        "doc_type": r.doc_type,
        "title": r.title,
        "body": r.body,
        "score": round(r.score, 4),
        "metadata": r.metadata,
        "provenance": prov_list,
        "rank": r.rank
    }
```

**2. `GET /api/provenance/{doc_id}`** — full provenance chain detail
```python
@app.get("/api/provenance/{doc_id}")
def get_provenance(doc_id: str):
    """
    Call prov.resolve(doc_id) and return the full ProvenanceChain as JSON.
    Must match this exact shape:
    {
        "kb_article_id": str,
        "kb_title": str,
        "has_provenance": bool,
        "sources": [
            {
                "source_type": "Ticket" | "Conversation" | "Script",
                "source_id": str,
                "relationship": "CREATED_FROM" | "REFERENCES",
                "evidence_snippet": str,
                "detail": { ... type-specific fields ... }
            }
        ],
        "learning_event": { ... } | null
    }
    """
```

**3. `GET /api/dashboard/stats`** — aggregated dashboard data
```python
@app.get("/api/dashboard/stats")
def get_dashboard():
    """
    Aggregate stats from the DataStore and (optionally) cached eval results.
    This endpoint assembles data from multiple sources:
    
    - knowledge_health: count articles by source type, scripts, etc. from ds
    - learning_pipeline: count learning events by status from ds.learning_events DataFrame
    - tickets: count by tier, priority, module from ds.tickets DataFrame
    - emerging_issues: from gap.detect_emerging_issues(gap.scan_all_tickets())
    - eval_results: from evl.run_all() — CACHE THIS, it takes 1-5 minutes
    
    For the eval_results: run evl.run_all() ONCE at startup (or on first request)
    and cache the result. Don't re-run on every dashboard load.
    """
```

**Response shape:**
```json
{
  "knowledge_health": {
    "total_articles": 3207,
    "seed_articles": 3046,
    "learned_articles": 161,
    "articles_with_metadata": 199,
    "articles_without_metadata": 3008,
    "avg_body_length": 2051,
    "scripts_total": 714
  },
  "learning_pipeline": {
    "total_events": 161,
    "approved": 134,
    "rejected": 27,
    "pending": 0,
    "pending_drafts": []
  },
  "tickets": {
    "total": 400,
    "by_tier": {"1": 121, "2": 118, "3": 161},
    "by_priority": {"Critical": 50, "High": 137, "Medium": 146, "Low": 67},
    "by_module": {}
  },
  "emerging_issues": [],
  "eval_results": {}
}
```

NOTE: For `eval_results`, the shape must match what `evl.run_all()` returns. If the eval hasn't been run yet (takes minutes), return `"eval_results": null` and let the frontend show a "Run Eval" button or loading state.

**4. `GET /api/conversations/{ticket_number}`** — conversation transcript
```python
@app.get("/api/conversations/{ticket_number}")
def get_conversation(ticket_number: str):
    """
    Look up the conversation for a given ticket from ds.conversations DataFrame.
    Join on Ticket_Number.
    
    Return:
    {
        "ticket_number": str,
        "conversation_id": str,
        "channel": str,
        "agent_name": str,
        "sentiment": str,
        "issue_summary": str,
        "transcript": str  (the full Transcript_Text)
    }
    """
```

**5. `POST /api/qa/score`** — QA scoring (LLM-powered, implemented in Prompt 2)
```python
class QAScoreRequest(BaseModel):
    ticket_number: str

@app.post("/api/qa/score")
def score_qa(req: QAScoreRequest):
    """Placeholder — will be implemented in Prompt 2."""
    raise HTTPException(501, "QA scoring not yet implemented")
```

**6. `GET /api/kb/drafts`** — list pending KB drafts
```python
@app.get("/api/kb/drafts")
def get_drafts():
    """Return gen.get_pending_drafts() as list of dicts."""
```

**7. `POST /api/kb/approve/{draft_id}`** — approve a KB draft
```python
@app.post("/api/kb/approve/{draft_id}")
def approve_draft(draft_id: str):
    """
    1. Call gen.approve_draft(draft_id) → returns a Document
    2. Call vs.add_documents([doc]) to add it to the retrieval index
    3. Return {"status": "approved", "doc_id": doc.doc_id}
    """
```

**8. `POST /api/kb/reject/{draft_id}`** — reject a KB draft
```python
@app.post("/api/kb/reject/{draft_id}")
def reject_draft(draft_id: str):
    """
    1. Call gen.reject_draft(draft_id)
    2. Return {"status": "rejected"}
    """
```

**9. `POST /api/eval/run`** — trigger full evaluation (long-running)
```python
@app.post("/api/eval/run")
def run_eval():
    """
    Run evl.run_all() and cache the result.
    This takes 1-5 minutes. Consider running in background.
    Return the full eval results dict.
    """
```

**10. `GET /api/gap/emerging`** — emerging issues
```python
@app.get("/api/gap/emerging")
def get_emerging_issues():
    """
    Run gap.detect_emerging_issues(gap.scan_all_tickets())
    Cache the result (expensive: scans 400 tickets).
    Return the list of emerging issue clusters.
    """
```

**Startup script (`run_server.py` at project root):**
```python
"""
Usage: python run_server.py
Starts Meridian API on port 8000.
"""
import uvicorn
if __name__ == "__main__":
    uvicorn.run("meridian.server.app:app", host="0.0.0.0", port=8000, reload=True)
```

**Acceptance criteria:**
- `python run_server.py` starts the server without errors
- `POST /api/query` with `{"query": "advance property date"}` returns results with correct shape
- `GET /api/provenance/KB-SYN-0001` returns a chain with 3 sources and a learning event
- `GET /api/dashboard/stats` returns knowledge_health with total_articles == 3207
- `GET /api/conversations/CS-38908386` returns a transcript
- `POST /api/kb/approve/{id}` and `POST /api/kb/reject/{id}` work (test with gen.generate_draft() first)
- All responses match the exact JSON shapes specified above
- CORS is enabled (the React frontend at localhost:5173 can call the API at localhost:8000)

**Dependencies:** fastapi, uvicorn, pydantic. Plus all of Person 1's dependencies (pandas, openpyxl, sklearn, numpy). Install: `pip install fastapi uvicorn pydantic --break-system-packages`

---
---

## PROMPT 2 OF 5 — QA SCORER (LLM-Powered Rubric Evaluation)

You are building the QA scoring module that evaluates support interactions using a production-grade rubric. This is the backend for Person 2's QA Scoring view.

### How QA scoring works

The dataset includes a `QA_Evaluation_Prompt` tab containing a detailed rubric for evaluating support agents. The rubric scores two aspects:

1. **Interaction QA** (how the agent handled the call/chat) — 10 parameters, each worth 10%
2. **Case QA** (how the agent documented the ticket) — 10 parameters, each worth 10%

Combined score: 70% Interaction + 30% Case (if both transcript and ticket exist).

There are also **Red Flags** (autozero triggers) and **Tracking Items** (specific coaching notes for failed parameters).

### The approach

Send the transcript + ticket data to Claude with the full rubric as the system prompt. Ask it to evaluate each parameter and return structured JSON. This is a single LLM call per scored case.

### Implementation: `meridian/server/qa_scorer.py`

```python
import json, os, logging
from datetime import datetime

logger = logging.getLogger(__name__)

# The full QA rubric (from the QA_Evaluation_Prompt tab in the dataset)
QA_SYSTEM_PROMPT = """You are a Quality Assurance evaluator for a support organization. 
You will be given a support interaction transcript and/or a case ticket. 
Score the interaction using the rubric below. Return ONLY valid JSON matching the exact schema provided.

## INTERACTION QA (10 parameters, each 10% of Interaction score)

### Customer Delight (50%)
1. **Conversational_Professional**: Did the agent greet professionally, use customer name, and close appropriately?
2. **Engagement_Personalization**: Did the agent acknowledge the customer's concern, show empathy, and personalize the interaction?
3. **Tone_Pace**: Was the tone appropriate, pace comfortable, and communication clear?
4. **Language**: Did the agent avoid jargon, explain technical terms, and communicate in plain language?
5. **Objection_Handling_Conversation_Control**: Did the agent manage objections, set expectations, and control the conversation flow?

### Resolution Handling (50%)
6. **Delivered_Expected_Outcome**: Was the customer's issue resolved? (AUTOZERO if No — entire Interaction score becomes 0%)
7. **Exhibit_Critical_Thinking**: Did the agent diagnose logically, ask clarifying questions, and verify before acting?
8. **Educate_Accurately_Handle_Information**: Did the agent provide accurate information and educate the customer on prevention?
9. **Effective_Use_of_Resources**: Did the agent use KB articles, scripts, and available tools appropriately?
10. **Call_Case_Control_Timeliness**: Did the agent manage time well, avoid unnecessary delays, and maintain ownership?

## CASE QA (10 parameters, each 10% of Case score)

### Documentation Quality (50%)
11. **Clear_Problem_Summary**: Is the problem description clear and specific?
12. **Captured_Key_Context**: Are module, error text, steps to reproduce, and timeline documented?
13. **Action_Log_Completeness**: Are all troubleshooting steps documented?
14. **Correct_Categorization**: Is the ticket categorized correctly (category, module, priority, tier)?
15. **Customer_Facing_Clarity**: Could another agent pick up this ticket and understand it?

### Resolution Quality (50%)
16. **Resolution_Specific_Reproducible**: Is the resolution specific enough to reproduce?
17. **Uses_Approved_Process_Scripts_When_Required**: Were approved scripts/processes used when applicable?
18. **Accuracy_of_Technical_Content**: Is the technical content accurate?
19. **References_Knowledge_Correctly**: Are KB articles and scripts referenced where used?
20. **Timeliness_Ownership_Signals**: Are there signs of timely follow-up and ownership?

## RED FLAGS (any "Yes" → Overall score becomes 0%)
- Account_Documentation_Violation: Was account data handled improperly?
- Payment_Compliance_PCI_Violation: Was PCI data exposed in notes or transcript?
- Data_Integrity_Confidentiality_Violation: Was confidential data shared inappropriately?
- Misbehavior_Unprofessionalism: Was there discriminatory, harassing, or unprofessional behavior?

## SCORING RULES
- Each parameter: "Yes" (pass, 10 points), "No" (fail, 0 points), or "N/A" (not applicable, excluded from calculation)
- If Delivered_Expected_Outcome = "No": Interaction_QA Final_Weighted_Score = "0%"
- If any Red Flag = "Yes": Overall_Weighted_Score = "0%"
- Evaluation_Mode: "Both" if transcript AND ticket provided, "Interaction Only" if only transcript, "Case Only" if only ticket
- Overall = 70% Interaction + 30% Case (if Both), 100% of whichever is available otherwise
- For each "No" score, provide 1-2 tracking_items (brief labels) and evidence (quote from transcript/ticket)

## RESPONSE FORMAT
Return ONLY this JSON (no markdown, no explanation):
{
  "Evaluation_Mode": "Both" | "Interaction Only" | "Case Only",
  "Interaction_QA": {
    "Conversational_Professional": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Engagement_Personalization": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Tone_Pace": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Language": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Objection_Handling_Conversation_Control": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Delivered_Expected_Outcome": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Exhibit_Critical_Thinking": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Educate_Accurately_Handle_Information": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Effective_Use_of_Resources": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Call_Case_Control_Timeliness": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Final_Weighted_Score": "X%"
  },
  "Case_QA": {
    "Clear_Problem_Summary": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Captured_Key_Context": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Action_Log_Completeness": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Correct_Categorization": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Customer_Facing_Clarity": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Resolution_Specific_Reproducible": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Uses_Approved_Process_Scripts_When_Required": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Accuracy_of_Technical_Content": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "References_Knowledge_Correctly": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Timeliness_Ownership_Signals": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Final_Weighted_Score": "X%"
  },
  "Red_Flags": {
    "Account_Documentation_Violation": {"score": "N/A"|"Yes"|"No", "tracking_items": [], "evidence": ""},
    "Payment_Compliance_PCI_Violation": {"score": "N/A"|"Yes"|"No", "tracking_items": [], "evidence": ""},
    "Data_Integrity_Confidentiality_Violation": {"score": "N/A"|"Yes"|"No", "tracking_items": [], "evidence": ""},
    "Misbehavior_Unprofessionalism": {"score": "N/A"|"Yes"|"No", "tracking_items": [], "evidence": ""}
  },
  "Contact_Summary": "Brief summary of the interaction",
  "Case_Summary": "Brief summary of the ticket",
  "QA_Recommendation": "Keep doing" | "Coaching needed" | "Escalate" | "Compliance review",
  "Overall_Weighted_Score": "X%"
}
"""


class QAScorer:
    def __init__(self, datastore, api_key: str = ""):
        self.datastore = datastore
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
    
    def score_ticket(self, ticket_number: str) -> dict:
        """
        Score a support interaction by ticket number.
        
        1. Look up the ticket from datastore.ticket_by_number
        2. Look up the conversation from datastore.conversations (join on Ticket_Number)
        3. Build the user prompt with transcript + ticket data
        4. If API key available: call Claude with QA_SYSTEM_PROMPT
        5. If no API key: return a template-based score (all "Yes" with generic summaries)
        6. Parse the JSON response
        7. Validate: apply autozero rules (Delivered_Expected_Outcome, Red Flags)
        8. Return the score dict
        """
    
    def _build_user_prompt(self, ticket: dict, conversation: dict = None) -> str:
        """
        Build the user prompt for the LLM.
        
        Include:
        - Ticket: number, subject, description, resolution, category, module,
          tier, priority, root_cause, script_id (if any)
        - Conversation transcript (truncated to 4000 chars if needed)
        - Instruct: "Evaluate this interaction and return the JSON score."
        """
    
    def _call_llm(self, user_prompt: str) -> dict:
        """
        Call Claude API with the QA system prompt and user prompt.
        Parse the response as JSON. Handle errors gracefully.
        
        Use model: claude-sonnet-4-20250514
        Max tokens: 2000
        Temperature: 0 (deterministic scoring)
        """
    
    def _template_score(self, ticket: dict, conversation: dict = None) -> dict:
        """
        Fallback scoring without LLM.
        Returns a plausible score dict with:
        - All parameters scored "Yes" (conservative: no coaching items flagged)
        - Summaries built from ticket subject/description/resolution
        - Overall_Weighted_Score: "85%"
        - Evaluation_Mode based on whether conversation exists
        """
```

**Wire it into the server (update app.py):**
```python
from meridian.server.qa_scorer import QAScorer
qa = QAScorer(ds)

@app.post("/api/qa/score")
def score_qa(req: QAScoreRequest):
    try:
        result = qa.score_ticket(req.ticket_number)
        return result
    except KeyError:
        raise HTTPException(404, f"Ticket {req.ticket_number} not found")
    except Exception as e:
        raise HTTPException(500, f"QA scoring failed: {str(e)}")
```

**Acceptance criteria:**
- `POST /api/qa/score` with `{"ticket_number": "CS-38908386"}` returns a valid QA score JSON
- The response has all 20 parameters + 4 red flags + summaries + overall score
- If no API key: template fallback returns a valid score (all "Yes", 85%)
- If API key present: LLM returns differentiated scores (some "Yes", some "No" with tracking items)
- Autozero rules are enforced: if Delivered_Expected_Outcome is "No", Interaction score is "0%"
- The JSON structure matches exactly what Person 2's QAScoreReport component expects

**Dependencies:** anthropic SDK (`pip install anthropic --break-system-packages`). Handle ImportError — if not installed, always use template fallback.

---
---

## PROMPT 3 OF 5 — SYNTHETIC TICKETS (The Novel Issue That Doesn't Exist Yet)

This is where you create the ammunition for the most important demo moment. You are creating 6 realistic support tickets about a problem that **does not exist anywhere in the current dataset.**

### Why this matters — the full reasoning

The Meridian system has two proof points:

**Proof Point 1 (Historical):** The before/after eval shows that 161 KB articles created from historical tickets improved retrieval accuracy. Person 1's eval harness produces this metric. This is strong but retrospective — it proves the system learned from the PAST.

**Proof Point 2 (Live — THIS IS WHAT YOU'RE BUILDING):** During the demo, a completely new type of problem appears. The system has never seen anything like it. The gap detector flags it. The emerging issue detector clusters multiple instances. A KB article is drafted and approved. The copilot starts answering questions about it. This proves the system can learn from the PRESENT — it adapts to novel situations in real time.

Proof Point 2 is what separates "we built a RAG chatbot" (every team will have this) from "we built a self-learning system" (almost no team will demonstrate this convincingly).

### The novel issue: Report Export Failure

The current dataset has three main issue types:
- **Advance Property Date** — backend date sync failures (Accounting / Date Advance module)
- **HAP/Voucher Processing** — voucher calculation errors (Affordable / HAP module)
- **Certifications/Compliance** — compliance workflow blocks (Compliance / Certifications module)

Your synthetic issue is: **Report Export Failure** — users trying to generate or export reports (Rent Rolls, HAP Billing Summaries, Compliance Audit Reports) from the Reporting / Exports module, and getting corrupted files, blank PDFs, timeout errors, or mismatched data.

This is realistic because:
- Real property management software has extensive reporting needs
- Export issues are a common support category in any enterprise software
- It naturally maps to the existing product (PropertySuite Affordable)
- It could involve backend data issues (Tier 3) or configuration issues (Tier 1/2)

### Implementation: `meridian/server/synthetic_tickets.py`

Create exactly 6 synthetic tickets. They must follow the EXACT schema of the real Tickets DataFrame (same column names, same value patterns) and have matching conversations.

**The 6 tickets (pre-written — do not generate these with an LLM):**

```python
SYNTHETIC_TICKETS = [
    {
        "Ticket_Number": "CS-DEMO-001",
        "Conversation_ID": "CONV-DEMO-001",
        "Subject": "Report export produces blank PDF (Rent Roll Monthly)",
        "Description": "Tenant at Heritage Point site reports that exporting the Monthly Rent Roll report produces a blank PDF. The report preview in the UI shows data correctly, but the exported file is 0 bytes. This started after the latest property date advance. Multiple users at the site are affected.",
        "Resolution": "Investigated the export pipeline. Found that the report rendering service was referencing a stale property date cache after the most recent date advance. Cleared the report cache via the admin console (Settings → Reporting → Clear Cache) and re-triggered the export. PDF generated correctly with all tenant data. Advised customer to clear cache after each date advance until the next patch.",
        "Tier": 2,
        "Priority": "High",
        "Status": "Closed",
        "Category": "Report Export Failure",
        "Module": "Reporting / Exports",
        "Product": "PropertySuite Affordable",
        "Root_Cause": "Stale cache after property date advance",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    },
    {
        "Ticket_Number": "CS-DEMO-002",
        "Conversation_ID": "CONV-DEMO-002",
        "Subject": "HAP Billing Summary export shows incorrect voucher amounts",
        "Description": "Property manager at Meadow Pointe reports that the HAP Billing Summary export contains voucher amounts that don't match the values shown in the Affordable / HAP module. The discrepancy appears in the Total Adjusted Payment column. The exported CSV shows the old amounts from before a recent batch correction.",
        "Resolution": "Confirmed that the report was pulling from a materialized view that hadn't been refreshed after the HAP batch correction. Ran the backend refresh procedure for the reporting materialized views (this is a known gap — the batch correction process doesn't automatically trigger a view refresh). After refresh, the exported CSV matched the corrected voucher amounts. Flagged for engineering to add automatic view refresh to the batch correction workflow.",
        "Tier": 3,
        "Priority": "Critical",
        "Status": "Closed",
        "Category": "Report Export Failure",
        "Module": "Reporting / Exports",
        "Product": "PropertySuite Affordable",
        "Root_Cause": "Materialized view not refreshed after batch correction",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    },
    {
        "Ticket_Number": "CS-DEMO-003",
        "Conversation_ID": "CONV-DEMO-003",
        "Subject": "Compliance Audit Report export times out for large portfolios",
        "Description": "User at Oakwood Properties attempts to export the annual Compliance Audit Report for their full portfolio (12 properties, ~2,400 units). The export process runs for 10+ minutes and then times out with error 'Report generation exceeded maximum allowed time.' Smaller single-property exports work fine.",
        "Resolution": "The export timeout is set to 600 seconds by default, which is insufficient for large multi-property compliance reports. Adjusted the timeout setting for this site via the admin panel (Settings → Reporting → Export Timeout → 1800s). Also recommended the customer export by property group instead of full portfolio as a workaround. Escalated to engineering to optimize the compliance report query for large datasets.",
        "Tier": 2,
        "Priority": "Medium",
        "Status": "Closed",
        "Category": "Report Export Failure",
        "Module": "Reporting / Exports",
        "Product": "PropertySuite Affordable",
        "Root_Cause": "Export timeout too low for large datasets",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    },
    {
        "Ticket_Number": "CS-DEMO-004",
        "Conversation_ID": "CONV-DEMO-004",
        "Subject": "Exported Rent Roll CSV has garbled characters in tenant names",
        "Description": "Site admin at Pine Valley Apartments reports that exported Rent Roll CSVs display garbled characters (mojibake) in tenant names containing accents or special characters (e.g., 'García' shows as 'GarcÃ­a'). This only happens in the CSV export — the PDF export and UI display show names correctly.",
        "Resolution": "The CSV export was using Windows-1252 encoding instead of UTF-8. This is a known encoding issue in the reporting module's CSV writer. Workaround: instructed the customer to open the CSV in Excel using Data → From Text/CSV → select UTF-8 encoding. Permanent fix: updated the site-level export configuration to force UTF-8 encoding with BOM (Settings → Reporting → CSV Encoding → UTF-8 with BOM). Verified the exported file now displays all characters correctly.",
        "Tier": 1,
        "Priority": "Medium",
        "Status": "Closed",
        "Category": "Report Export Failure",
        "Module": "Reporting / Exports",
        "Product": "PropertySuite Affordable",
        "Root_Cause": "CSV encoding set to Windows-1252 instead of UTF-8",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    },
    {
        "Ticket_Number": "CS-DEMO-005",
        "Conversation_ID": "CONV-DEMO-005",
        "Subject": "Scheduled report delivery stopped working after email server migration",
        "Description": "Property manager at Riverside Commons reports that their scheduled weekly Rent Roll and Monthly HAP Summary reports stopped being delivered via email 2 weeks ago. The reports still generate correctly when manually exported. The issue started around the time their organization migrated to a new email server. No error messages are shown in the UI.",
        "Resolution": "Checked the scheduled report delivery logs in the admin console. Found SMTP connection failures starting on the date of the email migration. The old SMTP server credentials were still configured in PropertySuite. Updated the SMTP settings (Settings → Notifications → Email Server) with the new server address, port, and credentials. Sent a test report — delivered successfully. Re-enabled the weekly schedule. All 3 pending reports from the last 2 weeks were manually triggered and delivered.",
        "Tier": 1,
        "Priority": "High",
        "Status": "Closed",
        "Category": "Report Export Failure",
        "Module": "Reporting / Exports",
        "Product": "PropertySuite Affordable",
        "Root_Cause": "SMTP credentials not updated after email server migration",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    },
    {
        "Ticket_Number": "CS-DEMO-006",
        "Conversation_ID": "CONV-DEMO-006",
        "Subject": "Report Export Failure — backend data sync causing duplicate rows in Move-Out Summary",
        "Description": "Accounting team at Birchwood Manor reports that the Move-Out Summary report contains duplicate rows for tenants who moved out in the last 30 days. Each move-out appears 2-3 times with identical data. This is causing incorrect totals in their accounting reconciliation. The duplication is visible in both PDF and CSV exports.",
        "Resolution": "Investigated the Move-Out Summary report query. Found that a recent backend data sync created duplicate entries in the move-out events table due to a race condition during the sync process. Ran a deduplication script on the move-out events table for the affected site (identified 47 duplicate records across 19 tenants). After cleanup, the report generated correctly with unique rows. Escalated to Tier 3 to investigate the sync race condition for a permanent fix.",
        "Tier": 3,
        "Priority": "Critical",
        "Status": "Closed",
        "Category": "Report Export Failure",
        "Module": "Reporting / Exports",
        "Product": "PropertySuite Affordable",
        "Root_Cause": "Duplicate entries from backend data sync race condition",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    }
]
```

**Matching synthetic conversations:**

For each ticket, create a matching conversation transcript. These should follow the same format as the real transcripts in the dataset (agent name, customer name, back-and-forth dialogue).

```python
SYNTHETIC_CONVERSATIONS = [
    {
        "Conversation_ID": "CONV-DEMO-001",
        "Ticket_Number": "CS-DEMO-001",
        "Channel": "Chat",
        "Agent_Name": "Jordan",
        "Customer_Sentiment": "Frustrated",
        "Issue_Summary": "Monthly Rent Roll export produces blank PDF after property date advance.",
        "Transcript_Text": """Jordan (ExampleCo): Thanks for contacting ExampleCo Support! I'm Jordan. How can I help you today?
Sarah Chen: Hi Jordan — this is Sarah Chen from Heritage Point management. We're having a serious issue with our monthly Rent Roll report. When we try to export it as a PDF, we get a blank file. Zero bytes.
Jordan (ExampleCo): I'm sorry to hear that, Sarah. Let me look into this right away. Can you confirm — does the report preview show data correctly in the UI before you export?
Sarah Chen: Yes, the preview looks fine. All tenant data is there. It's only when we click Export to PDF that we get a blank file. And it's not just me — two other property managers at our site have the same issue.
Jordan (ExampleCo): Got it — so the data is rendering correctly in-app but the export pipeline is failing. When did this start happening? Did anything change recently?
Sarah Chen: It started Monday. We did our monthly property date advance on Friday.
Jordan (ExampleCo): That's a helpful clue. Let me check the report cache status for your site. I suspect the date advance may have left a stale cache that the export process is reading from. One moment...
Jordan (ExampleCo): Confirmed — the report cache for Heritage Point hasn't refreshed since before your date advance. I'm going to clear it now via the admin console and we'll re-try the export.
Sarah Chen: OK, fingers crossed.
Jordan (ExampleCo): Cache cleared. Can you try the export again now?
Sarah Chen: Let me try... It's generating... Yes! The PDF has all the data now. Thank you!
Jordan (ExampleCo): Great news! So the issue was a stale report cache after your date advance. For now, I'd recommend clearing the cache after each date advance — you can ask us to do it or I can show you where the setting is. We're also flagging this for a patch so it refreshes automatically.
Sarah Chen: That would be great — please show me where the setting is so we don't have to call every month.
Jordan (ExampleCo): Sure — go to Settings → Reporting → Clear Cache. You'll see a button there. Just click it after each date advance and you should be good.
Sarah Chen: Perfect, thank you Jordan. This was really helpful.
Jordan (ExampleCo): Happy to help, Sarah! I'll document this in your ticket. If it happens again or you have any other issues, don't hesitate to reach out. Have a great day!"""
    },
    {
        "Conversation_ID": "CONV-DEMO-002",
        "Ticket_Number": "CS-DEMO-002",
        "Channel": "Phone",
        "Agent_Name": "Alex",
        "Customer_Sentiment": "Frustrated",
        "Issue_Summary": "HAP Billing Summary export shows stale voucher amounts after batch correction.",
        "Transcript_Text": """Alex (ExampleCo): Thank you for calling ExampleCo Support, this is Alex. How can I assist you today?
David Martinez: Hi Alex, this is David Martinez, property manager at Meadow Pointe. I've got a critical issue with our HAP Billing Summary. The exported report is showing the wrong voucher amounts.
Alex (ExampleCo): I understand that's concerning, David. Can you tell me more — what specifically is wrong with the amounts?
David Martinez: We did a batch correction last week to fix some voucher calculations. The HAP module shows the corrected amounts, but when I export the Billing Summary, it still shows the old numbers. The Total Adjusted Payment column is completely wrong.
Alex (ExampleCo): So the HAP module itself shows the correct amounts, but the export doesn't reflect the batch correction. That tells me the reporting layer might be pulling from a cached data source. Let me investigate.
David Martinez: Please hurry — we need to submit this to HUD by end of week.
Alex (ExampleCo): Understood, I'm on it now. I'm checking the materialized views that the reporting module uses... David, I found the issue. The reporting materialized view hasn't been refreshed since before your batch correction. The batch correction process doesn't automatically trigger a view refresh — this is a known gap.
David Martinez: So the report is looking at old data?
Alex (ExampleCo): Exactly. I'm going to run the backend refresh procedure now. This should take a couple of minutes. I'll need to escalate this to Tier 3 for the actual refresh command but I can stay on the line.
David Martinez: OK, please do whatever you need to do.
Alex (ExampleCo): The refresh is complete. Can you try exporting the HAP Billing Summary again?
David Martinez: Running it now... The amounts match now. The Total Adjusted Payment column has the corrected figures. Thank you.
Alex (ExampleCo): I'm glad that's resolved. I'm going to flag this for engineering so they add automatic view refreshes to the batch correction workflow. In the meantime, if you do another batch correction, let us know and we'll trigger the refresh. Is there anything else I can help with?
David Martinez: No, that's all. Thanks for the quick turnaround, Alex.
Alex (ExampleCo): Of course, David. Good luck with the HUD submission. Have a great day!"""
    },
    {
        "Conversation_ID": "CONV-DEMO-003",
        "Ticket_Number": "CS-DEMO-003",
        "Channel": "Chat",
        "Agent_Name": "Morgan",
        "Customer_Sentiment": "Neutral",
        "Issue_Summary": "Compliance Audit Report export times out for large multi-property portfolio.",
        "Transcript_Text": """Morgan (ExampleCo): Hi there! Welcome to ExampleCo Support. I'm Morgan. What can I help you with today?
Lisa Park: Hi Morgan — Lisa Park from Oakwood Properties. I'm trying to export our annual Compliance Audit Report but it keeps timing out.
Morgan (ExampleCo): I'm sorry about that, Lisa. Can you give me more details? How large is the report you're trying to generate?
Lisa Park: It's our full portfolio — 12 properties, about 2,400 units total. The export runs for about 10 minutes and then I get an error that says "Report generation exceeded maximum allowed time."
Morgan (ExampleCo): I see. And do smaller exports work — like a single property?
Lisa Park: Yes, single property exports work fine. It's only when I try to do all 12 at once.
Morgan (ExampleCo): That makes sense. The export timeout is set to 600 seconds by default, which is likely not enough for a portfolio that size. Let me adjust the timeout for your site and we'll try again.
Lisa Park: Is there a permanent fix?
Morgan (ExampleCo): I'm going to increase your timeout to 1800 seconds — that should be plenty. I'm also going to recommend that engineering optimizes the compliance report query for large datasets. In the meantime, you could also export by property group if you need results faster.
Lisa Park: OK, let me try with the longer timeout... It's running... still going... The report generated! Took about 14 minutes but it completed.
Morgan (ExampleCo): Excellent! That confirms the timeout was the issue. With the new setting, it should work consistently going forward. I'll document this and escalate the optimization request to engineering.
Lisa Park: Thank you Morgan, appreciate the help.
Morgan (ExampleCo): You're welcome, Lisa! Don't hesitate to reach out if you need anything else."""
    },
    {
        "Conversation_ID": "CONV-DEMO-004",
        "Ticket_Number": "CS-DEMO-004",
        "Channel": "Chat",
        "Agent_Name": "Taylor",
        "Customer_Sentiment": "Neutral",
        "Issue_Summary": "CSV export has garbled characters (mojibake) in tenant names with accents.",
        "Transcript_Text": """Taylor (ExampleCo): Hello! I'm Taylor from ExampleCo Support. How can I help?
Roberto Diaz: Hi Taylor — Roberto Diaz at Pine Valley Apartments. Our Rent Roll CSV exports have garbled text. Tenant names with accents are messed up — like García shows as GarcÃ­a.
Taylor (ExampleCo): That sounds like a character encoding issue. Let me ask — does this happen in the PDF export too, or just CSV?
Roberto Diaz: Just CSV. The PDF and the screen display look fine.
Taylor (ExampleCo): That helps narrow it down. The CSV writer is probably using the wrong encoding. I'll check your site's export configuration. One moment...
Taylor (ExampleCo): Found it — your site's CSV export is set to Windows-1252 encoding instead of UTF-8. That's what's causing the garbled characters for names with accents and special characters.
Roberto Diaz: Can you fix it?
Taylor (ExampleCo): Yes — I'm updating the setting now. Settings → Reporting → CSV Encoding → UTF-8 with BOM. The BOM (byte order mark) helps Excel recognize the encoding automatically. Done. Can you try an export now?
Roberto Diaz: Let me try... Exporting... Opened in Excel... García looks correct now! All the names look good.
Taylor (ExampleCo): Perfect! The fix is permanent for your site. All future CSV exports will use UTF-8. Is there anything else I can help with?
Roberto Diaz: No, that's everything. Thanks Taylor!
Taylor (ExampleCo): You're welcome, Roberto! Have a great day."""
    },
    {
        "Conversation_ID": "CONV-DEMO-005",
        "Ticket_Number": "CS-DEMO-005",
        "Channel": "Phone",
        "Agent_Name": "Jordan",
        "Customer_Sentiment": "Relieved",
        "Issue_Summary": "Scheduled report delivery via email stopped after organization's email server migration.",
        "Transcript_Text": """Jordan (ExampleCo): ExampleCo Support, this is Jordan. How can I help?
Amanda Foster: Hi Jordan, Amanda Foster from Riverside Commons. Our scheduled reports stopped coming through about two weeks ago. We used to get the weekly Rent Roll and monthly HAP Summary automatically by email but they just stopped.
Jordan (ExampleCo): Hi Amanda. Sorry about the disruption. Let me check a few things — can you manually export those reports from the UI?
Amanda Foster: Yes, manual exports still work. It's just the automatic scheduled delivery that stopped.
Jordan (ExampleCo): OK, so the reports themselves generate fine — it's the email delivery that's broken. Did anything change with your email setup recently?
Amanda Foster: Actually, yes — our organization migrated to a new email server about two weeks ago. Could that be related?
Jordan (ExampleCo): That's almost certainly the cause. PropertySuite stores the SMTP server credentials for email delivery, and if your organization changed servers, those credentials would be pointing to the old server. Let me check the delivery logs... Yes, I can see SMTP connection failures starting exactly on your migration date.
Amanda Foster: Oh, that makes sense. Can you update the settings?
Jordan (ExampleCo): Absolutely. I'll need the new SMTP server address, port, and credentials. Do you have those or should I coordinate with your IT team?
Amanda Foster: I have them here — let me give them to you.
Jordan (ExampleCo): Got it, updating now... Settings → Notifications → Email Server... credentials saved. Let me send a test report... Amanda, can you check your inbox?
Amanda Foster: Just got it! The test report came through.
Jordan (ExampleCo): I'm going to re-enable your weekly schedule and also manually trigger the 3 pending reports from the last 2 weeks so you're caught up. You should see those in the next few minutes.
Amanda Foster: That's amazing — thank you so much, Jordan. I was worried we'd lost those reports.
Jordan (ExampleCo): All set! The schedule is active again and the backlog is on its way. If anything else comes up, let us know."""
    },
    {
        "Conversation_ID": "CONV-DEMO-006",
        "Ticket_Number": "CS-DEMO-006",
        "Channel": "Phone",
        "Agent_Name": "Alex",
        "Customer_Sentiment": "Frustrated",
        "Issue_Summary": "Move-Out Summary report has duplicate rows caused by backend data sync race condition.",
        "Transcript_Text": """Alex (ExampleCo): ExampleCo Support, this is Alex. How may I help you?
James Wilson: Alex, this is James Wilson from Birchwood Manor. We've got a big problem with our Move-Out Summary report. It's showing duplicate entries for every tenant who moved out in the last month.
Alex (ExampleCo): That's definitely not right. Can you tell me more about the duplicates — are they exact copies or slightly different?
James Wilson: Exact copies. Each move-out shows up 2 or 3 times with the same data. It's throwing off our accounting reconciliation because the totals are inflated.
Alex (ExampleCo): Understood — that's impacting your financial reporting. Let me investigate immediately. Is this happening in both PDF and CSV exports?
James Wilson: Yes, both. And I can see the duplicates in the report preview too, so it's not just an export issue.
Alex (ExampleCo): Good observation — that means the underlying data has duplicates, not just the export. Let me check the move-out events table for your site... James, I found the issue. There are duplicate entries in the move-out events table. It looks like a recent backend data sync created duplicate records — there's a known race condition that can cause this during the sync process.
James Wilson: Can you fix the data?
Alex (ExampleCo): I can clean up the duplicates. I'm identifying all duplicate records for your site now... I found 47 duplicate records across 19 tenants. I'm going to run a deduplication cleanup. This will need Tier 3 approval for the backend modification. Let me escalate this now.
James Wilson: Please. We need this fixed for our month-end close.
Alex (ExampleCo): I understand the urgency. The cleanup is done — the deduplication script removed the 47 duplicate records. Can you pull the Move-Out Summary again?
James Wilson: Running it... The duplicates are gone. Each tenant shows only once. The totals look correct now.
Alex (ExampleCo): I'm also escalating the root cause — the sync race condition — to Tier 3 for a permanent fix so this doesn't happen again. I'll make sure your ticket is tracked against that engineering work. Is there anything else?
James Wilson: No, that's it. Thank you, Alex — this was critical.
Alex (ExampleCo): Of course, James. Good luck with month-end. We'll keep you posted on the permanent fix."""
    }
]
```

**Also create 3 questions that a support agent might ask about Report Export Failure (for the demo query moment):**

```python
DEMO_QUESTIONS = [
    {
        "question": "A customer is getting blank PDFs when exporting their Rent Roll report. The preview shows data fine but the export is empty. What should I check?",
        "expected_answer_type": "KB",
        "description": "Should match the new KB article about Report Export Failure after it's been created and approved."
    },
    {
        "question": "We have a site where the HAP Billing Summary export shows old voucher amounts that don't match what's in the system after a batch correction. How do we fix this?",
        "expected_answer_type": "KB",
        "description": "Should match the materialized view refresh resolution."
    },
    {
        "question": "Multiple users across different sites are reporting issues with report exports — blank files, wrong data, timeouts. Is this a known issue?",
        "expected_answer_type": "KB",
        "description": "Should match the general Report Export Failure KB article."
    }
]
```

**Utility functions:**

```python
def get_synthetic_tickets() -> list:
    """Return the list of synthetic ticket dicts."""
    return SYNTHETIC_TICKETS

def get_synthetic_conversations() -> list:
    """Return the list of synthetic conversation dicts."""
    return SYNTHETIC_CONVERSATIONS

def get_demo_questions() -> list:
    """Return the demo questions."""
    return DEMO_QUESTIONS

def ticket_to_dataframe_row(ticket: dict) -> dict:
    """
    Convert a synthetic ticket dict to a row dict that matches
    the Tickets DataFrame schema exactly. Fill in any missing
    columns with sensible defaults.
    """
```

**Acceptance criteria:**
- `len(SYNTHETIC_TICKETS) == 6`
- All 6 tickets have Category == "Report Export Failure" and Module == "Reporting / Exports"
- All 6 have matching conversations in SYNTHETIC_CONVERSATIONS (same Ticket_Number)
- Tickets span Tier 1 (2 tickets), Tier 2 (2 tickets), Tier 3 (2 tickets) — representing different complexity levels
- Each ticket has a distinct, realistic Root_Cause
- Each conversation follows the same format as real dataset conversations (agent greeting, back-and-forth, resolution)
- None of the ticket/conversation text appears anywhere in the real dataset
- `DEMO_QUESTIONS` contains 3 questions with descriptions

**Dependencies:** None (pure data, no imports needed).

---
---

## PROMPT 4 OF 5 — DEMO PIPELINE (The Live Learning Loop Orchestrator)

This is the most important module you will build. It orchestrates the live demo flow where the system encounters a novel problem type, detects it as an emerging issue, generates new knowledge, and then retrieves that knowledge for future questions — all in real time during the presentation.

### The demo flow, step by step

Here is exactly what happens during the 5-minute demo. You are building the backend automation that powers steps 3-7.

```
DEMO SCRIPT (5 minutes):

[1] COPILOT HERO MOMENT (60s) — Person presenting
    → Type a question about Advance Property Date into the copilot
    → Show: classification, primary SCRIPT results with provenance badges
    → Click provenance on KB-SYN article → show full evidence chain
    → "Every recommendation traces to its source. Nothing is a black box."

[2] BEFORE/AFTER EVAL (45s) — Person presenting
    → Switch to Dashboard → show eval metrics
    → "Our self-learning loop improved retrieval accuracy from X% to Y%"
    → Show the before/after comparison card
    → "But that's historical. Let me show you what happens with something new."

[3] INJECT NOVEL TICKETS (60s) — YOUR PIPELINE
    → "We just received 6 new tickets about a problem we've never seen: Report Export Failure."
    → Click "Inject Tickets" button on Dashboard (or separate Demo panel)
    → Tickets appear in the system one by one with a brief animation/log
    → Gap detector runs on each: "⚠ No KB match for CS-DEMO-001 (similarity: 0.12)"

[4] EMERGING ISSUE DETECTED (30s) — YOUR PIPELINE
    → After injection, the emerging issue detector runs
    → Dashboard shows: "🔴 NEW: Report Export Failure — 6 tickets, 0 KB coverage, avg similarity 0.14"
    → "The system has identified a pattern. Multiple customers are hitting the same unknown issue."

[5] KB ARTICLE DRAFTED (30s) — YOUR PIPELINE
    → System auto-generates a KB article draft from the tickets
    → Draft appears in the approval queue
    → Title: "PropertySuite Affordable: Report Export Failure — Troubleshooting Guide"
    → "The system drafted a knowledge base article from the ticket data."

[6] APPROVE AND LEARN (30s) — Person presenting
    → Click "Approve" on the draft
    → Article enters the retrieval corpus
    → "The article is now live in our knowledge base."

[7] COPILOT RETRIEVES NEW KNOWLEDGE (45s) — Person presenting
    → Switch to Copilot
    → Type: "Customer is getting blank PDFs when exporting Rent Roll report"
    → Copilot retrieves the JUST-CREATED article about Report Export Failure
    → Provenance shows: "Created from CS-DEMO-001, CS-DEMO-002..."
    → "60 seconds ago, the system had never heard of Report Export Failure.
       Now it's giving evidence-grounded answers. That's self-learning."

[8] CLOSING (30s) — Person presenting
    → "Three surfaces: copilot creates value, learning engine compounds it,
       QA layer governs it. Every answer traced to its source."
```

### Implementation: `meridian/server/demo_pipeline.py` + `meridian/server/demo_state.py`

**DemoState** — tracks the demo progression:

```python
# meridian/server/demo_state.py

from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class DemoPhase(str, Enum):
    READY = "ready"                    # System booted, no demo actions taken
    TICKETS_INJECTED = "tickets_injected"  # Synthetic tickets fed into the system
    GAPS_DETECTED = "gaps_detected"    # Gap detection ran on synthetic tickets
    EMERGING_FLAGGED = "emerging_flagged"  # Emerging issue cluster identified
    DRAFT_GENERATED = "draft_generated"    # KB article drafted
    DRAFT_APPROVED = "draft_approved"      # KB article approved and indexed
    DEMO_COMPLETE = "demo_complete"        # New knowledge retrieved successfully

@dataclass
class DemoState:
    phase: DemoPhase = DemoPhase.READY
    injected_tickets: List[str] = field(default_factory=list)
    gap_results: List[dict] = field(default_factory=list)
    emerging_issues: List[dict] = field(default_factory=list)
    generated_draft_id: Optional[str] = None
    approved_doc_id: Optional[str] = None
    events_log: List[dict] = field(default_factory=list)  # timestamped event log
    started_at: Optional[str] = None
    
    def log_event(self, event_type: str, detail: str):
        self.events_log.append({
            "timestamp": datetime.now().isoformat(),
            "phase": self.phase.value,
            "event": event_type,
            "detail": detail
        })
    
    def to_dict(self) -> dict:
        return {
            "phase": self.phase.value,
            "injected_tickets": self.injected_tickets,
            "gap_results": [
                {
                    "ticket_number": g["ticket_number"],
                    "is_gap": g["is_gap"],
                    "similarity": round(g["similarity"], 4),
                    "best_match": g["best_match"]
                }
                for g in self.gap_results
            ],
            "emerging_issues": self.emerging_issues,
            "generated_draft_id": self.generated_draft_id,
            "approved_doc_id": self.approved_doc_id,
            "events_log": self.events_log,
            "started_at": self.started_at
        }
    
    def reset(self):
        """Reset to initial state (for re-running the demo)."""
        self.__init__()
```

**DemoPipeline** — the orchestration engine:

```python
# meridian/server/demo_pipeline.py

from meridian.server.synthetic_tickets import (
    get_synthetic_tickets, get_synthetic_conversations, get_demo_questions
)
from meridian.server.demo_state import DemoState, DemoPhase
from meridian.engine.data_loader import Document
from dataclasses import dataclass
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class DemoPipeline:
    def __init__(self, datastore, vector_store, gap_detector, kb_generator, provenance_resolver):
        self.ds = datastore
        self.vs = vector_store
        self.gap = gap_detector
        self.gen = kb_generator
        self.prov = provenance_resolver
        self.state = DemoState()
    
    def reset(self):
        """
        Reset the demo to initial state.
        Remove any synthetic documents from the vector store.
        Remove synthetic tickets from datastore lookup maps.
        Reset the demo state.
        """
        # Remove any previously injected synthetic docs
        synthetic_ids = {f"TICKET-{t['Ticket_Number']}" for t in get_synthetic_tickets()}
        if self.state.approved_doc_id:
            synthetic_ids.add(self.state.approved_doc_id)
        # Only remove docs that actually exist in the index
        existing_ids = {d.doc_id for d in self.vs.documents}
        to_remove = synthetic_ids & existing_ids
        if to_remove:
            self.vs.remove_documents(to_remove)
        self.state.reset()
        self.state.log_event("RESET", "Demo pipeline reset to initial state")
        return self.state.to_dict()
    
    def step1_inject_tickets(self) -> dict:
        """
        DEMO STEP 3: Inject the 6 synthetic tickets into the system.
        
        For each synthetic ticket:
        1. Create a Document object (doc_type="TICKET", doc_id using Ticket_Number)
        2. Add to the vector store via vs.add_documents()
        3. Add to datastore lookup maps so gap detection can find them
        4. Log the injection event
        
        The tickets must become queryable in the vector store AND visible
        to the gap detector (which looks up tickets by number from the datastore).
        
        Return the updated demo state.
        """
        tickets = get_synthetic_tickets()
        conversations = get_synthetic_conversations()
        
        new_docs = []
        for ticket in tickets:
            # Build a Document matching the data_loader format
            doc = Document(
                doc_id=ticket["Ticket_Number"],   # Use ticket number as doc_id directly
                doc_type="TICKET",
                title=ticket["Subject"],
                body=f"Description: {ticket['Description']}\n\nResolution: {ticket['Resolution']}",
                search_text=f"{ticket['Subject']} {ticket['Category']} {ticket['Module']} {ticket['Root_Cause']} resolution: {ticket['Resolution']} description: {ticket['Description']}",
                metadata={
                    "tier": ticket["Tier"],
                    "priority": ticket["Priority"],
                    "root_cause": ticket["Root_Cause"],
                    "module": ticket["Module"],
                    "category": ticket["Category"],
                    "script_id": ticket.get("Script_ID")
                },
                provenance=[]
            )
            new_docs.append(doc)
            self.state.injected_tickets.append(ticket["Ticket_Number"])
            self.state.log_event("INJECT_TICKET", f"Injected {ticket['Ticket_Number']}: {ticket['Subject']}")
        
        # Add all at once to the vector store
        self.vs.add_documents(new_docs)
        
        # Also register in datastore lookup maps so gap_detector.check_ticket works
        # Create a mini DataFrame from synthetic tickets and add rows to ds.tickets
        # or add to ds.ticket_by_number dict directly
        for ticket in tickets:
            self.ds.ticket_by_number[ticket["Ticket_Number"]] = pd.Series(ticket)
        
        # Register conversations too
        for conv in conversations:
            # Add to conversations DataFrame or a lookup map
            # The provenance resolver and conversation endpoint need these
            pass  # Implement based on how datastore stores conversations
        
        self.state.phase = DemoPhase.TICKETS_INJECTED
        self.state.started_at = self.state.events_log[0]["timestamp"] if self.state.events_log else None
        
        return self.state.to_dict()
    
    def step2_detect_gaps(self) -> dict:
        """
        DEMO STEP 3 (continued): Run gap detection on the injected tickets.
        
        For each synthetic ticket:
        1. Call gap.check_ticket(ticket_number)
        2. Record the result (should be is_gap=True for all, since no Report Export
           Failure KB exists)
        3. Log: "⚠ No KB match for CS-DEMO-001 (similarity: 0.12)"
        
        ALL 6 tickets should show is_gap=True with very low similarity scores
        (< 0.20) because nothing about Report Export Failure exists in the KB.
        
        Return updated state with gap results.
        """
        for ticket_num in self.state.injected_tickets:
            result = self.gap.check_ticket(ticket_num)
            self.state.gap_results.append({
                "ticket_number": ticket_num,
                "is_gap": result.is_gap,
                "similarity": result.resolution_similarity,
                "best_match": result.best_matching_kb_id
            })
            self.state.log_event(
                "GAP_DETECTED" if result.is_gap else "GAP_COVERED",
                f"{'⚠ No KB match' if result.is_gap else '✓ KB match'} for {ticket_num} (similarity: {result.resolution_similarity:.4f})"
            )
        
        self.state.phase = DemoPhase.GAPS_DETECTED
        return self.state.to_dict()
    
    def step3_detect_emerging_issue(self) -> dict:
        """
        DEMO STEP 4: Run emerging issue detection.
        
        The gap results from step 2 show 6 tickets about "Report Export Failure"
        with no KB coverage. The emerging issue detector should cluster them
        by (Category, Module) and flag:
        
        "🔴 NEW: Report Export Failure / Reporting & Exports — 6 tickets, 0 KB coverage"
        
        NOTE: The gap_detector.detect_emerging_issues() function works on
        GapDetectionResult objects from scan_all_tickets(). For the demo,
        we need to feed it ONLY the synthetic ticket gap results, or run
        it on all tickets (which will include the synthetic ones now).
        
        Simplest approach: run scan on just the synthetic tickets and pass
        those results to detect_emerging_issues with min_cluster_size=3.
        
        Return updated state with emerging issues.
        """
        # Build GapDetectionResult-like objects for the synthetic tickets
        # and pass to detect_emerging_issues
        # OR: re-run scan_all_tickets (which now includes synthetics) and filter
        
        gap_results_for_detection = []
        for ticket_num in self.state.injected_tickets:
            result = self.gap.check_ticket(ticket_num)
            gap_results_for_detection.append(result)
        
        emerging = self.gap.detect_emerging_issues(
            gap_results_for_detection, 
            min_cluster_size=3
        )
        
        self.state.emerging_issues = emerging
        self.state.phase = DemoPhase.EMERGING_FLAGGED
        
        for issue in emerging:
            self.state.log_event(
                "EMERGING_ISSUE",
                f"🔴 NEW: {issue['category']} / {issue['module']} — {issue['ticket_count']} tickets, avg similarity {issue['avg_similarity']:.4f}"
            )
        
        return self.state.to_dict()
    
    def step4_generate_kb_draft(self) -> dict:
        """
        DEMO STEP 5: Generate a KB article draft from the synthetic tickets.
        
        Pick the most representative ticket (CS-DEMO-001 is a good choice — 
        it's a clear, common scenario) and generate a KB article draft.
        
        If an API key is available, the KB generator will use Claude to create
        a polished article. If not, it will use the template fallback.
        
        The generated article should cover the general "Report Export Failure"
        pattern, not just one specific ticket. If using LLM generation, include
        context from multiple tickets in the prompt.
        
        Return updated state with draft ID.
        """
        # Generate a draft from the first synthetic ticket
        draft = self.gen.generate_draft(self.state.injected_tickets[0])
        
        self.state.generated_draft_id = draft.draft_id
        self.state.phase = DemoPhase.DRAFT_GENERATED
        self.state.log_event(
            "DRAFT_GENERATED",
            f"KB article draft '{draft.title}' generated from {draft.source_ticket}"
        )
        
        return self.state.to_dict()
    
    def step5_approve_and_index(self) -> dict:
        """
        DEMO STEP 6: Approve the draft and add it to the retrieval index.
        
        1. Call gen.approve_draft(draft_id) → returns a Document
        2. Call vs.add_documents([doc]) → article is now retrievable
        3. Log the event
        
        After this step, querying about Report Export Failure should return
        this newly created article as a top result.
        
        Return updated state.
        """
        doc = self.gen.approve_draft(self.state.generated_draft_id)
        if doc:
            self.vs.add_documents([doc])
            self.state.approved_doc_id = doc.doc_id
            self.state.phase = DemoPhase.DRAFT_APPROVED
            self.state.log_event(
                "DRAFT_APPROVED",
                f"KB article {doc.doc_id} approved and indexed — now retrievable"
            )
        
        return self.state.to_dict()
    
    def step6_verify_retrieval(self) -> dict:
        """
        DEMO STEP 7: Verify the copilot now retrieves the new article.
        
        Run each of the 3 demo questions through route_and_retrieve.
        Check if the newly approved article appears in the results.
        
        This is the proof moment: the system learned something new.
        
        Return:
        {
            "state": demo_state_dict,
            "verification": [
                {
                    "question": str,
                    "found_new_article": bool,
                    "article_rank": int | null,
                    "article_score": float | null,
                    "top_result": {"doc_id": str, "title": str, "score": float}
                }
            ]
        }
        """
        from meridian.engine.query_router import route_and_retrieve
        
        questions = get_demo_questions()
        verification = []
        
        for q in questions:
            result = route_and_retrieve(q["question"], self.vs, top_k=10)
            
            # Check all results (primary + secondary) for the new article
            all_results = result["primary_results"][:]
            for sec_results in result["secondary_results"].values():
                all_results.extend(sec_results)
            
            found = False
            rank = None
            score = None
            for i, r in enumerate(all_results):
                if r.doc_id == self.state.approved_doc_id:
                    found = True
                    rank = i + 1
                    score = r.score
                    break
            
            top = all_results[0] if all_results else None
            verification.append({
                "question": q["question"],
                "found_new_article": found,
                "article_rank": rank,
                "article_score": round(score, 4) if score else None,
                "top_result": {
                    "doc_id": top.doc_id,
                    "title": top.title,
                    "score": round(top.score, 4)
                } if top else None
            })
        
        self.state.phase = DemoPhase.DEMO_COMPLETE
        self.state.log_event("VERIFIED", f"Retrieval verification complete — new article found in {sum(1 for v in verification if v['found_new_article'])}/3 queries")
        
        return {
            "state": self.state.to_dict(),
            "verification": verification
        }
    
    def run_full_pipeline(self) -> dict:
        """
        Run the entire demo pipeline in sequence (for testing).
        Returns the final state with verification results.
        """
        self.reset()
        self.step1_inject_tickets()
        self.step2_detect_gaps()
        self.step3_detect_emerging_issue()
        self.step4_generate_kb_draft()
        self.step5_approve_and_index()
        result = self.step6_verify_retrieval()
        return result
```

### Wire the demo pipeline into the API server

Add these endpoints to `app.py`:

```python
from meridian.server.demo_pipeline import DemoPipeline

demo = DemoPipeline(ds, vs, gap, gen, prov)

# Demo pipeline endpoints
@app.get("/api/demo/state")
def get_demo_state():
    """Return current demo state."""
    return demo.state.to_dict()

@app.post("/api/demo/reset")
def reset_demo():
    """Reset the demo to initial state."""
    return demo.reset()

@app.post("/api/demo/inject")
def demo_inject():
    """Step 1: Inject synthetic tickets."""
    return demo.step1_inject_tickets()

@app.post("/api/demo/detect-gaps")
def demo_detect_gaps():
    """Step 2: Run gap detection on injected tickets."""
    return demo.step2_detect_gaps()

@app.post("/api/demo/detect-emerging")
def demo_detect_emerging():
    """Step 3: Detect emerging issue cluster."""
    return demo.step3_detect_emerging_issue()

@app.post("/api/demo/generate-draft")
def demo_generate_draft():
    """Step 4: Generate KB article draft."""
    return demo.step4_generate_kb_draft()

@app.post("/api/demo/approve")
def demo_approve():
    """Step 5: Approve draft and add to index."""
    return demo.step5_approve_and_index()

@app.post("/api/demo/verify")
def demo_verify():
    """Step 6: Verify new article is retrievable."""
    return demo.step6_verify_retrieval()

@app.post("/api/demo/run-all")
def demo_run_all():
    """Run the full demo pipeline (for testing only)."""
    return demo.run_full_pipeline()
```

### Acceptance criteria

This is the most critical set of acceptance criteria in the entire project. If these pass, the demo will work.

- `POST /api/demo/reset` returns state with phase="ready" and empty lists
- `POST /api/demo/inject` returns state with 6 injected ticket numbers and phase="tickets_injected"
- `POST /api/demo/detect-gaps` returns 6 gap results, ALL with is_gap=True and similarity < 0.25
- `POST /api/demo/detect-emerging` returns at least 1 emerging issue with category="Report Export Failure" and ticket_count=6
- `POST /api/demo/generate-draft` returns state with a non-null generated_draft_id
- `POST /api/demo/approve` returns state with a non-null approved_doc_id and phase="draft_approved"
- `POST /api/demo/verify` returns verification where at least 2/3 questions find the new article (found_new_article=True)
- `POST /api/demo/run-all` executes the entire pipeline and returns a complete result
- After the full pipeline, querying `/api/query` with `{"query": "report export blank PDF"}` returns the new article in results
- `POST /api/demo/reset` after a full run cleans up all synthetic data and returns to initial state
- Running the pipeline a second time after reset produces the same results (idempotent)

**Dependencies:** All Person 1 modules + FastAPI server from Prompt 1 + synthetic tickets from Prompt 3.

---
---

## PROMPT 5 OF 5 — DEMO SCRIPT + PRESENTATION DECK

You are creating the final presentation materials for the Meridian demo. This includes a structured demo script with exact timing and speaking notes, and a concise slide deck.

### The presentation context

- **Audience:** Hackathon judges (technical and business stakeholders from RealPage)
- **Time:** 5 minutes total (strict)
- **Format:** Live demo with a few slides for context
- **Evaluation criteria:** Learning capability, compliance/safety value, accuracy/consistency, automation/scalability, demo clarity, enterprise readiness
- **What judges want to see:** Not another RAG chatbot. A system that learns, traces its evidence, and could be deployed in a real support org.

### Slide deck (6 slides)

Create a slide deck as an HTML file that can be presented in the browser. Use a clean, dark-themed design consistent with the product. Each slide should be full-screen with large text.

**Slide 1: Title**
```
MERIDIAN
Self-Learning AI for Support

"OpenEvidence for Support Agents"

Evidence-grounded answers that get smarter from every interaction.

Team: [names]
```

**Slide 2: The Problem**
```
Support knowledge is trapped.

→ 3,207 KB articles, but 95% lack metadata, tags, or update dates.
→ 714 scripts exist but agents can't find the right one in real time.
→ When agents solve new problems, that knowledge disappears.
→ Every resolved ticket is a lesson the organization never learns.

Meridian turns every resolution into institutional memory.
```

**Slide 3: Architecture (simple diagram)**
```
Three Surfaces, One Loop

    ┌────────────┐     ┌────────────────┐     ┌──────────────┐
    │  COPILOT   │────▶│ LEARNING ENGINE │────▶│  DASHBOARD   │
    │            │     │                │     │              │
    │ Evidence-  │     │ Gap Detection  │     │ Knowledge    │
    │ grounded   │◀────│ KB Generation  │◀────│ Health, QA,  │
    │ answers    │     │ Auto-indexing  │     │ Emerging     │
    └────────────┘     └────────────────┘     │ Issues       │
                                              └──────────────┘

    Copilot creates value.
    Learning Engine compounds it.
    Dashboard governs it.
```

**Slide 4: Live Demo** (just a title card before switching to the app)
```
LIVE DEMO

"Watch the system learn something it's never seen before."
```

**Slide 5: The Numbers**
```
Results

Retrieval Accuracy:
  hit@1: X%  →  hit@5: Y%  →  hit@10: Z%

Self-Learning Proof:
  Before learning:  hit@5 = A%
  After learning:   hit@5 = B%  (▲ +C pp)
  134 knowledge gaps closed

Live Demo:
  Novel issue (Report Export Failure) → 0 KB coverage
  → Gap detected → KB drafted → Approved → Retrieved
  All in < 60 seconds.
```

**Slide 6: Enterprise Vision**
```
In production, Meridian would:

→ Ingest live ticket feeds via Salesforce/Zendesk webhook
→ Auto-detect emerging issues across the entire support org
→ Generate KB articles reviewed by senior agents
→ Score every interaction against the QA rubric
→ Surface compliance violations before they escalate
→ Reduce mean time to resolution by giving agents the right answer first

Every answer comes with a citation.
Nothing is a black box.
```

### Demo script with exact timing

Create the demo script as a markdown file with precise timestamps and speaking notes.

```markdown
# MERIDIAN DEMO SCRIPT — 5 MINUTES

## [0:00 - 0:30] SLIDE 1-2: Context Setting (30s)
SLIDE 1 — on screen.
"Meridian is a self-learning AI copilot for support agents. Every answer is
evidence-grounded — traced back to a specific ticket, conversation, or script.
And the system gets smarter from every interaction."

SLIDE 2 — click.
"The dataset has over 3,200 KB articles, but 95% have no metadata. 714 scripts
exist but agents struggle to find the right one. And when agents solve new
problems, that knowledge disappears into closed tickets. Meridian fixes this."

## [0:30 - 1:30] COPILOT DEMO (60s)
Switch to the app — Copilot tab.

[ACTION] Type: "advance property date backend script fails"
[WAIT] Results populate.

"The engine classified this as a SCRIPT question with 82% confidence. It pulled
the right backend fix script — SCRIPT-0293 — with the required input parameters
highlighted. Notice the provenance badge on the KB article."

[ACTION] Click the provenance badge on KB-SYN article.

"This article was automatically generated from ticket CS-38908386, which
captured a conversation with agent Alex, where they used this exact script.
Every recommendation traces to its source. Nothing is a black box."

[ACTION] Close provenance modal.

## [1:30 - 2:15] DASHBOARD + EVAL (45s)
[ACTION] Switch to Dashboard tab.

"The dashboard shows knowledge health — 161 articles have been auto-generated
by the learning system. Our eval harness ran 1,000 ground-truth questions.
Hit@5 retrieval accuracy is [Y]%."

[ACTION] Point to the Self-Learning Proof card.

"This is the headline: before the learning loop, hit@5 was [A]%. After the
system generated 161 articles from resolved tickets, it jumped to [B]%.
That's [C] percentage points of improvement."

"But that's historical. Let me show you what happens live."

## [2:15 - 3:15] LIVE INJECTION — THE WOW MOMENT (60s)
"We just received 6 new tickets about a problem Meridian has never seen:
Report Export Failure. Customers getting blank PDFs, wrong data in exports,
timeouts on large reports."

[ACTION] Click "Inject Tickets" (or trigger via demo panel).
[WAIT] Tickets inject, gap detection runs.

"The gap detector just ran. Every single ticket flagged as a knowledge gap —
zero KB coverage, similarity scores below 0.15."

[ACTION] Point to emerging issues.

"The emerging issue detector clustered these: 'Report Export Failure —
6 unmatched tickets, no KB coverage.' The system identified a pattern."

## [3:15 - 3:45] DRAFT + APPROVE (30s)
[ACTION] Point to the generated draft in the approval queue.

"Meridian drafted a KB article from the ticket data. It synthesized the
common pattern — report cache issues, encoding problems, timeout
configuration — into a structured troubleshooting guide."

[ACTION] Click "Approve."

"Approved. The article is now in the retrieval index."

## [3:45 - 4:30] RETRIEVAL VERIFICATION — THE PAYOFF (45s)
[ACTION] Switch to Copilot tab.
[ACTION] Type: "Customer getting blank PDFs when exporting Rent Roll report"
[WAIT] Results populate.

"There it is. The copilot is now returning the article that was created
60 seconds ago. The provenance shows it was generated from the demo tickets.
The system went from 'I don't know about this' to 'Here's an evidence-grounded
answer with full traceability' — in under a minute."

"That's the self-learning loop, live. Not historical replay — real-time
adaptation to a problem that didn't exist in the knowledge base."

## [4:30 - 5:00] SLIDE 5-6: Closing (30s)
SLIDE 5 — click.
"The numbers: [state retrieval accuracy, before/after improvement,
live demo results]."

SLIDE 6 — click.
"In production: live ticket feeds, Salesforce integration, org-wide
emerging issue detection, automated QA scoring. Every answer with a citation.
Nothing is a black box. Thank you."
```

### Implementation

Create two files:

1. `meridian/demo/deck.html` — the 6-slide presentation as a self-contained HTML file with:
   - Full-screen slides with keyboard arrow navigation (left/right)
   - Dark theme (#0f172a background, white text)
   - Large, readable text (minimum 24px body, 48px headings)
   - Slide counter in bottom-right corner
   - The architecture diagram on Slide 3 rendered as styled divs or SVG (not ASCII)
   - Placeholder markers like `[X%]` for numbers that will be filled in from real eval results

2. `meridian/demo/script.md` — the demo script above as a formatted markdown file

**Acceptance criteria:**
- `deck.html` opens in a browser and shows 6 navigable slides
- Arrow keys advance/retreat between slides
- Slide 3 has a visual architecture diagram (not just text)
- Slide 5 has clear placeholder markers for eval numbers
- `script.md` has timestamps for each section totaling 5 minutes
- The script references specific UI actions (click, type, switch tab) with expected results
- Both files are in `meridian/demo/` directory

**Dependencies:** None (pure HTML + markdown).

---
---

## APPENDIX: FULL ENDPOINT REFERENCE

All endpoints Person 3 implements, in priority order:

| # | Endpoint | Method | Priority | Notes |
|---|----------|--------|----------|-------|
| 1 | `/api/query` | POST | CRITICAL | Main copilot endpoint |
| 2 | `/api/provenance/{doc_id}` | GET | CRITICAL | Evidence chain display |
| 3 | `/api/conversations/{ticket_number}` | GET | HIGH | Conversation panel |
| 4 | `/api/dashboard/stats` | GET | HIGH | Dashboard data |
| 5 | `/api/demo/inject` | POST | CRITICAL | Demo pipeline step 1-3 |
| 6 | `/api/demo/detect-gaps` | POST | CRITICAL | Demo pipeline step 2 |
| 7 | `/api/demo/detect-emerging` | POST | CRITICAL | Demo pipeline step 3 |
| 8 | `/api/demo/generate-draft` | POST | CRITICAL | Demo pipeline step 4 |
| 9 | `/api/demo/approve` | POST | CRITICAL | Demo pipeline step 5 |
| 10 | `/api/demo/verify` | POST | HIGH | Demo pipeline step 6 |
| 11 | `/api/demo/state` | GET | HIGH | Demo state tracking |
| 12 | `/api/demo/reset` | POST | HIGH | Reset for re-run |
| 13 | `/api/demo/run-all` | POST | MEDIUM | Full pipeline (testing) |
| 14 | `/api/kb/drafts` | GET | MEDIUM | Approval queue list |
| 15 | `/api/kb/approve/{draft_id}` | POST | MEDIUM | Approve KB draft |
| 16 | `/api/kb/reject/{draft_id}` | POST | LOW | Reject KB draft |
| 17 | `/api/qa/score` | POST | LOW | QA scoring (LLM) |
| 18 | `/api/eval/run` | POST | LOW | Full eval (slow) |
| 19 | `/api/gap/emerging` | GET | LOW | Emerging issues list |

**Build order:** Prompts 1 → 2 → 3 → 4 → 5. If behind schedule, skip Prompt 2 (QA scorer) and Prompt 5 (deck — make slides manually). The demo pipeline (Prompts 3-4) is non-negotiable.

## APPENDIX: INTEGRATION CHECKLIST

Before the demo, verify each of these:

```
[ ] Server starts: python run_server.py → "Meridian booted in Xs — 4321 docs indexed"
[ ] CORS works: frontend at localhost:5173 can call API at localhost:8000
[ ] /api/query returns results matching the frontend's expected shape
[ ] /api/provenance/KB-SYN-0001 returns 3 sources + learning event
[ ] /api/conversations/CS-38908386 returns a transcript
[ ] /api/dashboard/stats returns knowledge_health.total_articles == 3207
[ ] Frontend USE_MOCK = false → copilot view populates with real data
[ ] Frontend provenance modal displays real evidence chain
[ ] Frontend dashboard shows real numbers
[ ] Demo pipeline: /api/demo/run-all completes without errors
[ ] Demo pipeline: after run-all, /api/query with "report export" returns new article
[ ] Demo pipeline: /api/demo/reset cleans up and allows re-run
[ ] Full dry run: walk through the 5-minute script end to end
[ ] Backup plan: if API fails, frontend can fall back to USE_MOCK = true
```