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

from .config import DATA_PATH, GAP_SIMILARITY_THRESHOLD, OPENAI_API_KEY
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
    gap = GapDetector(vs, ds, threshold=GAP_SIMILARITY_THRESHOLD)
    gen = KBGenerator(ds, api_key=OPENAI_API_KEY)
    evl = EvalHarness(ds, vs, query_router_module, gap)

    elapsed = time.time() - t0

    logger.info("=" * 70)
    logger.info(f"Meridian booted in {elapsed:.1f}s — {len(ds.documents)} docs indexed")
    logger.info("=" * 70)

    return ds, vs, prov, gap, gen, evl


def run_learning_pipeline(ds, vs, gap, gen, auto_approve=True):
    """
    Run the self-learning pipeline end-to-end:
      1. Scan all tickets for knowledge gaps
      2. Filter to tickets that don't already have a generated KB article
      3. Generate KB drafts for each gap
      4. Optionally auto-approve and add to the vector store
    Returns: dict with pipeline stats and list of generated documents
    """
    logger.info("=" * 70)
    logger.info("Running Self-Learning Pipeline")
    logger.info("=" * 70)

    t0 = time.time()

    # 1. Scan for gaps
    logger.info("Step 1: Scanning tickets for knowledge gaps...")
    gap_results = gap.scan_all_tickets()
    gaps = [r for r in gap_results if r.is_gap]
    logger.info(f"  Found {len(gaps)} gaps out of {len(gap_results)} tickets")

    # 2. Filter out tickets that already have a generated KB article
    tickets_with_kb = set(
        ds.df_tickets.loc[
            ds.df_tickets['Generated_KB_Article_ID'].notna(),
            'Ticket_Number'
        ].tolist()
    )
    new_gaps = [g for g in gaps if g.ticket_number not in tickets_with_kb]
    logger.info(f"  {len(gaps) - len(new_gaps)} gaps already have KB articles")
    logger.info(f"  {len(new_gaps)} new gaps to process")

    # 3. Generate drafts
    logger.info("Step 2: Generating KB drafts...")
    drafts = []
    failed = []
    for g in new_gaps:
        try:
            draft = gen.generate_draft(g.ticket_number)
            drafts.append(draft)
        except Exception as e:
            logger.warning(f"  Failed to generate draft for {g.ticket_number}: {e}")
            failed.append(g.ticket_number)

    logger.info(f"  Generated {len(drafts)} drafts ({len(failed)} failed)")

    # 4. Approve and index
    new_docs = []
    if auto_approve and drafts:
        logger.info("Step 3: Approving drafts and adding to index...")
        for draft in drafts:
            doc = gen.approve_draft(draft.draft_id)
            if doc is not None:
                # Attach provenance from the source ticket's lineage
                lineage = ds.lineage_by_kb.get(doc.doc_id, [])
                if not lineage:
                    # Build provenance from the draft's source info
                    prov_chain = []
                    if draft.source_ticket:
                        prov_chain.append({
                            'KB_Article_ID': doc.doc_id,
                            'Related_ID': draft.source_ticket,
                            'Relationship': 'CREATED_FROM',
                            'Related_Type': 'Ticket'
                        })
                    if draft.source_conversation:
                        prov_chain.append({
                            'KB_Article_ID': doc.doc_id,
                            'Related_ID': draft.source_conversation,
                            'Relationship': 'CREATED_FROM',
                            'Related_Type': 'Conversation'
                        })
                    if draft.source_script:
                        prov_chain.append({
                            'KB_Article_ID': doc.doc_id,
                            'Related_ID': draft.source_script,
                            'Relationship': 'REFERENCES',
                            'Related_Type': 'Script'
                        })
                    doc.provenance = prov_chain
                new_docs.append(doc)

        if new_docs:
            vs.add_documents(new_docs)
            logger.info(f"  Added {len(new_docs)} new KB articles to index")

    elapsed = time.time() - t0

    # Detect emerging issues
    emerging = gap.detect_emerging_issues(gap_results)

    stats = {
        'total_tickets_scanned': len(gap_results),
        'total_gaps': len(gaps),
        'existing_kb_coverage': len(tickets_with_kb),
        'new_gaps_processed': len(new_gaps),
        'drafts_generated': len(drafts),
        'drafts_failed': len(failed),
        'docs_indexed': len(new_docs),
        'emerging_issues': len(emerging),
        'elapsed_seconds': elapsed,
    }

    logger.info("=" * 70)
    logger.info(f"Pipeline completed in {elapsed:.1f}s")
    logger.info(f"  Gaps found: {len(gaps)} | New drafts: {len(drafts)} | Indexed: {len(new_docs)}")
    logger.info("=" * 70)

    return {
        'stats': stats,
        'new_documents': new_docs,
        'emerging_issues': emerging,
        'gap_results': gap_results,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Meridian Intelligence Engine")
    parser.add_argument("--eval", action="store_true", help="Run full evaluation")
    parser.add_argument("--query", type=str, default=None, help="Run a single query")
    parser.add_argument("--eval-sample", action="store_true", help="Run eval on 100 questions (fast)")
    parser.add_argument("--learn", action="store_true", help="Run self-learning pipeline (gap detection + KB generation)")
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

    elif args.learn:
        # Run self-learning pipeline
        print("\n" + "=" * 70)
        print("Running SELF-LEARNING PIPELINE")
        print("Gap Detection -> KB Generation -> Indexing")
        print("=" * 70)

        pipeline_result = run_learning_pipeline(ds, vs, gap, gen, auto_approve=True)
        stats = pipeline_result['stats']

        print("\n" + "=" * 70)
        print("LEARNING PIPELINE RESULTS")
        print("=" * 70)
        print(f"Tickets scanned:      {stats['total_tickets_scanned']}")
        print(f"Knowledge gaps found: {stats['total_gaps']}")
        print(f"Already covered:      {stats['existing_kb_coverage']}")
        print(f"New gaps processed:   {stats['new_gaps_processed']}")
        print(f"KB drafts generated:  {stats['drafts_generated']}")
        print(f"Failed generations:   {stats['drafts_failed']}")
        print(f"New articles indexed: {stats['docs_indexed']}")
        print(f"Emerging issues:      {stats['emerging_issues']}")
        print(f"Time elapsed:         {stats['elapsed_seconds']:.1f}s")

        if pipeline_result['emerging_issues']:
            print("\n" + "-" * 40)
            print("TOP EMERGING ISSUES:")
            print("-" * 40)
            for i, issue in enumerate(pipeline_result['emerging_issues'][:5], 1):
                print(f"  {i}. {issue['category']} / {issue['module']}")
                print(f"     Tickets: {issue['ticket_count']} | Avg similarity: {issue['avg_similarity']:.3f}")

        if pipeline_result['new_documents']:
            print("\n" + "-" * 40)
            print(f"NEW KB ARTICLES GENERATED ({len(pipeline_result['new_documents'])}):")
            print("-" * 40)
            for doc in pipeline_result['new_documents'][:10]:
                print(f"  {doc.doc_id}: {doc.title[:60]}...")
                if doc.provenance:
                    sources = [p['Related_ID'] for p in doc.provenance]
                    print(f"    Provenance: {' -> '.join(sources)}")

        print("=" * 70 + "\n")

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
        print("  python -m meridian.main --learn        (run self-learning pipeline)")
        print("=" * 70 + "\n")
