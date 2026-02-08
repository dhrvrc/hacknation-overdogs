"""
Meridian Demo Pipeline
Orchestrates the live demo flow where the system encounters Report Export Failure
(a novel problem type), detects it as an emerging issue, generates new knowledge,
and then retrieves that knowledge for future questions - all in real time.
"""
from meridian.server.synthetic_tickets import (
    get_synthetic_tickets,
    get_synthetic_conversations,
    get_demo_questions
)
from meridian.server.demo_state import DemoState, DemoPhase
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class DemoPipeline:
    """
    Orchestrates the live demo flow for the presentation.

    This is the most important module - it powers the "learning from the present"
    proof point that separates Meridian from a basic RAG chatbot.
    """

    def __init__(self, datastore, vector_store, gap_detector, kb_generator, provenance_resolver):
        """
        Initialize demo pipeline with engine components.

        Args:
            datastore: DataStore with tickets and conversations
            vector_store: VectorStore for document retrieval
            gap_detector: GapDetector for finding knowledge gaps
            kb_generator: KBGenerator for creating draft articles
            provenance_resolver: ProvenanceResolver for evidence chains
        """
        self.ds = datastore
        self.vs = vector_store
        self.gap = gap_detector
        self.gen = kb_generator
        self.prov = provenance_resolver
        self.state = DemoState()

    def reset(self):
        """
        Reset the demo to initial state.

        - Remove any synthetic documents from the vector store
        - Remove synthetic tickets from datastore lookup maps
        - Reset the demo state

        This allows the demo to be re-run multiple times.
        """
        logger.info("Resetting demo pipeline...")

        # Remove any previously injected synthetic ticket docs
        synthetic_ticket_ids = [t["Ticket_Number"] for t in get_synthetic_tickets()]

        # Also remove approved KB article if it exists
        if self.state.approved_doc_id:
            synthetic_ticket_ids.append(self.state.approved_doc_id)

        # Only remove docs that actually exist in the index
        existing_doc_ids = {d.doc_id for d in self.ds.documents}
        to_remove = set(synthetic_ticket_ids) & existing_doc_ids

        if to_remove:
            logger.info(f"Removing {len(to_remove)} synthetic documents from vector store")
            self.vs.remove_documents(to_remove)

        # Remove from datastore ticket lookup
        for ticket_num in synthetic_ticket_ids:
            if ticket_num in self.ds.ticket_by_number:
                del self.ds.ticket_by_number[ticket_num]

        # Reset state
        self.state.reset()
        self.state.log_event("RESET", "Demo pipeline reset to initial state")

        logger.info("Demo pipeline reset complete")
        return self.state.to_dict()

    def step1_inject_tickets(self) -> dict:
        """
        DEMO STEP 3: Inject the 6 synthetic tickets into the system.

        For each synthetic ticket:
        1. Create a Document object (doc_type="TICKET")
        2. Add to the vector store via vs.add_documents()
        3. Add to datastore lookup maps so gap detection can find them
        4. Log the injection event

        Returns:
            Updated demo state dict
        """
        logger.info("Step 1: Injecting synthetic tickets...")

        tickets = get_synthetic_tickets()
        conversations = get_synthetic_conversations()

        # Import Document class
        from meridian.engine.data_loader import Document

        new_docs = []
        for ticket in tickets:
            # Build a Document matching the data_loader format
            doc = Document(
                doc_id=ticket["Ticket_Number"],  # Use ticket number as doc_id
                doc_type="TICKET",
                title=ticket["Subject"],
                body=f"Description: {ticket['Description']}\n\nResolution: {ticket['Resolution']}",
                search_text=f"{ticket['Subject']} {ticket['Category']} {ticket['Module']} {ticket['Root_Cause']} resolution: {ticket['Resolution']} description: {ticket['Description']}",
                metadata={
                    "tier": ticket["Tier"],
                    "priority": ticket["Priority"],
                    "root_cause": ticket["Root_Cause"],
                    "module": ticket["Module"],
                    "category": ticket["Category"],
                    "script_id": ticket.get("Script_ID")
                },
                provenance=[]
            )
            new_docs.append(doc)
            self.state.injected_tickets.append(ticket["Ticket_Number"])
            self.state.log_event("INJECT_TICKET", f"Injected {ticket['Ticket_Number']}: {ticket['Subject']}")

        # Add all tickets to the vector store at once
        self.vs.add_documents(new_docs)
        logger.info(f"Added {len(new_docs)} synthetic ticket documents to vector store")

        # Register in datastore lookup maps so gap_detector.check_ticket works
        for ticket in tickets:
            self.ds.ticket_by_number[ticket["Ticket_Number"]] = pd.Series(ticket)

        # Register conversations (if datastore has conversations DataFrame)
        if hasattr(self.ds, 'conversations'):
            # Append to existing conversations DataFrame
            for conv in conversations:
                # Create a row and append
                new_row = pd.DataFrame([conv])
                self.ds.conversations = pd.concat([self.ds.conversations, new_row], ignore_index=True)

        self.state.phase = DemoPhase.TICKETS_INJECTED
        self.state.started_at = self.state.events_log[0]["timestamp"] if self.state.events_log else None

        logger.info(f"Step 1 complete: {len(tickets)} tickets injected")
        return self.state.to_dict()

    def step2_detect_gaps(self) -> dict:
        """
        DEMO STEP 3 (continued): Run gap detection on the injected tickets.

        For each synthetic ticket:
        1. Call gap.check_ticket(ticket_number)
        2. Record the result (should be is_gap=True for all)
        3. Log: "⚠ No KB match for CS-DEMO-001 (similarity: 0.12)"

        ALL 6 tickets should show is_gap=True with very low similarity scores
        (< 0.25) because nothing about Report Export Failure exists in the KB.

        Returns:
            Updated demo state dict with gap results
        """
        logger.info("Step 2: Detecting knowledge gaps...")

        for ticket_num in self.state.injected_tickets:
            result = self.gap.check_ticket(ticket_num)

            self.state.gap_results.append({
                "ticket_number": ticket_num,
                "is_gap": result.is_gap,
                "similarity": result.resolution_similarity,
                "best_match": result.best_matching_kb_id
            })

            status_icon = "⚠" if result.is_gap else "✓"
            status_text = "No KB match" if result.is_gap else "KB match found"
            self.state.log_event(
                "GAP_DETECTED" if result.is_gap else "GAP_COVERED",
                f"{status_icon} {status_text} for {ticket_num} (similarity: {result.resolution_similarity:.4f})"
            )

        gaps_found = sum(1 for g in self.state.gap_results if g["is_gap"])
        logger.info(f"Step 2 complete: {gaps_found}/{len(self.state.gap_results)} gaps detected")

        self.state.phase = DemoPhase.GAPS_DETECTED
        return self.state.to_dict()

    def step3_detect_emerging_issue(self) -> dict:
        """
        DEMO STEP 4: Run emerging issue detection.

        The gap results from step 2 show 6 tickets about "Report Export Failure"
        with no KB coverage. The emerging issue detector should cluster them
        by (Category, Module) and flag:

        "🔴 NEW: Report Export Failure / Reporting & Exports — 6 tickets, 0 KB coverage"

        Returns:
            Updated demo state dict with emerging issues
        """
        logger.info("Step 3: Detecting emerging issues...")

        # Build GapDetectionResult objects for the synthetic tickets
        gap_results_for_detection = []
        for ticket_num in self.state.injected_tickets:
            result = self.gap.check_ticket(ticket_num)
            gap_results_for_detection.append(result)

        # Detect emerging issues with min cluster size of 3
        emerging = self.gap.detect_emerging_issues(
            gap_results_for_detection,
            min_cluster_size=3
        )

        self.state.emerging_issues = emerging
        self.state.phase = DemoPhase.EMERGING_FLAGGED

        for issue in emerging:
            self.state.log_event(
                "EMERGING_ISSUE",
                f"🔴 NEW: {issue['category']} / {issue['module']} — {issue['ticket_count']} tickets, avg similarity {issue['avg_similarity']:.4f}"
            )

        logger.info(f"Step 3 complete: {len(emerging)} emerging issue(s) detected")
        return self.state.to_dict()

    def step4_generate_kb_draft(self) -> dict:
        """
        DEMO STEP 5: Generate a KB article draft from the synthetic tickets.

        Picks the first synthetic ticket (CS-DEMO-001 - a clear, common scenario)
        and generates a KB article draft.

        If an API key is available, the KB generator will use Claude to create
        a polished article. If not, it will use the template fallback.

        Returns:
            Updated demo state dict with draft ID
        """
        logger.info("Step 4: Generating KB article draft...")

        # Generate a draft from the first synthetic ticket
        draft = self.gen.generate_draft(self.state.injected_tickets[0])

        self.state.generated_draft_id = draft.draft_id
        self.state.phase = DemoPhase.DRAFT_GENERATED
        self.state.log_event(
            "DRAFT_GENERATED",
            f"KB article draft '{draft.title}' generated from {draft.source_ticket}"
        )

        logger.info(f"Step 4 complete: Draft {draft.draft_id} generated")
        return self.state.to_dict()

    def step5_approve_and_index(self) -> dict:
        """
        DEMO STEP 6: Approve the draft and add it to the retrieval index.

        1. Call gen.approve_draft(draft_id) → returns a Document
        2. Call vs.add_documents([doc]) → article is now retrievable
        3. Log the event

        After this step, querying about Report Export Failure should return
        this newly created article as a top result.

        Returns:
            Updated demo state dict
        """
        logger.info("Step 5: Approving and indexing KB article...")

        doc = self.gen.approve_draft(self.state.generated_draft_id)

        if doc:
            self.vs.add_documents([doc])
            self.state.approved_doc_id = doc.doc_id
            self.state.phase = DemoPhase.DRAFT_APPROVED
            self.state.log_event(
                "DRAFT_APPROVED",
                f"KB article {doc.doc_id} approved and indexed — now retrievable"
            )
            logger.info(f"Step 5 complete: Article {doc.doc_id} approved and indexed")
        else:
            logger.error("Step 5 failed: Draft approval returned None")

        return self.state.to_dict()

    def step6_verify_retrieval(self) -> dict:
        """
        DEMO STEP 7: Verify the copilot now retrieves the new article.

        Run each of the 3 demo questions through route_and_retrieve.
        Check if the newly approved article appears in the results.

        This is the proof moment: the system learned something new.

        Returns:
            {
                "state": demo_state_dict,
                "verification": [
                    {
                        "question": str,
                        "found_new_article": bool,
                        "article_rank": int | null,
                        "article_score": float | null,
                        "top_result": {"doc_id": str, "title": str, "score": float}
                    }
                ]
            }
        """
        logger.info("Step 6: Verifying retrieval of new article...")

        from meridian.engine.query_router import route_and_retrieve

        questions = get_demo_questions()
        verification = []

        for q in questions:
            result = route_and_retrieve(q["question"], self.vs, top_k=10)

            # Check all results (primary + secondary) for the new article
            all_results = result["primary_results"][:]
            for sec_results in result["secondary_results"].values():
                all_results.extend(sec_results)

            found = False
            rank = None
            score = None
            for i, r in enumerate(all_results):
                if r.doc_id == self.state.approved_doc_id:
                    found = True
                    rank = i + 1
                    score = r.score
                    break

            top = all_results[0] if all_results else None
            verification.append({
                "question": q["question"],
                "found_new_article": found,
                "article_rank": rank,
                "article_score": round(score, 4) if score else None,
                "top_result": {
                    "doc_id": top.doc_id,
                    "title": top.title,
                    "score": round(top.score, 4)
                } if top else None
            })

        found_count = sum(1 for v in verification if v['found_new_article'])
        self.state.phase = DemoPhase.DEMO_COMPLETE
        self.state.log_event(
            "VERIFIED",
            f"Retrieval verification complete — new article found in {found_count}/3 queries"
        )

        logger.info(f"Step 6 complete: New article found in {found_count}/3 queries")

        return {
            "state": self.state.to_dict(),
            "verification": verification
        }

    def run_full_pipeline(self) -> dict:
        """
        Run the entire demo pipeline in sequence (for testing).

        This executes all 6 steps:
        1. Reset
        2. Inject tickets
        3. Detect gaps
        4. Detect emerging issues
        5. Generate KB draft
        6. Approve and index
        7. Verify retrieval

        Returns:
            Final state with verification results
        """
        logger.info("Running full demo pipeline...")

        self.reset()
        self.step1_inject_tickets()
        self.step2_detect_gaps()
        self.step3_detect_emerging_issue()
        self.step4_generate_kb_draft()
        self.step5_approve_and_index()
        result = self.step6_verify_retrieval()

        logger.info("Full demo pipeline complete")
        return result
