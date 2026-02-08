"""
Meridian Vector Store
ChromaDB-backed embedding retrieval engine with partitioned search and dynamic indexing.
Uses separate collections per doc_type for isolated HNSW indices.
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

_QUERY_CACHE_FILE = os.path.join(CHROMADB_PERSIST_DIR, "query_embedding_cache.npz")

logger = logging.getLogger(__name__)

# OpenAI limits to 300K tokens per request and 8191 tokens per text.
# Batch size of 250 with truncated texts stays safely under limits.
_EMBED_BATCH_SIZE = 250
_MAX_TEXT_CHARS = 8000  # ~2000 tokens, keeps inputs focused

# Separate collection per doc_type for isolated HNSW indices
_COLLECTION_NAMES = {
    "KB": "meridian_kb",
    "SCRIPT": "meridian_script",
    "TICKET": "meridian_ticket",
}
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
        self.collections: Dict[str, chromadb.Collection] = {}  # doc_type -> Collection
        self.documents: List[Document] = []
        self.doc_index: Dict[str, Document] = {}  # doc_id -> Document
        self.is_built = False
        self._excluded_ids: Set[str] = set()  # virtual exclusion set (avoids ChromaDB delete bugs)
        self._query_cache: Dict[str, np.ndarray] = {}  # text -> embedding vector
        self._query_cache_dirty = 0  # count of unsaved entries
        self._load_query_cache()

    @property
    def embedding_matrix(self):
        """Backward-compatible property for code accessing .embedding_matrix.shape"""
        count = sum(c.count() for c in self.collections.values()) if self.collections else 0
        return _EmbeddingMatrixShim(count, EMBEDDING_DIMENSIONS)

    def _load_query_cache(self):
        """Load query embedding cache from disk if it exists and model matches."""
        if not os.path.exists(_QUERY_CACHE_FILE):
            return
        try:
            data = np.load(_QUERY_CACHE_FILE, allow_pickle=True)
            if data.get("model", "") != self.embedding_model:
                logger.info("  Query cache model mismatch, ignoring disk cache")
                return
            keys = list(data["keys"])
            vectors = data["vectors"]
            for key, vec in zip(keys, vectors):
                self._query_cache[key] = vec.reshape(1, -1)
            logger.info(f"  Loaded {len(keys)} cached query embeddings from disk")
        except Exception as e:
            logger.warning(f"  Could not load query cache: {e}")

    def _save_query_cache(self):
        """Persist query embedding cache to disk."""
        if not self._query_cache:
            return
        try:
            os.makedirs(os.path.dirname(_QUERY_CACHE_FILE), exist_ok=True)
            keys = list(self._query_cache.keys())
            vectors = np.array([self._query_cache[k][0] for k in keys], dtype=np.float32)
            np.savez(
                _QUERY_CACHE_FILE,
                keys=np.array(keys, dtype=object),
                vectors=vectors,
                model=np.array(self.embedding_model),
            )
        except Exception as e:
            logger.warning(f"  Could not save query cache: {e}")

    def flush_query_cache(self):
        """Flush any unsaved query embeddings to disk."""
        if self._query_cache_dirty > 0:
            self._save_query_cache()
            self._query_cache_dirty = 0

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
        self._query_cache_dirty += 1
        if self._query_cache_dirty >= 100:
            self._save_query_cache()
            self._query_cache_dirty = 0
        return vec

    def _compute_fingerprint(self, documents: List[Document]) -> str:
        """Compute a fingerprint of the document set AND content for cache validation."""
        # Include both IDs and search_text so content changes invalidate cache
        payload = [(doc.doc_id, doc.search_text[:200]) for doc in sorted(documents, key=lambda d: d.doc_id)]
        return hashlib.md5(json.dumps(payload).encode()).hexdigest()

    def _build_collection(self, doc_type: str, docs: List[Document]) -> chromadb.Collection:
        """Build or load a single per-type collection."""
        col_name = _COLLECTION_NAMES[doc_type]
        fingerprint = self._compute_fingerprint(docs)

        existing_names = [c.name for c in self.chroma_client.list_collections()]

        if col_name in existing_names:
            collection = self.chroma_client.get_collection(name=col_name)
            existing_fp = collection.metadata.get("doc_fingerprint", "")
            existing_count = collection.count()

            if existing_fp == fingerprint and existing_count == len(docs):
                logger.info(f"  [{doc_type}] Loaded {existing_count} docs from cache")
                return collection
            else:
                logger.info(f"  [{doc_type}] Cache mismatch, rebuilding...")
                self.chroma_client.delete_collection(col_name)

        # Create fresh collection
        collection = self.chroma_client.create_collection(
            name=col_name,
            metadata={
                "hnsw:space": "cosine",
                "doc_fingerprint": fingerprint,
            }
        )

        # Embed documents
        search_texts = [doc.search_text for doc in docs]
        logger.info(f"  [{doc_type}] Embedding {len(search_texts)} texts via OpenAI API...")
        embedding_matrix = self._embed_texts(search_texts)

        # Add to ChromaDB in batches
        for i in range(0, len(docs), _CHROMA_ADD_BATCH):
            batch_end = min(i + _CHROMA_ADD_BATCH, len(docs))
            collection.add(
                ids=[doc.doc_id for doc in docs[i:batch_end]],
                embeddings=embedding_matrix[i:batch_end].tolist(),
                metadatas=[{"doc_type": doc.doc_type} for doc in docs[i:batch_end]],
                documents=[doc.search_text for doc in docs[i:batch_end]]
            )

        logger.info(f"  [{doc_type}] Built: {collection.count()} docs")
        return collection

    def build_index(self, documents: List[Document]) -> None:
        """
        Embed all documents' search_text via OpenAI API and store in ChromaDB.
        Uses separate collections per doc_type for isolated HNSW indices.
        Uses ChromaDB persistence to avoid re-embedding if documents haven't changed.
        """
        logger.info(f"Building embedding index for {len(documents)} documents")
        t0 = time.time()

        self.documents = documents
        self.doc_index = {doc.doc_id: doc for doc in documents}

        # Clean up legacy single collection if it exists
        existing_names = [c.name for c in self.chroma_client.list_collections()]
        if "meridian" in existing_names:
            logger.info("  Removing legacy single collection 'meridian'...")
            self.chroma_client.delete_collection("meridian")

        # Group documents by type
        docs_by_type: Dict[str, List[Document]] = {"KB": [], "SCRIPT": [], "TICKET": []}
        for doc in documents:
            docs_by_type[doc.doc_type].append(doc)

        # Build each collection independently
        for doc_type, docs in docs_by_type.items():
            if docs:
                self.collections[doc_type] = self._build_collection(doc_type, docs)

        self.is_built = True

        elapsed = time.time() - t0
        logger.info(f"  Index built in {elapsed:.2f}s")
        total = sum(c.count() for c in self.collections.values())
        logger.info(f"  Total: {total} docs, {EMBEDDING_DIMENSIONS} dims")
        for doc_type, col in self.collections.items():
            logger.info(f"  {doc_type}: {col.count()} docs")

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        doc_types: Optional[List[str]] = None,
        exclude_ids: Optional[Set[str]] = None,
        _query_vec: Optional[np.ndarray] = None
    ) -> List[RetrievalResult]:
        """
        Core retrieval via ChromaDB. Embed query, search per-type collections,
        return top_k results sorted by score descending.
        """
        if not self.is_built:
            raise RuntimeError("Index not built. Call build_index() first.")

        # Embed query (cached)
        query_vec = _query_vec if _query_vec is not None else self._embed_query(query)

        # Determine which collections to query
        target_types = doc_types if doc_types else list(self.collections.keys())

        # Merge caller exclusions with virtual exclusions
        all_exclude = (exclude_ids or set()) | self._excluded_ids

        # Gather candidates from all target collections
        candidates: List[Tuple[str, float]] = []  # (doc_id, distance)
        for dtype in target_types:
            col = self.collections.get(dtype)
            if col is None or col.count() == 0:
                continue

            # Over-fetch to compensate for exclusion filtering
            request_k = top_k + len(all_exclude) if all_exclude else top_k
            request_k = min(request_k, col.count())
            if request_k == 0:
                continue

            chroma_results = col.query(
                query_embeddings=[query_vec[0].tolist()],
                n_results=request_k,
                include=["distances"]
            )

            for doc_id, distance in zip(chroma_results["ids"][0], chroma_results["distances"][0]):
                candidates.append((doc_id, distance))

        # Sort by distance ascending (lower = more similar for cosine)
        candidates.sort(key=lambda x: x[1])

        # Build results, applying exclusions
        results = []
        rank = 1
        for doc_id, distance in candidates:
            if all_exclude and doc_id in all_exclude:
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

        target_types = doc_types if doc_types else list(self.collections.keys())

        best_doc_id = ""
        best_distance = 2.0  # max cosine distance

        for dtype in target_types:
            col = self.collections.get(dtype)
            if col is None or col.count() == 0:
                continue

            # Over-fetch if we have virtual exclusions to filter out
            n_fetch = 1 + len(self._excluded_ids) if self._excluded_ids else 1
            n_fetch = min(n_fetch, col.count())
            if n_fetch == 0:
                continue

            chroma_results = col.query(
                query_embeddings=[text_vec[0].tolist()],
                n_results=n_fetch,
                include=["distances"]
            )

            if not chroma_results["ids"][0]:
                continue

            # Find best non-excluded result
            for doc_id, distance in zip(chroma_results["ids"][0], chroma_results["distances"][0]):
                if doc_id not in self._excluded_ids and distance < best_distance:
                    best_doc_id = doc_id
                    best_distance = distance

        if not best_doc_id:
            return 0.0, ""
        max_score = 1.0 - best_distance

        return max_score, best_doc_id

    def remove_documents(self, doc_ids: Set[str]) -> None:
        """Virtually remove documents by adding to exclusion set.

        Uses virtual exclusion instead of ChromaDB delete to avoid
        PersistentClient corruption bugs on delete operations.
        """
        logger.info(f"Removing {len(doc_ids)} documents from index")

        self._excluded_ids |= doc_ids

        # Update in-memory structures
        self.documents = [doc for doc in self.documents if doc.doc_id not in doc_ids]
        self.doc_index = {doc.doc_id: doc for doc in self.documents}

    def add_documents(self, new_docs: List[Document]) -> None:
        """Append new documents. Restores virtually-excluded docs or embeds truly new ones."""
        logger.info(f"Adding {len(new_docs)} documents to index")

        # Separate restored (previously excluded) vs truly new docs
        restored = [doc for doc in new_docs if doc.doc_id in self._excluded_ids]
        truly_new = [doc for doc in new_docs if doc.doc_id not in self._excluded_ids]

        # Clear restored docs from exclusion set
        if restored:
            self._excluded_ids -= {doc.doc_id for doc in restored}

        # Embed and add truly new documents to the appropriate collection
        if truly_new:
            # Group by doc_type
            by_type: Dict[str, List[Document]] = {}
            for doc in truly_new:
                by_type.setdefault(doc.doc_type, []).append(doc)

            for dtype, docs in by_type.items():
                col = self.collections.get(dtype)
                if col is None:
                    continue
                new_texts = [doc.search_text for doc in docs]
                new_embeddings = self._embed_texts(new_texts)
                col.add(
                    ids=[doc.doc_id for doc in docs],
                    embeddings=new_embeddings.tolist(),
                    metadatas=[{"doc_type": doc.doc_type} for doc in docs],
                    documents=[doc.search_text for doc in docs]
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
