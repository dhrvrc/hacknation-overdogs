# PERSON 1 (ENGINE) — MASTER PROMPT BREAKDOWN

This document contains **7 sequential prompts** for a coding agent building the retrieval engine, learning loop, and eval harness for a hackathon project called **Meridian** ("OpenEvidence for Support Agents").

Hand each prompt to the agent in order. Each is self-contained. The agent has access to the dataset file `SupportMind_Final_Data.xlsx`.

---
---

## PROMPT 1 OF 7 — THE NORTH STAR (read first, then build data_loader.py)

You are a senior ML engineer building the intelligence engine for a hackathon-winning product called **Meridian** — an "OpenEvidence for Support Agents." This is a real-time copilot that gives support agents evidence-grounded answers with full provenance tracing, plus a self-learning knowledge engine that automatically creates new knowledge base articles from resolved tickets.

You are Person 1 of a 3-person team. You own the entire backend intelligence layer. Person 2 builds the UI. Person 3 glues the API, handles the demo, and builds the approval workflow. Everything Person 2 and Person 3 build depends on YOUR modules being solid, importable, and fast.

### THE PRODUCT IN ONE PARAGRAPH

A support agent gets a question. Your engine classifies it (needs a script? a KB article? a past ticket resolution?), retrieves the best matches from a corpus of 4,321 documents, and attaches provenance to every recommendation — "this KB article was created from ticket CS-38908386, which was resolved using SCRIPT-0293." When a ticket gets resolved and the resolution doesn't match any existing KB article, your engine detects the gap, generates a draft KB article, and queues it for human approval. Once approved, it's added to the index and retrieved for the next similar question. The eval harness proves this works with ground-truth metrics.

### WHAT YOU ARE BUILDING (7 modules, in order)

```
meridian/
├── engine/
│   ├── data_loader.py       ← PROMPT 1 (this prompt)
│   ├── vector_store.py      ← PROMPT 2
│   ├── query_router.py      ← PROMPT 3
│   ├── provenance.py        ← PROMPT 4
│   ├── gap_detector.py      ← PROMPT 5
│   ├── kb_generator.py      ← PROMPT 6
│   └── eval_harness.py      ← PROMPT 7
├── config.py
└── main.py                  ← boots everything, runs eval, exposes functions for the API
```

### THE DATA — WHAT YOU HAVE

A single Excel workbook (`SupportMind_Final_Data.xlsx`) with 10 tabs. Here is the exact schema and how every table joins:

```
                    ┌─────────────────────────────────┐
                    │  Questions (1,000 rows)          │
                    │  Ground truth for eval           │
                    │  Answer_Type → routing target    │
                    └──────┬──────┬──────┬────────────┘
                           │      │      │
            (SCRIPT)───────┘      │      └───────(TICKET_RESOLUTION)
                  │            (KB)                    │
                  ▼               ▼                    ▼
    ┌─────────────────┐  ┌────────────────┐  ┌────────────────┐
    │ Scripts_Master   │  │ Knowledge_     │  │ Tickets        │
    │ (714 rows)       │  │ Articles       │  │ (400 rows)     │
    │                  │  │ (3,207 rows)   │  │                │
    └────────┬─────────┘  └───────┬────────┘  └──┬──────┬──────┘
             │                    │               │      │
             │              ┌─────┴──────┐        │      │
             │              │ KB_Lineage │◄───────┘      │
             │              │ (483 rows) │               │
             │              └─────┬──────┘               │
             │                    │                      │
             └────────────────────┘          ┌───────────┘
                                             ▼
                                    ┌────────────────┐
                                    │ Conversations  │
                                    │ (400 rows)     │
                                    └────────────────┘
```

**Join keys:**
- `Ticket_Number`: Conversations ↔ Tickets; also used as Target_ID for TICKET_RESOLUTION questions
- `Script_ID`: Tickets → Scripts_Master; Questions (SCRIPT) → Scripts_Master; KB_Lineage → Scripts_Master
- `KB_Article_ID`: Tickets → Knowledge_Articles; Questions (KB) → Knowledge_Articles; KB_Lineage → Knowledge_Articles
- `Conversation_ID`: Conversations ↔ Tickets (secondary)

**Critical data characteristics:**
- ALL 3,046 seed KB articles have NULL values in Tags, Module, Category, Created_At, Updated_At. Only the 161 synthetic (SYNTH_FROM_TICKET) articles have metadata.
- Script_Inputs can be NULL.
- Body text ranges 146–32,767 chars. Question text ranges 174–417 chars.
- 161/400 tickets have a Script_ID (all are Tier 3). 161/400 tickets have a Generated_KB_Article_ID.
- ALL join FKs resolve perfectly — you don't need to handle broken references.

**Ground truth distribution (1,000 Questions):**
- Answer_Type: 700 SCRIPT, 209 KB, 91 TICKET_RESOLUTION
- Difficulty: 605 Hard, 282 Easy, 113 Medium
- The SCRIPT questions target 569 unique scripts, but 479/700 are about "Advance Property Date"
- The KB questions target many distinct articles, with KB-783E0977C4 appearing 61 times

### NOW BUILD: data_loader.py

Create `meridian/engine/data_loader.py` that loads the entire dataset into memory and builds a unified document corpus.

**Document dataclass:**
```python
@dataclass
class Document:
    doc_id: str          # "KB-xxx", "SCRIPT-xxx", or "CS-xxx"
    doc_type: str        # "KB" | "SCRIPT" | "TICKET"
    title: str
    body: str            # full text content
    search_text: str     # concatenated text optimized for TF-IDF indexing
    metadata: dict       # type-specific fields
    provenance: list     # from KB_Lineage — empty list if no lineage exists
```

**DataStore dataclass** — holds everything:
- All raw DataFrames as named attributes
- `documents: List[Document]` — the unified corpus (should be exactly 4,321)
- `doc_index: Dict[str, Document]` — doc_id → Document for O(1) lookup
- Lookup maps: `lineage_by_kb: Dict[str, List[dict]]`, `ticket_by_number`, `script_by_id`, `kb_by_id`

**search_text construction** (this is what TF-IDF will index — must be information-rich):
- KB article: `"{title} {category} {module} {tags} {body}"`
- Script: `"{title} {purpose} {category} {module} script backend fix {inputs} {script_text}"`
- Ticket: `"{subject} {category} {module} {root_cause} resolution: {resolution} description: {description}"`

**CRITICAL:** When building search_text, any NaN/None field must become empty string `""`. The literal string `"nan"` must NEVER appear in any search_text. Use `str(x) if pd.notna(x) else ""` everywhere.

**Functions to implement:**
1. `load_data(path: str) → DataStore` — reads all tabs
2. `validate_joins(ds: DataStore) → Dict[str, bool]` — checks 5 FK relationships, logs ✓/✗ for each
3. `build_lookup_maps(ds: DataStore)` — populates the 4 lookup dicts
4. `build_document_corpus(ds: DataStore) → List[Document]` — creates all 4,321 Documents
5. `init_datastore(path: str) → DataStore` — runs the full pipeline

**Acceptance criteria:**
- `init_datastore()` returns in <10 seconds
- `len(ds.documents) == 4321` (3207 KB + 714 SCRIPT + 400 TICKET)
- All 5 FK checks pass
- `"nan"` not in any `doc.search_text` (case-insensitive check excluding words like "finance")
- `ds.lineage_by_kb["KB-SYN-0001"]` returns exactly 3 records
- `ds.ticket_by_number["CS-38908386"]` returns a Series with Tier==3

**Dependencies:** pandas, openpyxl only. No network calls.

---
---

## PROMPT 2 OF 7 — VECTOR STORE (TF-IDF Retrieval Engine)

You are building the retrieval engine for Meridian, a support agent copilot. You have a `data_loader.py` module (built in the previous step) that gives you a unified corpus of 4,321 Document objects, each with a `search_text` field optimized for TF-IDF indexing.

Your job is to build a fast, partitioned TF-IDF vector store that supports:
1. **Unified retrieval** — search all 4,321 docs at once
2. **Partitioned retrieval** — search only KB articles, only scripts, or only tickets
3. **Corpus similarity scoring** — "what is the max similarity between this new text and anything in the KB?" (used by the gap detector in Prompt 5)
4. **Dynamic index mutation** — remove docs and rebuild (for before/after eval), add docs and rebuild (for learning loop)

We are using TF-IDF + cosine similarity, NOT dense embeddings. This must work offline with sklearn only — no API calls, no GPU.

### Implementation: `meridian/engine/vector_store.py`

**RetrievalResult dataclass:**
```python
@dataclass
class RetrievalResult:
    doc_id: str
    doc_type: str       # "KB" | "SCRIPT" | "TICKET"
    title: str
    body: str           # truncated to first 2000 chars for API responses
    score: float        # cosine similarity, range [0, 1]
    metadata: dict
    provenance: list
    rank: int           # 1-indexed position in results
```

**VectorStore class:**

```python
class VectorStore:
    def build_index(self, documents: List[Document]) -> None:
        """
        Fit TF-IDF vectorizer on all documents' search_text.
        Store the sparse matrix and build partition index maps.
        
        TF-IDF params:
          max_features=30000, ngram_range=(1,2), stop_words="english",
          sublinear_tf=True, dtype=np.float32
        
        Partition maps: dict of doc_type → list of row indices in the matrix.
        """

    def retrieve(self, query: str, top_k: int = 5,
                 doc_types: Optional[List[str]] = None,
                 exclude_ids: Optional[set] = None) -> List[RetrievalResult]:
        """
        Core retrieval. Transform query, compute cosine similarity
        against candidates (filtered by doc_types and exclude_ids),
        return top_k results sorted by score descending.
        
        Use np.argpartition for O(n) top-k instead of full sort.
        Truncate body to 2000 chars in the result.
        """

    def retrieve_by_partitions(self, query: str,
                               top_k_per: int = 3) -> Dict[str, List[RetrievalResult]]:
        """
        Retrieve top_k_per from EACH partition independently.
        Returns {"KB": [...], "SCRIPT": [...], "TICKET": [...]}.
        Used by the query router to compare cross-partition relevance.
        """

    def similarity_to_corpus(self, text: str,
                             doc_types: Optional[List[str]] = None) -> Tuple[float, str]:
        """
        Returns (max_cosine_similarity, best_match_doc_id) for the given
        text against the corpus (or a partition). Used by gap detector.
        """

    def remove_documents(self, doc_ids: set) -> None:
        """Filter out documents by ID and rebuild the index from scratch."""

    def add_documents(self, new_docs: List[Document]) -> None:
        """Append new documents and rebuild the index from scratch."""

    def get_document(self, doc_id: str) -> Optional[Document]:
        """O(1) lookup by doc_id."""
```

**Performance targets:**
- `build_index` with 4,321 docs: <5 seconds
- `retrieve` for a single query: <100ms
- Matrix shape after build: (4321, ≤30000) sparse

**Acceptance criteria:**
- `retrieve("advance property date backend script", top_k=5, doc_types=["SCRIPT"])` returns 5 results, all with doc_type=="SCRIPT", all with score > 0
- `retrieve("how to edit time worked", top_k=3, doc_types=["KB"])` returns results where top-1 title contains "Time Worked" (KB-3FFBFE3C70 is the known best match)
- `retrieve_by_partitions("certifications compliance issue")` returns a dict with exactly 3 keys
- After `remove_documents({"KB-SYN-0001"})`, `get_document("KB-SYN-0001")` returns None AND the matrix row count is 4320
- After `add_documents([new_doc])`, matrix row count increases by 1

**Dependencies:** sklearn, numpy, data_loader (Document, DataStore)

---
---

## PROMPT 3 OF 7 — QUERY ROUTER (Answer_Type Classifier + Retrieval Orchestrator)

You are building the query routing layer for Meridian. When a support question comes in, you must:
1. **Classify** it as SCRIPT, KB, or TICKET_RESOLUTION — without any LLM call
2. **Route** retrieval to the right partition (primary) while also fetching secondary results from other partitions
3. **Return a structured response** that the copilot UI can render directly

This must be fast (no network calls) and reasonably accurate. We have 1,000 ground-truth questions to evaluate against (Prompt 7), so we need >65% classification accuracy as a floor.

### Why classification matters for the product

The copilot UI renders results differently by type:
- **SCRIPT** results show the script text with placeholder inputs highlighted (e.g., `<DATABASE>`, `<SITE_NAME>`) and a "Required Inputs" badge
- **KB** results show the article body with a provenance chain
- **TICKET** results show the resolution steps and a "Similar Case" badge

Wrong classification = wrong UI panel = confused agent. The router is the traffic cop.

### The classification challenge

Looking at the ground truth:
- 700/1000 questions are SCRIPT (70%) — strong prior
- 209/1000 are KB (20.9%)
- 91/1000 are TICKET_RESOLUTION (9.1%)

SCRIPT questions tend to mention backend fixes, data issues, scripts, Tier 3 escalation, specific module names like "Advance Property Date", "TRACS", "HAP/Vouchers", "Certifications."

KB questions tend to ask "how to" do something, mention configuration, steps, UI navigation, or reference a specific article-like topic.

TICKET_RESOLUTION questions ask what was done in a past case, mention a specific site name, or ask "what was the resolution."

**Sample questions by type:**

SCRIPT: "In PropertySuite Affordable, we're after a recent data import seeing a workflow block in Compliance / Certifications (Certifications) that's stopping move-ins. It appears related to backend data in backend reference data. What Tier 3 remediation script..."

KB: "Can you explain how to handle: Screening Task on Move-In Checklist Appears as Optional Despite Being Set as Required in PropertySuite Affordable and what common mistakes cause issues?"

TICKET_RESOLUTION: "A user on our team can't complete General in General. General: A report or form output doesn't look right and needs guidance (site: Meadow Pointe) What was the resolution in similar cases?"

### Implementation: `meridian/engine/query_router.py`

```python
# Keyword signal lists (tune these — these are starting points)
SCRIPT_SIGNALS = [
    "script", "backend", "run query", "data fix", "sql", "database",
    "backend fix", "data sync", "batch", "execute", "stored procedure",
    "update query", "sync issue", "data inconsistency",
    "advance property date", "date advance", "tracs", "hap", "voucher",
    "certification", "move-in", "move-out", "move in", "move out",
    "tier 3", "escalat", "backend data", "remediation",
    "workflow block", "data-fix", "backend correction"
]

KB_SIGNALS = [
    "how to", "how do i", "steps to", "guide", "walkthrough", "tutorial",
    "instructions", "process", "configure", "setup", "set up",
    "edit", "update", "change", "navigate", "where do i", "screen",
    "checklist", "optional", "required", "explain how",
    "what is the process", "can you explain"
]

TICKET_SIGNALS = [
    "resolution", "what was done", "similar case", "past case",
    "how was it resolved", "previous ticket", "what fixed",
    "resolved before", "prior incident", "what was the resolution",
    "in similar cases", "site:"
]
```

**`classify_query(query: str, vector_store: VectorStore) → Tuple[str, Dict[str, float]]`:**
1. Lowercase the query
2. Count keyword hits for each type (a signal "hits" if it appears as a substring in the query)
3. Compute keyword_score per type: `min(hits / 3.0, 1.0)` (caps at 1.0 — 3 hits = max confidence)
4. Retrieve top-1 from each partition using `vector_store.retrieve_by_partitions(query, top_k_per=1)`
5. Get retrieval_score per type: the top-1 cosine similarity score from each partition (0 if no results)
6. Combine: `final_score[type] = keyword_score * 0.4 + retrieval_score * 0.6`
7. Predicted type = argmax of final_scores
8. Tiebreaker: if scores are equal, prefer SCRIPT > KB > TICKET (matches prior distribution)
9. Return `(predicted_type, final_scores_dict)`

**`route_and_retrieve(query: str, vector_store: VectorStore, top_k: int = 5) → dict`:**
1. Call `classify_query`
2. Retrieve `top_k` from the predicted PRIMARY type
3. Retrieve `top_2` from each of the other two types (secondary results)
4. Return:
```python
{
    "query": query,
    "predicted_type": "SCRIPT" | "KB" | "TICKET",
    "confidence_scores": {"SCRIPT": float, "KB": float, "TICKET": float},
    "primary_results": [RetrievalResult, ...],   # len ≤ top_k
    "secondary_results": {                        # only the OTHER types
        "KB": [RetrievalResult, ...],
        "SCRIPT": [RetrievalResult, ...],
    }
}
```
The `secondary_results` dict should NOT include the `predicted_type` key.

**Acceptance criteria:**
- `classify_query` returns a tuple of (str, dict) where the str is one of the three valid types
- On a spot-check: "advance property date backend script" → SCRIPT
- On a spot-check: "how to edit time worked in the UI" → KB
- On a spot-check: "what was the resolution for site Meadow Pointe" → TICKET
- `route_and_retrieve` returns primary_results with correct doc_types matching predicted_type
- secondary_results has exactly 2 keys (the other two types)
- No network or LLM calls anywhere

**Dependencies:** vector_store (VectorStore, RetrievalResult)

---
---

## PROMPT 4 OF 7 — PROVENANCE RESOLVER

You are building the provenance resolution layer. This is the feature that makes Meridian different from a basic RAG system. Every recommendation the copilot shows must carry a **full evidence chain** — not just "here's a KB article" but "here's a KB article that was created from ticket CS-38908386, which captured conversation CONV-O2RAK1VRJN, where the agent used SCRIPT-0293 to fix the issue."

### The data that powers provenance

**KB_Lineage** (483 rows) maps synthetic KB articles back to their sources:
```
KB-SYN-0001:
  → Ticket: CS-38908386 (CREATED_FROM) — "Derived from Tier 3 ticket CS-38908386: Unable to advance property date (backend data sync)"
  → Conversation: CONV-O2RAK1VRJN (CREATED_FROM) — "Conversation context captured in CONV-O2RAK1VRJN for ticket CS-38908386."
  → Script: SCRIPT-0293 (REFERENCES) — "This KB references Script_ID SCRIPT-0293 for the backend fix procedure."
```

Each synthetic KB article (KB-SYN-xxxx) has exactly 3 lineage records: one Ticket (CREATED_FROM), one Conversation (CREATED_FROM), one Script (REFERENCES).

The 3,046 seed KB articles have NO lineage records.

**Learning_Events** (161 rows) show the approval workflow:
```
LEARN-0001:
  Trigger_Ticket_Number: CS-38908386
  Detected_Gap: "No existing KB match above threshold for Advance Property Date issue; escalated to Tier 3."
  Proposed_KB_Article_ID: KB-SYN-0001
  Final_Status: Approved
  Reviewer_Role: Tier 3 Support
```

### Implementation: `meridian/engine/provenance.py`

**`ProvenanceChain` dataclass:**
```python
@dataclass
class ProvenanceChain:
    kb_article_id: str
    kb_title: str
    sources: list          # list of ProvenanceSource
    learning_event: dict   # from Learning_Events, or None
    has_provenance: bool   # True if any lineage exists

@dataclass
class ProvenanceSource:
    source_type: str       # "Ticket" | "Conversation" | "Script"
    source_id: str         # "CS-xxx" | "CONV-xxx" | "SCRIPT-xxx"
    relationship: str      # "CREATED_FROM" | "REFERENCES"
    evidence_snippet: str
    # Enriched fields (resolved from lookup maps):
    detail: dict           # depends on source_type — see below
```

**Enrichment by source_type:**
- Ticket: `{"subject": ..., "tier": ..., "resolution": ..., "root_cause": ..., "module": ...}`
- Conversation: `{"channel": ..., "agent_name": ..., "sentiment": ..., "issue_summary": ...}`
- Script: `{"title": ..., "purpose": ..., "inputs": ...}`

**`ProvenanceResolver` class:**
```python
class ProvenanceResolver:
    def __init__(self, datastore: DataStore):
        # Store references to lineage_by_kb, ticket_by_number,
        # script_by_id, conversations DataFrame, learning_events DataFrame

    def resolve(self, doc_id: str) -> ProvenanceChain:
        """
        Given any doc_id, build its full provenance chain.
        
        If doc_type is KB and lineage exists → full chain with enriched sources
        If doc_type is KB and no lineage → has_provenance=False, empty sources
        If doc_type is SCRIPT → look up which tickets reference this script,
            return those tickets as "used_by" provenance
        If doc_type is TICKET → look up its script_id and kb_article_id,
            return those as "references" provenance
        """

    def resolve_for_results(self, results: List[RetrievalResult]) -> List[dict]:
        """
        Batch resolve provenance for a list of retrieval results.
        Returns a list of dicts, each being the JSON-serializable form
        of a ProvenanceChain. Same order as input.
        """

    def get_learning_event(self, kb_article_id: str) -> Optional[dict]:
        """
        Look up the Learning_Events row for a given KB article.
        Returns dict with keys: event_id, trigger_ticket, detected_gap,
        draft_summary, final_status, reviewer_role, timestamp.
        Returns None if no learning event exists.
        """
```

**JSON output format** (what the copilot UI will render):
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
            "evidence_snippet": "Derived from Tier 3 ticket CS-38908386...",
            "detail": {
                "subject": "Unable to advance property date...",
                "tier": 3,
                "resolution": "Validated issue, collected exact error...",
                "root_cause": "Data inconsistency requiring backend fix",
                "module": "Accounting / Date Advance"
            }
        },
        {
            "source_type": "Conversation",
            "source_id": "CONV-O2RAK1VRJN",
            "relationship": "CREATED_FROM",
            "evidence_snippet": "Conversation context captured...",
            "detail": {
                "channel": "Chat",
                "agent_name": "Alex",
                "sentiment": "Neutral",
                "issue_summary": "Date advance fails because..."
            }
        },
        {
            "source_type": "Script",
            "source_id": "SCRIPT-0293",
            "relationship": "REFERENCES",
            "evidence_snippet": "This KB references Script_ID SCRIPT-0293...",
            "detail": {
                "title": "Accounting / Date Advance",
                "purpose": "Run this backend data-fix script...",
                "inputs": "<DATABASE>, <SITE_NAME>, <ID>"
            }
        }
    ],
    "learning_event": {
        "event_id": "LEARN-0001",
        "trigger_ticket": "CS-38908386",
        "detected_gap": "No existing KB match above threshold...",
        "draft_summary": "Draft KB created to document...",
        "final_status": "Approved",
        "reviewer_role": "Tier 3 Support",
        "timestamp": "2025-02-19T02:05:13"
    }
}
```

**Acceptance criteria:**
- `resolve("KB-SYN-0001")` returns a ProvenanceChain with 3 sources, all enriched, and a learning_event
- `resolve("KB-3FFBFE3C70")` (a seed KB article) returns has_provenance=False, empty sources
- `resolve("SCRIPT-0293")` returns provenance showing which tickets used this script
- `resolve("CS-38908386")` returns provenance linking to its script and KB references
- `resolve_for_results([...])` returns JSON-serializable dicts in the same order

**Dependencies:** data_loader (DataStore), vector_store (RetrievalResult). No network calls.

---
---

## PROMPT 5 OF 7 — GAP DETECTOR

You are building the knowledge gap detection system. This is the trigger for the entire self-learning loop. When a ticket gets resolved, you check: "Does our KB already cover this resolution?" If not, you flag a gap and hand it to the KB generator (Prompt 6).

### How gap detection works conceptually

1. A ticket is resolved. It has a `Resolution` text describing what was done.
2. Compute the similarity of that resolution text against ALL existing KB articles.
3. If the best match score is BELOW a threshold → this is a **knowledge gap**. The resolution contains new information that isn't captured in any existing KB article.
4. Also compute similarity against the ticket's `Description` + `Subject` to see if the *problem itself* is novel.
5. For emerging issue detection: cluster recent unmatched tickets to see if multiple customers are hitting the same new problem.

### The similarity threshold

Looking at the data: the 161 synthetic KB articles were created FROM tickets. So if we remove those articles and check the similarity of those ticket resolutions against the remaining seed KB, the scores should be LOW (that's why those articles needed to be created). This gives us an empirical way to set the threshold.

Use a default threshold of **0.40** cosine similarity. Below this = gap. This should be a configurable parameter.

### Implementation: `meridian/engine/gap_detector.py`

```python
@dataclass
class GapDetectionResult:
    ticket_number: str
    is_gap: bool
    resolution_similarity: float       # best match score of resolution vs KB
    best_matching_kb_id: str           # which KB article was closest
    problem_similarity: float          # best match score of description vs KB
    best_matching_kb_for_problem: str
    resolution_text: str
    description_text: str
    tier: int
    module: str
    category: str
    script_id: Optional[str]          # if a script was used (Tier 3)
    conversation_id: Optional[str]


class GapDetector:
    def __init__(self, vector_store: VectorStore, datastore: DataStore,
                 threshold: float = 0.40):
        self.vector_store = vector_store
        self.datastore = datastore
        self.threshold = threshold

    def check_ticket(self, ticket_number: str) -> GapDetectionResult:
        """
        Check a single resolved ticket for knowledge gaps.
        
        1. Look up the ticket from datastore.ticket_by_number
        2. Get its Resolution text
        3. Call vector_store.similarity_to_corpus(resolution, doc_types=["KB"])
        4. Get its Subject + Description text
        5. Call vector_store.similarity_to_corpus(description, doc_types=["KB"])
        6. If resolution_similarity < threshold → is_gap = True
        """

    def scan_all_tickets(self) -> List[GapDetectionResult]:
        """
        Scan all 400 tickets. Return results sorted by
        resolution_similarity ascending (worst gaps first).
        """

    def detect_emerging_issues(self, gap_results: List[GapDetectionResult],
                               min_cluster_size: int = 3) -> List[dict]:
        """
        Among the gap results where is_gap=True, cluster by category+module.
        
        If a (category, module) pair has >= min_cluster_size gaps,
        flag it as an emerging issue.
        
        Return list of:
        {
            "category": str,
            "module": str,
            "ticket_count": int,
            "ticket_numbers": [str, ...],
            "avg_similarity": float,
            "sample_resolution": str  # from the first ticket
        }
        Sorted by ticket_count descending.
        """

    def before_after_comparison(self) -> dict:
        """
        THE KEY EVAL METRIC FOR THE SELF-LEARNING STORY.
        
        1. Record current gap scan results (with 161 synthetic KBs present)
        2. Get the 161 synthetic KB doc_ids
        3. Call vector_store.remove_documents(synthetic_ids)
        4. Re-scan all tickets → "before" results
        5. Call vector_store.add_documents(synthetic_docs)
        6. Re-scan all tickets → "after" results (should match step 1)
        7. Return comparison metrics:
        {
            "before_learning": {
                "total_gaps": int,
                "avg_resolution_similarity": float,
                "gaps_by_tier": {1: int, 2: int, 3: int}
            },
            "after_learning": {
                "total_gaps": int,
                "avg_resolution_similarity": float,
                "gaps_by_tier": {1: int, 2: int, 3: int}
            },
            "improvement": {
                "gaps_closed": int,
                "similarity_lift": float,
                "pct_improvement": float
            }
        }
        """
```

**Key insight for the agent:** The 161 synthetic KB articles are the "learned" knowledge. Before they exist, the Tier 3 tickets have gaps. After they exist, those gaps are filled. The before/after comparison IS the proof that the self-learning loop works.

**Acceptance criteria:**
- `check_ticket("CS-38908386")` returns a GapDetectionResult (this is a Tier 3 ticket with a synthetic KB — when that KB is present, it should NOT be a gap; when removed, it should be)
- `scan_all_tickets()` returns exactly 400 results
- `detect_emerging_issues()` returns at least 1 cluster (Advance Property Date should be the biggest)
- `before_after_comparison()` returns a dict where `before_learning.total_gaps > after_learning.total_gaps`
- The `gaps_closed` number should be substantial (reflecting the 161 synthetic articles filling real gaps)

**Dependencies:** vector_store (VectorStore), data_loader (DataStore). No network calls.

---
---

## PROMPT 6 OF 7 — KB GENERATOR (LLM-Powered Article Drafting)

You are building the knowledge base article generator. When the gap detector flags a ticket resolution that isn't covered by existing KB, this module takes the ticket + its conversation transcript + the script used (if any) and generates a structured KB article draft.

### This module calls the Anthropic API

Unlike all previous modules, this one makes LLM calls. Use the Anthropic Python SDK to call `claude-sonnet-4-20250514`. The API key will be in the environment variable `ANTHROPIC_API_KEY`. If the key is not set, the module should still work by returning a template-based draft (no LLM) as a fallback.

### What a good generated KB article looks like

Here's an actual synthetic KB article from the dataset (KB-SYN-0001). Your generator should produce articles in this same format:

```
PropertySuite Affordable: Advance Property Date - Unable to advance property date (backend data sync)

Summary
- This article documents a Tier 3-style backend data fix for a Advance Property Date issue in Accounting / Date Advance.

Applies To
- ExampleCo PropertySuite Affordable
- Module: Accounting / Date Advance
- Category: Advance Property Date

Symptoms
- Date advance fails because a backend voucher reference is invalid and needs a update correction.

Resolution Steps
1. Confirm there are no open batches (bank deposits, posting batches, or month-end tasks).
2. Verify the current property date and the next business date in the property calendar.
3. Check for any blocking validation messages and note the exact wording.
4. Escalate to Tier 3 for a backend data-fix script; validate once applied.

Script Reference
- Script_ID: SCRIPT-0293
- Required Inputs: <DATABASE>, <SITE_NAME>, <ID>
- Script Purpose: Run this backend data-fix script to resolve a Date Advance issue.

Source Ticket
- Ticket: CS-38908386 (Tier 3, Priority: High)
- Root Cause: Data inconsistency requiring backend fix

Tags: PropertySuite, affordable, date-advance, month-end, validation, property-calendar
```

### Implementation: `meridian/engine/kb_generator.py`

```python
@dataclass
class KBDraft:
    draft_id: str               # "DRAFT-{timestamp}" format
    title: str
    body: str                   # the full article text
    tags: List[str]
    module: str
    category: str
    source_ticket: str          # Ticket_Number
    source_conversation: str    # Conversation_ID
    source_script: Optional[str]  # Script_ID if applicable
    generated_at: str           # ISO timestamp
    generation_method: str      # "llm" or "template"
    status: str                 # "Pending"


class KBGenerator:
    def __init__(self, datastore: DataStore, api_key: str = ""):
        self.datastore = datastore
        self.api_key = api_key
        self.drafts: List[KBDraft] = []  # in-memory draft queue

    def generate_draft(self, ticket_number: str) -> KBDraft:
        """
        Generate a KB article draft from a resolved ticket.
        
        1. Look up ticket, its conversation, and its script (if any)
        2. If API key is set, call Claude to generate the article
        3. If not, use the template fallback
        4. Create a KBDraft, add it to self.drafts, return it
        """

    def _generate_with_llm(self, ticket: dict, conversation: dict,
                           script: Optional[dict]) -> Tuple[str, str]:
        """
        Call Claude API to generate title and body.
        Returns (title, body).
        
        System prompt should instruct the model to produce a KB article
        in the exact format shown above (Summary, Applies To, Symptoms,
        Resolution Steps, Script Reference, Source Ticket, Tags sections).
        
        The user prompt should include the ticket description, resolution,
        conversation transcript (truncated to 3000 chars), and script text
        (if applicable).
        """

    def _generate_with_template(self, ticket: dict, conversation: dict,
                                script: Optional[dict]) -> Tuple[str, str]:
        """
        Fallback: build the article from a string template.
        Uses the ticket's actual fields to fill in each section.
        No LLM needed. Less polished but structurally correct.
        """

    def get_pending_drafts(self) -> List[KBDraft]:
        """Return all drafts with status 'Pending'."""

    def approve_draft(self, draft_id: str) -> Optional[Document]:
        """
        Mark draft as 'Approved'.
        Convert it to a Document object (with doc_type="KB",
        doc_id="KB-DRAFT-{n}", source_type="GENERATED").
        Return the Document so the caller can add it to the vector store.
        """

    def reject_draft(self, draft_id: str) -> bool:
        """Mark draft as 'Rejected'. Return True if found."""
```

**The LLM prompt (for _generate_with_llm):**

System: "You are a technical writer for a support knowledge base. Generate a structured KB article from the provided ticket, conversation, and script information. Follow the exact format: Summary, Applies To, Symptoms, Resolution Steps, Script Reference (if applicable), Source Ticket, Tags. Be precise and actionable. Use the actual data — do not invent information."

User: (include ticket description, resolution, root cause, module, category, conversation transcript truncated to 3000 chars, script text + inputs if applicable)

**Acceptance criteria:**
- `generate_draft("CS-38908386")` returns a KBDraft with a non-empty title and body
- The body contains section headers: "Summary", "Resolution Steps", "Source Ticket"
- `get_pending_drafts()` returns the draft
- `approve_draft(draft_id)` returns a Document with doc_type=="KB"
- If no API key is set, generation still works (template fallback)
- Template-generated articles still have all required sections

**Dependencies:** data_loader (DataStore), anthropic SDK (pip install anthropic). Handle ImportError gracefully — if anthropic isn't installed, fall back to template.

---
---

## PROMPT 7 OF 7 — EVAL HARNESS

You are building the evaluation harness that proves the system works with hard numbers. This is what goes in the demo slides. The eval uses the 1,000 ground-truth Questions from the dataset.

### Three evaluations to implement

**Eval 1: Retrieval Accuracy (hit@k)**

For each of the 1,000 questions:
1. The question has a known `Answer_Type` (SCRIPT/KB/TICKET_RESOLUTION) and `Target_ID` (the correct document)
2. Run `route_and_retrieve(question_text, vector_store, top_k=10)` 
3. Check: does `Target_ID` appear in the top-k results?
4. Compute hit@1, hit@3, hit@5, hit@10

Slice results by:
- Overall
- By Answer_Type (SCRIPT / KB / TICKET_RESOLUTION)
- By Difficulty (Easy / Medium / Hard)

**Eval 2: Classification Accuracy**

For each of the 1,000 questions:
1. Run `classify_query(question_text, vector_store)`
2. Compare predicted_type to actual Answer_Type
3. Compute accuracy, precision, recall, F1 per class
4. Build a confusion matrix

**Eval 3: Before/After Learning Loop**

This uses `gap_detector.before_after_comparison()` which:
1. Removes the 161 synthetic KB articles
2. Runs retrieval eval with the degraded index
3. Re-adds the 161 synthetic KB articles
4. Runs retrieval eval with the full index
5. Shows the improvement delta

This is the headline metric for the demo: "Our self-learning loop improved retrieval accuracy from X% to Y%."

### Implementation: `meridian/engine/eval_harness.py`

```python
class EvalHarness:
    def __init__(self, datastore: DataStore, vector_store: VectorStore,
                 query_router_module, gap_detector: GapDetector):
        self.ds = datastore
        self.vs = vector_store
        self.router = query_router_module  # the module itself, for classify_query / route_and_retrieve
        self.gap = gap_detector

    def eval_retrieval(self, top_k_values: List[int] = [1, 3, 5, 10]) -> dict:
        """
        Run retrieval eval over all 1,000 questions.
        
        For each question:
          - Call route_and_retrieve(question_text, vector_store, top_k=max(top_k_values))
          - Collect ALL result doc_ids (primary + all secondary)
          - For each k in top_k_values: check if Target_ID is in the first k results
        
        Return:
        {
            "overall": {"hit@1": float, "hit@3": float, "hit@5": float, "hit@10": float},
            "by_answer_type": {
                "SCRIPT": {"hit@1": float, ...},
                "KB": {"hit@1": float, ...},
                "TICKET_RESOLUTION": {"hit@1": float, ...}
            },
            "by_difficulty": {
                "Easy": {"hit@1": float, ...},
                "Medium": {"hit@1": float, ...},
                "Hard": {"hit@1": float, ...}
            },
            "total_questions": 1000,
            "evaluated_at": "ISO timestamp"
        }
        """

    def eval_classification(self) -> dict:
        """
        Run classification eval over all 1,000 questions.
        
        Return:
        {
            "accuracy": float,
            "per_class": {
                "SCRIPT": {"precision": float, "recall": float, "f1": float, "support": int},
                "KB": {"precision": float, "recall": float, "f1": float, "support": int},
                "TICKET_RESOLUTION": {"precision": float, "recall": float, "f1": float, "support": int}
            },
            "confusion_matrix": {
                "actual_SCRIPT":  {"pred_SCRIPT": int, "pred_KB": int, "pred_TICKET": int},
                "actual_KB":      {"pred_SCRIPT": int, "pred_KB": int, "pred_TICKET": int},
                "actual_TICKET":  {"pred_SCRIPT": int, "pred_KB": int, "pred_TICKET": int}
            },
            "total_questions": 1000
        }
        """

    def eval_before_after(self) -> dict:
        """
        The headline self-learning proof.
        
        1. Identify the 161 synthetic KB doc_ids (Source_Type == SYNTH_FROM_TICKET)
        2. Store the current eval_retrieval results as "after_learning"
        3. vector_store.remove_documents(synthetic_ids)
        4. Run eval_retrieval → "before_learning"
        5. vector_store.add_documents(synthetic_docs) to restore
        6. Also include gap_detector.before_after_comparison() results
        
        Return:
        {
            "before_learning": {
                "retrieval": { same structure as eval_retrieval output },
                "gaps": { from gap_detector }
            },
            "after_learning": {
                "retrieval": { same structure as eval_retrieval output },
                "gaps": { from gap_detector }
            },
            "delta": {
                "hit@1_improvement": float,   # after - before
                "hit@5_improvement": float,
                "gaps_closed": int,
                "headline": "Self-learning loop improved hit@5 from X% to Y% (+Z pp)"
            }
        }
        """

    def run_all(self) -> dict:
        """Run all three evals and return combined results."""
        return {
            "retrieval": self.eval_retrieval(),
            "classification": self.eval_classification(),
            "before_after": self.eval_before_after(),
        }

    def print_report(self, results: dict) -> str:
        """
        Pretty-print the eval results as a formatted text report.
        Include tables for retrieval scores, confusion matrix,
        and the before/after comparison.
        Return the report as a string.
        """
```

**Important implementation detail for retrieval eval:**

When computing hit@k, you need to check the Target_ID against the FULL result set (primary + secondary). The route_and_retrieve function returns primary_results (top_k from predicted type) and secondary_results (top_2 from each other type). Combine them all into a single ranked list:
1. Primary results first (ranks 1 through len(primary))
2. Then secondary results interleaved (lower priority)

If the router misclassifies a SCRIPT question as KB, the correct SCRIPT target might still appear in the secondary results — we should still count that as a hit at the appropriate rank.

**Performance note:** 1,000 questions × retrieval = expect ~30-60 seconds total. Print progress every 100 questions.

**Acceptance criteria:**
- `eval_retrieval()` returns scores for all k values and all slices
- Overall hit@5 should be >30% (TF-IDF baseline on this corpus — it's not going to be amazing, but should be nonzero and meaningful)
- `eval_classification()` returns accuracy >60% (the keyword + retrieval hybrid should beat random)
- `eval_before_after()` shows measurable improvement: after_learning hit@k > before_learning hit@k
- `print_report()` produces a readable text report
- The entire `run_all()` completes in <5 minutes

**Dependencies:** All previous modules (data_loader, vector_store, query_router, provenance, gap_detector). sklearn for metrics (precision_recall_fscore_support, confusion_matrix). No network calls (except optionally for kb_generator if integrated).

---
---

## APPENDIX: main.py (Boot Script)

After all 7 modules are built, create `meridian/main.py`:

```python
"""
Meridian Engine — boot and run.
Usage:
    python -m meridian.main                  # boot + print stats
    python -m meridian.main --eval           # boot + run full eval
    python -m meridian.main --query "text"   # boot + run a single query
"""
import argparse, time, json, logging
from .config import DATA_PATH
from .engine.data_loader import init_datastore
from .engine.vector_store import VectorStore
from .engine.query_router import classify_query, route_and_retrieve
from .engine.provenance import ProvenanceResolver
from .engine.gap_detector import GapDetector
from .engine.kb_generator import KBGenerator
from .engine.eval_harness import EvalHarness

logging.basicConfig(level=logging.INFO)

def boot():
    t0 = time.time()
    ds = init_datastore(DATA_PATH)
    vs = VectorStore()
    vs.build_index(ds.documents)
    prov = ProvenanceResolver(ds)
    gap = GapDetector(vs, ds)
    gen = KBGenerator(ds)
    evl = EvalHarness(ds, vs, query_router_module=__import__('meridian.engine.query_router', fromlist=['*']), gap_detector=gap)
    print(f"Meridian booted in {time.time()-t0:.1f}s — {len(ds.documents)} docs indexed")
    return ds, vs, prov, gap, gen, evl

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--eval", action="store_true")
    parser.add_argument("--query", type=str, default=None)
    args = parser.parse_args()

    ds, vs, prov, gap, gen, evl = boot()

    if args.eval:
        results = evl.run_all()
        print(evl.print_report(results))
    elif args.query:
        result = route_and_retrieve(args.query, vs)
        provenance = prov.resolve_for_results(result["primary_results"])
        print(json.dumps({
            "predicted_type": result["predicted_type"],
            "confidence": result["confidence_scores"],
            "results": [{"title": r.title, "score": r.score, "doc_id": r.doc_id} for r in result["primary_results"]],
            "provenance": provenance,
        }, indent=2, default=str))
    else:
        print(f"Documents: {len(ds.documents)}")
        print(f"  KB: {sum(1 for d in ds.documents if d.doc_type=='KB')}")
        print(f"  SCRIPT: {sum(1 for d in ds.documents if d.doc_type=='SCRIPT')}")
        print(f"  TICKET: {sum(1 for d in ds.documents if d.doc_type=='TICKET')}")
```

This is the entry point Person 3 will import from to build the FastAPI server.

---
---

## APPENDIX: config.py

```python
"""Meridian Engine Configuration"""
import os

DATA_PATH = os.environ.get("MERIDIAN_DATA", "SupportMind_Final_Data.xlsx")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
GAP_SIMILARITY_THRESHOLD = 0.40
TOP_K_DEFAULT = 5
TFIDF_MAX_FEATURES = 30000
EVAL_HIT_K_VALUES = [1, 3, 5, 10]
```