"""
Contract Schema Tests

Validates that the Pydantic response models accept the exact JSON shapes
the frontend mock data defines. If these tests pass, the frontend will
render without crashes.

These tests are purely schema-level — they don't require the engine or a
running server. They import the models and validate sample payloads.
"""
import pytest

from meridian.server.contracts import (
    QueryResponse,
    ProvenanceResponse,
    DashboardResponse,
    ConversationResponse,
    QAScoreResponse,
    ApproveResponse,
    RejectResponse,
    HealthResponse,
    GapCheckResponse,
    KBGenerateResponse,
    adapt_eval_results,
    build_default_eval_results,
)


# ============================================================================
# Sample payloads copied from the frontend mock data (mockData.ts)
# ============================================================================

MOCK_QUERY_RESPONSE = {
    "query": "advance property date backend script fails",
    "predicted_type": "SCRIPT",
    "confidence_scores": {"SCRIPT": 0.82, "KB": 0.31, "TICKET": 0.15},
    "primary_results": [
        {
            "doc_id": "SCRIPT-0293",
            "doc_type": "SCRIPT",
            "title": "Accounting / Date Advance - Advance Property Date",
            "body": "use <DATABASE>\ngo\nupdate Haprequest\nset hrqTotalAdjPayAmount = <AMOUNT>",
            "score": 0.74,
            "metadata": {
                "purpose": "Run this backend data-fix script",
                "inputs": "<AMOUNT>, <DATABASE>, <DATE>, <ID>",
                "module": "Accounting / Date Advance",
                "category": "Advance Property Date",
            },
            "provenance": [],
            "rank": 1,
        },
    ],
    "secondary_results": {
        "KB": [
            {
                "doc_id": "KB-SYN-0001",
                "doc_type": "KB",
                "title": "PropertySuite Affordable: Advance Property Date",
                "body": "Summary\n- This article documents a fix...",
                "score": 0.61,
                "metadata": {
                    "source_type": "SYNTH_FROM_TICKET",
                    "module": "Accounting / Date Advance",
                    "tags": "PropertySuite, affordable, date-advance",
                },
                "provenance": [
                    {
                        "source_type": "Ticket",
                        "source_id": "CS-38908386",
                        "relationship": "CREATED_FROM",
                        "evidence_snippet": "Derived from Tier 3 ticket CS-38908386",
                    }
                ],
                "rank": 1,
            },
        ],
        "TICKET": [
            {
                "doc_id": "CS-38908386",
                "doc_type": "TICKET",
                "title": "Unable to advance property date",
                "body": "Description: Date advance fails...\n\nResolution: Applied fix.",
                "score": 0.55,
                "metadata": {
                    "tier": 3,
                    "priority": "High",
                    "root_cause": "Data inconsistency",
                    "module": "Accounting / Date Advance",
                    "script_id": "SCRIPT-0293",
                },
                "provenance": [],
                "rank": 1,
            },
        ],
    },
}

MOCK_PROVENANCE = {
    "kb_article_id": "KB-SYN-0001",
    "kb_title": "PropertySuite Affordable: Advance Property Date",
    "has_provenance": True,
    "sources": [
        {
            "source_type": "Ticket",
            "source_id": "CS-38908386",
            "relationship": "CREATED_FROM",
            "evidence_snippet": "Derived from Tier 3 ticket CS-38908386",
            "detail": {
                "subject": "Unable to advance property date",
                "tier": 3,
                "resolution": "Applied backend data-fix script.",
                "root_cause": "Data inconsistency",
                "module": "Accounting / Date Advance",
            },
        },
        {
            "source_type": "Conversation",
            "source_id": "CONV-O2RAK1VRJN",
            "relationship": "CREATED_FROM",
            "evidence_snippet": "Conversation context captured",
            "detail": {
                "channel": "Chat",
                "agent_name": "Alex",
                "sentiment": "Neutral",
                "issue_summary": "Date advance fails due to invalid voucher reference.",
            },
        },
        {
            "source_type": "Script",
            "source_id": "SCRIPT-0293",
            "relationship": "REFERENCES",
            "evidence_snippet": "References SCRIPT-0293 for backend fix",
            "detail": {
                "title": "Advance Property Date",
                "purpose": "Run this backend data-fix script",
                "inputs": "<AMOUNT>, <DATABASE>, <DATE>, <ID>",
            },
        },
    ],
    "learning_event": {
        "event_id": "LEARN-0001",
        "trigger_ticket": "CS-38908386",
        "detected_gap": "No existing KB match above threshold",
        "draft_summary": "Draft KB created to document backend resolution steps",
        "final_status": "Approved",
        "reviewer_role": "Tier 3 Support",
        "timestamp": "2025-02-19T02:05:13",
    },
}

MOCK_EMPTY_PROVENANCE = {
    "kb_article_id": "KB-3FFBFE3C70",
    "kb_title": "PropertySuite: HAP Voucher Processing Overview",
    "has_provenance": False,
    "sources": [],
    "learning_event": None,
}

MOCK_DASHBOARD = {
    "knowledge_health": {
        "total_articles": 3207,
        "seed_articles": 3046,
        "learned_articles": 161,
        "articles_with_metadata": 199,
        "articles_without_metadata": 3008,
        "avg_body_length": 2051,
        "scripts_total": 714,
        "placeholders_total": 25,
    },
    "learning_pipeline": {
        "total_events": 161,
        "approved": 134,
        "rejected": 27,
        "pending": 3,
        "pending_drafts": [
            {
                "draft_id": "DRAFT-001",
                "title": "HAP Voucher Sync Failure Resolution",
                "source_ticket": "CS-12345678",
                "detected_gap": "No existing KB match for HAP voucher sync failure",
                "generated_at": "2025-06-15T10:30:00Z",
            },
        ],
    },
    "tickets": {
        "total": 400,
        "by_tier": {"1": 121, "2": 118, "3": 161},
        "by_priority": {"Critical": 50, "High": 137, "Medium": 146, "Low": 67},
        "by_module": {
            "General": 123,
            "Accounting / Date Advance": 118,
        },
    },
    "emerging_issues": [
        {
            "category": "Advance Property Date",
            "module": "Accounting / Date Advance",
            "ticket_count": 118,
            "avg_similarity": 0.32,
            "sample_resolution": "Applied backend data-fix script.",
        },
    ],
    "eval_results": {
        "retrieval": {
            "overall": {"hit@1": 0.35, "hit@3": 0.52, "hit@5": 0.61, "hit@10": 0.73},
        },
        "classification": {
            "accuracy": 0.71,
            "per_class": {
                "SCRIPT": {"precision": 0.78, "recall": 0.85, "f1": 0.81},
                "KB": {"precision": 0.55, "recall": 0.48, "f1": 0.51},
                "TICKET_RESOLUTION": {"precision": 0.42, "recall": 0.38, "f1": 0.40},
            },
        },
        "before_after": {
            "before_hit5": 0.48,
            "after_hit5": 0.61,
            "improvement_pp": 13,
            "gaps_closed": 134,
            "headline": "Self-learning loop improved hit@5 from 48% to 61% (+13 pp)",
        },
    },
}

MOCK_CONVERSATION = {
    "ticket_number": "CS-38908386",
    "conversation_id": "CONV-O2RAK1VRJN",
    "channel": "Chat",
    "agent_name": "Alex",
    "sentiment": "Neutral",
    "issue_summary": "Date advance fails due to invalid voucher reference.",
    "transcript": "Alex (ExampleCo): Thanks for contacting ExampleCo Support.",
}

MOCK_QA_SCORE = {
    "Evaluation_Mode": "Both",
    "Interaction_QA": {
        "Conversational_Professional": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Engagement_Personalization": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Tone_Pace": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Language": {"score": "No", "tracking_items": ["Jargon"], "evidence": "Used jargon"},
        "Objection_Handling_Conversation_Control": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Delivered_Expected_Outcome": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Exhibit_Critical_Thinking": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Educate_Accurately_Handle_Information": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Effective_Use_of_Resources": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Call_Case_Control_Timeliness": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Final_Weighted_Score": "90%",
    },
    "Case_QA": {
        "Clear_Problem_Summary": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Captured_Key_Context": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Action_Log_Completeness": {"score": "No", "tracking_items": ["Steps missing"], "evidence": "No steps"},
        "Correct_Categorization": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Customer_Facing_Clarity": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Resolution_Specific_Reproducible": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Uses_Approved_Process_Scripts_When_Required": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Accuracy_of_Technical_Content": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "References_Knowledge_Correctly": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Timeliness_Ownership_Signals": {"score": "Yes", "tracking_items": [], "evidence": ""},
        "Final_Weighted_Score": "80%",
    },
    "Red_Flags": {
        "Account_Documentation_Violation": {"score": "N/A", "tracking_items": [], "evidence": ""},
        "Payment_Compliance_PCI_Violation": {"score": "N/A", "tracking_items": [], "evidence": ""},
        "Data_Integrity_Confidentiality_Violation": {"score": "N/A", "tracking_items": [], "evidence": ""},
        "Misbehavior_Unprofessionalism": {"score": "N/A", "tracking_items": [], "evidence": ""},
    },
    "Contact_Summary": "Agent handled a support case regarding date advance failure.",
    "Case_Summary": "Tier 3 escalation for backend data sync issue.",
    "QA_Recommendation": "Keep doing",
    "Overall_Weighted_Score": "87%",
}

MOCK_APPROVE = {"status": "approved", "doc_id": "KB-DRAFT-001"}

MOCK_REJECT = {"status": "rejected"}


# ============================================================================
# Tests
# ============================================================================

class TestQueryResponseContract:
    """POST /api/query response matches frontend expectations."""

    def test_mock_payload_validates(self) -> None:
        """The exact mock payload the frontend uses must pass validation."""
        resp = QueryResponse.model_validate(MOCK_QUERY_RESPONSE)
        assert resp.predicted_type == "SCRIPT"
        assert resp.confidence_scores.SCRIPT == 0.82
        assert len(resp.primary_results) == 1
        assert resp.primary_results[0].doc_id == "SCRIPT-0293"
        assert resp.primary_results[0].rank == 1
        assert "KB" in resp.secondary_results
        assert "TICKET" in resp.secondary_results

    def test_empty_provenance_is_valid(self) -> None:
        """Results with empty provenance array must validate."""
        result = MOCK_QUERY_RESPONSE["primary_results"][0]
        assert result["provenance"] == []

    def test_metadata_is_flexible_dict(self) -> None:
        """Metadata accepts arbitrary keys for different doc types."""
        resp = QueryResponse.model_validate(MOCK_QUERY_RESPONSE)
        assert "purpose" in resp.primary_results[0].metadata
        kb = resp.secondary_results["KB"][0]
        assert "source_type" in kb.metadata


class TestProvenanceResponseContract:
    """GET /api/provenance/{doc_id} response matches frontend expectations."""

    def test_full_provenance_validates(self) -> None:
        resp = ProvenanceResponse.model_validate(MOCK_PROVENANCE)
        assert resp.has_provenance is True
        assert len(resp.sources) == 3
        assert resp.sources[0].source_type == "Ticket"
        assert resp.sources[1].source_type == "Conversation"
        assert resp.sources[2].source_type == "Script"
        assert resp.learning_event is not None
        assert resp.learning_event.event_id == "LEARN-0001"

    def test_empty_provenance_validates(self) -> None:
        resp = ProvenanceResponse.model_validate(MOCK_EMPTY_PROVENANCE)
        assert resp.has_provenance is False
        assert resp.sources == []
        assert resp.learning_event is None


class TestDashboardResponseContract:
    """GET /api/dashboard/stats response matches frontend expectations."""

    def test_full_dashboard_validates(self) -> None:
        resp = DashboardResponse.model_validate(MOCK_DASHBOARD)
        assert resp.knowledge_health.total_articles == 3207
        assert resp.knowledge_health.placeholders_total == 25
        assert resp.knowledge_health.scripts_total == 714

    def test_eval_results_is_never_null(self) -> None:
        """eval_results must not be None — frontend crashes on null."""
        resp = DashboardResponse.model_validate(MOCK_DASHBOARD)
        assert resp.eval_results is not None
        assert resp.eval_results.retrieval.overall["hit@1"] == 0.35

    def test_eval_results_before_after_flat(self) -> None:
        """before_after must be flat: before_hit5, after_hit5, improvement_pp, gaps_closed, headline."""
        resp = DashboardResponse.model_validate(MOCK_DASHBOARD)
        ba = resp.eval_results.before_after
        assert ba.before_hit5 == 0.48
        assert ba.after_hit5 == 0.61
        assert ba.improvement_pp == 13
        assert ba.gaps_closed == 134
        assert "hit@5" in ba.headline

    def test_classification_uses_ticket_resolution_key(self) -> None:
        """per_class must include TICKET_RESOLUTION (not just TICKET)."""
        resp = DashboardResponse.model_validate(MOCK_DASHBOARD)
        per_class = resp.eval_results.classification.per_class
        assert "TICKET_RESOLUTION" in per_class
        assert per_class["TICKET_RESOLUTION"].f1 == 0.40

    def test_learning_pipeline_has_pending_drafts(self) -> None:
        resp = DashboardResponse.model_validate(MOCK_DASHBOARD)
        assert resp.learning_pipeline.pending == 3
        assert len(resp.learning_pipeline.pending_drafts) == 1
        draft = resp.learning_pipeline.pending_drafts[0]
        assert draft.draft_id == "DRAFT-001"

    def test_emerging_issues_shape(self) -> None:
        resp = DashboardResponse.model_validate(MOCK_DASHBOARD)
        assert len(resp.emerging_issues) == 1
        issue = resp.emerging_issues[0]
        assert issue.category == "Advance Property Date"
        assert issue.avg_similarity == 0.32


class TestConversationResponseContract:
    """GET /api/conversations/{ticket_number} response matches frontend expectations."""

    def test_conversation_validates(self) -> None:
        resp = ConversationResponse.model_validate(MOCK_CONVERSATION)
        assert resp.ticket_number == "CS-38908386"
        assert resp.channel == "Chat"
        assert resp.agent_name == "Alex"


class TestQAScoreResponseContract:
    """POST /api/qa/score response matches frontend expectations."""

    def test_full_qa_score_validates(self) -> None:
        resp = QAScoreResponse.model_validate(MOCK_QA_SCORE)
        assert resp.Evaluation_Mode == "Both"
        assert resp.Overall_Weighted_Score == "87%"
        assert resp.QA_Recommendation == "Keep doing"

    def test_interaction_qa_has_final_weighted_score(self) -> None:
        resp = QAScoreResponse.model_validate(MOCK_QA_SCORE)
        assert resp.Interaction_QA["Final_Weighted_Score"] == "90%"

    def test_case_qa_has_final_weighted_score(self) -> None:
        resp = QAScoreResponse.model_validate(MOCK_QA_SCORE)
        assert resp.Case_QA["Final_Weighted_Score"] == "80%"

    def test_red_flags_present(self) -> None:
        resp = QAScoreResponse.model_validate(MOCK_QA_SCORE)
        assert "Account_Documentation_Violation" in resp.Red_Flags
        assert resp.Red_Flags["Account_Documentation_Violation"]["score"] == "N/A"


class TestApproveRejectContract:
    """POST /api/kb/approve and /api/kb/reject response shape."""

    def test_approve_response(self) -> None:
        resp = ApproveResponse.model_validate(MOCK_APPROVE)
        assert resp.status == "approved"
        assert resp.doc_id == "KB-DRAFT-001"

    def test_reject_response(self) -> None:
        resp = RejectResponse.model_validate(MOCK_REJECT)
        assert resp.status == "rejected"


class TestAdapterFunctions:
    """Test the adapter functions that transform engine output to frontend contract."""

    def test_build_default_eval_results(self) -> None:
        """Default eval results must validate against the DashboardResponse model."""
        default = build_default_eval_results()
        assert default is not None
        # Wrap in a full dashboard to validate the nested shape
        dashboard = {
            **MOCK_DASHBOARD,
            "eval_results": default,
        }
        resp = DashboardResponse.model_validate(dashboard)
        assert resp.eval_results.before_after.headline == "Run evaluation to see results"

    def test_adapt_eval_results_from_none(self) -> None:
        """adapt_eval_results(None) must return valid defaults."""
        result = adapt_eval_results(None)
        dashboard = {**MOCK_DASHBOARD, "eval_results": result}
        resp = DashboardResponse.model_validate(dashboard)
        assert resp.eval_results.retrieval.overall["hit@1"] == 0.0

    def test_adapt_eval_results_from_engine(self) -> None:
        """adapt_eval_results transforms engine output to flat frontend shape."""
        engine_output = {
            "retrieval": {
                "overall": {"hit@1": 0.35, "hit@3": 0.52, "hit@5": 0.61, "hit@10": 0.73},
                "by_answer_type": {},
                "by_difficulty": {},
                "total_questions": 1000,
            },
            "classification": {
                "accuracy": 0.71,
                "per_class": {
                    "SCRIPT": {"precision": 0.78, "recall": 0.85, "f1": 0.81, "support": 300},
                    "KB": {"precision": 0.55, "recall": 0.48, "f1": 0.51, "support": 400},
                    "TICKET": {"precision": 0.42, "recall": 0.38, "f1": 0.40, "support": 300},
                },
                "confusion_matrix": {},
                "total_questions": 1000,
            },
            "before_after": {
                "before_learning": {
                    "retrieval": {
                        "overall": {"hit@1": 0.30, "hit@5": 0.48, "hit@10": 0.65},
                    },
                },
                "after_learning": {
                    "retrieval": {
                        "overall": {"hit@1": 0.35, "hit@5": 0.61, "hit@10": 0.73},
                    },
                },
                "delta": {
                    "hit@5_improvement": 0.13,
                    "gaps_closed": 134,
                },
            },
            "total_time": 245.0,
        }

        result = adapt_eval_results(engine_output)

        # Validate against the contract model
        dashboard = {**MOCK_DASHBOARD, "eval_results": result}
        resp = DashboardResponse.model_validate(dashboard)

        # Check key renamed: TICKET -> TICKET_RESOLUTION
        assert "TICKET_RESOLUTION" in resp.eval_results.classification.per_class
        assert "TICKET" not in resp.eval_results.classification.per_class

        # Check before_after flattened
        ba = resp.eval_results.before_after
        assert ba.before_hit5 == 0.48
        assert ba.after_hit5 == 0.61
        assert ba.gaps_closed == 134
        assert "hit@5" in ba.headline

        # Check retrieval only has "overall" (no by_answer_type etc.)
        assert "overall" in result["retrieval"]

    def test_adapt_eval_results_strips_support_field(self) -> None:
        """The 'support' field from engine per_class is stripped."""
        engine_output = {
            "retrieval": {"overall": {"hit@1": 0.5}},
            "classification": {
                "accuracy": 0.7,
                "per_class": {
                    "SCRIPT": {"precision": 0.8, "recall": 0.9, "f1": 0.85, "support": 300},
                },
            },
            "before_after": {
                "before_learning": {"retrieval": {"overall": {"hit@5": 0.4}}},
                "after_learning": {"retrieval": {"overall": {"hit@5": 0.6}}},
                "delta": {"hit@5_improvement": 0.2, "gaps_closed": 100},
            },
        }
        result = adapt_eval_results(engine_output)
        assert "support" not in result["classification"]["per_class"]["SCRIPT"]


# ============================================================================
# Gap Check + KB Generate contracts (copilot endpoints)
# ============================================================================

MOCK_GAP_CHECK = {
    "ticket_number": "CS-03758997",
    "is_gap": True,
    "resolution_similarity": 0.544,
    "best_matching_kb_id": "KB-ABC123",
    "module": "Affordable / Repayments",
    "category": "Repayment Plan",
    "description_text": "Repayment plan ending balance is incorrect",
}

MOCK_GAP_CHECK_NO_GAP = {
    "ticket_number": "CS-38908386",
    "is_gap": False,
    "resolution_similarity": 0.78,
    "best_matching_kb_id": "KB-SYN-0001",
    "module": "Accounting / Date Advance",
    "category": "Advance Property Date",
    "description_text": "Date advance fails",
}

MOCK_KB_GENERATE = {
    "draft_id": "DRAFT-20260208",
    "title": "Repayment Plan Balance Recalculation Workaround",
    "body": "Summary\n- After posting installments, re-validate the repayment schedule.",
    "source_ticket": "CS-03758997",
    "module": "Affordable / Repayments",
    "category": "Repayment Plan",
    "generated_at": "2026-02-08T12:00:00Z",
    "generation_method": "llm",
}


class TestGapCheckResponseContract:
    """POST /api/gap/check response matches contract."""

    def test_gap_detected_validates(self) -> None:
        resp = GapCheckResponse.model_validate(MOCK_GAP_CHECK)
        assert resp.is_gap is True
        assert resp.resolution_similarity == 0.544
        assert resp.module == "Affordable / Repayments"

    def test_no_gap_validates(self) -> None:
        resp = GapCheckResponse.model_validate(MOCK_GAP_CHECK_NO_GAP)
        assert resp.is_gap is False
        assert resp.resolution_similarity == 0.78


class TestKBGenerateResponseContract:
    """POST /api/kb/generate response matches contract."""

    def test_kb_draft_validates(self) -> None:
        resp = KBGenerateResponse.model_validate(MOCK_KB_GENERATE)
        assert resp.draft_id == "DRAFT-20260208"
        assert resp.generation_method == "llm"
        assert resp.source_ticket == "CS-03758997"
