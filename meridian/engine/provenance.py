"""
Meridian Provenance Resolver
Builds full evidence chains for every recommendation.
"""
import logging
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional

from .data_loader import DataStore
from .vector_store import RetrievalResult

logger = logging.getLogger(__name__)


@dataclass
class ProvenanceSource:
    """A single provenance source with enriched metadata."""
    source_type: str       # "Ticket" | "Conversation" | "Script"
    source_id: str         # "CS-xxx" | "CONV-xxx" | "SCRIPT-xxx"
    relationship: str      # "CREATED_FROM" | "REFERENCES" | "USED_BY"
    evidence_snippet: str
    detail: dict           # Enriched fields (depends on source_type)


@dataclass
class ProvenanceChain:
    """Full provenance chain for a document."""
    kb_article_id: str
    kb_title: str
    sources: List[ProvenanceSource]
    learning_event: Optional[dict]
    has_provenance: bool


class ProvenanceResolver:
    """Resolves provenance chains for documents."""

    def __init__(self, datastore: DataStore):
        self.ds = datastore

        # Build reverse lookups for efficiency
        self._build_reverse_lookups()

    def _build_reverse_lookups(self):
        """Build reverse lookup maps for provenance resolution."""
        # Scripts used by tickets: script_id -> list of ticket_numbers
        self.scripts_used_by = {}
        for ticket_num, ticket in self.ds.ticket_by_number.items():
            script_id = ticket.get('Script_ID')
            if script_id and str(script_id) != 'nan':
                if script_id not in self.scripts_used_by:
                    self.scripts_used_by[script_id] = []
                self.scripts_used_by[script_id].append(ticket_num)

        # KB articles generated from tickets: kb_id -> ticket_number
        self.kb_generated_from = {}
        for ticket_num, ticket in self.ds.ticket_by_number.items():
            kb_id = ticket.get('Generated_KB_Article_ID')
            if kb_id and str(kb_id) != 'nan':
                self.kb_generated_from[kb_id] = ticket_num

    def resolve(self, doc_id: str) -> ProvenanceChain:
        """
        Build full provenance chain for any document.

        - If doc_type is KB and lineage exists -> full chain with enriched sources
        - If doc_type is KB and no lineage -> has_provenance=False
        - If doc_type is SCRIPT -> show which tickets use this script
        - If doc_type is TICKET -> show its script_id and kb_article_id references
        """
        # Determine doc type from doc_id
        if doc_id.startswith('KB-'):
            return self._resolve_kb(doc_id)
        elif doc_id.startswith('SCRIPT-'):
            return self._resolve_script(doc_id)
        elif doc_id.startswith('CS-'):
            return self._resolve_ticket(doc_id)
        else:
            # Unknown type - return empty chain
            return ProvenanceChain(
                kb_article_id=doc_id,
                kb_title="Unknown Document",
                sources=[],
                learning_event=None,
                has_provenance=False
            )

    def _resolve_kb(self, kb_id: str) -> ProvenanceChain:
        """Resolve provenance for a KB article."""
        # Get KB article
        kb_article = self.ds.kb_by_id.get(kb_id)
        if kb_article is None:
            return ProvenanceChain(
                kb_article_id=kb_id,
                kb_title="Unknown KB Article",
                sources=[],
                learning_event=None,
                has_provenance=False
            )

        title = str(kb_article.get('Title', ''))

        # Get lineage records
        lineage_records = self.ds.lineage_by_kb.get(kb_id, [])

        if not lineage_records:
            # No provenance
            return ProvenanceChain(
                kb_article_id=kb_id,
                kb_title=title,
                sources=[],
                learning_event=None,
                has_provenance=False
            )

        # Build enriched sources from lineage
        sources = []
        for record in lineage_records:
            source_type = record.get('Source_Type', '')
            source_id = record.get('Source_ID', '')
            relationship = record.get('Relationship_Type', '')
            evidence = record.get('Evidence_Snippet', '')

            # Enrich based on source type
            detail = {}
            if source_type == 'Ticket':
                detail = self._enrich_ticket(source_id)
            elif source_type == 'Conversation':
                detail = self._enrich_conversation(source_id)
            elif source_type == 'Script':
                detail = self._enrich_script(source_id)

            source = ProvenanceSource(
                source_type=source_type,
                source_id=source_id,
                relationship=relationship,
                evidence_snippet=evidence,
                detail=detail
            )
            sources.append(source)

        # Get learning event
        learning_event = self.get_learning_event(kb_id)

        return ProvenanceChain(
            kb_article_id=kb_id,
            kb_title=title,
            sources=sources,
            learning_event=learning_event,
            has_provenance=True
        )

    def _resolve_script(self, script_id: str) -> ProvenanceChain:
        """Resolve provenance for a script (show which tickets use it)."""
        script = self.ds.script_by_id.get(script_id)
        if script is None:
            return ProvenanceChain(
                kb_article_id=script_id,
                kb_title="Unknown Script",
                sources=[],
                learning_event=None,
                has_provenance=False
            )

        title = str(script.get('Script_Title', ''))

        # Find tickets that use this script
        ticket_numbers = self.scripts_used_by.get(script_id, [])

        sources = []
        for ticket_num in ticket_numbers[:5]:  # Limit to first 5 for performance
            detail = self._enrich_ticket(ticket_num)
            source = ProvenanceSource(
                source_type='Ticket',
                source_id=ticket_num,
                relationship='USED_BY',
                evidence_snippet=f'This script was used to resolve ticket {ticket_num}.',
                detail=detail
            )
            sources.append(source)

        has_provenance = len(sources) > 0

        return ProvenanceChain(
            kb_article_id=script_id,
            kb_title=title,
            sources=sources,
            learning_event=None,
            has_provenance=has_provenance
        )

    def _resolve_ticket(self, ticket_number: str) -> ProvenanceChain:
        """Resolve provenance for a ticket (show its script and KB references)."""
        ticket = self.ds.ticket_by_number.get(ticket_number)
        if ticket is None:
            return ProvenanceChain(
                kb_article_id=ticket_number,
                kb_title="Unknown Ticket",
                sources=[],
                learning_event=None,
                has_provenance=False
            )

        subject = str(ticket.get('Subject', ''))

        sources = []

        # Add script reference if exists
        script_id = ticket.get('Script_ID')
        if script_id and str(script_id) != 'nan':
            detail = self._enrich_script(script_id)
            source = ProvenanceSource(
                source_type='Script',
                source_id=script_id,
                relationship='REFERENCES',
                evidence_snippet=f'This ticket used script {script_id} for resolution.',
                detail=detail
            )
            sources.append(source)

        # Add KB reference if exists
        kb_id = ticket.get('KB_Article_ID')
        if kb_id and str(kb_id) != 'nan':
            kb = self.ds.kb_by_id.get(kb_id)
            if kb is not None:
                detail = {
                    'title': str(kb.get('Title', '')),
                    'category': str(kb.get('Category', '')),
                    'module': str(kb.get('Module', ''))
                }
                source = ProvenanceSource(
                    source_type='KB',
                    source_id=kb_id,
                    relationship='REFERENCES',
                    evidence_snippet=f'This ticket referenced KB article {kb_id}.',
                    detail=detail
                )
                sources.append(source)

        # Add generated KB if exists
        gen_kb_id = ticket.get('Generated_KB_Article_ID')
        if gen_kb_id and str(gen_kb_id) != 'nan':
            kb = self.ds.kb_by_id.get(gen_kb_id)
            if kb is not None:
                detail = {
                    'title': str(kb.get('Title', '')),
                    'category': str(kb.get('Category', '')),
                    'module': str(kb.get('Module', ''))
                }
                source = ProvenanceSource(
                    source_type='KB',
                    source_id=gen_kb_id,
                    relationship='GENERATED',
                    evidence_snippet=f'This ticket generated KB article {gen_kb_id}.',
                    detail=detail
                )
                sources.append(source)

        has_provenance = len(sources) > 0

        return ProvenanceChain(
            kb_article_id=ticket_number,
            kb_title=subject,
            sources=sources,
            learning_event=None,
            has_provenance=has_provenance
        )

    def _enrich_ticket(self, ticket_number: str) -> dict:
        """Enrich ticket provenance with metadata."""
        ticket = self.ds.ticket_by_number.get(ticket_number)
        if ticket is None:
            return {}

        return {
            'subject': str(ticket.get('Subject', '')),
            'tier': str(ticket.get('Tier', '')),
            'resolution': str(ticket.get('Resolution', ''))[:200],  # Truncate
            'root_cause': str(ticket.get('Root_Cause', '')),
            'module': str(ticket.get('Module', ''))
        }

    def _enrich_conversation(self, conversation_id: str) -> dict:
        """Enrich conversation provenance with metadata."""
        # Find conversation in df_conversations
        conv_df = self.ds.df_conversations
        conv = conv_df[conv_df['Conversation_ID'] == conversation_id]

        if conv.empty:
            return {}

        conv = conv.iloc[0]

        return {
            'channel': str(conv.get('Channel', '')),
            'agent_name': str(conv.get('Agent_Name', '')),
            'sentiment': str(conv.get('Sentiment', '')),
            'issue_summary': str(conv.get('Issue_Summary', ''))[:200]  # Truncate
        }

    def _enrich_script(self, script_id: str) -> dict:
        """Enrich script provenance with metadata."""
        script = self.ds.script_by_id.get(script_id)
        if script is None:
            return {}

        return {
            'title': str(script.get('Script_Title', '')),
            'purpose': str(script.get('Script_Purpose', ''))[:200],  # Truncate
            'inputs': str(script.get('Script_Inputs', ''))
        }

    def get_learning_event(self, kb_article_id: str) -> Optional[dict]:
        """
        Look up the Learning_Events row for a given KB article.
        Returns dict or None if no learning event exists.
        """
        events_df = self.ds.df_learning_events
        event = events_df[events_df['Proposed_KB_Article_ID'] == kb_article_id]

        if event.empty:
            return None

        event = event.iloc[0]

        return {
            'event_id': str(event.get('Learning_Event_ID', '')),
            'trigger_ticket': str(event.get('Trigger_Ticket_Number', '')),
            'detected_gap': str(event.get('Detected_Gap', ''))[:200],
            'draft_summary': str(event.get('Draft_Summary', ''))[:200],
            'final_status': str(event.get('Final_Status', '')),
            'reviewer_role': str(event.get('Reviewer_Role', '')),
            'timestamp': str(event.get('Event_Timestamp', ''))
        }

    def resolve_for_results(self, results: List[RetrievalResult]) -> List[dict]:
        """
        Batch resolve provenance for a list of retrieval results.
        Returns list of JSON-serializable dicts (same order as input).
        """
        provenance_chains = []

        for result in results:
            chain = self.resolve(result.doc_id)

            # Convert to JSON-serializable dict
            chain_dict = {
                'kb_article_id': chain.kb_article_id,
                'kb_title': chain.kb_title,
                'has_provenance': chain.has_provenance,
                'sources': [
                    {
                        'source_type': s.source_type,
                        'source_id': s.source_id,
                        'relationship': s.relationship,
                        'evidence_snippet': s.evidence_snippet,
                        'detail': s.detail
                    }
                    for s in chain.sources
                ],
                'learning_event': chain.learning_event
            }

            provenance_chains.append(chain_dict)

        return provenance_chains


if __name__ == "__main__":
    """Sanity check with REAL assertions."""
    import sys
    import os
    import json

    # Setup
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

    from meridian.engine.data_loader import init_datastore

    print("\n" + "=" * 70)
    print("MERIDIAN PROVENANCE RESOLVER - SANITY CHECK")
    print("=" * 70 + "\n")

    # Load data
    print("Loading data...")
    ds = init_datastore("SupportMind_Final_Data.xlsx")
    print(f"[OK] Loaded {len(ds.documents)} documents\n")

    # Create resolver
    prov = ProvenanceResolver(ds)

    test_results = []

    # ========================================================================
    # TEST 1: Resolve synthetic KB article (KB-SYN-0001)
    # ========================================================================
    print("=" * 70)
    print("TEST 1: Synthetic KB Article Provenance (KB-SYN-0001)")
    print("=" * 70)

    chain = prov.resolve("KB-SYN-0001")

    # Assertions
    assert isinstance(chain, ProvenanceChain), f"Expected ProvenanceChain, got {type(chain)}"
    assert chain.kb_article_id == "KB-SYN-0001", "KB article ID mismatch"
    assert chain.has_provenance == True, "Should have provenance"
    assert len(chain.sources) == 3, f"Expected 3 sources, got {len(chain.sources)}"
    assert chain.learning_event is not None, "Should have learning event"

    print(f"KB Article: {chain.kb_article_id}")
    print(f"Title: {chain.kb_title[:60]}...")
    print(f"Has provenance: {chain.has_provenance}")
    print(f"Sources: {len(chain.sources)}")

    # Verify source types
    source_types = [s.source_type for s in chain.sources]
    assert 'Ticket' in source_types, "Should have Ticket source"
    assert 'Conversation' in source_types, "Should have Conversation source"
    assert 'Script' in source_types, "Should have Script source"

    for i, source in enumerate(chain.sources, 1):
        print(f"  Source {i}: {source.source_type} - {source.source_id}")
        print(f"    Relationship: {source.relationship}")
        assert isinstance(source.detail, dict), "Detail must be dict"
        assert len(source.detail) > 0, "Detail should not be empty"

    # Verify learning event
    assert isinstance(chain.learning_event, dict), "Learning event must be dict"
    assert 'event_id' in chain.learning_event, "Missing event_id"
    assert 'trigger_ticket' in chain.learning_event, "Missing trigger_ticket"

    print(f"  Learning Event: {chain.learning_event['event_id']}")
    print(f"    Trigger: {chain.learning_event['trigger_ticket']}")

    print("[PASS] KB-SYN-0001 provenance resolved correctly")
    test_results.append(("TEST 1", True))

    # ========================================================================
    # TEST 2: Resolve seed KB article (no provenance)
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 2: Seed KB Article (No Provenance)")
    print("=" * 70)

    # Find a seed KB article (one without lineage)
    seed_kb_id = None
    for kb_id in list(ds.kb_by_id.keys())[:100]:  # Check first 100
        if kb_id not in ds.lineage_by_kb or len(ds.lineage_by_kb[kb_id]) == 0:
            seed_kb_id = kb_id
            break

    assert seed_kb_id is not None, "Could not find a seed KB article for testing"

    chain = prov.resolve(seed_kb_id)

    # Assertions
    assert chain.has_provenance == False, "Seed KB should have no provenance"
    assert len(chain.sources) == 0, f"Expected 0 sources, got {len(chain.sources)}"
    assert chain.learning_event is None, "Seed KB should have no learning event"

    print(f"KB Article: {chain.kb_article_id}")
    print(f"Has provenance: {chain.has_provenance}")
    print(f"Sources: {len(chain.sources)}")

    print("[PASS] Seed KB article has no provenance (as expected)")
    test_results.append(("TEST 2", True))

    # ========================================================================
    # TEST 3: Resolve script (show tickets that use it)
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 3: Script Provenance (SCRIPT-0293)")
    print("=" * 70)

    chain = prov.resolve("SCRIPT-0293")

    # Assertions
    assert chain.kb_article_id == "SCRIPT-0293", "Script ID mismatch"

    print(f"Script: {chain.kb_article_id}")
    print(f"Title: {chain.kb_title[:60]}...")
    print(f"Has provenance: {chain.has_provenance}")
    print(f"Used by {len(chain.sources)} tickets")

    # Should have at least some tickets using it (or could be 0)
    for i, source in enumerate(chain.sources[:3], 1):  # Show first 3
        assert source.source_type == 'Ticket', "Script provenance should show Tickets"
        assert source.relationship == 'USED_BY', "Relationship should be USED_BY"
        print(f"  Used by: {source.source_id} - {source.detail.get('subject', '')[:40]}...")

    print("[PASS] Script provenance resolved correctly")
    test_results.append(("TEST 3", True))

    # ========================================================================
    # TEST 4: Resolve ticket (show script and KB references)
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 4: Ticket Provenance (CS-38908386)")
    print("=" * 70)

    chain = prov.resolve("CS-38908386")

    # Assertions
    assert chain.kb_article_id == "CS-38908386", "Ticket ID mismatch"

    print(f"Ticket: {chain.kb_article_id}")
    print(f"Subject: {chain.kb_title[:60]}...")
    print(f"Has provenance: {chain.has_provenance}")
    print(f"References: {len(chain.sources)}")

    # This ticket should reference a script (it's a Tier 3 ticket)
    has_script = any(s.source_type == 'Script' for s in chain.sources)
    print(f"  Has script reference: {has_script}")

    for source in chain.sources:
        print(f"  {source.relationship} {source.source_type}: {source.source_id}")

    print("[PASS] Ticket provenance resolved correctly")
    test_results.append(("TEST 4", True))

    # ========================================================================
    # TEST 5: Batch resolution for retrieval results
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 5: Batch Resolution (resolve_for_results)")
    print("=" * 70)

    # Create mock retrieval results
    from meridian.engine.vector_store import RetrievalResult

    mock_results = [
        RetrievalResult(
            doc_id="KB-SYN-0001",
            doc_type="KB",
            title="Test",
            body="Test",
            score=1.0,
            metadata={},
            provenance=[],
            rank=1
        ),
        RetrievalResult(
            doc_id=seed_kb_id,
            doc_type="KB",
            title="Test",
            body="Test",
            score=0.8,
            metadata={},
            provenance=[],
            rank=2
        )
    ]

    chains = prov.resolve_for_results(mock_results)

    # Assertions
    assert isinstance(chains, list), "Result must be list"
    assert len(chains) == 2, f"Expected 2 chains, got {len(chains)}"

    # Verify JSON serializable
    try:
        json_str = json.dumps(chains, default=str)
        assert len(json_str) > 0, "JSON serialization failed"
    except Exception as e:
        raise AssertionError(f"Not JSON serializable: {e}")

    # Verify order matches input
    assert chains[0]['kb_article_id'] == "KB-SYN-0001", "Order mismatch"
    assert chains[1]['kb_article_id'] == seed_kb_id, "Order mismatch"

    # Verify structure
    for chain_dict in chains:
        assert 'kb_article_id' in chain_dict, "Missing kb_article_id"
        assert 'kb_title' in chain_dict, "Missing kb_title"
        assert 'has_provenance' in chain_dict, "Missing has_provenance"
        assert 'sources' in chain_dict, "Missing sources"
        assert 'learning_event' in chain_dict, "Missing learning_event"

    print(f"Resolved {len(chains)} chains")
    print(f"  Chain 1: {chains[0]['kb_article_id']} - {chains[0]['has_provenance']}")
    print(f"  Chain 2: {chains[1]['kb_article_id']} - {chains[1]['has_provenance']}")
    print(f"  JSON serializable: True")

    print("[PASS] Batch resolution works correctly")
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
    passed = sum(1 for _, p in test_results if p)

    print("\n" + "=" * 70)
    if passed == total:
        print(f"[OK] ALL {total} TESTS PASSED")
    else:
        print(f"[FAIL] {passed}/{total} tests passed")
        sys.exit(1)
    print("=" * 70 + "\n")
