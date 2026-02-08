// ============================================================
// Meridian — API Wrapper
// Flip USE_MOCK to false when Person 3's FastAPI is ready.
// ============================================================

const USE_MOCK = false;
const API_BASE = "http://localhost:8000";

import {
  mockQueryResponse,
  mockProvenance,
  mockEmptyProvenance,
  mockDashboard,
  mockConversations,
  mockQAScore,
  mockApproveResponse,
  mockRejectResponse,
} from "@/mock/mockData";

/** POST /api/query — main copilot search */
export async function queryEngine(queryText: string) {
  if (USE_MOCK) return mockQueryResponse;
  const res = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: queryText }),
  });
  return res.json();
}

/** GET /api/provenance/{doc_id} — full evidence chain */
export async function getProvenance(docId: string) {
  if (USE_MOCK) {
    if (docId === "KB-SYN-0001") return mockProvenance;
    return mockEmptyProvenance;
  }
  const res = await fetch(`${API_BASE}/api/provenance/${docId}`);
  return res.json();
}

/** GET /api/dashboard/stats — knowledge health + metrics */
export async function getDashboard() {
  if (USE_MOCK) return mockDashboard;
  const res = await fetch(`${API_BASE}/api/dashboard/stats`);
  return res.json();
}

/** GET /api/conversations/{ticket_number} — transcript */
export async function getConversation(ticketNumber: string) {
  if (USE_MOCK) {
    return mockConversations[ticketNumber] ?? mockConversations["CS-38908386"];
  }
  const res = await fetch(`${API_BASE}/api/conversations/${ticketNumber}`);
  return res.json();
}

/** POST /api/qa/score — QA rubric evaluation */
export async function scoreQA(
  ticketNumber: string,
  transcript?: string,
  ticketData?: string
) {
  if (USE_MOCK) return mockQAScore;
  const res = await fetch(`${API_BASE}/api/qa/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticket_number: ticketNumber,
      transcript: transcript ?? "",
      ticket_data: ticketData ?? "",
    }),
  });
  return res.json();
}

/** POST /api/kb/approve/{draft_id} */
export async function approveDraft(draftId: string) {
  if (USE_MOCK) return mockApproveResponse;
  const res = await fetch(`${API_BASE}/api/kb/approve/${draftId}`, {
    method: "POST",
  });
  return res.json();
}

/** POST /api/kb/reject/{draft_id} */
export async function rejectDraft(draftId: string) {
  if (USE_MOCK) return mockRejectResponse;
  const res = await fetch(`${API_BASE}/api/kb/reject/${draftId}`, {
    method: "POST",
  });
  return res.json();
}

/** POST /api/eval/run — trigger full evaluation harness */
export async function runEvaluation() {
  const res = await fetch(`${API_BASE}/api/eval/run`, { method: "POST" });
  return res.json();
}

/** GET /api/tickets/sample — sample ticket list for QA dropdown */
export async function getSampleTickets() {
  const res = await fetch(`${API_BASE}/api/tickets/sample`);
  return res.json();
}

// ── Demo pipeline endpoints ──────────────────────────────────

/** GET /api/demo/state */
export async function demoGetState() {
  const res = await fetch(`${API_BASE}/api/demo/state`);
  return res.json();
}

/** POST /api/demo/reset */
export async function demoReset() {
  const res = await fetch(`${API_BASE}/api/demo/reset`, { method: "POST" });
  return res.json();
}

/** POST /api/demo/inject */
export async function demoInject() {
  const res = await fetch(`${API_BASE}/api/demo/inject`, { method: "POST" });
  return res.json();
}

/** POST /api/demo/detect-gaps */
export async function demoDetectGaps() {
  const res = await fetch(`${API_BASE}/api/demo/detect-gaps`, { method: "POST" });
  return res.json();
}

/** POST /api/demo/detect-emerging */
export async function demoDetectEmerging() {
  const res = await fetch(`${API_BASE}/api/demo/detect-emerging`, { method: "POST" });
  return res.json();
}

/** POST /api/demo/generate-draft */
export async function demoGenerateDraft() {
  const res = await fetch(`${API_BASE}/api/demo/generate-draft`, { method: "POST" });
  return res.json();
}

/** POST /api/demo/approve */
export async function demoApprove() {
  const res = await fetch(`${API_BASE}/api/demo/approve`, { method: "POST" });
  return res.json();
}

/** POST /api/demo/verify */
export async function demoVerify() {
  const res = await fetch(`${API_BASE}/api/demo/verify`, { method: "POST" });
  return res.json();
}

// ── Copilot endpoints ────────────────────────────────────────

/** POST /api/gap/check — check a ticket for knowledge gaps */
export async function checkGap(ticketNumber: string) {
  const res = await fetch(`${API_BASE}/api/gap/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket_number: ticketNumber }),
  });
  return res.json();
}

/** POST /api/kb/generate — generate a KB draft from a resolved ticket */
export async function generateKBDraft(ticketNumber: string) {
  const res = await fetch(`${API_BASE}/api/kb/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket_number: ticketNumber }),
  });
  return res.json();
}
