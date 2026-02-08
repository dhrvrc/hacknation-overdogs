"""
Meridian Frontend Contract Layer

Pydantic response models and adapter functions that guarantee the backend
returns JSON shapes exactly matching what the frontend components expect.

Every model here is the single source of truth for the API <-> UI contract.
"""
import logging
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ============================================================================
# POST /api/query — Response Models
# ============================================================================

class ProvenanceItem(BaseModel):
    """Inline provenance record attached to a search result."""
    source_type: str  # "Ticket" | "Conversation" | "Script"
    source_id: str
    relationship: str  # "CREATED_FROM" | "REFERENCES" | "USED_BY"
    evidence_snippet: str


class ResultItem(BaseModel):
    """A single search result (used in both primary and secondary results)."""
    doc_id: str
    doc_type: str  # "SCRIPT" | "KB" | "TICKET"
    title: str
    body: str
    score: float
    metadata: Dict[str, Any]
    provenance: List[ProvenanceItem] = Field(default_factory=list)
    rank: int


class ConfidenceScores(BaseModel):
    """Classification confidence scores per document type."""
    SCRIPT: float
    KB: float
    TICKET: float


class QueryResponse(BaseModel):
    """Response model for POST /api/query."""
    query: str
    predicted_type: str  # "SCRIPT" | "KB" | "TICKET"
    confidence_scores: ConfidenceScores
    primary_results: List[ResultItem]
    secondary_results: Dict[str, List[ResultItem]]


# ============================================================================
# GET /api/provenance/{doc_id} — Response Models
# ============================================================================

class ProvenanceSourceDetail(BaseModel):
    """Full provenance source with detail dict (used in ProvenanceModal)."""
    source_type: str  # "Ticket" | "Conversation" | "Script"
    source_id: str
    relationship: str
    evidence_snippet: str
    detail: Dict[str, Any] = Field(default_factory=dict)


class LearningEvent(BaseModel):
    """Learning event metadata for a synthetic KB article."""
    event_id: str
    trigger_ticket: str
    detected_gap: str
    draft_summary: str
    final_status: str  # "Approved" | "Rejected"
    reviewer_role: str
    timestamp: str  # ISO 8601


class ProvenanceResponse(BaseModel):
    """Response model for GET /api/provenance/{doc_id}."""
    kb_article_id: str
    kb_title: str
    has_provenance: bool
    sources: List[ProvenanceSourceDetail]
    learning_event: Optional[LearningEvent] = None


# ============================================================================
# GET /api/dashboard/stats — Response Models
# ============================================================================

class KnowledgeHealth(BaseModel):
    """Knowledge base health metrics."""
    total_articles: int
    seed_articles: int
    learned_articles: int
    articles_with_metadata: int
    articles_without_metadata: int
    avg_body_length: int
    scripts_total: int
    placeholders_total: int  # Count of unique <PLACEHOLDER> patterns across scripts


class PendingDraft(BaseModel):
    """A pending KB article draft in the learning pipeline."""
    draft_id: str
    title: str
    source_ticket: str
    detected_gap: str
    generated_at: str  # ISO 8601


class LearningPipeline(BaseModel):
    """Learning pipeline statistics."""
    total_events: int
    approved: int
    rejected: int
    pending: int
    pending_drafts: List[PendingDraft]


class TicketStats(BaseModel):
    """Ticket distribution statistics."""
    total: int
    by_tier: Dict[str, int]
    by_priority: Dict[str, int]
    by_module: Dict[str, int]


class EmergingIssue(BaseModel):
    """An emerging issue cluster detected by gap analysis."""
    category: str
    module: str
    ticket_count: int
    avg_similarity: float
    sample_resolution: str


class BeforeAfterEval(BaseModel):
    """Flat before/after eval results matching frontend's EvalResults component."""
    before_hit5: float
    after_hit5: float
    improvement_pp: float  # percentage points improvement
    gaps_closed: int
    headline: str


class ClassificationPerClass(BaseModel):
    """Per-class classification metrics."""
    precision: float
    recall: float
    f1: float


class ClassificationEval(BaseModel):
    """Classification evaluation results."""
    accuracy: float
    per_class: Dict[str, ClassificationPerClass]


class RetrievalEval(BaseModel):
    """Retrieval evaluation results."""
    overall: Dict[str, float]  # {"hit@1": float, "hit@3": float, ...}


class EvalResults(BaseModel):
    """Evaluation results matching the frontend's EvalResults component interface."""
    retrieval: RetrievalEval
    classification: ClassificationEval
    before_after: BeforeAfterEval


class DashboardResponse(BaseModel):
    """Response model for GET /api/dashboard/stats."""
    knowledge_health: KnowledgeHealth
    learning_pipeline: LearningPipeline
    tickets: TicketStats
    emerging_issues: List[EmergingIssue]
    eval_results: EvalResults  # Never null — use defaults when eval hasn't run


# ============================================================================
# GET /api/conversations/{ticket_number} — Response Models
# ============================================================================

class ConversationResponse(BaseModel):
    """Response model for GET /api/conversations/{ticket_number}."""
    ticket_number: str
    conversation_id: str
    channel: str  # "Chat" | "Phone"
    agent_name: str
    sentiment: str  # "Neutral" | "Frustrated" | "Relieved" | "Curious"
    issue_summary: str
    transcript: str


# ============================================================================
# POST /api/qa/score — Response Models
# ============================================================================

class QAParameterScore(BaseModel):
    """A single QA parameter evaluation."""
    score: str  # "Yes" | "No" | "N/A"
    tracking_items: List[str] = Field(default_factory=list)
    evidence: str = ""


class RedFlagScore(BaseModel):
    """A single red flag evaluation."""
    score: str  # "N/A" | "Yes" | "No"
    tracking_items: List[str] = Field(default_factory=list)
    evidence: str = ""


class QAScoreResponse(BaseModel):
    """Response model for POST /api/qa/score."""
    Evaluation_Mode: str  # "Both" | "Interaction Only" | "Case Only"
    Interaction_QA: Dict[str, Any]  # 10 params + Final_Weighted_Score
    Case_QA: Dict[str, Any]  # 10 params + Final_Weighted_Score
    Red_Flags: Dict[str, Any]  # 4 red flag params
    Contact_Summary: str
    Case_Summary: str
    QA_Recommendation: str
    Overall_Weighted_Score: str  # "87%"


# ============================================================================
# POST /api/kb/approve/{draft_id} — Response Models
# ============================================================================

class ApproveResponse(BaseModel):
    """Response model for POST /api/kb/approve/{draft_id}."""
    status: str = "approved"
    doc_id: str


# ============================================================================
# POST /api/kb/reject/{draft_id} — Response Models
# ============================================================================

class RejectResponse(BaseModel):
    """Response model for POST /api/kb/reject/{draft_id}."""
    status: str = "rejected"


# ============================================================================
# GET /health — Response Models
# ============================================================================

class HealthResponse(BaseModel):
    """Response model for GET /health."""
    status: str
    engine_available: bool
    timestamp: float


# ============================================================================
# ADAPTER FUNCTIONS
# ============================================================================

def build_default_eval_results() -> dict:
    """
    Build a default eval_results dict for when evaluation hasn't been run yet.

    Returns a contract-compliant structure with zero/placeholder values so
    the frontend's EvalResults component renders without crashing.
    """
    return {
        "retrieval": {
            "overall": {
                "hit@1": 0.0,
                "hit@3": 0.0,
                "hit@5": 0.0,
                "hit@10": 0.0,
            }
        },
        "classification": {
            "accuracy": 0.0,
            "per_class": {
                "SCRIPT": {"precision": 0.0, "recall": 0.0, "f1": 0.0},
                "KB": {"precision": 0.0, "recall": 0.0, "f1": 0.0},
                "TICKET_RESOLUTION": {"precision": 0.0, "recall": 0.0, "f1": 0.0},
            },
        },
        "before_after": {
            "before_hit5": 0.0,
            "after_hit5": 0.0,
            "improvement_pp": 0,
            "gaps_closed": 0,
            "headline": "Run evaluation to see results",
        },
    }


def adapt_eval_results(raw: dict) -> dict:
    """
    Transform the engine's eval_harness.run_all() output into the flat
    structure the frontend's EvalResults component expects.

    Engine returns:
        {
            "retrieval": {"overall": {...}, "by_answer_type": {...}, ...},
            "classification": {"accuracy": float, "per_class": {...}, ...},
            "before_after": {
                "before_learning": {"retrieval": {"overall": {...}}, ...},
                "after_learning": {"retrieval": {"overall": {...}}, ...},
                "delta": {"hit@5_improvement": float, "gaps_closed": int, ...}
            },
            "total_time": float
        }

    Frontend expects:
        {
            "retrieval": {"overall": {"hit@1": float, ...}},
            "classification": {"accuracy": float, "per_class": {
                "SCRIPT": {precision, recall, f1},
                "KB": {precision, recall, f1},
                "TICKET_RESOLUTION": {precision, recall, f1}
            }},
            "before_after": {
                "before_hit5": float,
                "after_hit5": float,
                "improvement_pp": float,
                "gaps_closed": int,
                "headline": str
            }
        }

    Args:
        raw: The raw eval results dict from evl.run_all()

    Returns:
        Contract-compliant eval results dict
    """
    if raw is None:
        return build_default_eval_results()

    try:
        # --- Retrieval: keep only "overall" ---
        retrieval = {
            "overall": raw.get("retrieval", {}).get("overall", {})
        }

        # --- Classification: rename "TICKET" key to "TICKET_RESOLUTION" ---
        raw_classification = raw.get("classification", {})
        raw_per_class = raw_classification.get("per_class", {})

        adapted_per_class: Dict[str, dict] = {}
        for key, val in raw_per_class.items():
            # Rename TICKET -> TICKET_RESOLUTION for frontend compatibility
            out_key = "TICKET_RESOLUTION" if key == "TICKET" else key
            # Strip the "support" field that the engine adds
            adapted_per_class[out_key] = {
                "precision": val.get("precision", 0.0),
                "recall": val.get("recall", 0.0),
                "f1": val.get("f1", 0.0),
            }

        classification = {
            "accuracy": raw_classification.get("accuracy", 0.0),
            "per_class": adapted_per_class,
        }

        # --- Before/After: flatten nested structure ---
        raw_ba = raw.get("before_after", {})
        delta = raw_ba.get("delta", {})

        # Extract hit@5 from before/after learning retrieval
        before_retrieval = raw_ba.get("before_learning", {}).get("retrieval", {}).get("overall", {})
        after_retrieval = raw_ba.get("after_learning", {}).get("retrieval", {}).get("overall", {})

        before_hit5 = before_retrieval.get("hit@5", 0.0)
        after_hit5 = after_retrieval.get("hit@5", 0.0)
        improvement_pp = delta.get("hit@5_improvement", after_hit5 - before_hit5)
        gaps_closed = delta.get("gaps_closed", 0)

        # Build headline
        before_pct = round(before_hit5 * 100)
        after_pct = round(after_hit5 * 100)
        imp_pp = round(improvement_pp * 100) if abs(improvement_pp) < 1 else round(improvement_pp)
        headline = f"Self-learning loop improved hit@5 from {before_pct}% to {after_pct}% (+{imp_pp} pp)"

        before_after = {
            "before_hit5": before_hit5,
            "after_hit5": after_hit5,
            "improvement_pp": imp_pp,
            "gaps_closed": gaps_closed,
            "headline": headline,
        }

        return {
            "retrieval": retrieval,
            "classification": classification,
            "before_after": before_after,
        }

    except Exception as e:
        logger.error(f"Failed to adapt eval results: {e}")
        return build_default_eval_results()


def compute_placeholders_total(documents: list) -> int:
    """
    Count unique placeholder patterns (e.g. <DATABASE>, <SITE_NAME>) across
    all SCRIPT documents.

    Args:
        documents: List of Document objects from the DataStore

    Returns:
        Count of unique placeholder patterns
    """
    import re
    placeholder_set: set[str] = set()
    for doc in documents:
        if doc.doc_type == "SCRIPT":
            placeholder_set.update(re.findall(r"<[A-Z_]+>", doc.body))
    return len(placeholder_set)


def get_conversation_field(row, preferred: str, fallback: str, default: str = "") -> str:
    """
    Safely retrieve a field from a DataFrame row, trying the preferred column
    name first, then a fallback.

    This handles the Sentiment/Customer_Sentiment and Transcript/Transcript_Text
    naming inconsistency between the real Excel data and synthetic tickets.

    Args:
        row: pandas Series (a DataFrame row)
        preferred: The preferred column name to try first
        fallback: The fallback column name if preferred doesn't exist
        default: Default value if neither column exists

    Returns:
        The field value as a string
    """
    if preferred in row.index:
        val = row[preferred]
    elif fallback in row.index:
        val = row[fallback]
    else:
        val = default
    # Handle NaN values from pandas
    if val is None or (isinstance(val, float) and str(val) == "nan"):
        return default
    return str(val)
