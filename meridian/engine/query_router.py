"""
Meridian Query Router
Classifies queries and routes retrieval to the right document partition.
"""
import logging
from typing import Tuple, Dict, List

from .vector_store import VectorStore, RetrievalResult

logger = logging.getLogger(__name__)


# Keyword signal lists (tuned for classification)
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


def classify_query(query: str, vector_store: VectorStore) -> Tuple[str, Dict[str, float]]:
    """
    Classify a query as SCRIPT, KB, or TICKET_RESOLUTION.

    Returns:
        (predicted_type, confidence_scores)

    Classification algorithm:
        1. Count keyword hits for each type (substring matching)
        2. keyword_score = min(hits / 3.0, 1.0)
        3. Retrieve top-1 from each partition
        4. retrieval_score = top-1 cosine similarity
        5. final_score = keyword_score * 0.4 + retrieval_score * 0.6
        6. predicted_type = argmax(final_scores)
        7. Tiebreaker: SCRIPT > KB > TICKET (by prior distribution)
    """
    query_lower = query.lower()

    # Step 1-2: Keyword scoring
    keyword_scores = {}

    script_hits = sum(1 for signal in SCRIPT_SIGNALS if signal in query_lower)
    keyword_scores['SCRIPT'] = min(script_hits / 3.0, 1.0)

    kb_hits = sum(1 for signal in KB_SIGNALS if signal in query_lower)
    keyword_scores['KB'] = min(kb_hits / 3.0, 1.0)

    ticket_hits = sum(1 for signal in TICKET_SIGNALS if signal in query_lower)
    keyword_scores['TICKET'] = min(ticket_hits / 3.0, 1.0)

    # Step 3-4: Retrieval scoring
    partition_results = vector_store.retrieve_by_partitions(query, top_k_per=1)

    retrieval_scores = {}
    for doc_type in ['SCRIPT', 'KB', 'TICKET']:
        results = partition_results.get(doc_type, [])
        retrieval_scores[doc_type] = results[0].score if results else 0.0

    # Step 5: Combine scores
    final_scores = {}
    for doc_type in ['SCRIPT', 'KB', 'TICKET']:
        final_scores[doc_type] = (
            keyword_scores[doc_type] * 0.4 +
            retrieval_scores[doc_type] * 0.6
        )

    # Step 6-7: Predict with tiebreaker
    max_score = max(final_scores.values())

    # Tiebreaker order: SCRIPT > KB > TICKET
    tiebreaker_order = ['SCRIPT', 'KB', 'TICKET']
    predicted_type = None
    for dt in tiebreaker_order:
        if final_scores[dt] == max_score:
            predicted_type = dt
            break

    logger.debug(f"Query: {query[:50]}...")
    logger.debug(f"  Keyword scores: {keyword_scores}")
    logger.debug(f"  Retrieval scores: {retrieval_scores}")
    logger.debug(f"  Final scores: {final_scores}")
    logger.debug(f"  Predicted: {predicted_type}")

    return predicted_type, final_scores


def route_and_retrieve(
    query: str,
    vector_store: VectorStore,
    top_k: int = 5
) -> dict:
    """
    Classify query, retrieve from primary partition, and fetch secondary results.

    Returns:
        {
            "query": str,
            "predicted_type": "SCRIPT" | "KB" | "TICKET",
            "confidence_scores": {"SCRIPT": float, "KB": float, "TICKET": float},
            "primary_results": [RetrievalResult, ...],
            "secondary_results": {
                "KB": [RetrievalResult, ...],      # only OTHER types
                "SCRIPT": [RetrievalResult, ...],
            }
        }
    """
    # Classify
    predicted_type, confidence_scores = classify_query(query, vector_store)

    # Primary retrieval (top_k from predicted type)
    primary_results = vector_store.retrieve(
        query=query,
        top_k=top_k,
        doc_types=[predicted_type]
    )

    # Secondary retrieval (top_2 from each OTHER type)
    all_types = ['SCRIPT', 'KB', 'TICKET']
    other_types = [dt for dt in all_types if dt != predicted_type]

    secondary_results = {}
    for doc_type in other_types:
        results = vector_store.retrieve(
            query=query,
            top_k=2,
            doc_types=[doc_type]
        )
        secondary_results[doc_type] = results

    return {
        "query": query,
        "predicted_type": predicted_type,
        "confidence_scores": confidence_scores,
        "primary_results": primary_results,
        "secondary_results": secondary_results
    }


if __name__ == "__main__":
    """Sanity check with REAL assertions."""
    import sys
    import os
    import logging

    # Setup logging
    logging.basicConfig(level=logging.INFO, format='%(message)s')

    # Add parent to path
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

    from meridian.engine.data_loader import init_datastore
    from meridian.engine.vector_store import VectorStore

    print("\n" + "=" * 70)
    print("MERIDIAN QUERY ROUTER - SANITY CHECK")
    print("=" * 70 + "\n")

    # Load data and build index
    print("Loading data and building index...")
    ds = init_datastore("SupportMind_Final_Data.xlsx")
    vs = VectorStore()
    vs.build_index(ds.documents)
    print(f"[OK] Index ready with {len(ds.documents)} documents\n")

    # Track test results
    test_results = []

    # ========================================================================
    # TEST 1: classify_query returns correct types
    # ========================================================================
    print("=" * 70)
    print("TEST 1: Classification Return Type")
    print("=" * 70)

    query = "test query"
    result = classify_query(query, vs)

    # Assertion 1: Returns a tuple
    assert isinstance(result, tuple), f"Expected tuple, got {type(result)}"
    assert len(result) == 2, f"Expected 2-tuple, got {len(result)} elements"

    # Assertion 2: First element is a string
    predicted_type, scores = result
    assert isinstance(predicted_type, str), f"Expected str, got {type(predicted_type)}"

    # Assertion 3: Predicted type is one of the valid types
    valid_types = ['SCRIPT', 'KB', 'TICKET']
    assert predicted_type in valid_types, f"Invalid type: {predicted_type}, expected one of {valid_types}"

    # Assertion 4: Scores is a dict
    assert isinstance(scores, dict), f"Expected dict, got {type(scores)}"

    # Assertion 5: Scores has all three types
    assert set(scores.keys()) == set(valid_types), f"Expected keys {valid_types}, got {scores.keys()}"

    # Assertion 6: All scores are floats
    for dt, score in scores.items():
        assert isinstance(score, float), f"Score for {dt} is not float: {type(score)}"
        assert 0.0 <= score <= 1.0, f"Score for {dt} out of range: {score}"

    print("[PASS] classify_query returns (str, dict) with correct types")
    print(f"  Predicted: {predicted_type}")
    print(f"  Scores: {scores}")
    test_results.append(("TEST 1", True))

    # ========================================================================
    # TEST 2: SCRIPT classification
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 2: SCRIPT Query Classification")
    print("=" * 70)

    script_query = "advance property date backend script"
    predicted, scores = classify_query(script_query, vs)

    print(f'Query: "{script_query}"')
    print(f"  Predicted: {predicted}")
    print(f"  Scores: {scores}")

    # Assertion: Should classify as SCRIPT
    assert predicted == "SCRIPT", f"Expected SCRIPT, got {predicted}"

    print("[PASS] Correctly classified as SCRIPT")
    test_results.append(("TEST 2", True))

    # ========================================================================
    # TEST 3: KB classification
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 3: KB Query Classification")
    print("=" * 70)

    kb_query = "how to edit time worked in the UI"
    predicted, scores = classify_query(kb_query, vs)

    print(f'Query: "{kb_query}"')
    print(f"  Predicted: {predicted}")
    print(f"  Scores: {scores}")

    # Assertion: Should classify as KB
    assert predicted == "KB", f"Expected KB, got {predicted}"

    print("[PASS] Correctly classified as KB")
    test_results.append(("TEST 3", True))

    # ========================================================================
    # TEST 4: TICKET classification
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 4: TICKET Query Classification")
    print("=" * 70)

    ticket_query = "what was the resolution for site Meadow Pointe"
    predicted, scores = classify_query(ticket_query, vs)

    print(f'Query: "{ticket_query}"')
    print(f"  Predicted: {predicted}")
    print(f"  Scores: {scores}")

    # Assertion: Should classify as TICKET
    assert predicted == "TICKET", f"Expected TICKET, got {predicted}"

    print("[PASS] Correctly classified as TICKET")
    test_results.append(("TEST 4", True))

    # ========================================================================
    # TEST 5: route_and_retrieve structure
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 5: route_and_retrieve Return Structure")
    print("=" * 70)

    query = "advance property date backend script"
    result = route_and_retrieve(query, vs, top_k=5)

    print(f'Query: "{query}"')

    # Assertion 1: Returns a dict
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"

    # Assertion 2: Has required keys
    required_keys = {"query", "predicted_type", "confidence_scores", "primary_results", "secondary_results"}
    assert required_keys.issubset(result.keys()), f"Missing keys: {required_keys - result.keys()}"

    # Assertion 3: query field matches
    assert result["query"] == query, f"Query mismatch: {result['query']} != {query}"

    # Assertion 4: predicted_type is valid
    assert result["predicted_type"] in valid_types, f"Invalid predicted_type: {result['predicted_type']}"

    # Assertion 5: confidence_scores is a dict with 3 keys
    assert isinstance(result["confidence_scores"], dict), "confidence_scores must be dict"
    assert len(result["confidence_scores"]) == 3, f"Expected 3 scores, got {len(result['confidence_scores'])}"

    # Assertion 6: primary_results is a list
    assert isinstance(result["primary_results"], list), "primary_results must be list"

    # Assertion 7: All primary results match predicted type
    for r in result["primary_results"]:
        assert isinstance(r, RetrievalResult), f"Expected RetrievalResult, got {type(r)}"
        assert r.doc_type == result["predicted_type"], \
            f"Primary result type {r.doc_type} != predicted {result['predicted_type']}"

    # Assertion 8: secondary_results is a dict
    assert isinstance(result["secondary_results"], dict), "secondary_results must be dict"

    # Assertion 9: secondary_results has exactly 2 keys (the OTHER types)
    assert len(result["secondary_results"]) == 2, \
        f"Expected 2 secondary types, got {len(result['secondary_results'])}"

    # Assertion 10: secondary_results does NOT include predicted_type
    assert result["predicted_type"] not in result["secondary_results"], \
        f"secondary_results should not include predicted_type {result['predicted_type']}"

    # Assertion 11: All secondary result types match their keys
    for doc_type, results in result["secondary_results"].items():
        assert isinstance(results, list), f"Results for {doc_type} must be list"
        for r in results:
            assert r.doc_type == doc_type, \
                f"Secondary result type {r.doc_type} != key {doc_type}"

    print(f"[PASS] route_and_retrieve returns correct structure")
    print(f"  Predicted: {result['predicted_type']}")
    print(f"  Primary results: {len(result['primary_results'])}")
    print(f"  Secondary types: {list(result['secondary_results'].keys())}")
    test_results.append(("TEST 5", True))

    # ========================================================================
    # TEST 6: Multiple classifications (consistency check)
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 6: Classification Consistency")
    print("=" * 70)

    test_queries = [
        ("backend data fix script", "SCRIPT"),
        ("how do i configure settings", "KB"),
        ("what fixed the issue in similar cases", "TICKET"),
        ("tier 3 escalation backend", "SCRIPT"),
        ("step by step guide", "KB"),
    ]

    consistency_pass = True
    for test_query, expected_type in test_queries:
        predicted, _ = classify_query(test_query, vs)
        match = predicted == expected_type
        status = "PASS" if match else "FAIL"
        print(f'  [{status}] "{test_query}" -> {predicted} (expected {expected_type})')

        if not match:
            consistency_pass = False

    assert consistency_pass, "Some classifications did not match expected types"

    print("[PASS] All test queries classified correctly")
    test_results.append(("TEST 6", True))

    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)

    for test_name, passed in test_results:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} {test_name}")

    total_tests = len(test_results)
    passed_tests = sum(1 for _, passed in test_results if passed)

    print("\n" + "=" * 70)
    if passed_tests == total_tests:
        print(f"[OK] ALL {total_tests} TESTS PASSED")
    else:
        print(f"[FAIL] {passed_tests}/{total_tests} tests passed")
        sys.exit(1)
    print("=" * 70 + "\n")
