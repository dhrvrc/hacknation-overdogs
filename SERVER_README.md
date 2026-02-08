# Meridian API Server

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

On Windows with system-wide Python:
```bash
pip install -r requirements.txt --break-system-packages
```

### 2. Start the Server

```bash
python run_server.py
```

Server will start on http://localhost:8000

### 3. Run Smoke Tests

In a separate terminal:
```bash
python scripts/smoke_api.py
```

### 4. Test with curl

```bash
# Health check
curl http://localhost:8000/health

# Query endpoint
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"advance property date\"}"

# Dashboard stats
curl http://localhost:8000/api/dashboard/stats
```

## Graceful Degradation

The server is designed to work even when the intelligence engine (Person 1's work) is not available:

- **Engine Available**: Returns real data from the retrieval system
- **Engine Not Available**: Returns stub JSON responses matching the exact same schema

This allows Person 2 (frontend) and Person 3 (API integration) to work in parallel with Person 1.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check and engine status |
| `/api/query` | POST | Main copilot query endpoint |
| `/api/provenance/{doc_id}` | GET | Get provenance chain for a document |
| `/api/dashboard/stats` | GET | Aggregate dashboard statistics |
| `/api/conversations/{ticket_number}` | GET | Get conversation transcript |
| `/api/kb/drafts` | GET | List pending KB drafts |
| `/api/kb/approve/{draft_id}` | POST | Approve a KB draft |
| `/api/kb/reject/{draft_id}` | POST | Reject a KB draft |
| `/api/eval/run` | POST | Run full evaluation harness |
| `/api/gap/emerging` | GET | Get emerging issues |

## CORS

CORS is enabled for all origins to support the React frontend running on localhost:5173.

## QA Scoring

The QA Scorer (`/api/qa/score`) evaluates support interactions using a production-grade rubric:

- **20 parameters**: 10 for Interaction QA, 10 for Case QA
- **Red flags**: 4 autozero triggers for compliance violations
- **Scoring**: 70% Interaction + 30% Case (if both available)

### Using Claude API (Recommended)

Set the `ANTHROPIC_API_KEY` environment variable:

```bash
export ANTHROPIC_API_KEY="your-key-here"
python run_server.py
```

The scorer will use Claude Sonnet 4 to evaluate tickets with nuanced scoring.

### Template Fallback

If no API key is set, the scorer uses a template:
- All parameters scored "Yes" (conservative baseline)
- Overall score: 85-90%
- QA Recommendation: "Keep doing"

### Testing QA Scorer

```bash
# Test with template fallback
python scripts/test_qa_scorer.py

# Test with API (requires ANTHROPIC_API_KEY)
export ANTHROPIC_API_KEY="your-key"
python scripts/test_qa_scorer.py
```

### Example Request

```powershell
# PowerShell using Invoke-RestMethod
Invoke-RestMethod -Uri 'http://localhost:8000/api/qa/score' -Method POST -ContentType 'application/json' -Body '{"ticket_number": "CS-38908386"}'

# PowerShell using curl.exe
curl.exe -X POST http://localhost:8000/api/qa/score -H 'Content-Type: application/json' -d '{\"ticket_number\": \"CS-38908386\"}'
```

## Synthetic Tickets (Demo Data)

The server includes 6 pre-written synthetic tickets about **Report Export Failure** - a novel issue type that doesn't exist in the main dataset. This is used for the live demo to prove the system can learn from new problems in real-time.

### Ticket Details

All 6 tickets:
- Category: "Report Export Failure"
- Module: "Reporting / Exports"
- Tier distribution: 2 × Tier 1, 2 × Tier 2, 2 × Tier 3
- Each has a matching conversation transcript

### Testing Synthetic Data

```bash
# Validate synthetic tickets structure
python scripts/test_synthetic_tickets.py

# Or run validation directly
python -m meridian.server.synthetic_tickets
```

Expected output:
```
✅ All validation checks PASSED
📊 Summary:
  Tickets: 6
  Conversations: 6
  Demo Questions: 3
  Tier Distribution: {1: 2, 2: 2, 3: 2}
```

## Demo Pipeline (Live Learning Loop)

The Demo Pipeline orchestrates the most important part of the presentation: proving that Meridian can learn from novel problems in real-time.

### The 6-Step Demo Flow

1. **Reset** - Clean slate, remove any previous demo data
2. **Inject** - Add 6 synthetic tickets about "Report Export Failure"
3. **Detect Gaps** - System finds no existing KB coverage (all similarity < 0.25)
4. **Detect Emerging** - Clusters 6 tickets as a new pattern
5. **Generate Draft** - Creates KB article from ticket data
6. **Approve & Index** - Article becomes retrievable
7. **Verify** - Copilot now answers questions about Report Export Failure

### Running the Demo

```bash
# Full pipeline (automated test)
uv run scripts/test_demo_pipeline.py
```

### Manual Step-by-Step (PowerShell)

```powershell
# Step 0: Reset
Invoke-RestMethod -Uri 'http://localhost:8000/api/demo/reset' -Method POST

# Step 1: Inject tickets
Invoke-RestMethod -Uri 'http://localhost:8000/api/demo/inject' -Method POST

# Step 2: Detect gaps
Invoke-RestMethod -Uri 'http://localhost:8000/api/demo/detect-gaps' -Method POST

# Step 3: Detect emerging issue
Invoke-RestMethod -Uri 'http://localhost:8000/api/demo/detect-emerging' -Method POST

# Step 4: Generate KB draft
Invoke-RestMethod -Uri 'http://localhost:8000/api/demo/generate-draft' -Method POST

# Step 5: Approve and index
Invoke-RestMethod -Uri 'http://localhost:8000/api/demo/approve' -Method POST

# Step 6: Verify retrieval
Invoke-RestMethod -Uri 'http://localhost:8000/api/demo/verify' -Method POST

# Check current state
Invoke-RestMethod -Uri 'http://localhost:8000/api/demo/state' -Method GET
```

### What Success Looks Like

After running the full pipeline:
- ✅ 6 tickets injected (phase: "tickets_injected")
- ✅ 6 gaps detected with similarity < 0.25
- ✅ 1 emerging issue: "Report Export Failure" with 6 tickets
- ✅ KB draft generated from CS-DEMO-001
- ✅ Article approved and indexed (phase: "draft_approved")
- ✅ New article found in 2-3/3 verification queries (phase: "demo_complete")

Query the copilot:
```powershell
$body = '{"query": "blank PDF when exporting Rent Roll report"}'
Invoke-RestMethod -Uri 'http://localhost:8000/api/query' -Method POST -ContentType 'application/json' -Body $body
```

The newly created KB article should appear in the results!
