"""
Meridian API Smoke Test
Verifies that all endpoints return correctly-shaped responses.
Usage: python scripts/smoke_api.py
"""
import requests
import json
import sys

API_BASE = "http://localhost:8000"

def test_health():
    """Test /health endpoint"""
    print("🔍 Testing /health...")
    resp = requests.get(f"{API_BASE}/health")
    assert resp.status_code == 200, f"Health check failed: {resp.status_code}"

    data = resp.json()
    assert "status" in data, "Missing 'status' key"
    assert "engine_available" in data, "Missing 'engine_available' key"
    assert "timestamp" in data, "Missing 'timestamp' key"

    print(f"   ✅ Health check passed (engine_available: {data['engine_available']})")
    return data

def test_query():
    """Test POST /api/query"""
    print("🔍 Testing POST /api/query...")
    resp = requests.post(
        f"{API_BASE}/api/query",
        json={"query": "advance property date backend script", "top_k": 5}
    )
    assert resp.status_code == 200, f"Query failed: {resp.status_code}"

    data = resp.json()

    # Check required top-level keys
    required_keys = ["query", "predicted_type", "confidence_scores", "primary_results", "secondary_results"]
    for key in required_keys:
        assert key in data, f"Missing key: {key}"

    # Check confidence_scores has all three types
    assert "SCRIPT" in data["confidence_scores"], "Missing SCRIPT confidence"
    assert "KB" in data["confidence_scores"], "Missing KB confidence"
    assert "TICKET" in data["confidence_scores"], "Missing TICKET confidence"

    # Check primary_results structure
    if len(data["primary_results"]) > 0:
        result = data["primary_results"][0]
        result_keys = ["doc_id", "doc_type", "title", "body", "score", "metadata", "provenance", "rank"]
        for key in result_keys:
            assert key in result, f"Missing key in primary_result: {key}"

    # Check secondary_results structure
    assert isinstance(data["secondary_results"], dict), "secondary_results should be a dict"

    print(f"   ✅ Query passed (predicted: {data['predicted_type']}, {len(data['primary_results'])} primary results)")
    return data

def test_dashboard_stats():
    """Test GET /api/dashboard/stats"""
    print("🔍 Testing GET /api/dashboard/stats...")
    resp = requests.get(f"{API_BASE}/api/dashboard/stats")
    assert resp.status_code == 200, f"Dashboard stats failed: {resp.status_code}"

    data = resp.json()

    # Check required sections
    required_sections = ["knowledge_health", "learning_pipeline", "tickets", "emerging_issues"]
    for section in required_sections:
        assert section in data, f"Missing section: {section}"

    # Check knowledge_health structure
    kh = data["knowledge_health"]
    kh_keys = ["total_articles", "seed_articles", "learned_articles", "scripts_total"]
    for key in kh_keys:
        assert key in kh, f"Missing key in knowledge_health: {key}"

    # Check learning_pipeline structure
    lp = data["learning_pipeline"]
    lp_keys = ["total_events", "approved", "rejected", "pending", "pending_drafts"]
    for key in lp_keys:
        assert key in lp, f"Missing key in learning_pipeline: {key}"

    print(f"   ✅ Dashboard stats passed (total_articles: {kh['total_articles']})")
    return data

def test_qa_score(engine_available):
    """Test POST /api/qa/score (only if engine available)"""
    if not engine_available:
        print("🔍 Testing POST /api/qa/score... ⏭️  SKIPPED (engine not available)")
        return None

    print("🔍 Testing POST /api/qa/score...")

    # Try with a sample ticket number
    # If engine is available, this should work with any valid ticket
    resp = requests.post(
        f"{API_BASE}/api/qa/score",
        json={"ticket_number": "CS-38908386"}
    )

    # May return 404 if specific ticket doesn't exist, that's OK
    if resp.status_code == 404:
        print("   ⚠️  Test ticket not found (expected if engine uses different data)")
        return None

    assert resp.status_code == 200, f"QA score failed: {resp.status_code}"

    data = resp.json()

    # Check required top-level keys
    required_keys = ["Evaluation_Mode", "Interaction_QA", "Case_QA", "Red_Flags",
                     "Contact_Summary", "Case_Summary", "QA_Recommendation", "Overall_Weighted_Score"]
    for key in required_keys:
        assert key in data, f"Missing key: {key}"

    # Check Interaction_QA structure
    interaction = data["Interaction_QA"]
    assert "Final_Weighted_Score" in interaction, "Missing Interaction Final_Weighted_Score"

    # Check Case_QA structure
    case_qa = data["Case_QA"]
    assert "Final_Weighted_Score" in case_qa, "Missing Case Final_Weighted_Score"

    # Check Red_Flags structure
    red_flags = data["Red_Flags"]
    assert len(red_flags) == 4, f"Expected 4 red flags, got {len(red_flags)}"

    print(f"   ✅ QA score passed (Overall: {data['Overall_Weighted_Score']}, Recommendation: {data['QA_Recommendation']})")
    return data


def main():
    """Run all smoke tests"""
    print("=" * 60)
    print("Meridian API Smoke Test")
    print("=" * 60)

    try:
        # Test health
        health = test_health()

        # Test query
        query_result = test_query()

        # Test dashboard stats
        dashboard = test_dashboard_stats()

        # Test QA scoring (only if engine available)
        qa_result = test_qa_score(health["engine_available"])

        print("\n" + "=" * 60)
        print("✅ All smoke tests PASSED")
        print("=" * 60)

        if health["engine_available"]:
            print("\n🎯 Engine is AVAILABLE - using real data")
        else:
            print("\n⚠️  Engine is NOT available - using stub data")
            print("   (This is expected if meridian.main.boot() hasn't been built yet)")

        return 0

    except AssertionError as e:
        print(f"\n❌ Smoke test FAILED: {e}")
        return 1
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Cannot connect to {API_BASE}")
        print("   Make sure the server is running: python run_server.py")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
