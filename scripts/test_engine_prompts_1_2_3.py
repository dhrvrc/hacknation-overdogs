"""
Integration test for Prompts 1, 2, 3: Data Loader + Vector Store + Query Router
Run this to verify all three modules work together correctly.
Uses REAL ASSERTIONS, not just print statements.
"""
import sys
import os
import time

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from meridian.engine.data_loader import init_datastore
from meridian.engine.vector_store import VectorStore, RetrievalResult
from meridian.engine.query_router import classify_query, route_and_retrieve

print("=" * 70)
print("INTEGRATION TEST: Prompts 1 + 2 + 3")
print("=" * 70)

test_results = []

# ========================================================================
# Setup: Load data and build index
# ========================================================================
print("\n[Setup] Loading data and building index...")
t0 = time.time()
ds = init_datastore("SupportMind_Final_Data.xlsx")
load_time = time.time() - t0

t0 = time.time()
vs = VectorStore()
vs.build_index(ds.documents)
build_time = time.time() - t0

print(f"  Data loaded: {len(ds.documents)} docs in {load_time:.2f}s")
print(f"  Index built: {vs.embedding_matrix.shape} in {build_time:.2f}s")

# Assertions for setup
assert len(ds.documents) == 4321, f"Expected 4321 documents, got {len(ds.documents)}"
assert vs.embedding_matrix.shape[0] == 4321, f"Expected 4321 rows, got {vs.embedding_matrix.shape[0]}"

# ========================================================================
# TEST 1: Classification accuracy on known queries
# ========================================================================
print("\n" + "=" * 70)
print("TEST 1: Classification Accuracy")
print("=" * 70)

test_cases = [
    ("advance property date backend script", "SCRIPT"),
    ("how to edit time worked in the UI", "KB"),
    ("what was the resolution for site Meadow Pointe", "TICKET"),
    ("run backend data fix query", "SCRIPT"),
    ("steps to configure settings", "KB"),
    ("similar case resolution", "TICKET"),
]

correct = 0
for query, expected in test_cases:
    predicted, scores = classify_query(query, vs)
    is_correct = predicted == expected
    if is_correct:
        correct += 1

    status = "[PASS]" if is_correct else "[FAIL]"
    print(f'{status} "{query[:40]}..." -> {predicted} (expected {expected})')

accuracy = correct / len(test_cases)
print(f"\nAccuracy: {correct}/{len(test_cases)} = {accuracy:.1%}")

assert accuracy >= 0.8, f"Classification accuracy too low: {accuracy:.1%}"
test_results.append(("TEST 1: Classification", True))

# ========================================================================
# TEST 2: Route and retrieve returns correct structure
# ========================================================================
print("\n" + "=" * 70)
print("TEST 2: Route and Retrieve Structure")
print("=" * 70)

query = "advance property date backend script"
result = route_and_retrieve(query, vs, top_k=5)

# Assertions on structure
assert isinstance(result, dict), "Result must be dict"
assert result["query"] == query, "Query field mismatch"
assert result["predicted_type"] in ["SCRIPT", "KB", "TICKET"], "Invalid predicted_type"
assert isinstance(result["primary_results"], list), "primary_results must be list"
assert isinstance(result["secondary_results"], dict), "secondary_results must be dict"
assert len(result["secondary_results"]) == 2, "secondary_results must have exactly 2 keys"
assert result["predicted_type"] not in result["secondary_results"], \
    "secondary_results should not contain predicted_type"

print(f"Query: {query}")
print(f"  Predicted type: {result['predicted_type']}")
print(f"  Primary results: {len(result['primary_results'])}")
print(f"  Secondary types: {list(result['secondary_results'].keys())}")

# Verify primary results all match predicted type
for r in result["primary_results"]:
    assert isinstance(r, RetrievalResult), f"Expected RetrievalResult, got {type(r)}"
    assert r.doc_type == result["predicted_type"], \
        f"Primary result type mismatch: {r.doc_type} != {result['predicted_type']}"

# Verify secondary results match their keys
for doc_type, results in result["secondary_results"].items():
    assert isinstance(results, list), f"Results for {doc_type} must be list"
    for r in results:
        assert r.doc_type == doc_type, \
            f"Secondary result type mismatch: {r.doc_type} != {doc_type}"

print("[PASS] Structure validation passed")
test_results.append(("TEST 2: Structure", True))

# ========================================================================
# TEST 3: SCRIPT query retrieves SCRIPT documents
# ========================================================================
print("\n" + "=" * 70)
print("TEST 3: SCRIPT Query Routing")
print("=" * 70)

script_query = "backend fix for advance property date"
result = route_and_retrieve(script_query, vs, top_k=5)

assert result["predicted_type"] == "SCRIPT", \
    f"Expected SCRIPT, got {result['predicted_type']}"

assert len(result["primary_results"]) > 0, "No primary results returned"

# All primary results should be SCRIPT type
for r in result["primary_results"]:
    assert r.doc_type == "SCRIPT", \
        f"Expected SCRIPT result, got {r.doc_type}"

print(f"Query: {script_query}")
print(f"  Predicted: {result['predicted_type']} (correct)")
print(f"  Primary results: {len(result['primary_results'])} SCRIPT documents")
print(f"  Top result: {result['primary_results'][0].doc_id}")
print(f"  Top score: {result['primary_results'][0].score:.4f}")

print("[PASS] SCRIPT routing works correctly")
test_results.append(("TEST 3: SCRIPT routing", True))

# ========================================================================
# TEST 4: KB query retrieves KB documents
# ========================================================================
print("\n" + "=" * 70)
print("TEST 4: KB Query Routing")
print("=" * 70)

kb_query = "how to configure time worked settings"
result = route_and_retrieve(kb_query, vs, top_k=3)

assert result["predicted_type"] == "KB", \
    f"Expected KB, got {result['predicted_type']}"

assert len(result["primary_results"]) > 0, "No primary results returned"

# All primary results should be KB type
for r in result["primary_results"]:
    assert r.doc_type == "KB", \
        f"Expected KB result, got {r.doc_type}"

print(f"Query: {kb_query}")
print(f"  Predicted: {result['predicted_type']} (correct)")
print(f"  Primary results: {len(result['primary_results'])} KB documents")
print(f"  Top result: {result['primary_results'][0].doc_id}")
print(f"  Top score: {result['primary_results'][0].score:.4f}")

print("[PASS] KB routing works correctly")
test_results.append(("TEST 4: KB routing", True))

# ========================================================================
# TEST 5: Secondary results are present and correct
# ========================================================================
print("\n" + "=" * 70)
print("TEST 5: Secondary Results Validation")
print("=" * 70)

query = "certifications compliance issue"
result = route_and_retrieve(query, vs, top_k=5)

print(f"Query: {query}")
print(f"  Predicted: {result['predicted_type']}")
print(f"  Primary count: {len(result['primary_results'])}")

# Verify secondary results exist
assert len(result["secondary_results"]) == 2, \
    f"Expected 2 secondary types, got {len(result['secondary_results'])}"

for doc_type, results in result["secondary_results"].items():
    print(f"  Secondary ({doc_type}): {len(results)} results")

    # Should have at least 1 result (we request top_2 per type)
    assert len(results) >= 1, f"No secondary results for {doc_type}"

    # All results should match their type
    for r in results:
        assert r.doc_type == doc_type, \
            f"Type mismatch in secondary: {r.doc_type} != {doc_type}"

print("[PASS] Secondary results validation passed")
test_results.append(("TEST 5: Secondary results", True))

# ========================================================================
# TEST 6: Confidence scores are valid
# ========================================================================
print("\n" + "=" * 70)
print("TEST 6: Confidence Scores Validation")
print("=" * 70)

query = "backend script for data fix"
predicted, scores = classify_query(query, vs)

print(f"Query: {query}")
print(f"  Predicted: {predicted}")
print(f"  Scores: {scores}")

# Verify all types have scores
assert len(scores) == 3, f"Expected 3 scores, got {len(scores)}"
assert set(scores.keys()) == {"SCRIPT", "KB", "TICKET"}, \
    f"Unexpected score keys: {scores.keys()}"

# Verify all scores are valid floats in range [0, 1]
for doc_type, score in scores.items():
    assert isinstance(score, float), f"Score for {doc_type} is not float: {type(score)}"
    assert 0.0 <= score <= 1.0, f"Score for {doc_type} out of range: {score}"

# Predicted type should have highest or tied-highest score
max_score = max(scores.values())
assert scores[predicted] >= max_score - 0.001, \
    f"Predicted type {predicted} doesn't have max score"

print("[PASS] Confidence scores are valid")
test_results.append(("TEST 6: Confidence scores", True))

# ========================================================================
# SUMMARY
# ========================================================================
print("\n" + "=" * 70)
print("TEST SUMMARY")
print("=" * 70)

for test_name, passed in test_results:
    status = "[PASS]" if passed else "[FAIL]"
    print(f"{status} {test_name}")

total = len(test_results)
passed = sum(1 for _, p in test_results if p)

print("\n" + "=" * 70)
if passed == total:
    print(f"[OK] ALL {total} INTEGRATION TESTS PASSED")
else:
    print(f"[FAIL] {passed}/{total} tests passed")
    sys.exit(1)
print("=" * 70 + "\n")
