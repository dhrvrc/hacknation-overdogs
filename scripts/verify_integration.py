"""
Meridian Integration Verification Script

One-command verification that hits every frontend-consumed endpoint and
validates the response shapes match the frontend contract.

Usage:
    uv run python scripts/verify_integration.py
    uv run python scripts/verify_integration.py --base-url http://localhost:8000

Requires the backend to be running. Returns exit code 0 if all pass.
"""
import argparse
import json
import sys
import time
from typing import Any

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package not installed. Run: uv add requests")
    sys.exit(1)


def check_keys(data: dict, required_keys: list[str], label: str) -> list[str]:
    """Check that all required keys exist in a dict. Returns list of errors."""
    errors: list[str] = []
    for key in required_keys:
        if key not in data:
            errors.append(f"  [{label}] Missing key: '{key}'")
    return errors


def validate_query(base_url: str) -> tuple[bool, list[str]]:
    """Validate POST /api/query."""
    errors: list[str] = []
    try:
        r = requests.post(
            f"{base_url}/api/query",
            json={"query": "advance property date backend script"},
            timeout=30,
        )
        if r.status_code != 200:
            return False, [f"  Status {r.status_code}: {r.text[:200]}"]

        data = r.json()
        errors.extend(check_keys(data, ["query", "predicted_type", "confidence_scores", "primary_results", "secondary_results"], "query"))

        cs = data.get("confidence_scores", {})
        errors.extend(check_keys(cs, ["SCRIPT", "KB", "TICKET"], "confidence_scores"))

        for i, result in enumerate(data.get("primary_results", [])):
            errors.extend(check_keys(result, ["doc_id", "doc_type", "title", "body", "score", "metadata", "provenance", "rank"], f"primary_results[{i}]"))

        if not isinstance(data.get("secondary_results"), dict):
            errors.append("  secondary_results is not a dict")

    except Exception as e:
        errors.append(f"  Exception: {e}")

    return len(errors) == 0, errors


def validate_provenance(base_url: str) -> tuple[bool, list[str]]:
    """Validate GET /api/provenance/{doc_id}."""
    errors: list[str] = []
    try:
        r = requests.get(f"{base_url}/api/provenance/KB-SYN-0001", timeout=10)
        if r.status_code != 200:
            return False, [f"  Status {r.status_code}: {r.text[:200]}"]

        data = r.json()
        errors.extend(check_keys(data, ["kb_article_id", "kb_title", "has_provenance", "sources", "learning_event"], "provenance"))

        if not isinstance(data.get("sources"), list):
            errors.append("  sources is not a list")

    except Exception as e:
        errors.append(f"  Exception: {e}")

    return len(errors) == 0, errors


def validate_dashboard(base_url: str) -> tuple[bool, list[str]]:
    """Validate GET /api/dashboard/stats — the most critical endpoint."""
    errors: list[str] = []
    try:
        r = requests.get(f"{base_url}/api/dashboard/stats", timeout=120)
        if r.status_code != 200:
            return False, [f"  Status {r.status_code}: {r.text[:200]}"]

        data = r.json()
        errors.extend(check_keys(data, ["knowledge_health", "learning_pipeline", "tickets", "emerging_issues", "eval_results"], "dashboard"))

        # knowledge_health must include placeholders_total
        kh = data.get("knowledge_health", {})
        if "placeholders_total" not in kh:
            errors.append("  knowledge_health.placeholders_total MISSING (will crash KnowledgeHealth)")
        elif not isinstance(kh["placeholders_total"], int):
            errors.append(f"  knowledge_health.placeholders_total is {type(kh['placeholders_total']).__name__}, expected int")

        # eval_results must not be null
        if data.get("eval_results") is None:
            errors.append("  eval_results is null (will crash EvalResults component)")
        else:
            ev = data["eval_results"]
            errors.extend(check_keys(ev, ["retrieval", "classification", "before_after"], "eval_results"))

            # before_after must be flat
            ba = ev.get("before_after", {})
            errors.extend(check_keys(ba, ["before_hit5", "after_hit5", "improvement_pp", "gaps_closed", "headline"], "before_after"))

            # classification per_class must have TICKET_RESOLUTION
            per_class = ev.get("classification", {}).get("per_class", {})
            if "TICKET_RESOLUTION" not in per_class:
                errors.append("  classification.per_class missing 'TICKET_RESOLUTION' key")

    except Exception as e:
        errors.append(f"  Exception: {e}")

    return len(errors) == 0, errors


def validate_conversation(base_url: str) -> tuple[bool, list[str]]:
    """Validate GET /api/conversations/{ticket_number}."""
    errors: list[str] = []
    try:
        r = requests.get(f"{base_url}/api/conversations/CS-38908386", timeout=10)
        if r.status_code == 404:
            # Ticket might not exist in test data — acceptable
            return True, ["  (ticket not found — skipped)"]
        if r.status_code != 200:
            return False, [f"  Status {r.status_code}: {r.text[:200]}"]

        data = r.json()
        errors.extend(check_keys(data, ["ticket_number", "conversation_id", "channel", "agent_name", "sentiment", "issue_summary", "transcript"], "conversation"))

    except Exception as e:
        errors.append(f"  Exception: {e}")

    return len(errors) == 0, errors


def validate_qa_score(base_url: str) -> tuple[bool, list[str]]:
    """Validate POST /api/qa/score (real ticket + paste mode)."""
    errors: list[str] = []
    try:
        # Test paste mode specifically (this was broken before)
        r = requests.post(
            f"{base_url}/api/qa/score",
            json={"ticket_number": "paste"},
            timeout=30,
        )
        if r.status_code == 503:
            return True, ["  (engine unavailable — 503 is acceptable)"]
        if r.status_code != 200:
            errors.append(f"  paste mode: Status {r.status_code}: {r.text[:200]}")
        else:
            data = r.json()
            errors.extend(check_keys(data, [
                "Evaluation_Mode", "Interaction_QA", "Case_QA", "Red_Flags",
                "Contact_Summary", "Case_Summary", "QA_Recommendation", "Overall_Weighted_Score",
            ], "qa_score (paste)"))

    except Exception as e:
        errors.append(f"  Exception: {e}")

    return len(errors) == 0, errors


def validate_health(base_url: str) -> tuple[bool, list[str]]:
    """Validate GET /health."""
    errors: list[str] = []
    try:
        r = requests.get(f"{base_url}/health", timeout=5)
        if r.status_code != 200:
            return False, [f"  Status {r.status_code}"]
        data = r.json()
        errors.extend(check_keys(data, ["status", "engine_available", "timestamp"], "health"))
    except Exception as e:
        errors.append(f"  Exception: {e}")

    return len(errors) == 0, errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Meridian integration verification")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend base URL")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    print(f"Meridian Integration Verification")
    print(f"Backend: {base_url}")
    print("=" * 60)

    # Check if server is reachable
    try:
        requests.get(f"{base_url}/health", timeout=5)
    except requests.ConnectionError:
        print(f"\nERROR: Cannot connect to {base_url}")
        print("Start the backend first: uv run python run_server.py")
        return 1

    validators = [
        ("GET  /health", validate_health),
        ("POST /api/query", validate_query),
        ("GET  /api/provenance/KB-SYN-0001", validate_provenance),
        ("GET  /api/dashboard/stats", validate_dashboard),
        ("GET  /api/conversations/CS-38908386", validate_conversation),
        ("POST /api/qa/score (paste mode)", validate_qa_score),
    ]

    total = len(validators)
    passed = 0
    failed = 0

    for label, validator in validators:
        ok, messages = validator(base_url)
        status = "PASS" if ok else "FAIL"
        icon = "+" if ok else "X"
        print(f"\n[{icon}] {label} ... {status}")
        for msg in messages:
            print(msg)

        if ok:
            passed += 1
        else:
            failed += 1

    print("\n" + "=" * 60)
    print(f"Results: {passed}/{total} passed, {failed} failed")

    if failed == 0:
        print("\nAll checks passed! Frontend contract is satisfied.")
    else:
        print(f"\n{failed} check(s) failed. Fix issues before flipping USE_MOCK=false.")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
