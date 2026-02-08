"""
Meridian Vector Store
ChromaDB-backed embedding retrieval engine with partitioned search and dynamic indexing.
"""
import hashlib
import json
import time
import logging
import os
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple, Set
import numpy as np
import openai
import chromadb

from .data_loader import Document
from ..config import OPENAI_API_KEY, OPENAI_EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, CHROMADB_PERSIST_DIR

logger = logging.getLogger(__name__)

# OpenAI limits to 300K tokens per request and 8191 tokens per text.
# Batch size of 250 with truncated texts stays safely under limits.
_EMBED_BATCH_SIZE = 250
_MAX_TEXT_CHARS = 8000  # ~2000 tokens, keeps inputs focused

_COLLECTION_NAME = "meridian"
_CHROMA_ADD_BATCH = 5000  # ChromaDB add batch limit


class _EmbeddingMatrixShim:
    """Backward-compatible shim so external code accessing .embedding_matrix.shape still works."""
    def __init__(self, rows: int, cols: int):
        self.shape = (rows, cols)
        self.dtype = np.float32

    def __repr__(self):
        return f"ChromaDB({self.shape[0]} docs, {self.shape[1]} dims)"


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
    """ChromaDB embedding vector store with partitioned retrieval and dynamic indexing."""

    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
        self.embedding_model = OPENAI_EMBEDDING_MODEL
        self.chroma_client = chromadb.PersistentClient(path=CHROMADB_PERSIST_DIR)
        self.collection: Optional[chromadb.Collection] = None
        self.documents: List[Document] = []
        self.doc_index: Dict[str, Document] = {}  # doc_id -> Document
        self.is_built = False
        self._query_cache: Dict[str, np.ndarray] = {}  # text -> embedding vector (in-memory)

    @property
    def embedding_matrix(self):
        """Backward-compatible property for code accessing .embedding_matrix.shape"""
        count = self.collection.count() if self.collection else 0
        return _EmbeddingMatrixShim(count, EMBEDDING_DIMENSIONS)

    def _embed_texts(self, texts: List[str]) -> np.ndarray:
        """
        Batch-embed texts via OpenAI API.
        Handles chunking for batches > 2048 texts.
        Returns L2-normalized ndarray of shape (len(texts), dim).
        """
        all_embeddings = []

        # Truncate texts to avoid exceeding per-text and per-request token limits
        texts = [t[:_MAX_TEXT_CHARS] for t in texts]

        for i in range(0, len(texts), _EMBED_BATCH_SIZE):
            batch = texts[i:i + _EMBED_BATCH_SIZE]
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=batch
            )
            # Sort by index to ensure order matches input
            sorted_data = sorted(response.data, key=lambda x: x.index)
            batch_embeddings = [item.embedding for item in sorted_data]
            all_embeddings.extend(batch_embeddings)

        matrix = np.array(all_embeddings, dtype=np.float32)

        # OpenAI embeddings are already L2-normalized, but verify/ensure
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1  # avoid division by zero
        matrix = matrix / norms

        return matrix

    def _embed_query(self, text: str) -> np.ndarray:
        """
        Embed a single query string, returning a cached result if available.
        Returns shape (1, dim) ndarray.
        """
        cache_key = text[:_MAX_TEXT_CHARS]
        if cache_key in self._query_cache:
            return self._query_cache[cache_key]

        vec = self._embed_texts([text])
        self._query_cache[cache_key] = vec
        return vec

    def _compute_fingerprint(self, doc_ids: List[str]) -> str:
        """Compute a fingerprint of the document set for cache validation."""
        return hashlib.md5(json.dumps(sorted(doc_ids)).encode()).hexdigest()

    def build_index(self, documents: List[Document]) -> None:
        """
        Embed all documents' search_text via OpenAI API and store in ChromaDB.
        Uses ChromaDB persistence to avoid re-embedding if documents haven't changed.
        """
        logger.info(f"Building embedding index for {len(documents)} documents")
        t0 = time.time()

        self.documents = documents
        self.doc_index = {doc.doc_id: doc for doc in documents}

        # Compute fingerprint for cache validation
        doc_ids = [doc.doc_id for doc in documents]
        fingerprint = self._compute_fingerprint(doc_ids)

        # Check if collection exists with matching fingerprint
        existing_names = [c.name for c in self.chroma_client.list_collections()]

        if _COLLECTION_NAME in existing_names:
            self.collection = self.chroma_client.get_collection(name=_COLLECTION_NAME)
            existing_fingerprint = self.collection.metadata.get("doc_fingerprint", "")
            existing_count = self.collection.count()

            if existing_fingerprint == fingerprint and existing_count == len(documents):
                logger.info("  Loaded embeddings from ChromaDB cache")
                self.is_built = True
                elapsed = time.time() - t0
                logger.info(f"  Index built in {elapsed:.2f}s")
                logger.info(f"  Collection size: {self.collection.count()} docs, {EMBEDDING_DIMENSIONS} dims")
                return
            else:
                logger.info("  Cache fingerprint mismatch, rebuilding...")
                self.chroma_client.delete_collection(_COLLECTION_NAME)

        # Create fresh collection
        self.collection = self.chroma_client.create_collection(
            name=_COLLECTION_NAME,
            metadata={
                "hnsw:space": "cosine",
                "doc_fingerprint": fingerprint,
            }
        )

        # Embed all documents via OpenAI
        search_texts = [doc.search_text for doc in documents]
        logger.info(f"  Embedding {len(search_texts)} texts via OpenAI API...")
        embedding_matrix = self._embed_texts(search_texts)

        # Add to ChromaDB in batches
        for i in range(0, len(documents), _CHROMA_ADD_BATCH):
            batch_end = min(i + _CHROMA_ADD_BATCH, len(documents))
            self.collection.add(
                ids=[doc.doc_id for doc in documents[i:batch_end]],
                embeddings=embedding_matrix[i:batch_end].tolist(),
                metadatas=[{"doc_type": doc.doc_type} for doc in documents[i:batch_end]],
                documents=[doc.search_text for doc in documents[i:batch_end]]
            )

        self.is_built = True

        elapsed = time.time() - t0
        logger.info(f"  Index built in {elapsed:.2f}s")
        logger.info(f"  Collection size: {self.collection.count()} docs, {EMBEDDING_DIMENSIONS} dims")

        # Count partitions for logging
        kb_count = sum(1 for d in documents if d.doc_type == 'KB')
        script_count = sum(1 for d in documents if d.doc_type == 'SCRIPT')
        ticket_count = sum(1 for d in documents if d.doc_type == 'TICKET')
        logger.info(f"  Partitions: KB={kb_count}, SCRIPT={script_count}, TICKET={ticket_count}")

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        doc_types: Optional[List[str]] = None,
        exclude_ids: Optional[Set[str]] = None,
        _query_vec: Optional[np.ndarray] = None
    ) -> List[RetrievalResult]:
        """
        Core retrieval via ChromaDB. Embed query, search with metadata filtering,
        return top_k results sorted by score descending.
        """
        if not self.is_built:
            raise RuntimeError("Index not built. Call build_index() first.")

        # Embed query (cached)
        query_vec = _query_vec if _query_vec is not None else self._embed_query(query)

        # Build ChromaDB where clause for doc_type filtering
        where_clause = None
        if doc_types:
            if len(doc_types) == 1:
                where_clause = {"doc_type": doc_types[0]}
            else:
                where_clause = {"doc_type": {"$in": doc_types}}

        # Over-fetch if we need to exclude IDs (post-filter)
        request_k = top_k
        if exclude_ids:
            request_k = top_k + len(exclude_ids)

        # Don't request more than available
        request_k = min(request_k, self.collection.count())
        if request_k == 0:
            return []

        # Query ChromaDB
        chroma_results = self.collection.query(
            query_embeddings=[query_vec[0].tolist()],
            n_results=request_k,
            where=where_clause,
            include=["distances"]
        )

        result_ids = chroma_results["ids"][0]
        result_distances = chroma_results["distances"][0]

        # Build results, applying exclude_ids filter
        results = []
        rank = 1
        for doc_id, distance in zip(result_ids, result_distances):
            if exclude_ids and doc_id in exclude_ids:
                continue
            if rank > top_k:
                break

            doc = self.doc_index.get(doc_id)
            if doc is None:
                continue

            # Convert cosine distance to cosine similarity
            score = 1.0 - distance

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
            rank += 1

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
        query_vec = self._embed_query(query)
        results = {}
        for doc_type in ['KB', 'SCRIPT', 'TICKET']:
            partition_results = self.retrieve(
                query=query,
                top_k=top_k_per,
                doc_types=[doc_type],
                _query_vec=query_vec
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

        # Embed text (cached)
        text_vec = self._embed_query(text)

        # Build where clause
        where_clause = None
        if doc_types:
            if len(doc_types) == 1:
                where_clause = {"doc_type": doc_types[0]}
            else:
                where_clause = {"doc_type": {"$in": doc_types}}

        # Query for top-1
        chroma_results = self.collection.query(
            query_embeddings=[text_vec[0].tolist()],
            n_results=1,
            where=where_clause,
            include=["distances"]
        )

        if not chroma_results["ids"][0]:
            return 0.0, ""

        best_doc_id = chroma_results["ids"][0][0]
        best_distance = chroma_results["distances"][0][0]
        max_score = 1.0 - best_distance

        return max_score, best_doc_id

    def remove_documents(self, doc_ids: Set[str]) -> None:
        """Remove documents by ID from ChromaDB and in-memory structures."""
        logger.info(f"Removing {len(doc_ids)} documents from index")

        # Remove from ChromaDB
        ids_to_remove = list(doc_ids)
        for i in range(0, len(ids_to_remove), _CHROMA_ADD_BATCH):
            batch = ids_to_remove[i:i + _CHROMA_ADD_BATCH]
            self.collection.delete(ids=batch)

        # Update in-memory structures
        self.documents = [doc for doc in self.documents if doc.doc_id not in doc_ids]
        self.doc_index = {doc.doc_id: doc for doc in self.documents}

    def add_documents(self, new_docs: List[Document]) -> None:
        """Append new documents. Only embeds the new docs, not the full corpus."""
        logger.info(f"Adding {len(new_docs)} documents to index")

        # Embed only the new documents
        new_texts = [doc.search_text for doc in new_docs]
        new_embeddings = self._embed_texts(new_texts)

        # Add to ChromaDB
        self.collection.add(
            ids=[doc.doc_id for doc in new_docs],
            embeddings=new_embeddings.tolist(),
            metadatas=[{"doc_type": doc.doc_type} for doc in new_docs],
            documents=[doc.search_text for doc in new_docs]
        )

        # Update in-memory structures
        self.documents.extend(new_docs)
        for doc in new_docs:
            self.doc_index[doc.doc_id] = doc

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
    print(f"Collection: {vs.embedding_matrix}")

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
