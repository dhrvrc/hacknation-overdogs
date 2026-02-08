"""
Smoke Tests — Hit every frontend-consumed endpoint against a running server.

These tests require the backend to be running on http://localhost:8000.
They validate HTTP status codes and JSON response shapes.

Run with:
    uv run pytest tests/test_smoke.py -v

Start the backend first:
    uv run python run_server.py
"""
import pytest
import requests

BASE_URL = "http://localhost:8000"


def _server_reachable() -> bool:
    """Check if the backend is up."""
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=3)
        return r.status_code == 200
    except requests.ConnectionError:
        return False


pytestmark = pytest.mark.skipif(
    not _server_reachable(),
    reason="Backend not running at localhost:8000",
)


# ============================================================================
# Health
# ============================================================================

class TestHealth:
    def test_health_returns_200(self) -> None:
        r = requests.get(f"{BASE_URL}/health")
        assert r.status_code == 200
        data = r.json()
        assert "status" in data
        assert "engine_available" in data
        assert "timestamp" in data


# ============================================================================
# POST /api/query
# ============================================================================

class TestQuery:
    def test_query_returns_200(self) -> None:
        r = requests.post(
            f"{BASE_URL}/api/query",
            json={"query": "advance property date backend script"},
        )
        assert r.status_code == 200
        data = r.json()

        # Top-level keys
        assert "query" in data
        assert "predicted_type" in data
        assert "confidence_scores" in data
        assert "primary_results" in data
        assert "secondary_results" in data

        # Confidence scores
        cs = data["confidence_scores"]
        assert "SCRIPT" in cs
        assert "KB" in cs
        assert "TICKET" in cs

        # Primary results shape
        if data["primary_results"]:
            result = data["primary_results"][0]
            for key in ("doc_id", "doc_type", "title", "body", "score", "metadata", "provenance", "rank"):
                assert key in result, f"Missing key '{key}' in primary result"
            assert isinstance(result["provenance"], list)

        # Secondary results shape
        assert isinstance(data["secondary_results"], dict)


# ============================================================================
# GET /api/provenance/{doc_id}
# ============================================================================

class TestProvenance:
    def test_provenance_returns_200(self) -> None:
        r = requests.get(f"{BASE_URL}/api/provenance/KB-SYN-0001")
        assert r.status_code == 200
        data = r.json()

        for key in ("kb_article_id", "kb_title", "has_provenance", "sources", "learning_event"):
            assert key in data, f"Missing key '{key}' in provenance response"
        assert isinstance(data["sources"], list)

    def test_provenance_unknown_doc(self) -> None:
        """Unknown doc should still return 200 with has_provenance=false."""
        r = requests.get(f"{BASE_URL}/api/provenance/UNKNOWN-9999")
        assert r.status_code == 200
        data = r.json()
        assert data["has_provenance"] is False


# ============================================================================
# GET /api/dashboard/stats
# ============================================================================

class TestDashboard:
    def test_dashboard_returns_200(self) -> None:
        r = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200
        data = r.json()

        # Top-level sections
        for key in ("knowledge_health", "learning_pipeline", "tickets", "emerging_issues", "eval_results"):
            assert key in data, f"Missing key '{key}' in dashboard response"

    def test_dashboard_placeholders_total_present(self) -> None:
        """placeholders_total must be present (fixes KnowledgeHealth crash)."""
        r = requests.get(f"{BASE_URL}/api/dashboard/stats")
        data = r.json()
        kh = data["knowledge_health"]
        assert "placeholders_total" in kh
        assert isinstance(kh["placeholders_total"], int)

    def test_dashboard_eval_results_not_null(self) -> None:
        """eval_results must never be null (fixes EvalResults crash)."""
        r = requests.get(f"{BASE_URL}/api/dashboard/stats")
        data = r.json()
        assert data["eval_results"] is not None

    def test_dashboard_eval_results_flat_before_after(self) -> None:
        """before_after must be flat: before_hit5, after_hit5, improvement_pp, gaps_closed, headline."""
        r = requests.get(f"{BASE_URL}/api/dashboard/stats")
        data = r.json()
        ba = data["eval_results"]["before_after"]
        for key in ("before_hit5", "after_hit5", "improvement_pp", "gaps_closed", "headline"):
            assert key in ba, f"Missing key '{key}' in before_after"

    def test_dashboard_classification_per_class_keys(self) -> None:
        """per_class must use TICKET_RESOLUTION key (not just TICKET)."""
        r = requests.get(f"{BASE_URL}/api/dashboard/stats")
        data = r.json()
        per_class = data["eval_results"]["classification"]["per_class"]
        assert "TICKET_RESOLUTION" in per_class


# ============================================================================
# GET /api/conversations/{ticket_number}
# ============================================================================

class TestConversation:
    def test_conversation_returns_200(self) -> None:
        r = requests.get(f"{BASE_URL}/api/conversations/CS-38908386")
        # May be 200 or 404 depending on whether that ticket exists in the dataset
        if r.status_code == 200:
            data = r.json()
            for key in ("ticket_number", "conversation_id", "channel", "agent_name", "sentiment", "issue_summary", "transcript"):
                assert key in data, f"Missing key '{key}' in conversation response"


# ============================================================================
# POST /api/qa/score
# ============================================================================

class TestQAScore:
    def test_qa_score_with_real_ticket(self) -> None:
        """Score a real ticket (may 503 if engine unavailable)."""
        r = requests.post(
            f"{BASE_URL}/api/qa/score",
            json={"ticket_number": "CS-38908386"},
        )
        if r.status_code == 200:
            data = r.json()
            for key in ("Evaluation_Mode", "Interaction_QA", "Case_QA", "Red_Flags",
                        "Contact_Summary", "Case_Summary", "QA_Recommendation", "Overall_Weighted_Score"):
                assert key in data, f"Missing key '{key}' in QA score response"

    def test_qa_score_paste_mode(self) -> None:
        """Paste mode must return 200 with template score, not 404."""
        r = requests.post(
            f"{BASE_URL}/api/qa/score",
            json={"ticket_number": "paste"},
        )
        if r.status_code == 200:
            data = r.json()
            assert "Evaluation_Mode" in data
            assert "Overall_Weighted_Score" in data
        # 503 is acceptable if engine not available
        assert r.status_code in (200, 503)


# ============================================================================
# POST /api/kb/approve and /api/kb/reject
# ============================================================================

class TestKBApproveReject:
    def test_approve_nonexistent_draft(self) -> None:
        """Approving a nonexistent draft should return 404 or 503."""
        r = requests.post(f"{BASE_URL}/api/kb/approve/DRAFT-nonexistent")
        assert r.status_code in (404, 503)

    def test_reject_nonexistent_draft(self) -> None:
        """Rejecting a nonexistent draft should return 404 or 503."""
        r = requests.post(f"{BASE_URL}/api/kb/reject/DRAFT-nonexistent")
        assert r.status_code in (404, 503)


# ============================================================================
# POST /api/gap/check (copilot gap detection)
# ============================================================================

class TestGapCheck:
    def test_gap_check_real_ticket(self) -> None:
        """Check a real ticket for gaps — should return 200 with is_gap bool."""
        r = requests.post(
            f"{BASE_URL}/api/gap/check",
            json={"ticket_number": "CS-03758997"},
        )
        if r.status_code == 200:
            data = r.json()
            assert "is_gap" in data
            assert "resolution_similarity" in data
            assert "module" in data
            assert isinstance(data["is_gap"], bool)
        # 503 is acceptable if engine not available
        assert r.status_code in (200, 503)

    def test_gap_check_unknown_ticket(self) -> None:
        """Unknown ticket should return 404 or 503."""
        r = requests.post(
            f"{BASE_URL}/api/gap/check",
            json={"ticket_number": "CS-NONEXISTENT"},
        )
        assert r.status_code in (404, 503)


# ============================================================================
# POST /api/kb/generate (copilot KB draft generation)
# ============================================================================

class TestKBGenerate:
    def test_kb_generate_real_ticket(self) -> None:
        """Generate a KB draft from a real ticket — should return 200 with draft fields."""
        r = requests.post(
            f"{BASE_URL}/api/kb/generate",
            json={"ticket_number": "CS-03758997"},
            timeout=30,
        )
        if r.status_code == 200:
            data = r.json()
            assert "draft_id" in data
            assert "title" in data
            assert "body" in data
            assert "source_ticket" in data
            assert data["source_ticket"] == "CS-03758997"
            assert data["generation_method"] in ("llm", "template")
        # 503 is acceptable if engine not available
        assert r.status_code in (200, 503)

    def test_kb_generate_unknown_ticket(self) -> None:
        """Unknown ticket should return 404 or 503."""
        r = requests.post(
            f"{BASE_URL}/api/kb/generate",
            json={"ticket_number": "CS-NONEXISTENT"},
        )
        assert r.status_code in (404, 503)
