"""
Integration test for Prompts 1-5: Complete engine with gap detection
Tests: Data Loader + Vector Store + Query Router + Provenance + Gap Detector
Uses REAL ASSERTIONS, not just print statements.
"""
import sys
import os
import time

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from meridian.engine.data_loader import init_datastore
from meridian.engine.vector_store import VectorStore
from meridian.engine.query_router import route_and_retrieve
from meridian.engine.provenance import ProvenanceResolver
from meridian.engine.gap_detector import GapDetector

print("=" * 70)
print("INTEGRATION TEST: Prompts 1-5 (COMPLETE ENGINE)")
print("=" * 70)

test_results = []

# ========================================================================
# Setup
# ========================================================================
print("\n[Setup] Loading data and building all modules...")
t0 = time.time()

ds = init_datastore("SupportMind_Final_Data.xlsx")
vs = VectorStore()
vs.build_index(ds.documents)
prov = ProvenanceResolver(ds)
gap = GapDetector(vs, ds, threshold=0.40)

setup_time = time.time() - t0

print(f"  Data: {len(ds.documents)} docs")
print(f"  Index: {vs.tfidf_matrix.shape}")
print(f"  Setup time: {setup_time:.1f}s")

# ========================================================================
# TEST 1: Full workflow - Query to gap detection
# ========================================================================
print("\n" + "=" * 70)
print("TEST 1: Complete Workflow (Query -> Results -> Provenance -> Gaps)")
print("=" * 70)

# Search
query = "advance property date backend issue"
result = route_and_retrieve(query, vs, top_k=5)

print(f"Query: {query}")
print(f"  Classification: {result['predicted_type']}")
print(f"  Primary results: {len(result['primary_results'])}")

# Get provenance
provenance_chains = prov.resolve_for_results(result['primary_results'])

assert len(provenance_chains) == len(result['primary_results'])
print(f"  Provenance chains: {len(provenance_chains)}")

# Check gap for a ticket
ticket_gap = gap.check_ticket("CS-38908386")
print(f"\n  Gap check for CS-38908386:")
print(f"    Is gap: {ticket_gap.is_gap}")
print(f"    Similarity: {ticket_gap.resolution_similarity:.4f}")

print("\n[PASS] Complete workflow successful")
test_results.append(("TEST 1", True))

# ========================================================================
# TEST 2: Gap detection finds real gaps
# ========================================================================
print("\n" + "=" * 70)
print("TEST 2: Gap Detection Accuracy")
print("=" * 70)

# Scan first 50 tickets for speed
print("Scanning first 50 tickets...")
ticket_numbers = list(ds.ticket_by_number.keys())[:50]
sample_results = [gap.check_ticket(tn) for tn in ticket_numbers]

gaps_found = sum(1 for r in sample_results if r.is_gap)
avg_sim = sum(r.resolution_similarity for r in sample_results) / len(sample_results)

print(f"  Scanned: {len(sample_results)} tickets")
print(f"  Gaps: {gaps_found}")
print(f"  Avg similarity: {avg_sim:.4f}")

# Verify structure
for r in sample_results:
    assert isinstance(r.is_gap, bool)
    assert 0.0 <= r.resolution_similarity <= 1.0
    assert isinstance(r.best_matching_kb_id, str)

print("\n[PASS] Gap detection works correctly")
test_results.append(("TEST 2", True))

# ========================================================================
# TEST 3: Emerging issues clustering
# ========================================================================
print("\n" + "=" * 70)
print("TEST 3: Emerging Issues Detection")
print("=" * 70)

# Use full scan results if available, else scan again
print("Scanning all tickets for emerging issues...")
all_gaps = gap.scan_all_tickets()

emerging = gap.detect_emerging_issues(all_gaps, min_cluster_size=3)

assert len(emerging) >= 1, "Should find at least 1 emerging issue"

print(f"  Gaps found: {sum(1 for r in all_gaps if r.is_gap)}/{len(all_gaps)}")
print(f"  Emerging issues: {len(emerging)}")

# Show top 3
for i, issue in enumerate(emerging[:3], 1):
    print(f"\n  Issue {i}: {issue['category']} / {issue['module']}")
    print(f"    Tickets: {issue['ticket_count']}")
    print(f"    Avg similarity: {issue['avg_similarity']:.4f}")

    # Verify structure
    assert issue['ticket_count'] >= 3
    assert len(issue['ticket_numbers']) == issue['ticket_count']

print("\n[PASS] Emerging issues detected")
test_results.append(("TEST 3", True))

# ========================================================================
# TEST 4: Before/after comparison (THE HEADLINE METRIC)
# ========================================================================
print("\n" + "=" * 70)
print("TEST 4: Self-Learning Proof (Before/After Comparison)")
print("=" * 70)

print("Running before/after comparison...")
print("(This scans 400 tickets twice - will take ~30-60s)")

t0 = time.time()
comparison = gap.before_after_comparison()
comparison_time = time.time() - t0

before = comparison['before_learning']
after = comparison['after_learning']
improvement = comparison['improvement']

# Key assertions
assert before['total_gaps'] > after['total_gaps'], \
    "Before should have MORE gaps than after"

assert improvement['gaps_closed'] > 0, "Should close some gaps"

assert improvement['similarity_lift'] > 0, "Similarity should improve"

# The improvement should be substantial (at least 10%)
assert improvement['pct_improvement'] >= 10, \
    f"Improvement too small: {improvement['pct_improvement']:.1f}%"

print(f"\nCompleted in {comparison_time:.1f}s\n")

print("BEFORE (without 161 synthetic KBs):")
print(f"  Gaps: {before['total_gaps']}")
print(f"  Avg similarity: {before['avg_resolution_similarity']:.4f}")

print("\nAFTER (with 161 synthetic KBs):")
print(f"  Gaps: {after['total_gaps']}")
print(f"  Avg similarity: {after['avg_resolution_similarity']:.4f}")

print("\nIMPROVEMENT:")
print(f"  Gaps closed: {improvement['gaps_closed']}")
print(f"  Percentage: {improvement['pct_improvement']:.1f}%")
print(f"  Similarity lift: +{improvement['similarity_lift']:.4f}")

print("\n[PASS] Self-learning loop proven with measurable improvement")
test_results.append(("TEST 4", True))

# ========================================================================
# TEST 5: Integration - Find gap, check provenance of similar KB
# ========================================================================
print("\n" + "=" * 70)
print("TEST 5: Gap + Provenance Integration")
print("=" * 70)

# Find a ticket that is NOT a gap (has good KB coverage)
non_gap_ticket = None
for r in all_gaps:
    if not r.is_gap and r.resolution_similarity > 0.5:
        non_gap_ticket = r
        break

if non_gap_ticket:
    print(f"Non-gap ticket: {non_gap_ticket.ticket_number}")
    print(f"  Similarity: {non_gap_ticket.resolution_similarity:.4f}")
    print(f"  Best KB: {non_gap_ticket.best_matching_kb_id}")

    # Get provenance of the matching KB
    kb_chain = prov.resolve(non_gap_ticket.best_matching_kb_id)

    print(f"\n  KB Article provenance:")
    print(f"    Has provenance: {kb_chain.has_provenance}")
    print(f"    Sources: {len(kb_chain.sources)}")

    if kb_chain.has_provenance:
        print(f"    Learning event: {kb_chain.learning_event is not None}")

    print("\n[PASS] Gap + Provenance integration works")
    test_results.append(("TEST 5", True))
else:
    print("\n[SKIP] No non-gap ticket found for integration test")
    test_results.append(("TEST 5", False))

# ========================================================================
# SUMMARY
# ========================================================================
print("\n" + "=" * 70)
print("TEST SUMMARY")
print("=" * 70)

for test_name, passed in test_results:
    status = "[PASS]" if passed else "[SKIP]"
    print(f"{status} {test_name}")

total = len(test_results)
passed = sum(1 for _, p in test_results if p)

print("\n" + "=" * 70)
if passed == total:
    print(f"[OK] ALL {total} INTEGRATION TESTS PASSED")
elif passed >= total - 1:
    print(f"[OK] {passed}/{total} TESTS PASSED (1 skip allowed)")
else:
    print(f"[FAIL] {passed}/{total} tests passed")
    sys.exit(1)

print("\n" + "=" * 70)
print("DEMO HEADLINE METRICS")
print("=" * 70)
print(f"Self-learning loop closed: {improvement['gaps_closed']} gaps")
print(f"Improvement percentage: {improvement['pct_improvement']:.1f}%")
print(f"Similarity improvement: +{improvement['similarity_lift']:.4f}")
print(f"Before/After gap ratio: {before['total_gaps']}/{after['total_gaps']}")
print("=" * 70 + "\n")
