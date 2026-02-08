"""
Meridian KB Generator
Generates knowledge base article drafts from resolved tickets.
"""
import logging
import os
from dataclasses import dataclass
from typing import List, Optional, Tuple
from datetime import datetime

from .data_loader import DataStore, Document
from ..config import OPENAI_MODEL

logger = logging.getLogger(__name__)


@dataclass
class KBDraft:
    """A generated KB article draft awaiting approval."""
    draft_id: str               # "DRAFT-{timestamp}" format
    title: str
    body: str                   # the full article text
    tags: List[str]
    module: str
    category: str
    source_ticket: str          # Ticket_Number
    source_conversation: str    # Conversation_ID
    source_script: Optional[str]  # Script_ID if applicable
    generated_at: str           # ISO timestamp
    generation_method: str      # "llm" or "template"
    status: str                 # "Pending" | "Approved" | "Rejected"


class KBGenerator:
    """Generates KB article drafts from tickets using LLM or template."""

    def __init__(self, datastore: DataStore, api_key: str = ""):
        self.datastore = datastore
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.drafts: List[KBDraft] = []

        # Try to import openai
        self.openai_available = False
        if self.api_key:
            try:
                import openai
                self.client = openai.OpenAI(api_key=self.api_key)
                self.openai_available = True
                logger.info("KB Generator initialized with OpenAI API")
            except ImportError:
                logger.warning("openai package not installed - using template fallback")
                self.openai_available = False
        else:
            logger.info("No API key provided - using template fallback")

    def generate_draft(self, ticket_number: str) -> KBDraft:
        """
        Generate a KB article draft from a resolved ticket.

        1. Look up ticket, its conversation, and its script (if any)
        2. If API key is set, call Claude to generate the article
        3. If not, use the template fallback
        4. Create a KBDraft, add it to self.drafts, return it
        """
        # Look up ticket
        ticket = self.datastore.ticket_by_number.get(ticket_number)
        if ticket is None:
            raise ValueError(f"Ticket {ticket_number} not found")

        # Get conversation
        conversation = None
        conv_id = ticket.get('Conversation_ID')
        if conv_id and str(conv_id) != 'nan':
            conv_df = self.datastore.df_conversations
            conv_rows = conv_df[conv_df['Conversation_ID'] == conv_id]
            if not conv_rows.empty:
                conversation = conv_rows.iloc[0].to_dict()

        # Get script
        script = None
        script_id = ticket.get('Script_ID')
        if script_id and str(script_id) != 'nan':
            script = self.datastore.script_by_id.get(script_id)
            if script is not None:
                script = script.to_dict()

        # Generate
        if self.openai_available:
            title, body = self._generate_with_llm(ticket.to_dict(), conversation, script)
            method = "llm"
        else:
            title, body = self._generate_with_template(ticket.to_dict(), conversation, script)
            method = "template"

        # Extract metadata
        category = str(ticket.get('Category', ''))
        module = str(ticket.get('Module', ''))

        # Generate tags from category, module, and key terms
        tags = []
        if category:
            tags.extend(category.lower().replace('/', ' ').split())
        if module:
            tags.extend(module.lower().replace('/', ' ').split())
        tags = list(set(tags))[:10]  # Unique, max 10

        # Create draft
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        draft_id = f"DRAFT-{timestamp}"

        draft = KBDraft(
            draft_id=draft_id,
            title=title,
            body=body,
            tags=tags,
            module=module,
            category=category,
            source_ticket=ticket_number,
            source_conversation=str(conv_id) if conv_id and str(conv_id) != 'nan' else "",
            source_script=str(script_id) if script_id and str(script_id) != 'nan' else None,
            generated_at=datetime.now().isoformat(),
            generation_method=method,
            status="Pending"
        )

        self.drafts.append(draft)
        logger.info(f"Generated draft {draft_id} for ticket {ticket_number} using {method}")

        return draft

    def _generate_with_llm(
        self,
        ticket: dict,
        conversation: Optional[dict],
        script: Optional[dict]
    ) -> Tuple[str, str]:
        """
        Call OpenAI API to generate title and body.
        Returns (title, body).
        """
        import openai

        # Build system prompt
        system_prompt = """You are a technical writer for a support knowledge base. Generate a structured KB article from the provided ticket, conversation, and script information.

Follow this EXACT format:

Summary
- [Brief summary of the issue and resolution]

Applies To
- [Product name]
- Module: [module path]
- Category: [category]

Symptoms
- [What the user experiences]

Resolution Steps
1. [Step by step instructions]
2. [...]

Script Reference (if applicable)
- Script_ID: [id]
- Required Inputs: [inputs]
- Script Purpose: [purpose]

Source Ticket
- Ticket: [number] (Tier [tier], Priority: [priority])
- Root Cause: [root cause]

Tags: [comma-separated tags]

Be precise and actionable. Use the actual data — do not invent information."""

        # Build user prompt with ticket data
        user_prompt = f"""Generate a KB article from this support ticket:

TICKET: {ticket.get('Ticket_Number')}
Subject: {ticket.get('Subject')}
Description: {ticket.get('Description')}
Resolution: {ticket.get('Resolution')}
Root Cause: {ticket.get('Root_Cause')}
Tier: {ticket.get('Tier')}
Priority: {ticket.get('Priority')}
Module: {ticket.get('Module')}
Category: {ticket.get('Category')}
"""

        # Add conversation if available
        if conversation:
            transcript = str(conversation.get('Transcript', ''))
            # Truncate to 3000 chars
            if len(transcript) > 3000:
                transcript = transcript[:3000] + "..."
            user_prompt += f"\nCONVERSATION TRANSCRIPT:\n{transcript}\n"

        # Add script if available
        if script:
            script_text = str(script.get('Script_Text_Sanitized', ''))
            if len(script_text) > 1000:
                script_text = script_text[:1000] + "..."
            user_prompt += f"""
SCRIPT REFERENCE:
Script ID: {script.get('Script_ID')}
Purpose: {script.get('Script_Purpose')}
Inputs: {script.get('Script_Inputs')}
Script Text: {script_text}
"""

        # Call OpenAI
        try:
            response = self.client.chat.completions.create(
                model=OPENAI_MODEL,
                max_tokens=2000,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )

            full_text = response.choices[0].message.content

            # Extract title (first line) and body (rest)
            lines = full_text.strip().split('\n', 1)
            title = lines[0].strip()
            body = lines[1].strip() if len(lines) > 1 else full_text

            return title, body

        except Exception as e:
            logger.error(f"LLM generation failed: {e}, falling back to template")
            return self._generate_with_template(ticket, conversation, script)

    def _generate_with_template(
        self,
        ticket: dict,
        conversation: Optional[dict],
        script: Optional[dict]
    ) -> Tuple[str, str]:
        """
        Fallback: build the article from a string template.
        Uses the ticket's actual fields to fill in each section.
        """
        # Build title
        title = f"{ticket.get('Category', 'Issue')}: {ticket.get('Subject', 'Support Article')}"

        # Build body sections
        sections = []

        # Summary
        sections.append("Summary")
        tier = ticket.get('Tier', 'N/A')
        category = ticket.get('Category', 'General')
        module = ticket.get('Module', 'General')
        sections.append(f"- This article documents a Tier {tier} resolution for a {category} issue in {module}.")
        sections.append("")

        # Applies To
        sections.append("Applies To")
        sections.append(f"- Module: {module}")
        sections.append(f"- Category: {category}")
        sections.append("")

        # Symptoms
        sections.append("Symptoms")
        description = str(ticket.get('Description', 'No description available'))[:200]
        sections.append(f"- {description}")
        sections.append("")

        # Resolution Steps
        sections.append("Resolution Steps")
        resolution = str(ticket.get('Resolution', 'No resolution documented'))
        # Split resolution into numbered steps
        resolution_lines = resolution.split('. ')
        for i, line in enumerate(resolution_lines[:5], 1):  # Max 5 steps
            if line.strip():
                sections.append(f"{i}. {line.strip()}")
        sections.append("")

        # Script Reference (if applicable)
        if script:
            sections.append("Script Reference")
            sections.append(f"- Script_ID: {script.get('Script_ID')}")
            sections.append(f"- Required Inputs: {script.get('Script_Inputs', 'N/A')}")
            sections.append(f"- Script Purpose: {script.get('Script_Purpose', 'N/A')}")
            sections.append("")

        # Source Ticket
        sections.append("Source Ticket")
        sections.append(f"- Ticket: {ticket.get('Ticket_Number')} (Tier {tier}, Priority: {ticket.get('Priority', 'N/A')})")
        root_cause = ticket.get('Root_Cause', 'Not specified')
        sections.append(f"- Root Cause: {root_cause}")
        sections.append("")

        # Tags
        tags = [category.lower(), module.lower().replace('/', '-')]
        sections.append(f"Tags: {', '.join(tags)}")

        body = '\n'.join(sections)

        return title, body

    def get_pending_drafts(self) -> List[KBDraft]:
        """Return all drafts with status 'Pending'."""
        return [d for d in self.drafts if d.status == "Pending"]

    def approve_draft(self, draft_id: str) -> Optional[Document]:
        """
        Mark draft as 'Approved'.
        Convert it to a Document object (with doc_type="KB",
        doc_id="KB-DRAFT-{n}", source_type="GENERATED").
        Return the Document so the caller can add it to the vector store.
        """
        # Find draft
        draft = None
        for d in self.drafts:
            if d.draft_id == draft_id:
                draft = d
                break

        if draft is None:
            return None

        # Mark as approved
        draft.status = "Approved"

        # Create Document
        doc_id = f"KB-{draft_id}"

        metadata = {
            'category': draft.category,
            'module': draft.module,
            'tags': ', '.join(draft.tags),
            'source_type': 'GENERATED',
            'source_ticket': draft.source_ticket,
            'source_conversation': draft.source_conversation,
            'source_script': draft.source_script,
            'generation_method': draft.generation_method,
            'generated_at': draft.generated_at
        }

        # Build search_text
        search_text = f"{draft.title} {draft.category} {draft.module} {' '.join(draft.tags)} {draft.body}"

        doc = Document(
            doc_id=doc_id,
            doc_type='KB',
            title=draft.title,
            body=draft.body,
            search_text=search_text,
            metadata=metadata,
            provenance=[]
        )

        logger.info(f"Approved draft {draft_id} → {doc_id}")

        return doc

    def reject_draft(self, draft_id: str) -> bool:
        """Mark draft as 'Rejected'. Return True if found."""
        for draft in self.drafts:
            if draft.draft_id == draft_id:
                draft.status = "Rejected"
                logger.info(f"Rejected draft {draft_id}")
                return True
        return False


if __name__ == "__main__":
    """Sanity check with REAL assertions."""
    import sys
    import os

    # Setup
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

    from meridian.engine.data_loader import init_datastore

    print("\n" + "=" * 70)
    print("MERIDIAN KB GENERATOR - SANITY CHECK")
    print("=" * 70 + "\n")

    # Load data
    print("Loading data...")
    ds = init_datastore("SupportMind_Final_Data.xlsx")
    print(f"[OK] Loaded {len(ds.documents)} documents\n")

    # Check for API key
    api_key = os.environ.get("OPENAI_API_KEY", "")
    has_api_key = len(api_key) > 0

    if has_api_key:
        print("[INFO] OPENAI_API_KEY found - will test LLM generation")
    else:
        print("[INFO] No OPENAI_API_KEY - will test template fallback")

    # Create generator
    gen = KBGenerator(ds, api_key=api_key)

    test_results = []

    # ========================================================================
    # TEST 1: Generate draft from ticket
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 1: Generate KB Draft from Ticket")
    print("=" * 70)

    ticket_number = "CS-38908386"
    print(f"Generating draft for {ticket_number}...")

    draft = gen.generate_draft(ticket_number)

    # Assertions
    assert isinstance(draft, KBDraft), f"Expected KBDraft, got {type(draft)}"
    assert draft.draft_id.startswith("DRAFT-"), "Draft ID should start with DRAFT-"
    assert len(draft.title) > 0, "Title should not be empty"
    assert len(draft.body) > 0, "Body should not be empty"
    assert draft.source_ticket == ticket_number, "Source ticket mismatch"
    assert draft.status == "Pending", f"Status should be Pending, got {draft.status}"

    if has_api_key:
        assert draft.generation_method == "llm", "Should use LLM when API key available"
    else:
        assert draft.generation_method == "template", "Should use template when no API key"

    print(f"Draft ID: {draft.draft_id}")
    print(f"Title: {draft.title[:60]}...")
    print(f"Body length: {len(draft.body)} chars")
    print(f"Method: {draft.generation_method}")
    print(f"Status: {draft.status}")

    print("\n[PASS] Draft generated successfully")
    test_results.append(("TEST 1", True))

    # ========================================================================
    # TEST 2: Body contains required sections
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 2: Verify Required Sections")
    print("=" * 70)

    required_sections = ["Summary", "Resolution Steps", "Source Ticket"]

    sections_found = {}
    for section in required_sections:
        found = section in draft.body
        sections_found[section] = found
        status = "[FOUND]" if found else "[MISSING]"
        print(f"  {status} {section}")

    # Assertion - all required sections must be present
    missing = [s for s, found in sections_found.items() if not found]
    assert len(missing) == 0, f"Missing required sections: {missing}"

    print("\n[PASS] All required sections present")
    test_results.append(("TEST 2", True))

    # ========================================================================
    # TEST 3: get_pending_drafts returns the draft
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 3: Get Pending Drafts")
    print("=" * 70)

    pending = gen.get_pending_drafts()

    # Assertions
    assert isinstance(pending, list), "Should return list"
    assert len(pending) >= 1, "Should have at least 1 pending draft"
    assert draft in pending, "Generated draft should be in pending list"

    print(f"Pending drafts: {len(pending)}")
    for d in pending:
        print(f"  - {d.draft_id}: {d.title[:50]}...")

    print("\n[PASS] get_pending_drafts works correctly")
    test_results.append(("TEST 3", True))

    # ========================================================================
    # TEST 4: approve_draft returns Document
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 4: Approve Draft")
    print("=" * 70)

    print(f"Approving draft {draft.draft_id}...")
    doc = gen.approve_draft(draft.draft_id)

    # Assertions
    assert doc is not None, "approve_draft should return a Document"
    assert isinstance(doc, Document), f"Expected Document, got {type(doc)}"
    assert doc.doc_type == "KB", f"Expected doc_type KB, got {doc.doc_type}"
    assert doc.doc_id.startswith("KB-DRAFT-"), "Doc ID should start with KB-DRAFT-"
    assert doc.title == draft.title, "Title should match draft"
    assert doc.body == draft.body, "Body should match draft"
    assert draft.status == "Approved", "Draft status should be Approved"

    print(f"Approved document:")
    print(f"  Doc ID: {doc.doc_id}")
    print(f"  Type: {doc.doc_type}")
    print(f"  Title: {doc.title[:60]}...")
    print(f"  Metadata keys: {list(doc.metadata.keys())}")

    # Verify metadata
    assert 'source_type' in doc.metadata, "Missing source_type in metadata"
    assert doc.metadata['source_type'] == 'GENERATED', "source_type should be GENERATED"

    print("\n[PASS] approve_draft returns valid Document")
    test_results.append(("TEST 4", True))

    # ========================================================================
    # TEST 5: Template fallback works
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 5: Template Fallback (Force Template)")
    print("=" * 70)

    # Create generator without API key
    gen_template = KBGenerator(ds, api_key="")

    print("Generating with template (no API key)...")
    template_draft = gen_template.generate_draft("CS-38908386")

    # Assertions
    assert template_draft.generation_method == "template", "Should use template"
    assert len(template_draft.title) > 0, "Template should generate title"
    assert len(template_draft.body) > 0, "Template should generate body"

    # Verify template has required sections
    for section in required_sections:
        assert section in template_draft.body, f"Template missing section: {section}"

    print(f"Template draft:")
    print(f"  Method: {template_draft.generation_method}")
    print(f"  Title: {template_draft.title[:60]}...")
    print(f"  Body length: {len(template_draft.body)} chars")

    print("\n[PASS] Template fallback works correctly")
    test_results.append(("TEST 5", True))

    # ========================================================================
    # TEST 6: reject_draft works
    # ========================================================================
    print("\n" + "=" * 70)
    print("TEST 6: Reject Draft")
    print("=" * 70)

    # Add small delay to ensure unique timestamp
    import time
    time.sleep(1)

    # Generate a new draft to reject
    reject_draft = gen.generate_draft("CS-07303379")
    print(f"Rejecting draft {reject_draft.draft_id}...")

    success = gen.reject_draft(reject_draft.draft_id)

    # Assertions
    assert success == True, "reject_draft should return True"
    assert reject_draft.status == "Rejected", "Status should be Rejected"

    # Should not appear in pending
    pending_after = gen.get_pending_drafts()
    assert reject_draft not in pending_after, "Rejected draft should not be in pending"

    print(f"  Status: {reject_draft.status}")
    print(f"  In pending: {reject_draft in pending_after}")

    print("\n[PASS] reject_draft works correctly")
    test_results.append(("TEST 6", True))

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
        if has_api_key:
            print("\nNote: LLM generation was tested")
        else:
            print("\nNote: Only template generation was tested (no API key)")
            print("      Set OPENAI_API_KEY to test LLM generation")
    else:
        print(f"[FAIL] {passed}/{total} tests passed")
        sys.exit(1)
    print("=" * 70 + "\n")
