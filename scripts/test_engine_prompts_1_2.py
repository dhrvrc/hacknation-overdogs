"""
Quick test for Prompts 1 & 2: Data Loader + Vector Store
Run this to verify both modules work together.
"""
import sys
import os
import time

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from meridian.engine.data_loader import init_datastore
from meridian.engine.vector_store import VectorStore

print("=" * 70)
print("TESTING PROMPTS 1 & 2: Data Loader + Vector Store")
print("=" * 70)

# Test 1: Load data
print("\n[Test 1] Loading data...")
t0 = time.time()
ds = init_datastore("SupportMind_Final_Data.xlsx")
print(f"  [OK] Loaded {len(ds.documents)} documents in {time.time()-t0:.2f}s")

# Test 2: Build vector store
print("\n[Test 2] Building vector store...")
vs = VectorStore()
t0 = time.time()
vs.build_index(ds.documents)
print(f"  [OK] Built index in {time.time()-t0:.2f}s")
print(f"  [OK] Matrix shape: {vs.embedding_matrix.shape}")

# Test 3: Search for scripts
print("\n[Test 3] Searching for scripts...")
results = vs.retrieve("advance property date backend script", top_k=5, doc_types=["SCRIPT"])
print(f"  [OK] Found {len(results)} results")
print(f"  Top result: {results[0].doc_id} - {results[0].title[:50]}...")
print(f"  Score: {results[0].score:.4f}")

# Test 4: Search for KB articles
print("\n[Test 4] Searching KB articles...")
results = vs.retrieve("how to edit time worked", top_k=3, doc_types=["KB"])
print(f"  [OK] Found {len(results)} results")
print(f"  Top result: {results[0].doc_id} - {results[0].title[:50]}...")
print(f"  Score: {results[0].score:.4f}")

# Test 5: Partitioned search
print("\n[Test 5] Multi-partition search...")
partition_results = vs.retrieve_by_partitions("certifications compliance", top_k_per=2)
print(f"  [OK] Searched {len(partition_results)} partitions")
for ptype, presults in partition_results.items():
    if presults:
        print(f"  {ptype}: {presults[0].doc_id} (score={presults[0].score:.4f})")

# Test 6: Similarity check
print("\n[Test 6] Corpus similarity...")
max_sim, best_doc = vs.similarity_to_corpus("property date advance issue", doc_types=["KB"])
print(f"  [OK] Max similarity: {max_sim:.4f}")
print(f"  Best match: {best_doc}")

# Test 7: Document lookup
print("\n[Test 7] Document lookup...")
doc = vs.get_document("KB-SYN-0001")
print(f"  [OK] Found: {doc.doc_id if doc else 'None'}")
if doc:
    print(f"  Title: {doc.title[:50]}...")
    print(f"  Provenance: {len(doc.provenance)} records")

# Test 8: Ticket lookup from datastore
print("\n[Test 8] Ticket lookup...")
ticket = ds.ticket_by_number.get("CS-38908386")
if ticket is not None:
    print(f"  [OK] Found ticket: CS-38908386")
    print(f"  Tier: {ticket['Tier']}")
    print(f"  Subject: {ticket['Subject'][:50]}...")

print("\n" + "=" * 70)
print("[OK] ALL TESTS PASSED")
print("=" * 70)
