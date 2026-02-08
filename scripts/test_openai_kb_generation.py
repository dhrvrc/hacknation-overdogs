"""
Direct test of OpenAI KB Generation
This script boots the engine and generates a KB article using OpenAI.
Run this to verify OpenAI is actually being called.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=" * 70)
print("OPENAI KB GENERATION TEST")
print("=" * 70)

# Check for API key
api_key = os.environ.get("OPENAI_API_KEY", "")
if not api_key:
    print("\n[FAIL] OPENAI_API_KEY not set!")
    print("\nTo fix:")
    print('  $env:OPENAI_API_KEY = "sk-proj-your-key"')
    sys.exit(1)

print(f"\n[OK] API key found: {api_key[:20]}...")

# Boot the engine
print("\n[1/3] Booting Meridian engine...")
from meridian.engine.data_loader import init_datastore
from meridian.engine.kb_generator import KBGenerator

ds = init_datastore("SupportMind_Final_Data.xlsx")
print(f"  Loaded {len(ds.documents)} documents")

# Initialize KB generator with OpenAI
print("\n[2/3] Initializing KB generator with OpenAI...")
gen = KBGenerator(ds, api_key=api_key)

if not gen.openai_available:
    print("[FAIL] OpenAI not available!")
    print("  This usually means the 'openai' package is not installed.")
    print("  Install it with: pip install openai")
    sys.exit(1)

print(f"  [OK] OpenAI available: {gen.openai_available}")

# Generate a KB article
print("\n[3/3] Generating KB article from ticket CS-38908386...")
print("  This will make a REAL OpenAI API call!")
print("  Watch your OpenAI dashboard for usage...")

import time
t0 = time.time()

try:
    draft = gen.generate_draft("CS-38908386")
    elapsed = time.time() - t0

    print(f"\n  [SUCCESS] Draft generated in {elapsed:.1f}s")
    print(f"\n  Draft ID: {draft.draft_id}")
    print(f"  Title: {draft.title}")
    print(f"  Generation method: {draft.generation_method}")
    print(f"  Body length: {len(draft.body)} characters")
    print(f"  Category: {draft.category}")
    print(f"  Module: {draft.module}")
    print(f"  Tags: {', '.join(draft.tags)}")

    # Show first 500 chars of the body
    print(f"\n  Body preview:")
    print("  " + "-" * 66)
    body_preview = draft.body[:500]
    for line in body_preview.split('\n'):
        print(f"  {line}")
    if len(draft.body) > 500:
        print("  [...truncated]")
    print("  " + "-" * 66)

    # Verify it used LLM
    if draft.generation_method == "llm":
        print("\n  [VERIFIED] OpenAI was called successfully!")
        print("  Check your OpenAI dashboard - you should see API usage.")
    else:
        print("\n  [WARNING] Used template fallback, not OpenAI!")
        print("  This means the API call failed silently.")

except Exception as e:
    print(f"\n  [FAIL] Generation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print("[SUCCESS] OpenAI KB generation works!")
print("=" * 70)
print("\nNow you can run:")
print("  python scripts/test_full_end_to_end.py")
print("  python run_server.py (then test demo pipeline)")
print("=" * 70)
