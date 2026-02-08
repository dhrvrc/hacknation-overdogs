"""
Meridian Data Loader
Loads the entire dataset into memory and builds a unified document corpus.
"""
import re
import time
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class Document:
    """Unified document representation for retrieval."""
    doc_id: str          # "KB-xxx", "SCRIPT-xxx", or "CS-xxx"
    doc_type: str        # "KB" | "SCRIPT" | "TICKET"
    title: str
    body: str            # full text content
    search_text: str     # concatenated text optimized for TF-IDF indexing
    metadata: dict       # type-specific fields
    provenance: list = field(default_factory=list)  # from KB_Lineage


@dataclass
class DataStore:
    """Container for all loaded data and lookup structures."""
    # Raw DataFrames
    df_kb_articles: pd.DataFrame
    df_scripts: pd.DataFrame
    df_tickets: pd.DataFrame
    df_conversations: pd.DataFrame
    df_kb_lineage: pd.DataFrame
    df_learning_events: pd.DataFrame
    df_questions: pd.DataFrame
    df_knowledge_base: pd.DataFrame  # Full original KB sheet
    df_scripts_master: pd.DataFrame  # Full original Scripts_Master sheet
    df_ticket_metadata: pd.DataFrame  # If exists

    # Unified corpus
    documents: List[Document] = field(default_factory=list)
    doc_index: Dict[str, Document] = field(default_factory=dict)

    # Lookup maps
    lineage_by_kb: Dict[str, List[dict]] = field(default_factory=dict)
    ticket_by_number: Dict[str, pd.Series] = field(default_factory=dict)
    script_by_id: Dict[str, pd.Series] = field(default_factory=dict)
    kb_by_id: Dict[str, pd.Series] = field(default_factory=dict)


def safe_str(value) -> str:
    """Convert value to string, returning empty string for NaN/None."""
    return str(value) if pd.notna(value) else ""


def clean_sql(raw_sql: str) -> str:
    """Strip noise from SQL script text, keeping only actual SQL statements.

    Removes comment lines (--), empty lines, 'go' keywords, and 'use <DB>'
    boilerplate.  This improves embedding quality by raising the signal-to-noise
    ratio (~65 % of raw script text is noise).
    """
    cleaned = []
    for line in raw_sql.split('\n'):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith('--'):
            continue
        if stripped.lower() == 'go':
            continue
        if re.match(r'^use\s+<', stripped, re.IGNORECASE):
            continue
        cleaned.append(stripped)
    return ' '.join(cleaned)


def load_data(path: str) -> DataStore:
    """Load all Excel tabs into DataFrames."""
    logger.info(f"Loading data from {path}")

    # Read all sheets
    excel_file = pd.ExcelFile(path)

    # Load all tabs (names from the spec)
    df_kb = excel_file.parse('Knowledge_Articles')
    df_scripts = excel_file.parse('Scripts_Master')
    df_tickets = excel_file.parse('Tickets')
    df_conversations = excel_file.parse('Conversations')
    df_kb_lineage = excel_file.parse('KB_Lineage')
    df_learning = excel_file.parse('Learning_Events')
    df_questions = excel_file.parse('Questions')

    # Also keep full sheets for reference
    df_knowledge_base = df_kb.copy()
    df_scripts_master = df_scripts.copy()

    # Handle optional Ticket_Metadata tab
    try:
        df_ticket_metadata = excel_file.parse('Ticket_Metadata')
    except:
        df_ticket_metadata = pd.DataFrame()

    logger.info(f"Loaded {len(df_kb)} KB articles, {len(df_scripts)} scripts, "
                f"{len(df_tickets)} tickets, {len(df_conversations)} conversations")

    return DataStore(
        df_kb_articles=df_kb,
        df_scripts=df_scripts,
        df_tickets=df_tickets,
        df_conversations=df_conversations,
        df_kb_lineage=df_kb_lineage,
        df_learning_events=df_learning,
        df_questions=df_questions,
        df_knowledge_base=df_knowledge_base,
        df_scripts_master=df_scripts_master,
        df_ticket_metadata=df_ticket_metadata,
    )


def validate_joins(ds: DataStore) -> Dict[str, bool]:
    """Validate all foreign key relationships."""
    logger.info("Validating FK relationships")

    results = {}

    # Check 1: Conversations.Ticket_Number → Tickets.Ticket_Number
    conv_tickets = set(ds.df_conversations['Ticket_Number'].dropna())
    ticket_numbers = set(ds.df_tickets['Ticket_Number'])
    check1 = conv_tickets.issubset(ticket_numbers)
    results['Conversations→Tickets'] = check1
    logger.info(f"  [{'OK' if check1 else 'FAIL'}] Conversations->Tickets (FK: Ticket_Number)")

    # Check 2: Tickets.Script_ID → Scripts_Master.Script_ID (for non-null)
    ticket_scripts = set(ds.df_tickets['Script_ID'].dropna())
    script_ids = set(ds.df_scripts['Script_ID'])
    check2 = ticket_scripts.issubset(script_ids)
    results['Tickets→Scripts'] = check2
    logger.info(f"  [{'OK' if check2 else 'FAIL'}] Tickets->Scripts (FK: Script_ID)")

    # Check 3: Tickets.KB_Article_ID → Knowledge_Articles.KB_Article_ID (for non-null)
    ticket_kbs = set(ds.df_tickets['KB_Article_ID'].dropna())
    kb_ids = set(ds.df_kb_articles['KB_Article_ID'])
    check3 = ticket_kbs.issubset(kb_ids)
    results['Tickets→KB_Articles'] = check3
    logger.info(f"  [{'OK' if check3 else 'FAIL'}] Tickets->KB_Articles (FK: KB_Article_ID)")

    # Check 4: KB_Lineage.KB_Article_ID → Knowledge_Articles.KB_Article_ID
    lineage_kbs = set(ds.df_kb_lineage['KB_Article_ID'].dropna())
    check4 = lineage_kbs.issubset(kb_ids)
    results['KB_Lineage→KB_Articles'] = check4
    logger.info(f"  [{'OK' if check4 else 'FAIL'}] KB_Lineage->KB_Articles (FK: KB_Article_ID)")

    # Check 5: Questions.Target_ID resolves (check by Answer_Type)
    # This is a polymorphic FK - different target tables by type
    questions = ds.df_questions
    all_targets_valid = True

    script_qs = questions[questions['Answer_Type'] == 'SCRIPT']
    kb_qs = questions[questions['Answer_Type'] == 'KB']
    ticket_qs = questions[questions['Answer_Type'] == 'TICKET_RESOLUTION']

    if len(script_qs) > 0:
        script_targets = set(script_qs['Target_ID'].dropna())
        all_targets_valid &= script_targets.issubset(script_ids)

    if len(kb_qs) > 0:
        kb_targets = set(kb_qs['Target_ID'].dropna())
        all_targets_valid &= kb_targets.issubset(kb_ids)

    if len(ticket_qs) > 0:
        ticket_targets = set(ticket_qs['Target_ID'].dropna())
        all_targets_valid &= ticket_targets.issubset(ticket_numbers)

    results['Questions→Targets'] = all_targets_valid
    logger.info(f"  [{'OK' if all_targets_valid else 'FAIL'}] Questions->Targets (polymorphic FK)")

    return results


def build_lookup_maps(ds: DataStore) -> None:
    """Populate lookup dictionaries for O(1) access."""
    logger.info("Building lookup maps")

    # lineage_by_kb: KB_Article_ID → list of lineage records
    for kb_id in ds.df_kb_articles['KB_Article_ID']:
        lineage_rows = ds.df_kb_lineage[ds.df_kb_lineage['KB_Article_ID'] == kb_id]
        ds.lineage_by_kb[kb_id] = lineage_rows.to_dict('records')

    # ticket_by_number: Ticket_Number → Series
    for _, row in ds.df_tickets.iterrows():
        ds.ticket_by_number[row['Ticket_Number']] = row

    # script_by_id: Script_ID → Series
    for _, row in ds.df_scripts.iterrows():
        ds.script_by_id[row['Script_ID']] = row

    # kb_by_id: KB_Article_ID → Series
    for _, row in ds.df_kb_articles.iterrows():
        ds.kb_by_id[row['KB_Article_ID']] = row

    logger.info(f"  Built {len(ds.lineage_by_kb)} KB lineage lookups")
    logger.info(f"  Built {len(ds.ticket_by_number)} ticket lookups")
    logger.info(f"  Built {len(ds.script_by_id)} script lookups")
    logger.info(f"  Built {len(ds.kb_by_id)} KB lookups")


def build_document_corpus(ds: DataStore) -> List[Document]:
    """Create unified Document objects for all KB articles, scripts, and tickets."""
    logger.info("Building document corpus")
    documents = []

    # 1. KB Articles (3,207 expected)
    for _, row in ds.df_kb_articles.iterrows():
        kb_id = row['KB_Article_ID']
        title = safe_str(row['Title'])
        body = safe_str(row['Body'])
        category = safe_str(row.get('Category', ''))
        module = safe_str(row.get('Module', ''))
        tags = safe_str(row.get('Tags', ''))

        # search_text: "{title} {category} {module} {tags} {body}"
        search_text = f"{title} {category} {module} {tags} {body}".strip()

        # Get provenance from lineage
        provenance = ds.lineage_by_kb.get(kb_id, [])

        metadata = {
            'category': category,
            'module': module,
            'tags': tags,
            'source_type': safe_str(row.get('Source_Type', '')),
            'created_at': safe_str(row.get('Created_At', '')),
            'updated_at': safe_str(row.get('Updated_At', '')),
        }

        doc = Document(
            doc_id=kb_id,
            doc_type='KB',
            title=title,
            body=body,
            search_text=search_text,
            metadata=metadata,
            provenance=provenance
        )
        documents.append(doc)

    # 2. Scripts (714 expected)
    for _, row in ds.df_scripts.iterrows():
        script_id = row['Script_ID']
        title = safe_str(row['Script_Title'])
        script_text = safe_str(row['Script_Text_Sanitized'])
        purpose = safe_str(row.get('Script_Purpose', ''))
        category = safe_str(row.get('Category', ''))
        module = safe_str(row.get('Module', ''))
        inputs = safe_str(row.get('Script_Inputs', ''))

        # search_text: metadata + cleaned SQL body for discriminative embedding signal
        # The SQL body contains unique table/procedure names that questions reference
        cleaned_sql = clean_sql(script_text)
        search_text = f"{title} {purpose} {category} {module} {inputs} {cleaned_sql}".strip()

        metadata = {
            'category': category,
            'module': module,
            'purpose': purpose,
            'inputs': inputs,
            'source': safe_str(row.get('Source', '')),
        }

        doc = Document(
            doc_id=script_id,
            doc_type='SCRIPT',
            title=title,
            body=script_text,
            search_text=search_text,
            metadata=metadata,
            provenance=[]
        )
        documents.append(doc)

    # 3. Tickets (400 expected)
    for _, row in ds.df_tickets.iterrows():
        ticket_number = row['Ticket_Number']
        subject = safe_str(row['Subject'])
        description = safe_str(row.get('Description', ''))
        resolution = safe_str(row.get('Resolution', ''))
        category = safe_str(row.get('Category', ''))
        module = safe_str(row.get('Module', ''))
        root_cause = safe_str(row.get('Root_Cause', ''))

        # search_text: "{subject} {category} {module} {root_cause} resolution: {resolution} description: {description}"
        search_text = f"{subject} {category} {module} {root_cause} resolution: {resolution} description: {description}".strip()

        metadata = {
            'category': category,
            'module': module,
            'tier': safe_str(row.get('Tier', '')),
            'priority': safe_str(row.get('Priority', '')),
            'status': safe_str(row.get('Status', '')),
            'root_cause': root_cause,
            'script_id': safe_str(row.get('Script_ID', '')),
            'kb_article_id': safe_str(row.get('KB_Article_ID', '')),
            'conversation_id': safe_str(row.get('Conversation_ID', '')),
        }

        doc = Document(
            doc_id=ticket_number,
            doc_type='TICKET',
            title=subject,
            body=resolution,
            search_text=search_text,
            metadata=metadata,
            provenance=[]
        )
        documents.append(doc)

    logger.info(f"  Created {len(documents)} documents:")
    kb_count = sum(1 for d in documents if d.doc_type == 'KB')
    script_count = sum(1 for d in documents if d.doc_type == 'SCRIPT')
    ticket_count = sum(1 for d in documents if d.doc_type == 'TICKET')
    logger.info(f"    KB: {kb_count}")
    logger.info(f"    SCRIPT: {script_count}")
    logger.info(f"    TICKET: {ticket_count}")

    return documents


def init_datastore(path: str) -> DataStore:
    """
    Main entry point: load all data, validate, build lookups, create documents.
    Returns a fully initialized DataStore.
    """
    logger.info("=" * 70)
    logger.info("Initializing Meridian DataStore")
    logger.info("=" * 70)

    t0 = time.time()

    # Load all Excel tabs
    ds = load_data(path)

    # Validate foreign keys
    fk_checks = validate_joins(ds)
    if not all(fk_checks.values()):
        logger.warning("⚠️  Some FK checks failed - data may have integrity issues")

    # Build lookup maps
    build_lookup_maps(ds)

    # Build unified document corpus
    ds.documents = build_document_corpus(ds)

    # Build doc_index for O(1) lookup
    ds.doc_index = {doc.doc_id: doc for doc in ds.documents}

    elapsed = time.time() - t0
    logger.info("=" * 70)
    logger.info(f"[OK] DataStore initialized in {elapsed:.2f}s")
    logger.info(f"     Total documents: {len(ds.documents)}")
    logger.info("=" * 70)

    return ds


if __name__ == "__main__":
    """Sanity check: load data and print stats."""
    import sys
    import os

    # Enable logging to console
    logging.basicConfig(
        level=logging.INFO,
        format='%(message)s'
    )

    # Get data path from args or env
    try:
        from meridian.config import DATA_PATH
        path = sys.argv[1] if len(sys.argv) > 1 else DATA_PATH
    except ImportError:
        # If running directly without package context, use default or arg
        path = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("MERIDIAN_DATA", "SupportMind_Final_Data.xlsx")

    print("\n" + "=" * 70)
    print("MERIDIAN DATA LOADER — SANITY CHECK")
    print("=" * 70 + "\n")

    # Load datastore
    t0 = time.time()
    ds = init_datastore(path)
    load_time = time.time() - t0

    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)
    print(f"Load time: {load_time:.2f}s")
    print(f"\nDocument counts by type:")

    type_counts = {}
    for doc in ds.documents:
        type_counts[doc.doc_type] = type_counts.get(doc.doc_type, 0) + 1

    for doc_type, count in sorted(type_counts.items()):
        print(f"  {doc_type}: {count}")

    print(f"\nTotal: {len(ds.documents)}")

    # Check for "nan" in search_text
    print("\n" + "=" * 70)
    print("NaN CHECK")
    print("=" * 70)

    nan_found = False
    for doc in ds.documents:
        # Case-insensitive check for the literal string "nan"
        # (excluding words like "finance", "tenant" that contain "nan")
        search_lower = doc.search_text.lower()
        # Look for " nan " with spaces, or "nan" at start/end
        if (' nan ' in search_lower or
            search_lower.startswith('nan ') or
            search_lower.endswith(' nan')):
            print(f"  [FAIL] Found 'nan' in {doc.doc_id}")
            nan_found = True

    if not nan_found:
        print("  [OK] No 'nan' strings found in any search_text")

    # Test specific lookups
    print("\n" + "=" * 70)
    print("LOOKUP TESTS")
    print("=" * 70)

    # Test lineage lookup
    if "KB-SYN-0001" in ds.lineage_by_kb:
        lineage = ds.lineage_by_kb["KB-SYN-0001"]
        print(f"  [OK] ds.lineage_by_kb['KB-SYN-0001'] -> {len(lineage)} records")
    else:
        print(f"  [WARN] KB-SYN-0001 not found in lineage")

    # Test ticket lookup
    if "CS-38908386" in ds.ticket_by_number:
        ticket = ds.ticket_by_number["CS-38908386"]
        tier = ticket.get('Tier', 'N/A')
        print(f"  [OK] ds.ticket_by_number['CS-38908386'] -> Tier={tier}")
    else:
        print(f"  [WARN] CS-38908386 not found in tickets")

    print("\n" + "=" * 70)
    print("[OK] SANITY CHECK COMPLETE")
    print("=" * 70 + "\n")
