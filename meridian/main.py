"""
Meridian Engine - Boot and Run
Usage:
    python -m meridian.main                  # boot + print stats
    python -m meridian.main --eval           # boot + run full eval
    python -m meridian.main --query "text"   # boot + run a single query
"""
import argparse
import time
import json
import logging

from .config import DATA_PATH
from .engine.data_loader import init_datastore
from .engine.vector_store import VectorStore
from .engine.query_router import classify_query, route_and_retrieve
from .engine.provenance import ProvenanceResolver
from .engine.gap_detector import GapDetector
from .engine.kb_generator import KBGenerator
from .engine.eval_harness import EvalHarness
import meridian.engine.query_router as query_router_module

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def boot():
    """
    Boot the Meridian engine.
    Returns: (datastore, vector_store, provenance, gap_detector, kb_generator, eval_harness)
    """
    logger.info("=" * 70)
    logger.info("Booting Meridian Engine")
    logger.info("=" * 70)

    t0 = time.time()

    # Load data
    logger.info("Loading datastore...")
    ds = init_datastore(DATA_PATH)

    # Build vector store
    logger.info("Building vector store...")
    vs = VectorStore()
    vs.build_index(ds.documents)

    # Initialize modules
    logger.info("Initializing modules...")
    prov = ProvenanceResolver(ds)
    gap = GapDetector(vs, ds)
    gen = KBGenerator(ds)
    evl = EvalHarness(ds, vs, query_router_module, gap)

    elapsed = time.time() - t0

    logger.info("=" * 70)
    logger.info(f"Meridian booted in {elapsed:.1f}s — {len(ds.documents)} docs indexed")
    logger.info("=" * 70)

    return ds, vs, prov, gap, gen, evl


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Meridian Intelligence Engine")
    parser.add_argument("--eval", action="store_true", help="Run full evaluation")
    parser.add_argument("--query", type=str, default=None, help="Run a single query")
    parser.add_argument("--eval-sample", action="store_true", help="Run eval on 100 questions (fast)")
    args = parser.parse_args()

    # Boot engine
    ds, vs, prov, gap, gen, evl = boot()

    if args.eval:
        # Run full evaluation (1,000 questions)
        print("\n" + "=" * 70)
        print("Running FULL evaluation (1,000 questions)")
        print("This will take 2-5 minutes...")
        print("=" * 70)

        results = evl.run_all()
        report = evl.print_report(results)

    elif args.eval_sample:
        # Run sample evaluation (100 questions for speed)
        print("\n" + "=" * 70)
        print("Running SAMPLE evaluation (100 questions)")
        print("=" * 70)

        # Limit to 100 questions
        original_questions = ds.df_questions.copy()
        ds.df_questions = ds.df_questions.head(100)

        results = {
            'retrieval': evl.eval_retrieval([1, 5, 10]),
            'classification': evl.eval_classification()
        }

        # Restore
        ds.df_questions = original_questions

        report = evl.print_report(results)

    elif args.query:
        # Run single query
        print("\n" + "=" * 70)
        print(f"Query: {args.query}")
        print("=" * 70)

        result = route_and_retrieve(args.query, vs)
        provenance_chains = prov.resolve_for_results(result["primary_results"])

        output = {
            "query": args.query,
            "predicted_type": result["predicted_type"],
            "confidence_scores": result["confidence_scores"],
            "results": [
                {
                    "rank": r.rank,
                    "doc_id": r.doc_id,
                    "doc_type": r.doc_type,
                    "title": r.title,
                    "score": r.score
                }
                for r in result["primary_results"]
            ],
            "provenance": provenance_chains
        }

        print(json.dumps(output, indent=2, default=str))

    else:
        # Default: print stats
        print("\n" + "=" * 70)
        print("MERIDIAN ENGINE - STATUS")
        print("=" * 70)
        print(f"Documents: {len(ds.documents)}")
        print(f"  KB: {sum(1 for d in ds.documents if d.doc_type=='KB')}")
        print(f"  SCRIPT: {sum(1 for d in ds.documents if d.doc_type=='SCRIPT')}")
        print(f"  TICKET: {sum(1 for d in ds.documents if d.doc_type=='TICKET')}")
        print(f"\nVector store: {vs.embedding_matrix.shape}")
        print(f"Provenance resolver: Ready")
        print(f"Gap detector: threshold={gap.threshold}")
        print(f"KB generator: {gen.generation_method if hasattr(gen, 'generation_method') else 'template'} mode")
        print(f"Eval harness: Ready")
        print("\nUsage:")
        print("  python -m meridian.main --query 'your question'")
        print("  python -m meridian.main --eval-sample  (100 questions, ~1 min)")
        print("  python -m meridian.main --eval         (1000 questions, ~5 min)")
        print("=" * 70 + "\n")
