# PERSON 2 (PLATFORM) — MASTER PROMPT BREAKDOWN

This document contains **5 sequential prompts** for a coding agent building the frontend for a hackathon project called **Meridian** ("OpenEvidence for Support Agents").

Hand each prompt to the agent in order. Each is self-contained.

---
---

## PROMPT 1 OF 5 — THE NORTH STAR (read first, then set up the project)

You are a senior frontend engineer and UI designer building the interface for a hackathon-winning product called **Meridian** — an "OpenEvidence for Support Agents." This is a real-time copilot that gives support agents evidence-grounded answers with full provenance tracing, plus a self-learning knowledge engine that gets smarter from every resolved ticket.

You are Person 2 of a 3-person team. You own ALL the frontend. Person 1 built the backend intelligence engine (retrieval, classification, provenance resolution, gap detection, KB generation, eval). Person 3 is building the FastAPI server that wraps Person 1's engine and serves your frontend. You will build against **mock data first** (hardcoded JSON matching the exact API response shapes), then swap to real `fetch()` calls when Person 3's API is live.

### THE PRODUCT IN ONE PARAGRAPH

A support agent gets a customer question. They type or paste it into the copilot. The engine classifies it (script needed? KB article? past ticket resolution?), retrieves the best matches from 4,321 documents, and displays them with **provenance badges** — every recommendation traces back to its source ticket, conversation, and script. The dashboard shows knowledge health, the self-learning pipeline status, emerging issues, and QA scoring. The judges see: question in → evidence-grounded answer out → gap detected → KB drafted → approved → copilot retrieves it next time.

### WHAT YOU ARE BUILDING (4 views)

```
meridian-ui/
├── src/
│   ├── App.jsx                    ← Router: 4 views
│   ├── views/
│   │   ├── CopilotView.jsx       ← PROMPT 2 (the hero — two-panel copilot)
│   │   ├── DashboardView.jsx     ← PROMPT 4 (knowledge health + learning pipeline)
│   │   └── QAScoringView.jsx     ← PROMPT 5 (QA rubric evaluation)
│   ├── components/
│   │   ├── ConversationPanel.jsx  ← PROMPT 2 (left panel: live transcript)
│   │   ├── ResultsPanel.jsx       ← PROMPT 2 (right panel: recommendations)
│   │   ├── ScriptCard.jsx         ← PROMPT 2 (script result with placeholder highlighting)
│   │   ├── KBCard.jsx             ← PROMPT 2 (KB article result)
│   │   ├── TicketCard.jsx         ← PROMPT 2 (resolved ticket result)
│   │   ├── ProvenanceBadge.jsx    ← PROMPT 3 (clickable provenance chain)
│   │   ├── ProvenanceModal.jsx    ← PROMPT 3 (full evidence chain detail)
│   │   ├── ConfidenceBar.jsx      ← PROMPT 2 (SCRIPT/KB/TICKET confidence visualization)
│   │   ├── ApprovalQueue.jsx      ← PROMPT 4 (pending KB draft review)
│   │   ├── KnowledgeHealth.jsx    ← PROMPT 4 (metrics cards + charts)
│   │   ├── EmergingIssues.jsx     ← PROMPT 4 (clustered gap alerts)
│   │   ├── EvalResults.jsx        ← PROMPT 4 (hit@k scores, before/after)
│   │   ├── QAScoreForm.jsx        ← PROMPT 5 (input form for transcript + ticket)
│   │   └── QAScoreReport.jsx      ← PROMPT 5 (rendered JSON report)
│   ├── mock/
│   │   └── mockData.js           ← PROMPT 1 (this prompt — hardcoded API responses)
│   └── lib/
│       └── api.js               ← fetch wrapper (mock → real toggle)
```

### DESIGN SYSTEM

This is an enterprise support tool, not a consumer app. The aesthetic should be:
- **Dark-mode primary** with a deep slate/navy background (#0f172a). Light mode optional.
- **High-information-density** — judges have 5 minutes. Every pixel must communicate.
- **Color coding by document type:**
  - SCRIPT → amber/orange (#f59e0b) — signals "action required, backend fix"
  - KB → blue (#3b82f6) — signals "knowledge, how-to"
  - TICKET → emerald (#10b981) — signals "resolved case, evidence"
  - GAP/ALERT → red (#ef4444) — signals "knowledge gap detected"
  - APPROVED → green (#22c55e)
  - REJECTED → red (#ef4444)
  - PENDING → yellow (#eab308)
- **Typography:** Use `font-mono` for script text, code blocks, doc IDs. Use a clean sans-serif (system font stack or Geist if importing) for everything else.
- **Provenance is the hero visual.** Every recommendation card should have a provenance badge. When clicked, it expands into a chain: KB → Ticket → Conversation → Script. This is what makes the product different from ChatGPT-over-docs.

### TECH STACK

- **React 18** with functional components and hooks
- **Tailwind CSS** (utility classes only — no custom CSS files)
- **Vite** for build/dev server
- **Lucide React** for icons
- **Recharts** for dashboard charts
- No other dependencies. No state management library — useState/useReducer is sufficient.
- All data fetching goes through `lib/api.js` which starts with mock data and switches to `fetch()`.

### API CONTRACTS (what Person 3's FastAPI will serve)

Build all components against these exact response shapes. Person 3 will implement these endpoints.

**`POST /api/query`** — the main copilot endpoint
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
      "body": "use <DATABASE>\ngo\n\nupdate Haprequest\nset hrqTotalAdjPayAmount = <AMOUNT>\n...",
      "score": 0.74,
      "metadata": {
        "purpose": "Run this backend data-fix script to resolve a Advance Property Date issue in Accounting / Date Advance.",
        "inputs": "<AMOUNT>, <DATABASE>, <DATE>, <ID>",
        "module": "Accounting / Date Advance",
        "category": "Advance Property Date"
      },
      "provenance": [],
      "rank": 1
    }
  ],
  "secondary_results": {
    "KB": [
      {
        "doc_id": "KB-SYN-0001",
        "doc_type": "KB",
        "title": "PropertySuite Affordable: Advance Property Date - Unable to advance property date (backend data sync)",
        "body": "Summary\n- This article documents a Tier 3-style backend data fix...\n\nApplies To\n- ExampleCo PropertySuite Affordable\n- Module: Accounting / Date Advance\n\nSymptoms\n- Date advance fails because a backend voucher reference is invalid...\n\nResolution Steps\n1. Confirm there are no open batches...\n2. Verify the current property date...",
        "score": 0.61,
        "metadata": {"source_type": "SYNTH_FROM_TICKET", "module": "Accounting / Date Advance", "tags": "PropertySuite, affordable, date-advance"},
        "provenance": [
          {"source_type": "Ticket", "source_id": "CS-38908386", "relationship": "CREATED_FROM", "evidence_snippet": "Derived from Tier 3 ticket CS-38908386"},
          {"source_type": "Conversation", "source_id": "CONV-O2RAK1VRJN", "relationship": "CREATED_FROM", "evidence_snippet": "Conversation context captured"},
          {"source_type": "Script", "source_id": "SCRIPT-0293", "relationship": "REFERENCES", "evidence_snippet": "References SCRIPT-0293 for backend fix"}
        ],
        "rank": 1
      }
    ],
    "TICKET": [
      {
        "doc_id": "CS-38908386",
        "doc_type": "TICKET",
        "title": "Unable to advance property date (backend data sync)",
        "body": "Description: Date advance fails because a backend voucher reference is invalid...\n\nResolution: Validated issue, collected exact error context, and escalated to Tier 3. Applied backend data-fix script. Customer confirmed the workflow completed successfully.",
        "score": 0.55,
        "metadata": {"tier": 3, "priority": "High", "root_cause": "Data inconsistency requiring backend fix", "module": "Accounting / Date Advance", "script_id": "SCRIPT-0293"},
        "provenance": [],
        "rank": 1
      }
    ]
  }
}
```

**`GET /api/provenance/{doc_id}`** — full provenance chain
```json
{
  "kb_article_id": "KB-SYN-0001",
  "kb_title": "PropertySuite Affordable: Advance Property Date...",
  "has_provenance": true,
  "sources": [
    {
      "source_type": "Ticket",
      "source_id": "CS-38908386",
      "relationship": "CREATED_FROM",
      "evidence_snippet": "Derived from Tier 3 ticket CS-38908386: Unable to advance property date",
      "detail": {
        "subject": "Unable to advance property date (backend data sync)",
        "tier": 3,
        "resolution": "Validated issue, collected exact error context, and escalated to Tier 3. Applied backend data-fix script. Customer confirmed the workflow completed successfully. Steps: Confirm there are no open batches...",
        "root_cause": "Data inconsistency requiring backend fix",
        "module": "Accounting / Date Advance"
      }
    },
    {
      "source_type": "Conversation",
      "source_id": "CONV-O2RAK1VRJN",
      "relationship": "CREATED_FROM",
      "evidence_snippet": "Conversation context captured in CONV-O2RAK1VRJN",
      "detail": {
        "channel": "Chat",
        "agent_name": "Alex",
        "sentiment": "Neutral",
        "issue_summary": "Date advance fails because a backend voucher reference is invalid and needs a update correction."
      }
    },
    {
      "source_type": "Script",
      "source_id": "SCRIPT-0293",
      "relationship": "REFERENCES",
      "evidence_snippet": "This KB references Script_ID SCRIPT-0293 for the backend fix procedure.",
      "detail": {
        "title": "Accounting / Date Advance - Advance Property Date",
        "purpose": "Run this backend data-fix script to resolve a Advance Property Date issue in Accounting / Date Advance.",
        "inputs": "<AMOUNT>, <DATABASE>, <DATE>, <ID>"
      }
    }
  ],
  "learning_event": {
    "event_id": "LEARN-0001",
    "trigger_ticket": "CS-38908386",
    "detected_gap": "No existing KB match above threshold for Advance Property Date issue; escalated to Tier 3.",
    "draft_summary": "Draft KB created to document backend resolution steps for: Unable to advance property date (backend data sync)",
    "final_status": "Approved",
    "reviewer_role": "Tier 3 Support",
    "timestamp": "2025-02-19T02:05:13"
  }
}
```

**`GET /api/dashboard/stats`**
```json
{
  "knowledge_health": {
    "total_articles": 3207,
    "seed_articles": 3046,
    "learned_articles": 161,
    "articles_with_metadata": 199,
    "articles_without_metadata": 3008,
    "avg_body_length": 2051,
    "scripts_total": 714,
    "placeholders_total": 25
  },
  "learning_pipeline": {
    "total_events": 161,
    "approved": 134,
    "rejected": 27,
    "pending": 3,
    "pending_drafts": [
      {
        "draft_id": "DRAFT-001",
        "title": "PropertySuite Affordable: HAP Voucher Sync...",
        "source_ticket": "CS-12345678",
        "detected_gap": "No existing KB match for HAP voucher sync failure",
        "generated_at": "2025-06-15T10:30:00Z"
      }
    ]
  },
  "tickets": {
    "total": 400,
    "by_tier": {"1": 121, "2": 118, "3": 161},
    "by_priority": {"Critical": 50, "High": 137, "Medium": 146, "Low": 67},
    "by_module": {
      "General": 123, "Accounting / Date Advance": 118,
      "Compliance / Certifications": 38, "Affordable / HAP": 36,
      "Residents / Move-Out": 15, "Residents / Move-In": 14,
      "Other": 56
    }
  },
  "emerging_issues": [
    {
      "category": "Advance Property Date",
      "module": "Accounting / Date Advance",
      "ticket_count": 118,
      "avg_similarity": 0.32,
      "sample_resolution": "Validated issue, collected exact error context..."
    }
  ],
  "eval_results": {
    "retrieval": {
      "overall": {"hit@1": 0.35, "hit@3": 0.52, "hit@5": 0.61, "hit@10": 0.73}
    },
    "classification": {
      "accuracy": 0.71,
      "per_class": {
        "SCRIPT": {"precision": 0.78, "recall": 0.85, "f1": 0.81},
        "KB": {"precision": 0.55, "recall": 0.48, "f1": 0.51},
        "TICKET_RESOLUTION": {"precision": 0.42, "recall": 0.38, "f1": 0.40}
      }
    },
    "before_after": {
      "before_hit5": 0.48,
      "after_hit5": 0.61,
      "improvement_pp": 13,
      "gaps_closed": 134,
      "headline": "Self-learning loop improved hit@5 from 48% to 61% (+13 pp)"
    }
  }
}
```

**`POST /api/qa/score`** — request body: `{ticket_number: str}`, response: the full QA JSON from the rubric (see Prompt 5 for exact shape).

**`POST /api/kb/approve/{draft_id}`** — response: `{status: "approved", doc_id: "KB-DRAFT-001"}`

**`POST /api/kb/reject/{draft_id}`** — response: `{status: "rejected"}`

**`GET /api/conversations/{ticket_number}`** — returns the conversation transcript
```json
{
  "ticket_number": "CS-38908386",
  "conversation_id": "CONV-O2RAK1VRJN",
  "channel": "Chat",
  "agent_name": "Alex",
  "sentiment": "Neutral",
  "issue_summary": "Date advance fails because a backend voucher reference is invalid...",
  "transcript": "Alex (ExampleCo): Thanks for contacting ExampleCo Support...\nMorgan Johnson: Hello—this is Morgan Johnson from Oak & Ivy Management..."
}
```

### NOW BUILD: Project scaffold + mock data + api wrapper

1. Set up a Vite + React + Tailwind project
2. Create `src/mock/mockData.js` with ALL the mock payloads above as exported constants
3. Create `src/lib/api.js`:
```javascript
const USE_MOCK = true;  // flip to false when Person 3's API is ready
const API_BASE = "http://localhost:8000";

import { mockQueryResponse, mockProvenance, mockDashboard, mockConversation } from "../mock/mockData";

export async function queryEngine(queryText) {
  if (USE_MOCK) return mockQueryResponse;
  const res = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({query: queryText})
  });
  return res.json();
}

// ... similar for getProvenance, getDashboard, scoreQA, approveDraft, rejectDraft, getConversation
```
4. Create `src/App.jsx` with a top nav bar and React Router (or simple tab state) routing to the 4 views: Copilot, Dashboard, QA Scoring, and an About/Demo view.

**Acceptance criteria:**
- `npm run dev` starts without errors
- The app renders a nav bar with 4 tabs
- `api.queryEngine("test")` returns the mock data
- Tailwind dark mode is configured and active

---
---

## PROMPT 2 OF 5 — COPILOT VIEW (The Hero Feature)

You are building the copilot view — the main screen judges will see during the demo. This is a two-panel interface where a support agent works a case.

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔍 Query Bar (full width)                               [Search ▶] │
├──────────────────────────┬───────────────────────────────────────────┤
│                          │  ┌─ Confidence Bar ─────────────────────┐ │
│  CONVERSATION PANEL      │  │ ■■■■■■■■ SCRIPT 82%  ■■■ KB 31%    │ │
│  (left, 40% width)       │  └─────────────────────────────────────┘ │
│                          │                                           │
│  ┌────────────────────┐  │  ┌─ PRIMARY RESULTS ───────────────────┐ │
│  │ Agent: Thanks for   │  │  │                                     │ │
│  │ contacting...       │  │  │  [ScriptCard]  rank 1  score 0.74  │ │
│  │                     │  │  │  ┌ SCRIPT-0293 ──────────────────┐  │ │
│  │ Customer: Hello,    │  │  │  │ Accounting / Date Advance     │  │ │
│  │ I need help...      │  │  │  │ 🏷 Required: <DATABASE>,     │  │ │
│  │                     │  │  │  │   <AMOUNT>, <DATE>, <ID>      │  │ │
│  │ Agent: Can you      │  │  │  │                               │  │ │
│  │ confirm the menu    │  │  │  │ use <DATABASE>                │  │ │
│  │ path...             │  │  │  │ go                            │  │ │
│  │                     │  │  │  │ update Haprequest             │  │ │
│  │ Customer: Settings  │  │  │  │ set hrqTotalAdj...            │  │ │
│  │ → Property → Date   │  │  │  └───────────────────────────────┘  │ │
│  │ Advance             │  │  │                                     │ │
│  │                     │  │  │  [ScriptCard]  rank 2  score 0.68  │ │
│  │ ...                 │  │  │  ...                                │ │
│  │                     │  │  └─────────────────────────────────────┘ │
│  │                     │  │                                           │
│  │  📊 Metadata:       │  │  ┌─ ALSO RELEVANT ───────────────────┐  │
│  │  Channel: Chat      │  │  │  📘 KB Article  │  🎫 Past Ticket │  │
│  │  Agent: Alex        │  │  │  KB-SYN-0001    │  CS-38908386    │  │
│  │  Sentiment: Neutral │  │  │  [provenance ◉]  │  Tier 3, High  │  │
│  └────────────────────┘  │  └─────────────────────────────────────┘  │
│                          │                                           │
│  [Load Conversation ▼]   │  [QA Nudges: ⚠ Confirm resolution with  │
│                          │   customer before closing]                │
└──────────────────────────┴───────────────────────────────────────────┘
```

### Components to build

**1. Query Bar** (`CopilotView.jsx` top section)
- Full-width text input with a "Search" button
- On submit: calls `api.queryEngine(text)` → populates results panel
- Also has a dropdown "Load Conversation" that loads a sample transcript into the left panel
- Shows a subtle loading spinner during the API call

**2. ConversationPanel** (left, 40% width)
- Renders a chat transcript with alternating agent/customer bubbles
- Parse the raw transcript text: lines starting with an agent name (e.g., "Alex (ExampleCo):") are agent messages, all others are customer messages
- Agent messages: right-aligned, blue-tinted background
- Customer messages: left-aligned, slate/gray background
- Below the transcript: metadata card showing Channel, Agent, Sentiment (with color: Neutral=gray, Frustrated=red, Relieved=green, Curious=blue), Issue Summary
- A "Load Conversation" dropdown that lists a few sample ticket numbers. On select, loads the conversation from `api.getConversation(ticketNumber)` and populates the panel.

**3. ConfidenceBar** (top of results panel)
- Horizontal stacked bar showing the three confidence scores
- Color coded: SCRIPT=amber, KB=blue, TICKET=emerald
- Shows the predicted type as the "winner" with a badge
- Example: `■■■■■■■■ SCRIPT 82%  ■■■ KB 31%  ■ TICKET 15%`

**4. ResultsPanel** (right, 60% width)
- Has two sections: "Primary Results" and "Also Relevant"
- Primary: renders full cards for the top-k results of the predicted type
- Also Relevant: compact cards for secondary results (collapsed by default, expandable)

**5. ScriptCard** (for doc_type === "SCRIPT")
- Header: script title + doc_id badge (amber)
- "Required Inputs" tag line: parse `metadata.inputs` (comma-separated), render each placeholder as a highlighted chip (amber background)
- Script body: rendered in a `<pre>` block with `font-mono`. **Highlight all placeholders** in the body text — any `<PLACEHOLDER>` pattern should be wrapped in a `<span>` with amber background. Use regex `/(<[A-Z_]+>)/g` to find and highlight them.
- "Purpose" subtitle: from `metadata.purpose`
- Score badge: "Match: 74%"
- Provenance badge (if provenance array is non-empty): clickable, see Prompt 3

**6. KBCard** (for doc_type === "KB")
- Header: article title + doc_id badge (blue)
- Body: rendered as formatted text. If the body has section headers (lines starting with "Summary", "Applies To", "Symptoms", "Resolution Steps"), render them as bold subtitles.
- Tags: if `metadata.tags` exists, render as pill badges
- Source type badge: "SEED" (gray) or "LEARNED ✨" (blue with sparkle) based on `metadata.source_type`
- Provenance badge: this is the key differentiator — learned articles ALWAYS have provenance. Render the provenance badge prominently.

**7. TicketCard** (for doc_type === "TICKET")
- Header: ticket title + doc_id badge (emerald)
- Tier badge: "Tier 3" (red), "Tier 2" (yellow), "Tier 1" (green)
- Priority badge: Critical=red, High=orange, Medium=yellow, Low=gray
- Body: split on "Resolution:" to show Description and Resolution separately
- Root cause: from metadata
- Script reference: if `metadata.script_id` exists, show as a linked badge

**8. QA Nudges** (bottom of results panel)
- Static for now (will be dynamic when Person 3 integrates QA scoring)
- Show 2-3 contextual reminders based on the predicted type:
  - SCRIPT results: "⚠ Verify script inputs before execution" + "⚠ Confirm resolution with customer after applying"
  - KB results: "⚠ Verify article is current (check Updated_At)" + "⚠ Walk customer through steps, don't just read them"
  - TICKET results: "⚠ Confirm the customer's issue matches the referenced case" + "⚠ Document your resolution clearly for future KB generation"

### Interaction flow
1. Agent types question in query bar → hits search
2. Results panel populates with primary + secondary results
3. Confidence bar shows routing classification
4. Agent clicks "Load Conversation" → left panel shows the transcript
5. Agent clicks provenance badge on a KB result → modal opens (Prompt 3)

### Real data to embed in mock
Use the exact sample data from the API contracts in Prompt 1. The mock `queryEngine` response should include at least:
- 3 SCRIPT results as primary (when query matches a script pattern)
- 1 KB result and 1 TICKET result as secondary
- The KB result should be KB-SYN-0001 with full provenance (3 sources)

Also mock a KB-type query response with KB results as primary and SCRIPT/TICKET as secondary.

**Acceptance criteria:**
- Two-panel layout renders correctly at 1440px+ width
- Query submission populates results
- ScriptCard highlights all `<PLACEHOLDER>` tokens in amber
- KBCard shows "LEARNED ✨" badge for SYNTH_FROM_TICKET articles
- TicketCard shows colored tier/priority badges
- ConfidenceBar shows all three scores with correct colors
- Conversation panel parses and renders transcript with agent/customer bubbles
- "Also Relevant" section shows the other two doc types

---
---

## PROMPT 3 OF 5 — PROVENANCE & EVIDENCE CHAIN COMPONENTS

You are building the provenance display system — the feature that makes Meridian a trust engine, not just a search tool. Every recommendation the copilot shows can be traced back to its source evidence. This is the visual proof of "why should I trust this answer?"

### What provenance looks like in the product

On every result card (ScriptCard, KBCard, TicketCard), there's a small badge. For results WITH provenance data, the badge is an interactive element:

```
┌──────────────────────────────────────────────────────────────┐
│  📘 KB-SYN-0001: Advance Property Date...                    │
│  Match: 61%  │  LEARNED ✨  │  ◉ Evidence Chain (3 sources)  │ ← clickable
│  ...                                                          │
└──────────────────────────────────────────────────────────────┘
```

Clicking "◉ Evidence Chain" opens a modal OR expands an inline panel showing the full chain:

```
┌─ EVIDENCE CHAIN ──────────────────────────────────────────────────────┐
│                                                                        │
│  This article was automatically generated from resolved support data.  │
│                                                                        │
│  ┌─ Source Ticket ─────────────────────────────────────┐              │
│  │  🎫 CS-38908386  •  Tier 3  •  High Priority        │              │
│  │  "Unable to advance property date (backend data sync)"│              │
│  │  Root Cause: Data inconsistency requiring backend fix │              │
│  │  Resolution: Validated issue, collected exact error   │              │
│  │  context, and escalated to Tier 3. Applied backend    │              │
│  │  data-fix script...                                   │              │
│  │  Relationship: CREATED_FROM                           │              │
│  └───────────────────────────────────────────────────────┘              │
│       │                                                                │
│       ▼                                                                │
│  ┌─ Source Conversation ───────────────────────────────┐              │
│  │  💬 CONV-O2RAK1VRJN  •  Chat  •  Agent: Alex       │              │
│  │  Sentiment: Neutral                                  │              │
│  │  "Date advance fails because a backend voucher       │              │
│  │   reference is invalid and needs a update correction" │              │
│  │  Relationship: CREATED_FROM                           │              │
│  └───────────────────────────────────────────────────────┘              │
│       │                                                                │
│       ▼                                                                │
│  ┌─ Referenced Script ─────────────────────────────────┐              │
│  │  🔧 SCRIPT-0293  •  Advance Property Date           │              │
│  │  Purpose: Run this backend data-fix script...        │              │
│  │  Inputs: <AMOUNT>, <DATABASE>, <DATE>, <ID>          │              │
│  │  Relationship: REFERENCES                             │              │
│  └───────────────────────────────────────────────────────┘              │
│                                                                        │
│  ┌─ Learning Event ────────────────────────────────────┐              │
│  │  📋 LEARN-0001  •  Approved by Tier 3 Support       │              │
│  │  Gap Detected: "No existing KB match above threshold │              │
│  │  for Advance Property Date issue"                    │              │
│  │  Draft: "Draft KB created to document backend        │              │
│  │  resolution steps for: Unable to advance property    │              │
│  │  date (backend data sync)"                           │              │
│  │  Approved: 2025-02-19                                │              │
│  └───────────────────────────────────────────────────────┘              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Components to build

**1. ProvenanceBadge** (inline on every result card)

The badge appears differently based on provenance status:
- **Has provenance** (provenance array length > 0):
  - Render: `◉ Evidence Chain (N sources)` — clickable, blue underline
  - On click: open ProvenanceModal
- **No provenance** (seed KB articles, scripts, tickets without lineage):
  - Render: `○ No chain` — gray, not clickable
  - Tooltip on hover: "This article predates the learning system. No provenance data available."
- **Is a learned article** (`metadata.source_type === "SYNTH_FROM_TICKET"`):
  - Also render a sparkle badge: `LEARNED ✨` next to the provenance badge
  - This is a visual signal that the self-learning loop produced this article

**2. ProvenanceModal** (overlay/modal that shows the full chain)

When clicked, fetch full provenance from `api.getProvenance(doc_id)` and render:

- **Header**: KB article title + doc_id
- **Chain visualization**: vertical timeline/flowchart with arrows (▼) between nodes
- **Source nodes** (one per item in `sources` array):
  - Each node has an icon by source_type:
    - Ticket: 🎫 (emerald)
    - Conversation: 💬 (blue)
    - Script: 🔧 (amber)
  - Relationship badge: "CREATED_FROM" (blue) or "REFERENCES" (gray)
  - The `detail` object fields rendered as key-value pairs
  - The `evidence_snippet` as a quote block
- **Learning Event node** (if `learning_event` is not null):
  - Icon: 📋
  - Shows: gap detected reason, draft summary, approval status + reviewer role + date
  - Status badge: Approved (green) or Rejected (red)
- **Close button** (top right)

The modal should have a semi-transparent dark backdrop and animate in (fade + slide up).

**3. Provenance for non-KB documents**

For SCRIPT results: provenance might show "Used in N tickets" — this comes from the API too. Render as a compact list: "Used in: CS-38908386, CS-12345678, ..."

For TICKET results: provenance might show "Script used: SCRIPT-0293" and "KB generated: KB-SYN-0001". Render as linked badges.

### Mock provenance data

The mock data from Prompt 1 already includes a full provenance chain for KB-SYN-0001. For the modal, use the full `/api/provenance/KB-SYN-0001` response.

For results without provenance (seed KB articles like KB-3FFBFE3C70), the provenance array will be empty and `has_provenance` will be false.

**Acceptance criteria:**
- ProvenanceBadge renders on every result card in the copilot
- Clicking a badge with provenance opens the ProvenanceModal
- The modal shows a vertical chain with 3 source nodes + 1 learning event node
- Each node has the correct icon and color by source_type
- The chain has visual arrows/connectors between nodes
- Badges without provenance show "No chain" in gray
- "LEARNED ✨" badge appears on SYNTH_FROM_TICKET articles
- Modal closes on backdrop click or close button

---
---

## PROMPT 4 OF 5 — DASHBOARD VIEW

You are building the Meridian dashboard — the second screen judges will see. This shows the health of the knowledge base, the self-learning pipeline, emerging issues, and eval metrics. This is where we prove the system isn't just a one-time demo but an operationalized intelligence layer.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MERIDIAN DASHBOARD                                              [Refresh] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ KNOWLEDGE HEALTH ──────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │  3,207   │  │   714    │  │   161    │  │    25    │           │   │
│  │  │ Articles │  │ Scripts  │  │ Learned ✨│  │Placeholders│          │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │   │
│  │                                                                      │   │
│  │  [Donut chart: 3046 Seed vs 161 Learned]  [Bar: body length dist]  │   │
│  │  [Progress: 199/3207 articles have metadata (6.2%)]                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ LEARNING PIPELINE ──────┐  ┌─ EVAL METRICS ───────────────────────┐   │
│  │                           │  │                                       │   │
│  │  134 Approved   ██████░░  │  │  Retrieval Accuracy (hit@k)          │   │
│  │   27 Rejected   ██░░░░░░  │  │  ┌──────────────────────────────┐   │   │
│  │    3 Pending    █░░░░░░░  │  │  │  [bar chart: hit@1/3/5/10]   │   │   │
│  │                           │  │  │  overall + by Answer_Type     │   │   │
│  │  ┌ PENDING REVIEW ─────┐ │  │  └──────────────────────────────┘   │   │
│  │  │  DRAFT-001           │ │  │                                       │   │
│  │  │  HAP Voucher Sync... │ │  │  Classification: 71% accuracy        │   │
│  │  │  From: CS-12345678   │ │  │  [confusion matrix heatmap]          │   │
│  │  │  [Approve] [Reject]  │ │  │                                       │   │
│  │  └──────────────────────┘ │  │  ┌ SELF-LEARNING PROOF ────────────┐ │   │
│  │                           │  │  │  Before: hit@5 = 48%             │ │   │
│  │  Recent Approvals:        │  │  │  After:  hit@5 = 61%  ▲ +13 pp  │ │   │
│  │  ✓ KB-SYN-0001 (02/19)  │  │  │  134 gaps closed                 │ │   │
│  │  ✓ KB-SYN-0002 (02/19)  │  │  │  [before/after bar comparison]   │ │   │
│  │  ✗ KB-SYN-0158 (02/20)  │  │  └──────────────────────────────────┘ │   │
│  └───────────────────────────┘  └───────────────────────────────────────┘   │
│                                                                             │
│  ┌─ EMERGING ISSUES ───────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  🔴 Advance Property Date  │ 118 tickets │ avg sim: 0.32 │ T3      │   │
│  │  🟡 HAP / Voucher Process  │  43 tickets │ avg sim: 0.38 │ T2/T3   │   │
│  │  🟡 Certifications         │  38 tickets │ avg sim: 0.35 │ T2/T3   │   │
│  │  🟢 Move-Out               │  15 tickets │ avg sim: 0.45 │ T1      │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ TICKET DISTRIBUTION ───────────────────────────────────────────────┐   │
│  │  [Pie: by Tier]  [Bar: by Priority]  [Horizontal bar: by Module]    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components to build

**1. KnowledgeHealth** — summary metrics cards + charts
- 4 metric cards (large numbers): Total Articles (3,207), Scripts (714), Learned Articles (161 ✨), Placeholders (25)
- Donut chart (Recharts PieChart): Seed KB (3,046) vs Learned KB (161). Colors: seed=slate, learned=blue.
- Metadata coverage bar: "199 / 3,207 articles have metadata (6.2%)" — progress bar
- This communicates: "there's a massive seed KB with no metadata, and the learning system is enriching it"

**2. LearningPipeline** — approval workflow status
- 3 status rows with mini bar charts: Approved (134, green), Rejected (27, red), Pending (N, yellow)
- **Approval Queue**: list of pending KB drafts. Each shows:
  - Draft title (truncated)
  - Source ticket number
  - Detected gap description
  - Generated timestamp
  - [Approve ✓] and [Reject ✗] buttons
  - On approve: call `api.approveDraft(draftId)` → update status to green
  - On reject: call `api.rejectDraft(draftId)` → update status to red
- **Recent Activity**: scrollable list of recent learning events (last 10). Each shows:
  - ✓ (green) or ✗ (red) icon
  - KB article ID
  - Date
  - Reviewer role

**3. EvalResults** — the numbers that win the hackathon
- **Retrieval Accuracy bar chart** (Recharts BarChart):
  - X axis: hit@1, hit@3, hit@5, hit@10
  - Grouped bars: Overall, SCRIPT, KB, TICKET_RESOLUTION
  - Colors match the type system (amber, blue, emerald, gray for overall)
- **Classification accuracy**: single big number (71%) with a confusion matrix rendered as a 3×3 colored grid (heatmap style — darker = more)
- **Self-Learning Proof** (the hero metric):
  - Big callout card with before/after comparison
  - Before: hit@5 = X% (gray bar)
  - After: hit@5 = Y% (blue bar)
  - Delta: ▲ +Z pp (green text, large)
  - "N gaps closed" subtext
  - This is the single most important visual on the dashboard. Make it visually prominent — larger than other cards, with a subtle glow or border treatment.

**4. EmergingIssues** — clustered gap alerts
- Table/card list showing issue clusters detected by the gap detector
- Columns: Category, Module, Ticket Count, Avg Similarity, Severity indicator
- Color code severity: <0.30 avg sim = 🔴 red, 0.30-0.40 = 🟡 yellow, >0.40 = 🟢 green
- Sorted by ticket count descending
- Each row is expandable to show the sample resolution text

**5. TicketDistribution** — context charts
- Pie chart: tickets by Tier (T1=green, T2=yellow, T3=red)
- Bar chart: tickets by Priority (Critical=red, High=orange, Medium=yellow, Low=gray)
- Horizontal bar chart: tickets by Module (top 8)

### Data source
All data comes from `api.getDashboard()` which returns the mock `/api/dashboard/stats` response. Parse it once on mount and distribute to sub-components.

**Acceptance criteria:**
- Dashboard loads and renders all 5 sections
- Knowledge health shows 4 metric cards with correct numbers
- Donut chart renders seed vs learned split
- Learning pipeline shows approve/reject buttons that trigger API calls
- Eval results show retrieval bar chart with 4 grouped bars
- Self-learning proof card shows before/after with delta
- Emerging issues table renders with correct severity colors
- Ticket distribution shows 3 charts
- All charts use Recharts components
- Dashboard is responsive — stacks vertically on smaller screens

---
---

## PROMPT 5 OF 5 — QA SCORING VIEW

You are building the QA scoring interface. This uses the production-grade rubric from the dataset to score support interactions (call/chat transcripts) and case tickets. The scoring can be done by an LLM (via Person 3's API) or manually by a QA analyst using this interface.

### The QA Rubric (verbatim from the dataset)

The rubric has 3 sections:

**Interaction QA (Call/Chat) — 10 parameters, 100% weight:**
- Customer Delight (50%): Conversational & Professional (10%), Engagement & Personalization (10%), Tone & Pace (10%), Language (10%), Objection Handling / Conversation Control (10%)
- Resolution Handling (50%): Delivered Expected Outcome (10%, AUTOZERO if No), Exhibit Critical Thinking (10%), Educate & Accurately Handle Information (10%), Effective Use of Resources (10%), Call/Case Control & Timeliness (10%)

**Case QA (Ticket) — 10 parameters, 100% weight:**
- Documentation Quality (50%): Clear Problem Summary (10%), Captured Key Context (10%), Action Log Completeness (10%), Correct Categorization (10%), Customer-Facing Clarity (10%)
- Resolution Quality (50%): Resolution Specific & Reproducible (10%), Uses Approved Process/Scripts (10%), Accuracy of Technical Content (10%), References Knowledge Correctly (10%), Timeliness & Ownership Signals (10%)

**Red Flags (Autozero if any "Yes"):**
- Account Documentation Violation, Payment Compliance (PCI) Violation, Data Integrity & Confidentiality Violation, Misbehavior / Unprofessionalism

**Scoring formula:**
- If BOTH transcript + ticket available: Overall = 70% Interaction + 30% Case
- If only transcript: Overall = 100% Interaction
- If only ticket: Overall = 100% Case
- If Delivered_Expected_Outcome = "No": Interaction score → 0%
- If any Red Flag = "Yes": Overall → 0%

### Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│  QA SCORING                                                                │
├─────────────────────────────┬──────────────────────────────────────────────┤
│                             │                                              │
│  SELECT CASE                │  QA SCORE REPORT                             │
│                             │                                              │
│  Ticket #: [CS-38908386 ▼]  │  Overall Score: 85%  ██████████░░ │ ✓ PASS  │
│                             │                                              │
│  [Score with AI ▶]          │  Evaluation Mode: Both (70/30)               │
│  [Score Manually ▶]         │                                              │
│                             │  ┌─ Interaction QA ──── 90% ──────────────┐ │
│  ─── OR ───                 │  │                                         │ │
│                             │  │  ✓ Conversational & Professional  10/10 │ │
│  Paste transcript:          │  │  ✓ Engagement & Personalization  10/10 │ │
│  ┌───────────────────────┐  │  │  ✓ Tone & Pace                  10/10 │ │
│  │                       │  │  │  ✗ Language                       0/10 │ │
│  │                       │  │  │    └ "Used jargon without         │ │
│  │                       │  │  │       explanation"                 │ │
│  │                       │  │  │  ✓ Objection Handling            10/10 │ │
│  │                       │  │  │  ...                                    │ │
│  └───────────────────────┘  │  └─────────────────────────────────────────┘ │
│                             │                                              │
│  Paste ticket data:         │  ┌─ Case QA ──── 80% ─────────────────────┐ │
│  ┌───────────────────────┐  │  │  ...                                    │ │
│  │                       │  │  └─────────────────────────────────────────┘ │
│  │                       │  │                                              │
│  └───────────────────────┘  │  ┌─ Red Flags ──── ALL CLEAR ─────────────┐ │
│                             │  │  ○ Account Documentation     N/A        │ │
│  [Submit for Scoring ▶]     │  │  ○ Payment Compliance (PCI)  N/A        │ │
│                             │  │  ○ Data Integrity            N/A        │ │
│                             │  │  ○ Misbehavior               N/A        │ │
│                             │  └─────────────────────────────────────────┘ │
│                             │                                              │
│                             │  ┌─ Summary ──────────────────────────────┐ │
│                             │  │  Contact: "Morgan Johnson called about │ │
│                             │  │  date advance failure..."              │ │
│                             │  │  Case: "Tier 3 escalation for backend  │ │
│                             │  │  data sync issue..."                   │ │
│                             │  │  Recommendation: Keep doing ✓          │ │
│                             │  └─────────────────────────────────────────┘ │
│                             │                                              │
│                             │  [Export JSON] [Export PDF]                   │
└─────────────────────────────┴──────────────────────────────────────────────┘
```

### Components to build

**1. QAScoreForm** (left panel)
- Dropdown to select a ticket number from a preset list (use 5-10 sample ticket numbers from the dataset: CS-38908386, CS-02155732, etc.)
- "Score with AI" button: sends ticket_number to `api.scoreQA(ticketNumber)` → LLM scores it
- "Score Manually" button: opens the manual scoring mode (see below)
- OR: two text areas for pasting raw transcript and ticket data
- "Submit for Scoring" button for the paste mode

**2. Manual Scoring Mode**
- Renders all 20 parameters (10 Interaction + 10 Case) as a checklist
- Each parameter: label + 3-option toggle (Yes / No / N/A)
- If "No" is selected, expand a text field for "Tracking Item" (with autocomplete from the Tracking Items Library) and "Evidence" (free text)
- Red flags section: 4 checkboxes (default N/A)
- "Calculate Score" button: applies the weighted formula and renders the report

**3. QAScoreReport** (right panel)
- **Overall score**: large number with color (>80% green, 60-80% yellow, <60% red, 0% = AUTOZERO red with warning)
- **Evaluation mode**: "Both", "Interaction Only", or "Case Only"
- **Interaction QA section**: 10 rows, each showing parameter name, Yes/No/N/A status, score contribution (/10), and if "No": the tracking item + evidence in a collapsible block
- **Case QA section**: same format, 10 rows
- **Red Flags section**: 4 items, "ALL CLEAR" banner if none triggered, or bright red "⚠ AUTOZERO" banner if any triggered
- **Summary section**: Contact Summary, Case Summary, QA Recommendation (Keep doing / Coaching needed / Escalate / Compliance review)
- **Export buttons**: "Export JSON" (downloads the raw score JSON) and "Export PDF" (stretch goal — can be "Copy to clipboard" instead)

**4. QA Score JSON structure** (what the API returns and what the report renders)

This is the EXACT structure from the QA rubric in the dataset:
```json
{
  "Evaluation_Mode": "Both",
  "Interaction_QA": {
    "Conversational_Professional": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Engagement_Personalization": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Tone_Pace": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Language": {"score": "No", "tracking_items": ["Used jargon without explanation"], "evidence": "Agent said 'run the hrqTotalAdjPayAmount update' without explaining"},
    "Objection_Handling_Conversation_Control": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Delivered_Expected_Outcome": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Exhibit_Critical_Thinking": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Educate_Accurately_Handle_Information": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Effective_Use_of_Resources": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Call_Case_Control_Timeliness": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Final_Weighted_Score": "90%"
  },
  "Case_QA": {
    "Clear_Problem_Summary": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Captured_Key_Context": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Action_Log_Completeness": {"score": "No", "tracking_items": ["Steps taken not documented"], "evidence": "Resolution notes do not list individual troubleshooting steps"},
    "Correct_Categorization": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Customer_Facing_Clarity": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Resolution_Specific_Reproducible": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Uses_Approved_Process_Scripts_When_Required": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Accuracy_of_Technical_Content": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "References_Knowledge_Correctly": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Timeliness_Ownership_Signals": {"score": "Yes", "tracking_items": [], "evidence": ""},
    "Final_Weighted_Score": "80%"
  },
  "Red_Flags": {
    "Account_Documentation_Violation": {"score": "N/A", "tracking_items": [], "evidence": ""},
    "Payment_Compliance_PCI_Violation": {"score": "N/A", "tracking_items": [], "evidence": ""},
    "Data_Integrity_Confidentiality_Violation": {"score": "N/A", "tracking_items": [], "evidence": ""},
    "Misbehavior_Unprofessionalism": {"score": "N/A", "tracking_items": [], "evidence": ""}
  },
  "Business_Intelligence": {
    "Knowledge_Article_Attached": "Yes",
    "Screen_Recording_Available": "N/A",
    "PME_KCS_Attached": "N/A",
    "Work_Setup_WIO_WFH": "N/A",
    "Issues_IVR_IT_Tool_Audio": "N/A"
  },
  "Leader_Action_Required": "No",
  "Contact_Summary": "Morgan Johnson from Oak & Ivy Management called regarding a date advance failure in PropertySuite Affordable for Heritage Point. The issue was caused by an invalid backend voucher reference.",
  "Case_Summary": "Tier 3 escalation for backend data sync issue affecting date advance. Agent validated the error, collected context, and applied the backend data-fix script (SCRIPT-0293). Customer confirmed resolution.",
  "QA_Recommendation": "Keep doing",
  "Overall_Weighted_Score": "87%"
}
```

### Tracking Items Library (for manual scoring autocomplete)

When an agent marks "No" on a parameter, they should pick from the official tracking items. Here are ALL of them, organized by section:

**Interaction / Customer Delight:**
- Did not greet the customer or introduce self
- Did not use professional closing
- Did not use customer name when available
- Did not confirm preferred contact method / callback details when needed
- Did not acknowledge customer concern or show empathy
- Talked over customer / interrupted frequently
- Unprofessional tone (rude, dismissive, sarcastic)
- Excessive filler words or unclear communication
- Spoke too fast / too slow without adapting
- Used jargon without explanation
- Did not set expectations or agenda for the call/chat
- Did not control the conversation (rambling / no structure)
- Did not address customer objections or concerns

**Interaction / Resolution Handling:**
- Did not confirm the issue or restate problem clearly
- Did not ask clarifying questions
- Did not verify key details before troubleshooting
- Provided incorrect or conflicting information
- Did not troubleshoot logically (random steps / guessing)
- Did not use available resources when appropriate (KB, scripts, peer help)
- Did not document or summarize steps taken during the interaction
- Did not confirm resolution with the customer
- Did not provide next steps or escalation path when unresolved
- Excessive hold time or delays without explanation
- Did not manage case ownership / follow-up expectations

**Case / Documentation Quality:**
- Case description is vague or incomplete
- Missing key context (module, error text, what changed, date/time)
- Steps taken not documented
- Resolution notes missing or unclear
- Incorrect category/subcategory selection
- Priority or tier does not match impact/urgency described
- Ticket not actionable for another agent
- Internal notes contain unnecessary or confusing content

**Case / Resolution Quality:**
- Resolution not reproducible / lacks verification steps
- Did not reference script when script-required
- Did not reference knowledge article when used
- Knowledge article should have been created or updated but was not
- Technical content appears inaccurate or unsupported by evidence
- No escalation notes when escalation is required
- No follow-up plan when issue is pending

**Red Flags (Autozero):**
- Included payment card data (PCI) in transcript or case notes
- Requested or stored sensitive authentication credentials
- Shared confidential customer data inappropriately
- Instructed unsafe data changes that risk data integrity
- Discriminatory, harassing, or otherwise unprofessional behavior

Store all tracking items in a constant and use them for autocomplete suggestions in the manual scoring dropdowns.

**Acceptance criteria:**
- Dropdown lists sample ticket numbers
- "Score with AI" triggers API call and renders the report
- Manual scoring mode shows all 20 parameters with Yes/No/N/A toggles
- "No" selection expands to show tracking item autocomplete + evidence field
- Score calculation applies the correct weighted formula (70/30)
- Autozero rule works: if Delivered_Expected_Outcome = No, Interaction score → 0
- Red flag autozero works: if any flag = Yes, Overall → 0 with red banner
- Report renders all sections with correct color coding
- "Export JSON" downloads the score as a .json file
- Overall score shows correct color (green/yellow/red)

---
---

## APPENDIX: MOCK DATA CHECKLIST

Person 2 should have mock data for ALL these scenarios ready in `mockData.js`:

1. **SCRIPT-type query** response (3 primary scripts, 1 KB secondary, 1 TICKET secondary)
2. **KB-type query** response (3 primary KB articles, 1 SCRIPT secondary, 1 TICKET secondary)
3. **TICKET-type query** response (3 primary tickets, 1 KB secondary, 1 SCRIPT secondary)
4. **Full provenance chain** for KB-SYN-0001 (3 sources + learning event)
5. **Empty provenance** for KB-3FFBFE3C70 (seed article)
6. **Dashboard stats** (all sections populated)
7. **QA score report** (the full JSON shown in Prompt 5)
8. **Conversation transcript** for CS-38908386 (Chat channel, Agent Alex)
9. **Conversation transcript** for a Phone channel case
10. **3 pending KB drafts** for the approval queue

When Person 3's API is ready, flip `USE_MOCK = false` in `lib/api.js` and everything should work with no component changes.

## APPENDIX: HANDOFF NOTES FOR PERSON 3

Person 3 needs to build these FastAPI endpoints to serve Person 2's UI:

| Endpoint | Method | Request | Response | Person 1 function |
|----------|--------|---------|----------|-------------------|
| `/api/query` | POST | `{query: str, top_k?: int}` | route_and_retrieve output + provenance | `route_and_retrieve()` + `provenance.resolve_for_results()` |
| `/api/provenance/{doc_id}` | GET | — | ProvenanceChain JSON | `provenance.resolve()` |
| `/api/dashboard/stats` | GET | — | dashboard stats JSON | aggregated from DataStore + EvalHarness |
| `/api/conversations/{ticket_number}` | GET | — | conversation JSON | `datastore.conversations` lookup |
| `/api/qa/score` | POST | `{ticket_number: str}` | QA score JSON | `qa_scorer.score()` (LLM call) |
| `/api/kb/drafts` | GET | — | list of pending drafts | `kb_generator.get_pending_drafts()` |
| `/api/kb/approve/{draft_id}` | POST | — | approval result | `kb_generator.approve_draft()` + `vector_store.add_documents()` |
| `/api/kb/reject/{draft_id}` | POST | — | rejection result | `kb_generator.reject_draft()` |
| `/api/eval/run` | POST | — | full eval results | `eval_harness.run_all()` |
| `/api/gap/emerging` | GET | — | emerging issues list | `gap_detector.detect_emerging_issues()` |