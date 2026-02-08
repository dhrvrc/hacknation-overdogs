"""
Meridian Vector Store
Fast TF-IDF retrieval engine with partitioned search and dynamic indexing.
"""
import time
import logging
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple, Set
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .data_loader import Document

logger = logging.getLogger(__name__)


@dataclass
class RetrievalResult:
    """A single retrieval result with metadata."""
    doc_id: str
    doc_type: str       # "KB" | "SCRIPT" | "TICKET"
    title: str
    body: str           # truncated to first 2000 chars for API responses
    score: float        # cosine similarity, range [0, 1]
    metadata: dict
    provenance: list
    rank: int           # 1-indexed position in results


class VectorStore:
    """TF-IDF vector store with partitioned retrieval and dynamic indexing."""

    def __init__(self):
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None  # sparse matrix
        self.documents: List[Document] = []
        self.doc_index: Dict[str, Document] = {}  # doc_id → Document
        self.partition_indices: Dict[str, List[int]] = {}  # doc_type → list of row indices
        self.is_built = False

    def build_index(self, documents: List[Document]) -> None:
        """
        Fit TF-IDF vectorizer on all documents' search_text.
        Store the sparse matrix and build partition index maps.
        """
        logger.info(f"Building TF-IDF index for {len(documents)} documents")
        t0 = time.time()

        self.documents = documents
        self.doc_index = {doc.doc_id: doc for doc in documents}

        # Extract search texts
        search_texts = [doc.search_text for doc in documents]

        # Build TF-IDF vectorizer
        self.vectorizer = TfidfVectorizer(
            max_features=30000,
            ngram_range=(1, 2),
            stop_words='english',
            sublinear_tf=True,
            dtype=np.float32
        )

        # Fit and transform
        self.tfidf_matrix = self.vectorizer.fit_transform(search_texts)

        # Build partition indices
        self.partition_indices = {'KB': [], 'SCRIPT': [], 'TICKET': []}
        for idx, doc in enumerate(documents):
            if doc.doc_type in self.partition_indices:
                self.partition_indices[doc.doc_type].append(idx)

        self.is_built = True

        elapsed = time.time() - t0
        logger.info(f"  Index built in {elapsed:.2f}s")
        logger.info(f"  Matrix shape: {self.tfidf_matrix.shape}")
        logger.info(f"  Partitions: KB={len(self.partition_indices['KB'])}, "
                   f"SCRIPT={len(self.partition_indices['SCRIPT'])}, "
                   f"TICKET={len(self.partition_indices['TICKET'])}")

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        doc_types: Optional[List[str]] = None,
        exclude_ids: Optional[Set[str]] = None
    ) -> List[RetrievalResult]:
        """
        Core retrieval. Transform query, compute cosine similarity
        against candidates (filtered by doc_types and exclude_ids),
        return top_k results sorted by score descending.
        """
        if not self.is_built:
            raise RuntimeError("Index not built. Call build_index() first.")

        # Transform query
        query_vec = self.vectorizer.transform([query])

        # Determine candidate indices
        if doc_types:
            candidate_indices = []
            for dt in doc_types:
                if dt in self.partition_indices:
                    candidate_indices.extend(self.partition_indices[dt])
        else:
            candidate_indices = list(range(len(self.documents)))

        # Filter out excluded docs
        if exclude_ids:
            candidate_indices = [
                idx for idx in candidate_indices
                if self.documents[idx].doc_id not in exclude_ids
            ]

        if not candidate_indices:
            return []

        # Compute similarities for candidates only
        candidate_matrix = self.tfidf_matrix[candidate_indices]
        similarities = cosine_similarity(query_vec, candidate_matrix).flatten()

        # Get top-k using argpartition for O(n) complexity
        if len(similarities) <= top_k:
            top_indices = np.argsort(-similarities)
        else:
            # argpartition gives top-k unsorted, then we sort them
            partition_idx = np.argpartition(-similarities, top_k)[:top_k]
            top_indices = partition_idx[np.argsort(-similarities[partition_idx])]

        # Build results
        results = []
        for rank, idx in enumerate(top_indices, start=1):
            doc_idx = candidate_indices[idx]
            doc = self.documents[doc_idx]
            score = float(similarities[idx])

            # Truncate body to 2000 chars
            body = doc.body[:2000] if len(doc.body) > 2000 else doc.body

            result = RetrievalResult(
                doc_id=doc.doc_id,
                doc_type=doc.doc_type,
                title=doc.title,
                body=body,
                score=score,
                metadata=doc.metadata,
                provenance=doc.provenance,
                rank=rank
            )
            results.append(result)

        return results

    def retrieve_by_partitions(
        self,
        query: str,
        top_k_per: int = 3
    ) -> Dict[str, List[RetrievalResult]]:
        """
        Retrieve top_k_per from EACH partition independently.
        Returns {"KB": [...], "SCRIPT": [...], "TICKET": [...]}.
        Used by the query router to compare cross-partition relevance.
        """
        results = {}
        for doc_type in ['KB', 'SCRIPT', 'TICKET']:
            partition_results = self.retrieve(
                query=query,
                top_k=top_k_per,
                doc_types=[doc_type]
            )
            results[doc_type] = partition_results
        return results

    def similarity_to_corpus(
        self,
        text: str,
        doc_types: Optional[List[str]] = None
    ) -> Tuple[float, str]:
        """
        Returns (max_cosine_similarity, best_match_doc_id) for the given
        text against the corpus (or a partition). Used by gap detector.
        """
        if not self.is_built:
            raise RuntimeError("Index not built. Call build_index() first.")

        # Transform text
        text_vec = self.vectorizer.transform([text])

        # Determine candidate indices
        if doc_types:
            candidate_indices = []
            for dt in doc_types:
                if dt in self.partition_indices:
                    candidate_indices.extend(self.partition_indices[dt])
        else:
            candidate_indices = list(range(len(self.documents)))

        if not candidate_indices:
            return 0.0, ""

        # Compute similarities
        candidate_matrix = self.tfidf_matrix[candidate_indices]
        similarities = cosine_similarity(text_vec, candidate_matrix).flatten()

        # Find max
        max_idx = np.argmax(similarities)
        max_score = float(similarities[max_idx])
        best_doc_idx = candidate_indices[max_idx]
        best_doc_id = self.documents[best_doc_idx].doc_id

        return max_score, best_doc_id

    def remove_documents(self, doc_ids: Set[str]) -> None:
        """Filter out documents by ID and rebuild the index from scratch."""
        logger.info(f"Removing {len(doc_ids)} documents and rebuilding index")

        # Filter documents
        remaining_docs = [doc for doc in self.documents if doc.doc_id not in doc_ids]

        # Rebuild from scratch
        self.build_index(remaining_docs)

    def add_documents(self, new_docs: List[Document]) -> None:
        """Append new documents and rebuild the index from scratch."""
        logger.info(f"Adding {len(new_docs)} documents and rebuilding index")

        # Merge documents
        all_docs = self.documents + new_docs

        # Rebuild from scratch
        self.build_index(all_docs)

    def get_document(self, doc_id: str) -> Optional[Document]:
        """O(1) lookup by doc_id."""
        return self.doc_index.get(doc_id)


if __name__ == "__main__":
    """Sanity check: load data and test retrieval."""
    import sys
    logging.basicConfig(level=logging.INFO, format='%(message)s')

    from .data_loader import init_datastore

    try:
        from meridian.config import DATA_PATH
        path = sys.argv[1] if len(sys.argv) > 1 else DATA_PATH
    except ImportError:
        import os
        path = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("MERIDIAN_DATA", "SupportMind_Final_Data.xlsx")

    print("\n" + "=" * 70)
    print("MERIDIAN VECTOR STORE - SANITY CHECK")
    print("=" * 70 + "\n")

    # Load data
    print("Loading datastore...")
    ds = init_datastore(path)

    # Build index
    print(f"\nBuilding vector store with {len(ds.documents)} documents...")
    vs = VectorStore()
    t0 = time.time()
    vs.build_index(ds.documents)
    build_time = time.time() - t0

    print("\n" + "=" * 70)
    print("BUILD RESULTS")
    print("=" * 70)
    print(f"Build time: {build_time:.2f}s")
    print(f"Matrix shape: {vs.tfidf_matrix.shape}")
    print(f"Matrix dtype: {vs.tfidf_matrix.dtype}")
    print(f"Matrix sparsity: {1 - vs.tfidf_matrix.nnz / (vs.tfidf_matrix.shape[0] * vs.tfidf_matrix.shape[1]):.4f}")

    # Test retrieval
    print("\n" + "=" * 70)
    print("RETRIEVAL TESTS")
    print("=" * 70)

    # Test 1: SCRIPT partition
    print("\nTest 1: retrieve('advance property date backend script', top_k=5, doc_types=['SCRIPT'])")
    results = vs.retrieve("advance property date backend script", top_k=5, doc_types=["SCRIPT"])
    print(f"  Results: {len(results)}")
    for r in results[:3]:
        print(f"    {r.rank}. {r.doc_id} ({r.doc_type}) - score={r.score:.4f}")
        print(f"       {r.title[:60]}...")
    all_scripts = all(r.doc_type == "SCRIPT" for r in results)
    print(f"  [{'OK' if all_scripts and len(results) == 5 else 'FAIL'}] All results are SCRIPT type: {all_scripts}")

    # Test 2: KB partition
    print("\nTest 2: retrieve('how to edit time worked', top_k=3, doc_types=['KB'])")
    results = vs.retrieve("how to edit time worked", top_k=3, doc_types=["KB"])
    print(f"  Results: {len(results)}")
    for r in results:
        print(f"    {r.rank}. {r.doc_id} ({r.doc_type}) - score={r.score:.4f}")
        print(f"       {r.title[:60]}...")
    # Check if KB-3FFBFE3C70 appears (it should be the best match)
    has_time_worked = any("time worked" in r.title.lower() or "3FFBFE3C70" in r.doc_id for r in results)
    print(f"  [{'OK' if has_time_worked else 'WARN'}] Contains 'Time Worked' result: {has_time_worked}")

    # Test 3: Partitioned retrieval
    print("\nTest 3: retrieve_by_partitions('certifications compliance issue', top_k_per=2)")
    partition_results = vs.retrieve_by_partitions("certifications compliance issue", top_k_per=2)
    print(f"  Partitions returned: {list(partition_results.keys())}")
    for ptype, presults in partition_results.items():
        print(f"    {ptype}: {len(presults)} results")
        if presults:
            print(f"      Top: {presults[0].doc_id} - score={presults[0].score:.4f}")
    has_three_keys = len(partition_results) == 3
    print(f"  [{'OK' if has_three_keys else 'FAIL'}] Has exactly 3 partition keys: {has_three_keys}")

    # Test 4: Similarity to corpus
    print("\nTest 4: similarity_to_corpus('advance property date backend issue', doc_types=['KB'])")
    max_sim, best_doc = vs.similarity_to_corpus("advance property date backend issue", doc_types=["KB"])
    print(f"  Max similarity: {max_sim:.4f}")
    print(f"  Best match: {best_doc}")

    # Test 5: Remove and add documents
    print("\n" + "=" * 70)
    print("DYNAMIC INDEX TESTS")
    print("=" * 70)

    original_count = len(vs.documents)
    print(f"\nOriginal document count: {original_count}")

    # Remove a document
    print("\nRemoving KB-SYN-0001...")
    vs.remove_documents({"KB-SYN-0001"})
    after_remove = len(vs.documents)
    removed_doc = vs.get_document("KB-SYN-0001")
    print(f"  Document count after removal: {after_remove}")
    print(f"  get_document('KB-SYN-0001') returns: {removed_doc}")
    print(f"  [{'OK' if after_remove == original_count - 1 and removed_doc is None else 'FAIL'}] Remove successful")

    # Add it back
    print("\nAdding a new document...")
    new_doc = Document(
        doc_id="TEST-DOC-001",
        doc_type="KB",
        title="Test Article",
        body="This is a test article for testing purposes.",
        search_text="test article testing purposes",
        metadata={},
        provenance=[]
    )
    vs.add_documents([new_doc])
    after_add = len(vs.documents)
    added_doc = vs.get_document("TEST-DOC-001")
    print(f"  Document count after add: {after_add}")
    print(f"  get_document('TEST-DOC-001') returns: {added_doc.doc_id if added_doc else None}")
    print(f"  [{'OK' if after_add == after_remove + 1 and added_doc is not None else 'FAIL'}] Add successful")

    print("\n" + "=" * 70)
    print("[OK] SANITY CHECK COMPLETE")
    print("=" * 70 + "\n")
