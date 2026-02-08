"""
Test OpenAI API Connection
Quick script to verify OpenAI integration is working correctly.
"""
import os
import sys

print("=" * 70)
print("OPENAI CONNECTION TEST")
print("=" * 70)

# Step 1: Check if API key is set
print("\n[1/4] Checking for OPENAI_API_KEY environment variable...")
api_key = os.environ.get("OPENAI_API_KEY", "")

if not api_key:
    print("  [FAIL] OPENAI_API_KEY not set!")
    print("\n  To fix this, run:")
    print('  $env:OPENAI_API_KEY = "sk-proj-your-key-here"')
    sys.exit(1)
else:
    print(f"  [OK] API key found (length: {len(api_key)} chars)")
    print(f"  [OK] Key starts with: {api_key[:20]}...")

# Step 2: Check if openai package is installed
print("\n[2/4] Checking if openai package is installed...")
try:
    import openai
    print(f"  [OK] openai package version: {openai.__version__}")
except ImportError as e:
    print(f"  [FAIL] openai package not installed: {e}")
    print("\n  To fix this, run:")
    print("  pip install openai")
    sys.exit(1)

# Step 3: Test OpenAI client initialization
print("\n[3/4] Initializing OpenAI client...")
try:
    client = openai.OpenAI(api_key=api_key)
    print("  [OK] Client initialized successfully")
except Exception as e:
    print(f"  [FAIL] Failed to initialize client: {type(e).__name__}: {e}")
    sys.exit(1)

# Step 4: Make a test API call
print("\n[4/4] Making test API call (this will use ~100 tokens)...")
try:
    response = client.chat.completions.create(
        model="gpt-4",
        max_tokens=50,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say 'OpenAI connection successful!' and nothing else."}
        ]
    )

    result = response.choices[0].message.content
    print(f"  [OK] API call successful!")
    print(f"  [OK] Response: {result}")
    print(f"  [OK] Tokens used: {response.usage.total_tokens}")

except Exception as e:
    print(f"  [FAIL] API call failed: {type(e).__name__}: {e}")
    print("\n  Common issues:")
    print("  - Invalid API key")
    print("  - API key doesn't have GPT-4 access")
    print("  - Billing not set up on OpenAI account")
    print("  - Rate limit exceeded")
    sys.exit(1)

print("\n" + "=" * 70)
print("[SUCCESS] OpenAI integration is working correctly!")
print("=" * 70)
print("\nYou can now run:")
print("  python scripts/test_full_end_to_end.py")
print("  python -m meridian.engine.kb_generator")
print("  python run_server.py  (then test demo pipeline)")
print("=" * 70)
