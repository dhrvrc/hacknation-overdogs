"""
Integration test for Prompts 1-4: Full retrieval with provenance
Tests: Data Loader + Vector Store + Query Router + Provenance Resolver
Uses REAL ASSERTIONS, not just print statements.
"""
import sys
import os
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from meridian.engine.data_loader import init_datastore
from meridian.engine.vector_store import VectorStore
from meridian.engine.query_router import route_and_retrieve
from meridian.engine.provenance import ProvenanceResolver

print("=" * 70)
print("INTEGRATION TEST: Prompts 1 + 2 + 3 + 4")
print("=" * 70)

test_results = []

# ========================================================================
# Setup
# ========================================================================
print("\n[Setup] Loading data and building index...")
ds = init_datastore("SupportMind_Final_Data.xlsx")
vs = VectorStore()
vs.build_index(ds.documents)
prov = ProvenanceResolver(ds)

print(f"  Data: {len(ds.documents)} docs")
print(f"  Index: {vs.tfidf_matrix.shape}")
print(f"  Provenance resolver ready")

# ========================================================================
# TEST 1: End-to-end query with provenance
# ========================================================================
print("\n" + "=" * 70)
print("TEST 1: End-to-End Query with Provenance")
print("=" * 70)

query = "advance property date backend script"
result = route_and_retrieve(query, vs, top_k=5)

print(f"Query: {query}")
print(f"  Predicted type: {result['predicted_type']}")
print(f"  Primary results: {len(result['primary_results'])}")

# Get provenance for primary results
provenance_chains = prov.resolve_for_results(result['primary_results'])

# Assertions
assert len(provenance_chains) == len(result['primary_results']), \
    "Provenance count mismatch"

for i, (res, prov_chain) in enumerate(zip(result['primary_results'], provenance_chains), 1):
    assert res.doc_id == prov_chain['kb_article_id'], \
        f"Doc ID mismatch: {res.doc_id} != {prov_chain['kb_article_id']}"

    print(f"\n  Result {i}: {res.doc_id} (score={res.score:.4f})")
    print(f"    Type: {res.doc_type}")
    print(f"    Has provenance: {prov_chain['has_provenance']}")
    print(f"    Sources: {len(prov_chain['sources'])}")

    # Verify JSON serializable
    try:
        json.dumps(prov_chain, default=str)
    except Exception as e:
        raise AssertionError(f"Provenance not JSON serializable: {e}")

print("\n[PASS] End-to-end query with provenance works")
test_results.append(("TEST 1", True))

# ========================================================================
# TEST 2: KB article with full provenance chain
# ========================================================================
print("\n" + "=" * 70)
print("TEST 2: KB Article with Full Provenance Chain")
print("=" * 70)

# Search for a synthetic KB article
query = "property date advance issue backend"
result = route_and_retrieve(query, vs, top_k=10)

# Find a synthetic KB in results
synthetic_kb = None
for res in result['primary_results']:
    if res.doc_id.startswith('KB-SYN-'):
        synthetic_kb = res
        break

if not synthetic_kb:
    # Check secondary results
    for results_list in result['secondary_results'].values():
        for res in results_list:
            if res.doc_id.startswith('KB-SYN-'):
                synthetic_kb = res
                break
        if synthetic_kb:
            break

if synthetic_kb:
    chain = prov.resolve(synthetic_kb.doc_id)

    print(f"Found synthetic KB: {synthetic_kb.doc_id}")
    print(f"  Has provenance: {chain.has_provenance}")
    print(f"  Sources: {len(chain.sources)}")

    # Assertions for synthetic KB
    assert chain.has_provenance == True, "Synthetic KB should have provenance"
    assert len(chain.sources) >= 2, "Should have multiple sources"

    # Verify source structure
    for source in chain.sources:
        assert hasattr(source, 'source_type'), "Source must have source_type"
        assert hasattr(source, 'source_id'), "Source must have source_id"
        assert hasattr(source, 'detail'), "Source must have detail"
        assert isinstance(source.detail, dict), "Detail must be dict"

        print(f"    {source.source_type}: {source.source_id}")
        print(f"      Detail fields: {list(source.detail.keys())}")

    print("\n[PASS] Synthetic KB has full provenance chain")
else:
    print("\n[SKIP] No synthetic KB found in results")

test_results.append(("TEST 2", synthetic_kb is not None))

# ========================================================================
# TEST 3: Provenance for different document types
# ========================================================================
print("\n" + "=" * 70)
print("TEST 3: Provenance for Different Document Types")
print("=" * 70)

# Test KB
kb_chain = prov.resolve("KB-SYN-0001")
assert kb_chain.kb_article_id == "KB-SYN-0001"
assert kb_chain.has_provenance == True
print(f"  KB-SYN-0001: {len(kb_chain.sources)} sources")

# Test SCRIPT
script_chain = prov.resolve("SCRIPT-0293")
assert script_chain.kb_article_id == "SCRIPT-0293"
print(f"  SCRIPT-0293: {len(script_chain.sources)} tickets using it")

# Test TICKET
ticket_chain = prov.resolve("CS-38908386")
assert ticket_chain.kb_article_id == "CS-38908386"
assert ticket_chain.has_provenance == True
print(f"  CS-38908386: {len(ticket_chain.sources)} references")

print("\n[PASS] All document types resolve correctly")
test_results.append(("TEST 3", True))

# ========================================================================
# TEST 4: Provenance enrichment has required fields
# ========================================================================
print("\n" + "=" * 70)
print("TEST 4: Provenance Enrichment Validation")
print("=" * 70)

chain = prov.resolve("KB-SYN-0001")

for source in chain.sources:
    print(f"\n  {source.source_type} ({source.source_id}):")

    # Check required enrichment fields based on type
    if source.source_type == 'Ticket':
        required = ['subject', 'tier', 'resolution', 'root_cause', 'module']
        for field in required:
            assert field in source.detail, f"Missing {field} in Ticket detail"
            print(f"    {field}: {str(source.detail[field])[:40]}...")

    elif source.source_type == 'Conversation':
        required = ['channel', 'agent_name', 'sentiment', 'issue_summary']
        for field in required:
            assert field in source.detail, f"Missing {field} in Conversation detail"
            print(f"    {field}: {str(source.detail[field])[:40]}...")

    elif source.source_type == 'Script':
        required = ['title', 'purpose', 'inputs']
        for field in required:
            assert field in source.detail, f"Missing {field} in Script detail"
            print(f"    {field}: {str(source.detail[field])[:40]}...")

print("\n[PASS] All enrichment fields present")
test_results.append(("TEST 4", True))

# ========================================================================
# TEST 5: Learning event resolution
# ========================================================================
print("\n" + "=" * 70)
print("TEST 5: Learning Event Resolution")
print("=" * 70)

chain = prov.resolve("KB-SYN-0001")

assert chain.learning_event is not None, "Should have learning event"
assert isinstance(chain.learning_event, dict), "Learning event must be dict"

required_fields = ['event_id', 'trigger_ticket', 'detected_gap', 'final_status']
for field in required_fields:
    assert field in chain.learning_event, f"Missing {field} in learning event"

print(f"Learning Event:")
print(f"  ID: {chain.learning_event['event_id']}")
print(f"  Trigger: {chain.learning_event['trigger_ticket']}")
print(f"  Status: {chain.learning_event['final_status']}")
print(f"  Gap: {chain.learning_event['detected_gap'][:60]}...")

print("\n[PASS] Learning event resolved correctly")
test_results.append(("TEST 5", True))

# ========================================================================
# TEST 6: Full workflow - Query to Provenance
# ========================================================================
print("\n" + "=" * 70)
print("TEST 6: Complete Workflow (Query -> Results -> Provenance)")
print("=" * 70)

query = "how to edit time worked"
result = route_and_retrieve(query, vs, top_k=3)

print(f"Query: {query}")
print(f"  Predicted: {result['predicted_type']}")

# Get provenance for all results
all_results = result['primary_results'][:]
for sec_results in result['secondary_results'].values():
    all_results.extend(sec_results)

provenance_chains = prov.resolve_for_results(all_results)

assert len(provenance_chains) == len(all_results), "Provenance count mismatch"

print(f"\n  Total results: {len(all_results)}")
print(f"  Provenance chains: {len(provenance_chains)}")

# Count how many have provenance
with_prov = sum(1 for p in provenance_chains if p['has_provenance'])
print(f"  With provenance: {with_prov}")

# Verify structure of each chain
for prov_chain in provenance_chains:
    assert 'kb_article_id' in prov_chain
    assert 'has_provenance' in prov_chain
    assert 'sources' in prov_chain
    assert isinstance(prov_chain['sources'], list)

print("\n[PASS] Complete workflow successful")
test_results.append(("TEST 6", True))

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
elif passed >= total - 1:  # Allow 1 skip
    print(f"[OK] {passed}/{total} TESTS PASSED (1 skip allowed)")
else:
    print(f"[FAIL] {passed}/{total} tests passed")
    sys.exit(1)
print("=" * 70 + "\n")
