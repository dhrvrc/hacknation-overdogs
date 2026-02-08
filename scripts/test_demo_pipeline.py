"""
Test Demo Pipeline
Tests the full live demo flow via API endpoints.
Requires the server to be running with engine available.
"""
import requests
import json
import time
import sys

API_BASE = "http://localhost:8000"


def test_demo_pipeline():
    """Run the full demo pipeline and verify each step."""
    print("=" * 70)
    print("Meridian Demo Pipeline Test")
    print("=" * 70)

    # Check health
    print("\n🔍 Checking server health...")
    resp = requests.get(f"{API_BASE}/health")
    health = resp.json()

    if not health.get("engine_available"):
        print("❌ Engine not available - demo pipeline requires engine")
        print("   Start server with: uv run run_server.py")
        return 1

    print("✅ Server healthy, engine available\n")

    # Step 0: Reset
    print("=" * 70)
    print("Step 0: Reset Demo")
    print("=" * 70)
    resp = requests.post(f"{API_BASE}/api/demo/reset")
    assert resp.status_code == 200, f"Reset failed: {resp.status_code}"
    state = resp.json()
    assert state["phase"] == "ready", f"Expected phase 'ready', got '{state['phase']}'"
    assert len(state["injected_tickets"]) == 0, "Expected no injected tickets after reset"
    print(f"✅ Reset complete - Phase: {state['phase']}")

    # Step 1: Inject tickets
    print("\n" + "=" * 70)
    print("Step 1: Inject Synthetic Tickets")
    print("=" * 70)
    resp = requests.post(f"{API_BASE}/api/demo/inject")
    assert resp.status_code == 200, f"Inject failed: {resp.status_code}"
    state = resp.json()
    assert state["phase"] == "tickets_injected", f"Expected phase 'tickets_injected'"
    assert len(state["injected_tickets"]) == 6, f"Expected 6 tickets, got {len(state['injected_tickets'])}"
    print(f"✅ Injected {len(state['injected_tickets'])} tickets:")
    for ticket in state["injected_tickets"]:
        print(f"   - {ticket}")

    # Step 2: Detect gaps
    print("\n" + "=" * 70)
    print("Step 2: Detect Knowledge Gaps")
    print("=" * 70)
    resp = requests.post(f"{API_BASE}/api/demo/detect-gaps")
    assert resp.status_code == 200, f"Detect gaps failed: {resp.status_code}"
    state = resp.json()
    assert state["phase"] == "gaps_detected", f"Expected phase 'gaps_detected'"
    assert len(state["gap_results"]) == 6, f"Expected 6 gap results"

    gaps_found = sum(1 for g in state["gap_results"] if g["is_gap"])
    print(f"✅ Gap detection complete: {gaps_found}/6 tickets have gaps")
    for result in state["gap_results"]:
        status = "⚠ GAP" if result["is_gap"] else "✓ OK"
        print(f"   {status}  {result['ticket_number']} - similarity: {result['similarity']:.4f}")

    # Verify all are gaps with low similarity
    assert gaps_found >= 5, f"Expected at least 5 gaps, got {gaps_found}"
    avg_sim = sum(g["similarity"] for g in state["gap_results"]) / len(state["gap_results"])
    assert avg_sim < 0.30, f"Expected avg similarity < 0.30, got {avg_sim:.4f}"
    print(f"   Average similarity: {avg_sim:.4f} (< 0.30 ✅)")

    # Step 3: Detect emerging issue
    print("\n" + "=" * 70)
    print("Step 3: Detect Emerging Issue")
    print("=" * 70)
    resp = requests.post(f"{API_BASE}/api/demo/detect-emerging")
    assert resp.status_code == 200, f"Detect emerging failed: {resp.status_code}"
    state = resp.json()
    assert state["phase"] == "emerging_flagged", f"Expected phase 'emerging_flagged'"
    assert len(state["emerging_issues"]) >= 1, f"Expected at least 1 emerging issue"

    issue = state["emerging_issues"][0]
    print(f"✅ Emerging issue detected:")
    print(f"   🔴 {issue['category']} / {issue['module']}")
    print(f"   📊 {issue['ticket_count']} tickets, avg similarity: {issue['avg_similarity']:.4f}")
    assert issue["category"] == "Report Export Failure", f"Expected 'Report Export Failure'"
    assert issue["ticket_count"] == 6, f"Expected 6 tickets in cluster"

    # Step 4: Generate draft
    print("\n" + "=" * 70)
    print("Step 4: Generate KB Article Draft")
    print("=" * 70)
    resp = requests.post(f"{API_BASE}/api/demo/generate-draft")
    assert resp.status_code == 200, f"Generate draft failed: {resp.status_code}"
    state = resp.json()
    assert state["phase"] == "draft_generated", f"Expected phase 'draft_generated'"
    assert state["generated_draft_id"] is not None, "Expected non-null draft_id"
    print(f"✅ Draft generated: {state['generated_draft_id']}")

    # Step 5: Approve and index
    print("\n" + "=" * 70)
    print("Step 5: Approve Draft and Add to Index")
    print("=" * 70)
    resp = requests.post(f"{API_BASE}/api/demo/approve")
    assert resp.status_code == 200, f"Approve failed: {resp.status_code}"
    state = resp.json()
    assert state["phase"] == "draft_approved", f"Expected phase 'draft_approved'"
    assert state["approved_doc_id"] is not None, "Expected non-null approved_doc_id"
    print(f"✅ Article approved and indexed: {state['approved_doc_id']}")

    # Step 6: Verify retrieval
    print("\n" + "=" * 70)
    print("Step 6: Verify Retrieval of New Article")
    print("=" * 70)
    resp = requests.post(f"{API_BASE}/api/demo/verify")
    assert resp.status_code == 200, f"Verify failed: {resp.status_code}"
    result = resp.json()
    state = result["state"]
    verification = result["verification"]

    assert state["phase"] == "demo_complete", f"Expected phase 'demo_complete'"
    assert len(verification) == 3, f"Expected 3 verification results"

    found_count = sum(1 for v in verification if v["found_new_article"])
    print(f"✅ Verification complete: New article found in {found_count}/3 queries")

    for v in verification:
        status = "✅ FOUND" if v["found_new_article"] else "❌ NOT FOUND"
        print(f"\n   {status}")
        print(f"   Q: {v['question'][:60]}...")
        if v["found_new_article"]:
            print(f"   Rank: #{v['article_rank']}, Score: {v['article_score']}")
        print(f"   Top result: {v['top_result']['doc_id']} ({v['top_result']['score']:.4f})")

    assert found_count >= 2, f"Expected article in at least 2/3 queries, got {found_count}/3"

    # Final verification: Query the copilot directly
    print("\n" + "=" * 70)
    print("Final Verification: Query Copilot Directly")
    print("=" * 70)
    query = "Customer is getting blank PDFs when exporting Rent Roll report"
    print(f"Query: {query}")

    resp = requests.post(
        f"{API_BASE}/api/query",
        json={"query": query, "top_k": 5}
    )
    assert resp.status_code == 200, f"Query failed: {resp.status_code}"
    query_result = resp.json()

    # Check if new article appears in results
    all_doc_ids = [r["doc_id"] for r in query_result["primary_results"]]
    for results in query_result["secondary_results"].values():
        all_doc_ids.extend([r["doc_id"] for r in results])

    if state["approved_doc_id"] in all_doc_ids:
        print(f"✅ New article {state['approved_doc_id']} found in copilot results!")
    else:
        print(f"⚠️  New article not in top results (may need higher similarity)")

    # Print event log
    print("\n" + "=" * 70)
    print("Demo Event Log")
    print("=" * 70)
    for event in state["events_log"][-10:]:  # Last 10 events
        print(f"{event['timestamp'][:19]} [{event['phase']}] {event['event']}")
        print(f"  → {event['detail']}")

    print("\n" + "=" * 70)
    print("✅ ALL DEMO PIPELINE TESTS PASSED")
    print("=" * 70)
    print(f"\nDemo completed successfully in {len(state['events_log'])} steps")
    print(f"Phase: {state['phase']}")
    print(f"Approved article: {state['approved_doc_id']}")
    print(f"\nThe system learned about 'Report Export Failure' in real-time!")

    return 0


if __name__ == "__main__":
    try:
        sys.exit(test_demo_pipeline())
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Cannot connect to {API_BASE}")
        print("   Make sure the server is running: uv run run_server.py")
        sys.exit(1)
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
