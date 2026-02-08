// ============================================================
// Meridian — Build CopilotEvents from real API responses
//
// Pure functions that transform backend API responses into
// CopilotEvent arrays consumable by CopilotPanel and its
// child components. No side effects, no API calls.
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CopilotEvent } from "@/mock/copilotScenarios";

let _eventCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++_eventCounter}-${Date.now()}`;
}

// ── Build events from POST /api/query response ──────────────

/**
 * Transform a real QueryResponse into a sequence of CopilotEvents:
 *   thinking → classify_intent tool_call → search_kb tool_call →
 *   search_tickets tool_call → kb_result → ticket_result → suggestion
 */
export function buildQueryEvents(
  queryText: string,
  response: any
): CopilotEvent[] {
  const events: CopilotEvent[] = [];
  const predicted = response.predicted_type ?? "KB";
  const scores = response.confidence_scores ?? {};
  const primary = response.primary_results ?? [];
  const secondary = response.secondary_results ?? {};

  const topScore = primary.length > 0 ? primary[0].score : 0;
  const topTitle = primary.length > 0 ? primary[0].title : "No results";

  // 1. Thinking event
  events.push({
    id: nextId("think"),
    type: "thinking",
    delayMs: 400,
    data: {
      steps: [
        `Analyzing query: "${queryText.slice(0, 60)}..."`,
        `Intent classified: **${predicted}** (confidence ${Math.round((scores[predicted] ?? 0) * 100)}%)`,
        `Found ${primary.length} primary results, searching secondary partitions...`,
        `Top match: **${topTitle}** (${Math.round(topScore * 100)}% similarity)`,
      ],
    },
  });

  // 2. classify_intent tool call
  events.push({
    id: nextId("tool-classify"),
    type: "tool_call",
    delayMs: 600,
    data: {
      tool: "classify_intent",
      status: "complete",
      input: { query: queryText },
      output: {
        predicted_type: predicted,
        confidence: scores[predicted] ?? 0,
        all_scores: scores,
      },
    },
  });

  // 3. search_kb tool call
  const kbResults =
    predicted === "KB" ? primary : secondary["KB"] ?? [];
  events.push({
    id: nextId("tool-kb"),
    type: "tool_call",
    delayMs: 500,
    data: {
      tool: "search_kb",
      status: "complete",
      input: { query: queryText, top_k: 5 },
      output: {
        results_count: kbResults.length,
        top_match:
          kbResults.length > 0
            ? `${kbResults[0].doc_id} (${Math.round(kbResults[0].score * 100)}% match)`
            : "No results above threshold",
      },
    },
  });

  // 4. search_tickets tool call
  const ticketResults =
    predicted === "TICKET" ? primary : secondary["TICKET"] ?? [];
  events.push({
    id: nextId("tool-tickets"),
    type: "tool_call",
    delayMs: 400,
    data: {
      tool: "search_tickets",
      status: "complete",
      input: { query: queryText, top_k: 3 },
      output: {
        results_count: ticketResults.length,
        top_match:
          ticketResults.length > 0
            ? `${ticketResults[0].doc_id} (${Math.round(ticketResults[0].score * 100)}% match)`
            : "No similar tickets found",
      },
    },
  });

  // 5. kb_result / primary results event
  if (primary.length > 0) {
    events.push({
      id: nextId("results"),
      type: predicted === "TICKET" ? "ticket_result" : "kb_result",
      delayMs: 400,
      data: { results: primary },
    });
  }

  // 6. Secondary results (other types)
  for (const [docType, items] of Object.entries(secondary)) {
    if ((items as any[]).length > 0) {
      events.push({
        id: nextId(`sec-${docType}`),
        type: docType === "TICKET" ? "ticket_result" : "kb_result",
        delayMs: 300,
        data: { results: items },
      });
    }
  }

  // 7. Suggestion built from top result
  const suggestion = buildSuggestion(response);
  if (suggestion) {
    events.push({
      id: nextId("suggest"),
      type: "suggestion",
      delayMs: 500,
      data: suggestion,
    });
  }

  return events;
}

// ── Build suggestion from query response ─────────────────────

/**
 * Extract the top result and build a suggestion card.
 * - SCRIPT: suggest running the script with its inputs
 * - KB: summarize the article's resolution
 * - TICKET: reference the past resolution
 */
function buildSuggestion(
  response: any
): { title: string; description: string; actions: string[]; replyText?: string } | null {
  const primary = response.primary_results ?? [];
  if (primary.length === 0) return null;

  const top = primary[0];
  const predicted = response.predicted_type ?? "KB";

  if (predicted === "SCRIPT") {
    const inputs = top.metadata?.inputs ?? "";
    const module = top.metadata?.module ?? "";
    return {
      title: "Recommended Action",
      description: `Found matching backend script: ${top.doc_id}. ${top.metadata?.purpose ?? ""}`,
      actions: [
        `Verify issue matches: ${module}`,
        inputs ? `Collect required inputs: ${inputs}` : "Verify script prerequisites",
        `Escalate to Tier 3 for ${top.doc_id} execution`,
        "Confirm resolution with customer after script runs",
      ],
      replyText: `I can see this is a known issue. I found a backend fix script (${top.doc_id}) that should resolve this. I'll need to collect a few details and escalate to our Tier 3 team to run it. Let me get started on that right now.`,
    };
  }

  if (predicted === "KB") {
    const sourceType = top.metadata?.source_type ?? "";
    const label = sourceType === "SYNTH_FROM_TICKET"
      ? "learned from a previous ticket"
      : "from the knowledge base";
    return {
      title: "Knowledge Article Found",
      description: `Found matching article ${label}: ${top.doc_id} — "${top.title}"`,
      actions: [
        `Review article: ${top.title}`,
        "Walk customer through the resolution steps",
        "Confirm resolution with customer",
      ],
    };
  }

  // TICKET
  return {
    title: "Similar Ticket Found",
    description: `Found a previously resolved ticket: ${top.doc_id} — "${top.title}"`,
    actions: [
      "Review the past resolution approach",
      "Adapt the resolution to the current customer's situation",
      "Document any differences for future reference",
    ],
  };
}

// ── Build events from gap check response ─────────────────────

/**
 * Transform a GapCheckResponse into a gap_detection CopilotEvent.
 */
export function buildGapEvents(gapResult: any): CopilotEvent[] {
  if (!gapResult?.is_gap) return [];

  return [
    {
      id: nextId("gap"),
      type: "gap_detection",
      delayMs: 600,
      data: {
        topic: gapResult.category || "Unknown",
        module: gapResult.module || "Unknown",
        description: `Knowledge gap detected: no KB articles adequately cover this issue (best match similarity: ${Math.round((gapResult.resolution_similarity ?? 0) * 100)}%, below threshold). The resolution of this case will be captured for the learning pipeline.`,
      },
    },
  ];
}

// ── Build events from KB generate response ───────────────────

/**
 * Transform a KBGenerateResponse into a learn CopilotEvent.
 */
export function buildLearnEvents(draft: any): CopilotEvent[] {
  if (!draft?.draft_id) return [];

  return [
    {
      id: nextId("learn"),
      type: "learn",
      delayMs: 800,
      data: {
        draftTitle: draft.title,
        draftId: draft.draft_id,
        sourceTicket: draft.source_ticket,
        detectedGap: `No existing KB articles cover ${draft.category ?? "this issue"} in ${draft.module ?? "this module"}.`,
        summary: draft.body?.slice(0, 500) ?? "",
      },
    },
  ];
}
