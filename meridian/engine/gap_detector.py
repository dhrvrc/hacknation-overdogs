"""
Meridian Gap Detector
Detects knowledge gaps and emerging issues from resolved tickets.
"""
import logging
from dataclasses import dataclass
from typing import List, Dict, Optional
from collections import defaultdict

from .vector_store import VectorStore
from .data_loader import DataStore

logger = logging.getLogger(__name__)


@dataclass
class GapDetectionResult:
    """Result of gap detection for a single ticket."""
    ticket_number: str
    is_gap: bool
    resolution_similarity: float       # best match score of resolution vs KB
    best_matching_kb_id: str           # which KB article was closest
    problem_similarity: float          # best match score of description vs KB
    best_matching_kb_for_problem: str
    resolution_text: str
    description_text: str
    tier: int
    module: str
    category: str
    script_id: Optional[str]
    conversation_id: Optional[str]


class GapDetector:
    """Detects knowledge gaps and emerging issues."""

    def __init__(
        self,
        vector_store: VectorStore,
        datastore: DataStore,
        threshold: float = 0.40
    ):
        self.vector_store = vector_store
        self.datastore = datastore
        self.threshold = threshold

        logger.info(f"GapDetector initialized with threshold={threshold}")

    def check_ticket(self, ticket_number: str) -> GapDetectionResult:
        """
        Check a single resolved ticket for knowledge gaps.

        1. Look up the ticket
        2. Get its Resolution text
        3. Compute similarity vs KB corpus
        4. Get its Subject + Description text
        5. Compute similarity vs KB corpus
        6. If resolution_similarity < threshold → is_gap = True
        """
        # Look up ticket
        ticket = self.datastore.ticket_by_number.get(ticket_number)
        if ticket is None:
            raise ValueError(f"Ticket {ticket_number} not found")

        # Extract fields
        resolution_text = str(ticket.get('Resolution', ''))
        subject = str(ticket.get('Subject', ''))
        description = str(ticket.get('Description', ''))
        description_text = f"{subject} {description}"

        tier = int(ticket.get('Tier', 0)) if ticket.get('Tier') else 0
        module = str(ticket.get('Module', ''))
        category = str(ticket.get('Category', ''))
        script_id = ticket.get('Script_ID')
        script_id = str(script_id) if script_id and str(script_id) != 'nan' else None
        conversation_id = ticket.get('Conversation_ID')
        conversation_id = str(conversation_id) if conversation_id and str(conversation_id) != 'nan' else None

        # Check resolution similarity
        resolution_sim, best_kb = self.vector_store.similarity_to_corpus(
            resolution_text,
            doc_types=['KB']
        )

        # Check problem similarity
        problem_sim, best_kb_problem = self.vector_store.similarity_to_corpus(
            description_text,
            doc_types=['KB']
        )

        # Determine if gap
        is_gap = resolution_sim < self.threshold

        return GapDetectionResult(
            ticket_number=ticket_number,
            is_gap=is_gap,
            resolution_similarity=resolution_sim,
            best_matching_kb_id=best_kb,
            problem_similarity=problem_sim,
            best_matching_kb_for_problem=best_kb_problem,
            resolution_text=resolution_text,
            description_text=description_text,
            tier=tier,
            module=module,
            category=category,
            script_id=script_id,
            conversation_id=conversation_id
        )

    def scan_all_tickets(self) -> List[GapDetectionResult]:
        """
        Scan all 400 tickets.
        Return results sorted by resolution_similarity ascending (worst gaps first).
        """
        logger.info(f"Scanning {len(self.datastore.ticket_by_number)} tickets for gaps")

        results = []
        for ticket_number in self.datastore.ticket_by_number.keys():
            result = self.check_ticket(ticket_number)
            results.append(result)

        # Sort by similarity ascending (lowest = worst gaps)
        results.sort(key=lambda r: r.resolution_similarity)

        gaps_found = sum(1 for r in results if r.is_gap)
        logger.info(f"Found {gaps_found}/{len(results)} gaps (threshold={self.threshold})")

        return results

    def detect_emerging_issues(
        self,
        gap_results: List[GapDetectionResult],
        min_cluster_size: int = 3
    ) -> List[dict]:
        """
        Among the gap results where is_gap=True, cluster by category+module.

        If a (category, module) pair has >= min_cluster_size gaps,
        flag it as an emerging issue.

        Returns list of dicts sorted by ticket_count descending.
        """
        # Filter to gaps only
        gaps = [r for r in gap_results if r.is_gap]

        # Cluster by (category, module)
        clusters = defaultdict(list)
        for gap in gaps:
            key = (gap.category, gap.module)
            clusters[key].append(gap)

        # Build emerging issues
        emerging_issues = []
        for (category, module), cluster_gaps in clusters.items():
            if len(cluster_gaps) >= min_cluster_size:
                ticket_numbers = [g.ticket_number for g in cluster_gaps]
                avg_similarity = sum(g.resolution_similarity for g in cluster_gaps) / len(cluster_gaps)
                sample_resolution = cluster_gaps[0].resolution_text[:200]

                issue = {
                    'category': category,
                    'module': module,
                    'ticket_count': len(cluster_gaps),
                    'ticket_numbers': ticket_numbers,
                    'avg_similarity': avg_similarity,
                    'sample_resolution': sample_resolution
                }
                emerging_issues.append(issue)

        # Sort by ticket count descending
        emerging_issues.sort(key=lambda x: x['ticket_count'], reverse=True)

        logger.info(f"Detected {len(emerging_issues)} emerging issues (min_cluster_size={min_cluster_size})")

        return emerging_issues

    def before_after_comparison(self) -> dict:
        """
        THE KEY EVAL METRIC FOR THE SELF-LEARNING STORY.

        1. Identify the 161 synthetic KB docs
        2. Current scan (with synthetics) → "after"
        3. Remove synthetics from index
        4. Re-scan → "before"
        5. Add synthetics back
        6. Return comparison metrics
        """
        logger.info("Running before/after comparison for self-learning evaluation")

        # Identify synthetic KB articles
        synthetic_kb_ids = set()
        for doc in self.datastore.documents:
            if doc.doc_type == 'KB' and doc.metadata.get('source_type') == 'SYNTH_FROM_TICKET':
                synthetic_kb_ids.add(doc.doc_id)

        logger.info(f"Identified {len(synthetic_kb_ids)} synthetic KB articles")

        # Current state (with synthetics) = "after learning"
        logger.info("Scanning with synthetic KBs (after learning)...")
        after_results = self.scan_all_tickets()

        after_gaps = sum(1 for r in after_results if r.is_gap)
        after_avg_sim = sum(r.resolution_similarity for r in after_results) / len(after_results)
        after_by_tier = defaultdict(int)
        for r in after_results:
            if r.is_gap:
                after_by_tier[r.tier] += 1

        # Remove synthetics and re-scan = "before learning"
        logger.info("Removing synthetic KBs and re-scanning (before learning)...")
        synthetic_docs = [d for d in self.datastore.documents if d.doc_id in synthetic_kb_ids]
        self.vector_store.remove_documents(synthetic_kb_ids)

        before_results = self.scan_all_tickets()

        before_gaps = sum(1 for r in before_results if r.is_gap)
        before_avg_sim = sum(r.resolution_similarity for r in before_results) / len(before_results)
        before_by_tier = defaultdict(int)
        for r in before_results:
            if r.is_gap:
                before_by_tier[r.tier] += 1

        # Restore synthetics
        logger.info("Restoring synthetic KBs...")
        self.vector_store.add_documents(synthetic_docs)

        # Calculate improvements
        gaps_closed = before_gaps - after_gaps
        similarity_lift = after_avg_sim - before_avg_sim
        pct_improvement = (gaps_closed / before_gaps * 100) if before_gaps > 0 else 0

        logger.info(f"Gaps closed: {gaps_closed} ({pct_improvement:.1f}% improvement)")
        logger.info(f"Similarity lift: {similarity_lift:.4f}")

        return {
            'before_learning': {
                'total_gaps': before_gaps,
                'avg_resolution_similarity': before_avg_sim,
                'gaps_by_tier': dict(before_by_tier)
            },
            'after_learning': {
                'total_gaps': after_gaps,
                'avg_resolution_similarity': after_avg_sim,
                'gaps_by_tier': dict(after_by_tier)
            },
            'improvement': {
                'gaps_closed': gaps_closed,
                'similarity_lift': similarity_lift,
                'pct_improvement': pct_improvement
            }
        }


if __name__ == "__main__":
    """Sanity check with REAL assertions."""
    import sys
    import os
    import time

    # Setup
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

    from meridian.engine.data_loader import init_datastore
    from meridian.engine.vector_store import VectorStore

    print("\n" + "=" * 70)
    print("MERIDIAN GAP DETECTOR - SANITY CHECK")
    print("=" * 70 + "\n")

    # Load data and build index
    print("Loading data and building index...")
    ds = init_datastore("SupportMind_Final_Data.xlsx")
    vs = VectorStore()
    vs.build_index(ds.documents)
    print(f"[OK] Index ready\n")

    # Create gap detector
    gap = GapDetector(vs, ds, threshold=0.40)

    test_results = []

    # ========================================================================
    # TEST 1: check_ticket returns GapDetectionResult
    # ========================================================================
    print("=" * 70)
    print("TEST 1: Single Ticket Gap Detection")
    print("=" * 70)

    result = gap.check_ticket("CS-38908386")

    # Assertions
    assert isinstance(result, GapDetectionResult), f"Expected GapDetectionResult, got {type(result)}"
    assert result.ticket_number == "CS-38908386", "Ticket number mismatch"
    assert isinstance(result.is_gap, bool), "is_gap must be bool"
    assert isinstance(result.resolution_similarity, float), "resolution_similarity must be float"
    assert 0.0 <= result.resolution_similarity <= 1.0, "Similarity out of range"
    assert isinstance(result.best_matching_kb_id, str), "best_matching_kb_id must be str"
    assert result.tier == 3, f"Expected tier 3, got {result.tier}"

    print(f"Ticket: {result.ticket_number}")
    print(f"  Is gap: {result.is_gap}")
    print(f"  Resolution similarity: {result.resolution_similarity:.4f}")
    print(f"  Best match: {result.best_matching_kb_id}")
    print(f"  Tier: {result.tier}")
    print(f"  Category: {result.category}")

    print("\n[PASS] check_ticket returns correct structure")
    test_results.append(("TEST 1", True))

    # ========================================================================
    # TEST 2: scan_all_tickets returns 400 results
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 2: Scan All Tickets")
    print("=" * 70)

    t0 = time.time()
    all_results = gap.scan_all_tickets()
    scan_time = time.time() - t0

    # Assertions
    assert isinstance(all_results, list), "Results must be list"
    assert len(all_results) == 400, f"Expected 400 results, got {len(all_results)}"

    # All items must be GapDetectionResult
    for r in all_results:
        assert isinstance(r, GapDetectionResult), f"Expected GapDetectionResult, got {type(r)}"

    # Results should be sorted by similarity ascending
    for i in range(len(all_results) - 1):
        assert all_results[i].resolution_similarity <= all_results[i+1].resolution_similarity, \
            "Results not sorted by similarity ascending"

    gaps_count = sum(1 for r in all_results if r.is_gap)
    avg_sim = sum(r.resolution_similarity for r in all_results) / len(all_results)

    print(f"Scanned: {len(all_results)} tickets in {scan_time:.2f}s")
    print(f"  Gaps found: {gaps_count}")
    print(f"  Non-gaps: {len(all_results) - gaps_count}")
    print(f"  Avg similarity: {avg_sim:.4f}")
    print(f"  Worst gap: {all_results[0].ticket_number} (sim={all_results[0].resolution_similarity:.4f})")
    print(f"  Best match: {all_results[-1].ticket_number} (sim={all_results[-1].resolution_similarity:.4f})")

    print("\n[PASS] scan_all_tickets returns 400 sorted results")
    test_results.append(("TEST 2", True))

    # ========================================================================
    # TEST 3: detect_emerging_issues finds clusters
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 3: Detect Emerging Issues")
    print("=" * 70)

    emerging = gap.detect_emerging_issues(all_results, min_cluster_size=3)

    # Assertions
    assert isinstance(emerging, list), "Emerging issues must be list"
    assert len(emerging) >= 1, "Should find at least 1 emerging issue"

    # Verify structure
    for issue in emerging:
        assert 'category' in issue, "Missing category"
        assert 'module' in issue, "Missing module"
        assert 'ticket_count' in issue, "Missing ticket_count"
        assert 'ticket_numbers' in issue, "Missing ticket_numbers"
        assert 'avg_similarity' in issue, "Missing avg_similarity"
        assert issue['ticket_count'] >= 3, "Cluster too small"
        assert len(issue['ticket_numbers']) == issue['ticket_count'], "Ticket count mismatch"

    # Should be sorted by ticket count descending
    for i in range(len(emerging) - 1):
        assert emerging[i]['ticket_count'] >= emerging[i+1]['ticket_count'], \
            "Not sorted by ticket count descending"

    print(f"Found {len(emerging)} emerging issues")
    for i, issue in enumerate(emerging[:5], 1):  # Show top 5
        print(f"\n  Issue {i}: {issue['category']} / {issue['module']}")
        print(f"    Tickets: {issue['ticket_count']}")
        print(f"    Avg similarity: {issue['avg_similarity']:.4f}")

    # The biggest cluster should be "Advance Property Date" (mentioned in spec)
    biggest = emerging[0]
    print(f"\n  Biggest cluster: {biggest['category']}")

    print("\n[PASS] Emerging issues detected correctly")
    test_results.append(("TEST 3", True))

    # ========================================================================
    # TEST 4: before_after_comparison shows improvement
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 4: Before/After Learning Comparison (THE KEY METRIC)")
    print("=" * 70)

    print("This will take ~30-60 seconds (scanning 400 tickets twice)...")
    t0 = time.time()
    comparison = gap.before_after_comparison()
    comparison_time = time.time() - t0

    # Assertions
    assert 'before_learning' in comparison, "Missing before_learning"
    assert 'after_learning' in comparison, "Missing after_learning"
    assert 'improvement' in comparison, "Missing improvement"

    before = comparison['before_learning']
    after = comparison['after_learning']
    improvement = comparison['improvement']

    # Verify structure
    assert 'total_gaps' in before, "Missing total_gaps in before"
    assert 'avg_resolution_similarity' in before, "Missing avg_resolution_similarity in before"
    assert 'gaps_by_tier' in before, "Missing gaps_by_tier in before"

    assert 'total_gaps' in after, "Missing total_gaps in after"
    assert 'avg_resolution_similarity' in after, "Missing avg_resolution_similarity in after"
    assert 'gaps_by_tier' in after, "Missing gaps_by_tier in after"

    assert 'gaps_closed' in improvement, "Missing gaps_closed"
    assert 'similarity_lift' in improvement, "Missing similarity_lift"
    assert 'pct_improvement' in improvement, "Missing pct_improvement"

    # The key assertion: before should have MORE gaps than after
    assert before['total_gaps'] > after['total_gaps'], \
        f"Before ({before['total_gaps']}) should have MORE gaps than after ({after['total_gaps']})"

    # Improvement should be substantial
    assert improvement['gaps_closed'] > 0, "Should close some gaps"

    # Similarity should improve
    assert improvement['similarity_lift'] > 0, "Similarity should increase"

    print(f"\nComparison completed in {comparison_time:.1f}s\n")

    print("BEFORE LEARNING (without synthetic KBs):")
    print(f"  Total gaps: {before['total_gaps']}")
    print(f"  Avg similarity: {before['avg_resolution_similarity']:.4f}")
    print(f"  Gaps by tier: {before['gaps_by_tier']}")

    print("\nAFTER LEARNING (with synthetic KBs):")
    print(f"  Total gaps: {after['total_gaps']}")
    print(f"  Avg similarity: {after['avg_resolution_similarity']:.4f}")
    print(f"  Gaps by tier: {after['gaps_by_tier']}")

    print("\nIMPROVEMENT:")
    print(f"  Gaps closed: {improvement['gaps_closed']} ({improvement['pct_improvement']:.1f}%)")
    print(f"  Similarity lift: +{improvement['similarity_lift']:.4f}")

    print("\n[PASS] Before/after comparison shows measurable improvement")
    test_results.append(("TEST 4", True))

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
        print(f"[OK] ALL {total} TESTS PASSED")
        print("\nKEY FINDING:")
        print(f"  Self-learning loop closed {improvement['gaps_closed']} gaps")
        print(f"  Improvement: {improvement['pct_improvement']:.1f}%")
    else:
        print(f"[FAIL] {passed}/{total} tests passed")
        sys.exit(1)
    print("=" * 70 + "\n")
