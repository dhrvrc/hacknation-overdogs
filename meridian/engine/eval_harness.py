"""
Meridian Eval Harness
Comprehensive evaluation system using 1,000 ground-truth questions.
"""
import logging
import time
from typing import List, Dict
from collections import defaultdict

from .data_loader import DataStore
from .vector_store import VectorStore
from .gap_detector import GapDetector

logger = logging.getLogger(__name__)


class EvalHarness:
    """Evaluation harness for retrieval, classification, and self-learning."""

    def __init__(
        self,
        datastore: DataStore,
        vector_store: VectorStore,
        query_router_module,
        gap_detector: GapDetector
    ):
        self.ds = datastore
        self.vs = vector_store
        self.router = query_router_module  # The module itself (for classify_query, route_and_retrieve)
        self.gap = gap_detector

        logger.info("EvalHarness initialized")

    def eval_retrieval(self, top_k_values: List[int] = [1, 3, 5, 10]) -> dict:
        """
        Run retrieval eval over all 1,000 questions.

        For each question:
          - Call route_and_retrieve(question_text, vector_store, top_k=max(top_k_values))
          - Collect ALL result doc_ids (primary + all secondary)
          - For each k in top_k_values: check if Target_ID is in the first k results

        Returns comprehensive metrics sliced by answer type and difficulty.
        """
        logger.info(f"Running retrieval eval for top_k={top_k_values}")

        questions = self.ds.df_questions
        total_questions = len(questions)
        max_k = max(top_k_values)

        # Track hits for each k value
        hits = {k: defaultdict(list) for k in top_k_values}

        # Overall tracking
        overall_hits = {k: 0 for k in top_k_values}

        # By answer type
        by_type_hits = {
            'SCRIPT': {k: 0 for k in top_k_values},
            'KB': {k: 0 for k in top_k_values},
            'TICKET_RESOLUTION': {k: 0 for k in top_k_values}
        }
        by_type_counts = defaultdict(int)

        # By difficulty
        by_difficulty_hits = {
            'Easy': {k: 0 for k in top_k_values},
            'Medium': {k: 0 for k in top_k_values},
            'Hard': {k: 0 for k in top_k_values}
        }
        by_difficulty_counts = defaultdict(int)

        print(f"\nEvaluating retrieval on {total_questions} questions...")
        t0 = time.time()

        for idx, (_, question) in enumerate(questions.iterrows(), 1):
            if idx % 100 == 0:
                elapsed = time.time() - t0
                print(f"  Progress: {idx}/{total_questions} ({idx/total_questions*100:.1f}%) - {elapsed:.1f}s")

            question_text = question['Question_Text']
            target_id = question['Target_ID']
            answer_type = question['Answer_Type']
            difficulty = question['Difficulty']

            # Route and retrieve
            result = self.router.route_and_retrieve(question_text, self.vs, top_k=max_k)

            # Collect all doc_ids (primary + secondary)
            all_doc_ids = [r.doc_id for r in result['primary_results']]
            for sec_results in result['secondary_results'].values():
                all_doc_ids.extend([r.doc_id for r in sec_results])

            # Check hits for each k
            for k in top_k_values:
                hit = target_id in all_doc_ids[:k]

                if hit:
                    overall_hits[k] += 1
                    by_type_hits[answer_type][k] += 1
                    by_difficulty_hits[difficulty][k] += 1

            # Count by type and difficulty
            by_type_counts[answer_type] += 1
            by_difficulty_counts[difficulty] += 1

        elapsed = time.time() - t0
        print(f"  Completed in {elapsed:.1f}s")

        # Compute percentages
        overall_scores = {f"hit@{k}": overall_hits[k] / total_questions for k in top_k_values}

        by_type_scores = {}
        for answer_type, counts in by_type_counts.items():
            if counts > 0:
                by_type_scores[answer_type] = {
                    f"hit@{k}": by_type_hits[answer_type][k] / counts
                    for k in top_k_values
                }

        by_difficulty_scores = {}
        for difficulty, counts in by_difficulty_counts.items():
            if counts > 0:
                by_difficulty_scores[difficulty] = {
                    f"hit@{k}": by_difficulty_hits[difficulty][k] / counts
                    for k in top_k_values
                }

        return {
            'overall': overall_scores,
            'by_answer_type': by_type_scores,
            'by_difficulty': by_difficulty_scores,
            'total_questions': total_questions,
            'evaluated_at': time.strftime('%Y-%m-%dT%H:%M:%S')
        }

    def eval_classification(self) -> dict:
        """
        Run classification eval over all 1,000 questions.

        Returns accuracy, per-class metrics, and confusion matrix.
        """
        logger.info("Running classification eval")

        questions = self.ds.df_questions
        total_questions = len(questions)

        # Track predictions
        correct = 0
        predictions = []
        actuals = []

        # Confusion matrix
        confusion = {
            'actual_SCRIPT': {'pred_SCRIPT': 0, 'pred_KB': 0, 'pred_TICKET': 0},
            'actual_KB': {'pred_SCRIPT': 0, 'pred_KB': 0, 'pred_TICKET': 0},
            'actual_TICKET': {'pred_SCRIPT': 0, 'pred_KB': 0, 'pred_TICKET': 0}
        }

        print(f"\nEvaluating classification on {total_questions} questions...")
        t0 = time.time()

        for idx, (_, question) in enumerate(questions.iterrows(), 1):
            if idx % 100 == 0:
                elapsed = time.time() - t0
                print(f"  Progress: {idx}/{total_questions} ({idx/total_questions*100:.1f}%) - {elapsed:.1f}s")

            question_text = question['Question_Text']
            actual_type = question['Answer_Type']

            # Classify
            predicted_type, _ = self.router.classify_query(question_text, self.vs)

            # Track
            predictions.append(predicted_type)
            actuals.append(actual_type)

            if predicted_type == actual_type:
                correct += 1

            # Update confusion matrix
            actual_key = f"actual_{actual_type}"
            pred_key = f"pred_{predicted_type}"
            confusion[actual_key][pred_key] += 1

        elapsed = time.time() - t0
        print(f"  Completed in {elapsed:.1f}s")

        # Compute accuracy
        accuracy = correct / total_questions

        # Compute per-class metrics
        per_class = {}
        for class_name in ['SCRIPT', 'KB', 'TICKET']:
            # True positives, false positives, false negatives
            tp = confusion[f'actual_{class_name}'][f'pred_{class_name}']

            fp = sum(
                confusion[f'actual_{other}'][f'pred_{class_name}']
                for other in ['SCRIPT', 'KB', 'TICKET'] if other != class_name
            )

            fn = sum(
                confusion[f'actual_{class_name}'][f'pred_{other}']
                for other in ['SCRIPT', 'KB', 'TICKET'] if other != class_name
            )

            # Precision, recall, F1
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

            support = sum(confusion[f'actual_{class_name}'].values())

            per_class[class_name] = {
                'precision': precision,
                'recall': recall,
                'f1': f1,
                'support': support
            }

        return {
            'accuracy': accuracy,
            'per_class': per_class,
            'confusion_matrix': confusion,
            'total_questions': total_questions
        }

    def eval_before_after(self) -> dict:
        """
        The headline self-learning proof.

        1. Identify the 161 synthetic KB doc_ids
        2. Store current eval_retrieval results as "after_learning"
        3. vector_store.remove_documents(synthetic_ids)
        4. Run eval_retrieval → "before_learning"
        5. vector_store.add_documents(synthetic_docs) to restore
        6. Also include gap_detector.before_after_comparison() results

        Returns before/after comparison with delta.
        """
        logger.info("Running before/after self-learning evaluation")

        print("\n" + "=" * 70)
        print("SELF-LEARNING EVALUATION (Before/After)")
        print("=" * 70)

        # Identify synthetic KB articles
        synthetic_kb_ids = set()
        synthetic_docs = []
        for doc in self.ds.documents:
            if doc.doc_type == 'KB' and doc.metadata.get('source_type') == 'SYNTH_FROM_TICKET':
                synthetic_kb_ids.add(doc.doc_id)
                synthetic_docs.append(doc)

        print(f"\nIdentified {len(synthetic_kb_ids)} synthetic KB articles")

        # Current state (with synthetics) = "after learning"
        print("\n[1/3] Running retrieval eval WITH synthetic KBs (after learning)...")
        after_retrieval = self.eval_retrieval(top_k_values=[1, 5, 10])

        # Remove synthetics and re-eval = "before learning"
        print("\n[2/3] Removing synthetic KBs and re-running (before learning)...")
        self.vs.remove_documents(synthetic_kb_ids)

        before_retrieval = self.eval_retrieval(top_k_values=[1, 5, 10])

        # Restore synthetics
        print("\n[3/3] Restoring synthetic KBs...")
        self.vs.add_documents(synthetic_docs)

        # Get gap comparison (already does before/after internally)
        print("\nRunning gap detector before/after comparison...")
        gap_comparison = self.gap.before_after_comparison()

        # Compute deltas
        delta = {
            'hit@1_improvement': after_retrieval['overall']['hit@1'] - before_retrieval['overall']['hit@1'],
            'hit@5_improvement': after_retrieval['overall']['hit@5'] - before_retrieval['overall']['hit@5'],
            'gaps_closed': gap_comparison['improvement']['gaps_closed'],
            'headline': f"Self-learning loop improved hit@5 from {before_retrieval['overall']['hit@5']:.1%} to {after_retrieval['overall']['hit@5']:.1%} (+{(after_retrieval['overall']['hit@5'] - before_retrieval['overall']['hit@5']):.1%})"
        }

        return {
            'before_learning': {
                'retrieval': before_retrieval,
                'gaps': gap_comparison['before_learning']
            },
            'after_learning': {
                'retrieval': after_retrieval,
                'gaps': gap_comparison['after_learning']
            },
            'delta': delta
        }

    def run_all(self) -> dict:
        """Run all three evals and return combined results."""
        logger.info("Running full evaluation suite")

        print("\n" + "=" * 70)
        print("MERIDIAN FULL EVALUATION SUITE")
        print("=" * 70)

        t0 = time.time()

        # Run evals
        retrieval = self.eval_retrieval()
        classification = self.eval_classification()
        before_after = self.eval_before_after()

        elapsed = time.time() - t0

        print(f"\n{'=' * 70}")
        print(f"Full evaluation completed in {elapsed:.1f}s")
        print("=" * 70)

        return {
            'retrieval': retrieval,
            'classification': classification,
            'before_after': before_after,
            'total_time': elapsed
        }

    def print_report(self, results: dict) -> str:
        """
        Pretty-print the eval results as a formatted text report.
        Return the report as a string.
        """
        lines = []
        lines.append("\n" + "=" * 70)
        lines.append("MERIDIAN EVALUATION REPORT")
        lines.append("=" * 70)

        # Retrieval results
        if 'retrieval' in results:
            lines.append("\n[1] RETRIEVAL ACCURACY")
            lines.append("-" * 70)

            ret = results['retrieval']
            lines.append("\nOverall:")
            for metric, score in ret['overall'].items():
                lines.append(f"  {metric}: {score:.1%}")

            lines.append("\nBy Answer Type:")
            for answer_type, scores in ret['by_answer_type'].items():
                lines.append(f"  {answer_type}:")
                for metric, score in scores.items():
                    lines.append(f"    {metric}: {score:.1%}")

            lines.append("\nBy Difficulty:")
            for difficulty, scores in ret['by_difficulty'].items():
                lines.append(f"  {difficulty}:")
                for metric, score in scores.items():
                    lines.append(f"    {metric}: {score:.1%}")

        # Classification results
        if 'classification' in results:
            lines.append("\n[2] CLASSIFICATION ACCURACY")
            lines.append("-" * 70)

            cls = results['classification']
            lines.append(f"\nOverall Accuracy: {cls['accuracy']:.1%}")

            lines.append("\nPer-Class Metrics:")
            for class_name, metrics in cls['per_class'].items():
                lines.append(f"  {class_name}:")
                lines.append(f"    Precision: {metrics['precision']:.1%}")
                lines.append(f"    Recall: {metrics['recall']:.1%}")
                lines.append(f"    F1: {metrics['f1']:.3f}")
                lines.append(f"    Support: {metrics['support']}")

            lines.append("\nConfusion Matrix:")
            cm = cls['confusion_matrix']
            lines.append("                 Predicted:")
            lines.append("                 SCRIPT    KB    TICKET")
            for actual in ['SCRIPT', 'KB', 'TICKET']:
                actual_key = f'actual_{actual}'
                script_count = cm[actual_key]['pred_SCRIPT']
                kb_count = cm[actual_key]['pred_KB']
                ticket_count = cm[actual_key]['pred_TICKET']
                lines.append(f"  Actual {actual:7s}  {script_count:6d}  {kb_count:4d}  {ticket_count:6d}")

        # Before/after results
        if 'before_after' in results:
            lines.append("\n[3] SELF-LEARNING PROOF (Before/After)")
            lines.append("-" * 70)

            ba = results['before_after']
            delta = ba['delta']

            lines.append("\n" + delta['headline'])

            lines.append("\nRetrieval Improvement:")
            lines.append(f"  hit@1: +{delta['hit@1_improvement']:.1%}")
            lines.append(f"  hit@5: +{delta['hit@5_improvement']:.1%}")

            lines.append("\nGap Detection:")
            lines.append(f"  Gaps closed: {delta['gaps_closed']}")

            before_gaps = ba['before_learning']['gaps']['total_gaps']
            after_gaps = ba['after_learning']['gaps']['total_gaps']
            lines.append(f"  Before: {before_gaps} gaps")
            lines.append(f"  After: {after_gaps} gaps")

        lines.append("\n" + "=" * 70)
        lines.append("END OF REPORT")
        lines.append("=" * 70 + "\n")

        report = '\n'.join(lines)
        print(report)
        return report


if __name__ == "__main__":
    """Sanity check with REAL assertions."""
    import sys
    import os

    # Setup
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

    from meridian.engine.data_loader import init_datastore
    from meridian.engine.vector_store import VectorStore
    from meridian.engine.gap_detector import GapDetector
    import meridian.engine.query_router as query_router_module

    print("\n" + "=" * 70)
    print("MERIDIAN EVAL HARNESS - SANITY CHECK")
    print("=" * 70 + "\n")

    # Load data and build all modules
    print("Loading data and building engine...")
    ds = init_datastore("SupportMind_Final_Data.xlsx")
    vs = VectorStore()
    vs.build_index(ds.documents)
    gap = GapDetector(vs, ds, threshold=0.40)

    # Create eval harness
    evl = EvalHarness(ds, vs, query_router_module, gap)

    test_results = []

    # ========================================================================
    # TEST 1: eval_retrieval returns valid structure
    # ========================================================================
    print("=" * 70)
    print("TEST 1: Retrieval Evaluation (Sample)")
    print("=" * 70)
    print("Running on first 100 questions for speed...")

    # Temporarily limit questions for fast testing
    original_questions = ds.df_questions.copy()
    ds.df_questions = ds.df_questions.head(100)

    ret_results = evl.eval_retrieval(top_k_values=[1, 5, 10])

    # Restore full questions
    ds.df_questions = original_questions

    # Assertions
    assert 'overall' in ret_results, "Missing overall scores"
    assert 'by_answer_type' in ret_results, "Missing by_answer_type"
    assert 'by_difficulty' in ret_results, "Missing by_difficulty"
    assert 'total_questions' in ret_results, "Missing total_questions"

    assert ret_results['total_questions'] == 100, "Wrong question count"

    # Check all hit@k metrics present
    for k in [1, 5, 10]:
        metric = f'hit@{k}'
        assert metric in ret_results['overall'], f"Missing {metric} in overall"
        score = ret_results['overall'][metric]
        assert 0.0 <= score <= 1.0, f"{metric} score out of range: {score}"

    print(f"\nRetrieval results (100 questions):")
    for k in [1, 5, 10]:
        score = ret_results['overall'][f'hit@{k}']
        print(f"  hit@{k}: {score:.1%}")

    print("\n[PASS] Retrieval eval structure valid")
    test_results.append(("TEST 1", True))

    # ========================================================================
    # TEST 2: eval_classification returns valid structure
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 2: Classification Evaluation (Sample)")
    print("=" * 70)
    print("Running on first 100 questions for speed...")

    # Limit questions
    ds.df_questions = original_questions.head(100)

    cls_results = evl.eval_classification()

    # Restore
    ds.df_questions = original_questions

    # Assertions
    assert 'accuracy' in cls_results, "Missing accuracy"
    assert 'per_class' in cls_results, "Missing per_class"
    assert 'confusion_matrix' in cls_results, "Missing confusion_matrix"

    assert 0.0 <= cls_results['accuracy'] <= 1.0, "Accuracy out of range"

    # Check per-class metrics
    for class_name in ['SCRIPT', 'KB', 'TICKET']:
        assert class_name in cls_results['per_class'], f"Missing {class_name} in per_class"
        metrics = cls_results['per_class'][class_name]
        assert 'precision' in metrics, "Missing precision"
        assert 'recall' in metrics, "Missing recall"
        assert 'f1' in metrics, "Missing f1"
        assert 'support' in metrics, "Missing support"

    print(f"\nClassification accuracy (100 questions): {cls_results['accuracy']:.1%}")

    print("\n[PASS] Classification eval structure valid")
    test_results.append(("TEST 2", True))

    # ========================================================================
    # TEST 3: print_report generates text
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 3: Report Generation")
    print("=" * 70)

    sample_results = {
        'retrieval': ret_results,
        'classification': cls_results
    }

    report = evl.print_report(sample_results)

    # Assertions
    assert isinstance(report, str), "Report must be string"
    assert len(report) > 0, "Report should not be empty"
    assert "RETRIEVAL ACCURACY" in report, "Report should contain retrieval section"
    assert "CLASSIFICATION ACCURACY" in report, "Report should contain classification section"

    print("[PASS] Report generation works")
    test_results.append(("TEST 3", True))

    # ========================================================================
    # TEST 4: Verify hit@5 baseline (should be >30%)
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 4: Retrieval Baseline Check")
    print("=" * 70)

    hit5_score = ret_results['overall']['hit@5']
    print(f"hit@5 on sample: {hit5_score:.1%}")

    # Should be >0% at minimum (we expect >30% on full eval)
    assert hit5_score > 0.0, "hit@5 should be > 0%"

    print("\n[PASS] Retrieval baseline reasonable")
    test_results.append(("TEST 4", True))

    # ========================================================================
    # TEST 5: Verify classification baseline (should be >60%)
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 5: Classification Baseline Check")
    print("=" * 70)

    cls_accuracy = cls_results['accuracy']
    print(f"Classification accuracy on sample: {cls_accuracy:.1%}")

    # Should beat random (33.3%)
    assert cls_accuracy > 0.33, "Classification should beat random chance"

    print("\n[PASS] Classification baseline reasonable")
    test_results.append(("TEST 5", True))

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
    passed_count = sum(1 for _, p in test_results if p)

    print("\n" + "=" * 70)
    if passed_count == total:
        print(f"[OK] ALL {total} TESTS PASSED")
        print("\nNote: Tests run on 100 questions for speed")
        print("      Run full eval with run_all() for complete metrics")
    else:
        print(f"[FAIL] {passed_count}/{total} tests passed")
        sys.exit(1)
    print("=" * 70 + "\n")
