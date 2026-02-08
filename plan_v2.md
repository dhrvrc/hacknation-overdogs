## What You Need to Build

### 1. The Brain (Retrieval & Intelligence Engine)

This is the core backend. Everything else is a skin on top of this.

- **Vector store** — Embed all 3,207 KB articles + 714 scripts into a searchable index
- **Answer router** — Classifier that takes an incoming question and decides: is this a KB answer, a script, or needs escalation? (maps to Answer_Type in the ground truth)
- **Retrieval pipeline** — RAG that pulls the best matching resources, ranked, with similarity scores
- **Provenance resolver** — For every retrieved result, trace it back through KB_Lineage to its source ticket, conversation, and script. This is what makes you "OpenEvidence for support" — every answer comes with a citation chain

### 2. The Learning Loop (Self-Updating Knowledge Engine)

This is what wins you the hackathon. It's the piece most teams will skip or fake.

- **Gap detector** — When a new ticket resolves, compare its resolution against the existing KB corpus. If nothing matches above a similarity threshold → flag as a knowledge gap
- **KB article generator** — LLM takes the ticket + transcript + script and drafts a new KB article in the same format as existing ones
- **Lineage tracker** — Automatically records: this new KB article was created from ticket X, conversation Y, referencing script Z (mirrors KB_Lineage schema)
- **Approval workflow** — Simple queue: reviewer sees draft, reads provenance, clicks approve or reject. Approved articles get embedded and enter the vector store. The retrieval engine is now smarter.
- **Emerging issue detector** — Cluster unmatched tickets. If 3+ similar gaps appear in a window, flag it: "Emerging issue: 5 tickets about [X] with no KB coverage." This is your synthetic demo moment.

### 3. The Copilot (Agent-Facing Interface)

This is what judges *see*. It needs to feel like a real product.

- **Conversation panel** — Left side. Shows the live transcript (simulated: you stream it in or paste it). This is the "Cluely" side.
- **Recommendation panel** — Right side. Updates as the conversation progresses. Shows:
  - Classification: what type of issue this is, what tier, what category
  - Best matching KB article(s) with provenance badges
  - Best matching script with placeholder inputs highlighted
  - Similar resolved tickets with resolution summaries
- **QA nudge bar** — Subtle inline flags: "Agent hasn't confirmed the issue yet," "Required step not yet performed," "Consider asking for error message text." Powered by the QA rubric comparing the live transcript against expected steps.
- **Provenance drill-through** — Click any recommendation and see its full chain: "This KB article was created on [date] from ticket CS-XXXXX, based on conversation CONV-XXXXX, referencing SCRIPT-XXXX"

### 4. The Dashboard (Operations & Governance View)

This is the "enterprise readiness" layer. Doesn't need to be deep — but needs to exist.

- **Knowledge health view** — How many KB articles, how many sourced from tickets vs. seed, coverage by category, articles with no recent retrievals (stale)
- **Learning pipeline view** — Pending drafts awaiting review, recently approved/rejected, approval rate (mirrors Learning_Events: 134 approved, 27 rejected)
- **Emerging issues feed** — The clustered gaps from the detector. "3 new tickets about Report Export Failure — no KB coverage — draft proposed"
- **QA scoring view** — Pick a transcript + ticket pair, run it through the QA rubric, get the structured JSON scorecard. Show one or two scored examples. Agent-level trends if you have time.

### 5. The Eval Harness (Your Proof It Works)

This is what separates "cool demo" from "credible system." Judges will ask "how do you know it's accurate?"

- **Retrieval benchmark** — Run all 1,000 ground-truth questions through your pipeline. Measure hit@1, hit@3, hit@5 against Target_ID. Report accuracy by Answer_Type (SCRIPT vs KB vs TICKET_RESOLUTION) and by difficulty (Easy/Medium/Hard)
- **Before/after learning loop** — Remove the 161 synthetic KB articles from the corpus. Run the questions. Re-add them (simulating the learning loop). Show retrieval accuracy improvement. This is your "the system gets smarter" proof point.
- **QA scoring example** — At least 2-3 transcript+ticket pairs scored with the full rubric, showing the structured JSON output

### 6. The Demo Script & Deck

Don't underestimate this. A mediocre product with a great demo beats a great product with a confused walkthrough.

- **Narrative arc** — Problem → Architecture → Live Demo → Metrics → Enterprise Vision
- **The live walkthrough** — The 5-step flow: agent gets question → copilot answers with evidence → case resolves → gap detected → KB drafted → approved → copilot now retrieves it
- **One synthetic "new issue" scenario** — Create 5-8 tickets about a novel problem, feed them live, show the emerging issue detector light up
- **The numbers slide** — Retrieval accuracy, before/after learning loop improvement, QA scoring examples

---

## How Three People Split This

| Person | Owns | Builds |
|---|---|---|
| **Person 1: Engine** | The Brain + Learning Loop | Vector store, embeddings, retrieval pipeline, gap detection, KB generation, lineage tracking, eval harness |
| **Person 2: Platform** | Copilot + Dashboard UI | React/Streamlit app, conversation panel, recommendation panel, provenance display, dashboard views, QA scoring UI |
| **Person 3: Integration + Demo** | Glue + Presentation | API layer connecting engine to UI, approval workflow, emerging issue detector, synthetic demo data, demo script, deck, dry runs |

Person 3 is the most flexible role — they help wherever the bottleneck is and own the final demo quality. This role is critical because hackathons are won in the presentation.

---