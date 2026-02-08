// ============================================================
// Meridian — Copilot Simulation Scenarios
// Each scenario defines a full conversation flow with copilot
// events that trigger at specific message indices.
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  mockQueryResponse,
  mockKBQueryResponse,
} from "./mockData";

// ── Types ────────────────────────────────────────────────────

export type CopilotEventType =
  | "thinking"
  | "tool_call"
  | "kb_result"
  | "ticket_result"
  | "suggestion"
  | "gap_detection"
  | "learn";

export interface CopilotEvent {
  id: string;
  type: CopilotEventType;
  /** Delay in ms before this event appears after the previous one */
  delayMs: number;
  data: any;
}

export interface ChatMessage {
  id: string;
  sender: "customer" | "agent";
  name: string;
  text: string;
  timestamp: string;
}

export interface ScenarioMessage {
  sender: "customer" | "agent_auto";
  name: string;
  text: string;
  /** Delay in ms before this message appears */
  delayMs: number;
}

export interface CopilotScenario {
  id: string;
  title: string;
  channel: "chat" | "video" | "phone";
  customer: { name: string; company: string };
  agent: { name: string };
  /** Messages arrive sequentially with delays */
  messages: ScenarioMessage[];
  /** Copilot events triggered after specific message indices */
  copilotTriggers: Array<{
    afterMessageIndex: number;
    events: CopilotEvent[];
  }>;
  /** Suggested replies that appear for the agent at certain points */
  suggestedReplies: Array<{
    afterMessageIndex: number;
    replies: string[];
  }>;
  hasKBMatch: boolean;
}

// ── Scenario 1: Date Advance (KB + Script match) ────────────

const scenario1: CopilotScenario = {
  id: "date-advance",
  title: "Date Advance Failure (Chat)",
  channel: "chat",
  customer: { name: "Morgan Johnson", company: "Oak & Ivy Management" },
  agent: { name: "You" },
  messages: [
    {
      sender: "customer",
      name: "Morgan Johnson",
      text: "Hello — this is Morgan Johnson from Oak & Ivy Management. We're trying to advance the property date for Heritage Point (Property ID 4072) but the process keeps failing.",
      delayMs: 1500,
    },
    {
      sender: "customer",
      name: "Morgan Johnson",
      text: "When I go to Settings → Property → Date Advance and click \"Advance,\" it spins for a moment and then shows a generic \"Unable to complete\" error. No error code, just that message.",
      delayMs: 4000,
    },
    {
      sender: "customer",
      name: "Morgan Johnson",
      text: "I don't think there are any open batches, but I'm not sure how to check that on our end.",
      delayMs: 8000,
    },
    {
      sender: "customer",
      name: "Morgan Johnson",
      text: "Oh, okay. Is that something you can fix?",
      delayMs: 18000,
    },
    {
      sender: "customer",
      name: "Morgan Johnson",
      text: "How long will that take?",
      delayMs: 25000,
    },
    {
      sender: "customer",
      name: "Morgan Johnson",
      text: "Yes, this is fine. Thank you!",
      delayMs: 30000,
    },
  ],
  copilotTriggers: [
    {
      afterMessageIndex: 0,
      events: [
        {
          id: "t1-think-1",
          type: "thinking",
          delayMs: 400,
          data: {
            steps: [
              "New issue received from Morgan Johnson at Oak & Ivy Management.",
              "Detecting intent... Keywords: \"advance property date\", \"failing\", \"Heritage Point\", \"Property ID 4072\".",
              "Intent classified: **Date Advance Failure** (Module: Accounting / Date Advance).",
              "Searching knowledge base and historical tickets for similar issues...",
            ],
          },
        },
        {
          id: "t1-tool-classify",
          type: "tool_call",
          delayMs: 800,
          data: {
            tool: "classify_intent",
            status: "complete",
            input: { query: "advance property date failing Heritage Point" },
            output: { intent: "Date Advance Failure", module: "Accounting / Date Advance", confidence: 0.89 },
          },
        },
        {
          id: "t1-tool-kb",
          type: "tool_call",
          delayMs: 600,
          data: {
            tool: "search_kb",
            status: "complete",
            input: { query: "date advance failure property", top_k: 3 },
            output: { results_count: 3, top_match: "KB-SYN-0001 (61% match)" },
          },
        },
        {
          id: "t1-tool-tickets",
          type: "tool_call",
          delayMs: 500,
          data: {
            tool: "search_tickets",
            status: "complete",
            input: { query: "date advance failure", top_k: 3 },
            output: { results_count: 1, top_match: "CS-38908386 (55% match)" },
          },
        },
      ],
    },
    {
      afterMessageIndex: 1,
      events: [
        {
          id: "t1-think-2",
          type: "thinking",
          delayMs: 300,
          data: {
            steps: [
              "Customer confirmed symptom: Settings → Property → Date Advance → \"Unable to complete\" error.",
              "This matches KB-SYN-0001 exactly: date advance fails due to invalid backend voucher reference.",
              "Found 3 relevant scripts and 1 matching KB article. Surfacing results...",
            ],
          },
        },
        {
          id: "t1-kb-1",
          type: "kb_result",
          delayMs: 400,
          data: {
            results: [
              mockQueryResponse.primary_results[0],
              ...mockQueryResponse.secondary_results.KB,
            ],
          },
        },
        {
          id: "t1-ticket-1",
          type: "ticket_result",
          delayMs: 300,
          data: {
            results: mockQueryResponse.secondary_results.TICKET,
          },
        },
        {
          id: "t1-suggest-1",
          type: "suggestion",
          delayMs: 400,
          data: {
            title: "Recommended Action",
            description: "This is a known backend data issue. Ask the customer about open batches, then escalate to Tier 3 for SCRIPT-0293 execution.",
            actions: [
              "Ask customer to confirm no open batches or pending transactions",
              "Check backend for invalid voucher reference in HAP request table",
              "Escalate to Tier 3 with SCRIPT-0293 for data fix",
            ],
            replyText: "I'm sorry to hear that, Morgan. Let me pull up Heritage Point and check a few things on the backend. Can you confirm — are there any open batches or pending transactions for this property?",
          },
        },
      ],
    },
    {
      afterMessageIndex: 2,
      events: [
        {
          id: "t1-think-3",
          type: "thinking",
          delayMs: 300,
          data: {
            steps: [
              "Customer unsure about open batches. Checking backend directly...",
              "Based on KB-SYN-0001 Resolution Steps: need to verify current property date and check for invalid voucher reference.",
              "Preparing response with diagnostic findings.",
            ],
          },
        },
        {
          id: "t1-suggest-2",
          type: "suggestion",
          delayMs: 500,
          data: {
            title: "Backend Check Complete",
            description: "Inform the customer about the invalid voucher reference found in the HAP request table. Recommend Tier 3 escalation.",
            actions: [
              "Report findings: invalid voucher reference in HAP request table",
              "Initiate Tier 3 escalation for SCRIPT-0293 execution",
            ],
            replyText: "No worries, I can check from here. I can see the issue — there's an invalid voucher reference in the HAP request table that's blocking the date advance. This is a known issue that requires a backend data fix. I'll need to escalate this to our Tier 3 team, but I can initiate that right now.",
          },
        },
      ],
    },
  ],
  suggestedReplies: [
    {
      afterMessageIndex: 0,
      replies: [
        "I'm sorry to hear that, Morgan. Let me pull up Heritage Point right away.",
        "Thank you for reaching out. Can you describe the exact error you're seeing?",
      ],
    },
    {
      afterMessageIndex: 2,
      replies: [
        "No worries, I can check from here. Give me just a moment.",
        "Let me verify that on the backend for you.",
      ],
    },
    {
      afterMessageIndex: 3,
      replies: [
        "I'll escalate this to Tier 3 right now. They'll run a backend fix script and it should be resolved within a few hours.",
        "Yes, I can initiate the fix process. Let me create the escalation ticket.",
      ],
    },
    {
      afterMessageIndex: 4,
      replies: [
        "Typically within a few hours. I'll follow up with you once it's done.",
        "Should be resolved today. I'll make sure to keep you updated.",
      ],
    },
  ],
  hasKBMatch: true,
};

// ── Scenario 2: HAP Voucher Sync (KB match) ─────────────────

const scenario2: CopilotScenario = {
  id: "hap-voucher",
  title: "HAP Voucher Sync Error (Phone)",
  channel: "phone",
  customer: { name: "Sarah Chen", company: "Riverside Properties" },
  agent: { name: "You" },
  messages: [
    {
      sender: "customer",
      name: "Sarah Chen",
      text: "Hi, this is Sarah Chen from Riverside Properties. I'm having a serious issue with our HAP voucher processing. The amounts are completely wrong after the sync.",
      delayMs: 1500,
    },
    {
      sender: "customer",
      name: "Sarah Chen",
      text: "Property ID 2891. We ran the batch yesterday and now the amounts in the system don't match what we submitted at all.",
      delayMs: 5000,
    },
    {
      sender: "customer",
      name: "Sarah Chen",
      text: "We have a HUD deadline coming up and we really need this resolved quickly.",
      delayMs: 9000,
    },
    {
      sender: "customer",
      name: "Sarah Chen",
      text: "Can you fix it?",
      delayMs: 15000,
    },
    {
      sender: "customer",
      name: "Sarah Chen",
      text: "Okay, please go ahead.",
      delayMs: 20000,
    },
  ],
  copilotTriggers: [
    {
      afterMessageIndex: 0,
      events: [
        {
          id: "t2-think-1",
          type: "thinking",
          delayMs: 400,
          data: {
            steps: [
              "New issue from Sarah Chen at Riverside Properties.",
              "Detecting intent... Keywords: \"HAP voucher processing\", \"amounts wrong\", \"sync\".",
              "Intent classified: **HAP Voucher Sync Error** (Module: Affordable / HAP).",
              "Searching knowledge base for HAP voucher sync issues...",
            ],
          },
        },
        {
          id: "t2-tool-classify",
          type: "tool_call",
          delayMs: 700,
          data: {
            tool: "classify_intent",
            status: "complete",
            input: { query: "HAP voucher amounts wrong after sync" },
            output: { intent: "HAP Voucher Sync Error", module: "Affordable / HAP", confidence: 0.83 },
          },
        },
        {
          id: "t2-tool-kb",
          type: "tool_call",
          delayMs: 600,
          data: {
            tool: "search_kb",
            status: "complete",
            input: { query: "HAP voucher sync error amounts mismatch", top_k: 3 },
            output: { results_count: 3, top_match: "KB-SYN-0042 (58% match)" },
          },
        },
      ],
    },
    {
      afterMessageIndex: 1,
      events: [
        {
          id: "t2-think-2",
          type: "thinking",
          delayMs: 300,
          data: {
            steps: [
              "Property ID 2891 identified. Batch ran yesterday with mismatched amounts.",
              "KB-SYN-0042 describes exact resolution: run reconciliation report, identify mismatches, apply SCRIPT-0412.",
              "Previous ticket CS-02155732 had the same issue — resolved successfully with this approach.",
            ],
          },
        },
        {
          id: "t2-kb-1",
          type: "kb_result",
          delayMs: 400,
          data: {
            results: [
              mockKBQueryResponse.primary_results[2],
              ...mockKBQueryResponse.secondary_results.SCRIPT,
            ],
          },
        },
        {
          id: "t2-ticket-1",
          type: "ticket_result",
          delayMs: 300,
          data: {
            results: mockKBQueryResponse.secondary_results.TICKET,
          },
        },
        {
          id: "t2-suggest-1",
          type: "suggestion",
          delayMs: 400,
          data: {
            title: "Recommended Action",
            description: "Follow KB-SYN-0042 resolution steps: run reconciliation, identify mismatches, apply SCRIPT-0412 correction.",
            actions: [
              "Pull up property 2891 — Riverside Terrace",
              "Check batch processing logs from yesterday",
              "Run voucher reconciliation report",
              "Apply SCRIPT-0412 to correct mismatched amounts",
            ],
            replyText: "I understand the urgency, Sarah. Let me look into property 2891 right away. I can see the batch from yesterday — it looks like there's a sync mismatch. I'm going to run a reconciliation report to identify affected vouchers, then apply a correction. This should take about 15-20 minutes.",
          },
        },
      ],
    },
  ],
  suggestedReplies: [
    {
      afterMessageIndex: 0,
      replies: [
        "I understand how frustrating that must be, Sarah. Let me look into this right away. Can you give me your property ID?",
        "I'm sorry to hear that. Let me pull up your account. What's the property ID?",
      ],
    },
    {
      afterMessageIndex: 2,
      replies: [
        "Absolutely, I understand the urgency. Let me check the batch processing logs now.",
        "I'm on it. I can see the batch — let me identify which vouchers are affected.",
      ],
    },
    {
      afterMessageIndex: 3,
      replies: [
        "Yes, I can help with this. I'll run a reconciliation report and a correction script. Should take 15-20 minutes.",
        "Absolutely. I have a process to fix this. Let me get started right away.",
      ],
    },
  ],
  hasKBMatch: true,
};

// ── Scenario 3: Unknown Issue (Knowledge Gap) ───────────────

const scenario3: CopilotScenario = {
  id: "unknown-issue",
  title: "Bulk Import Timeout (New Issue)",
  channel: "chat",
  customer: { name: "David Park", company: "Summit Housing Group" },
  agent: { name: "You" },
  messages: [
    {
      sender: "customer",
      name: "David Park",
      text: "Hi, I'm David Park from Summit Housing Group. We're trying to bulk import 200+ resident records via the CSV upload in the Residents module, but it keeps timing out after processing about 50 records.",
      delayMs: 1500,
    },
    {
      sender: "customer",
      name: "David Park",
      text: "We've tried splitting the file into smaller batches of 100, but it still times out. The error says \"Request timeout — import incomplete.\" We need these records imported before the end of the week.",
      delayMs: 5000,
    },
    {
      sender: "customer",
      name: "David Park",
      text: "Yes, it's version 8.4.2. And we're using Chrome on Windows.",
      delayMs: 12000,
    },
    {
      sender: "customer",
      name: "David Park",
      text: "That worked! The batch of 30 went through. But we have over 200 records — this is going to take a while doing it 30 at a time.",
      delayMs: 22000,
    },
    {
      sender: "customer",
      name: "David Park",
      text: "That would be great. Thank you for your help!",
      delayMs: 30000,
    },
  ],
  copilotTriggers: [
    {
      afterMessageIndex: 0,
      events: [
        {
          id: "t3-think-1",
          type: "thinking",
          delayMs: 400,
          data: {
            steps: [
              "New issue from David Park at Summit Housing Group.",
              "Detecting intent... Keywords: \"bulk import\", \"CSV upload\", \"Residents module\", \"timing out\".",
              "Intent classified: **Bulk Import Timeout** (Module: Residents / Import).",
              "Searching knowledge base for bulk import timeout issues...",
            ],
          },
        },
        {
          id: "t3-tool-classify",
          type: "tool_call",
          delayMs: 700,
          data: {
            tool: "classify_intent",
            status: "complete",
            input: { query: "bulk import CSV resident records timing out" },
            output: { intent: "Bulk Import Timeout", module: "Residents / Import", confidence: 0.72 },
          },
        },
        {
          id: "t3-tool-kb",
          type: "tool_call",
          delayMs: 800,
          data: {
            tool: "search_kb",
            status: "complete",
            input: { query: "bulk import CSV timeout residents", top_k: 5 },
            output: { results_count: 0, top_match: "No results above threshold" },
          },
        },
        {
          id: "t3-tool-tickets",
          type: "tool_call",
          delayMs: 600,
          data: {
            tool: "search_tickets",
            status: "complete",
            input: { query: "bulk import timeout CSV", top_k: 5 },
            output: { results_count: 0, top_match: "No similar tickets found" },
          },
        },
        {
          id: "t3-gap-1",
          type: "gap_detection",
          delayMs: 500,
          data: {
            topic: "Bulk Import Timeout",
            module: "Residents / Import",
            description: "No KB articles or historical tickets match this issue. This appears to be a new, undocumented problem. The resolution of this case will be captured for the learning pipeline.",
          },
        },
      ],
    },
    {
      afterMessageIndex: 1,
      events: [
        {
          id: "t3-think-2",
          type: "thinking",
          delayMs: 300,
          data: {
            steps: [
              "Customer tried smaller batches (100) — still times out. Error: \"Request timeout — import incomplete.\"",
              "No existing documentation. Reasoning from first principles:",
              "  - CSV import likely has a server-side timeout (e.g., 30s or 60s request limit).",
              "  - 50 records process before timeout → ~0.6-1.2s per record is plausible.",
              "  - Recommendation: try batches of 25-30 to stay under the timeout threshold.",
              "  - Also check: PropertySuite version, browser, and any proxy/firewall timeouts.",
            ],
          },
        },
        {
          id: "t3-suggest-1",
          type: "suggestion",
          delayMs: 500,
          data: {
            title: "Troubleshooting Approach (No KB Match)",
            description: "No existing documentation found. Based on reasoning: the server-side timeout is likely cutting off large imports. Try smaller batches of 25-30 records.",
            actions: [
              "Ask for PropertySuite version and browser details",
              "Suggest splitting into batches of 25-30 records",
              "If that works, file a product improvement request for async imports",
              "Document resolution for future KB article",
            ],
            replyText: "I understand the urgency, David. This looks like a server timeout issue with large CSV imports. Can you tell me which version of PropertySuite you're running, and which browser? In the meantime, I'd suggest trying a smaller batch — around 25-30 records — to see if those go through.",
          },
        },
      ],
    },
    {
      afterMessageIndex: 3,
      events: [
        {
          id: "t3-think-3",
          type: "thinking",
          delayMs: 300,
          data: {
            steps: [
              "Confirmed: batches of 30 work. The timeout threshold is between 30-50 records.",
              "Root cause identified: server-side request timeout for bulk imports in PropertySuite 8.4.2.",
              "This is a confirmed workaround. Should document this for the knowledge base.",
            ],
          },
        },
        {
          id: "t3-suggest-2",
          type: "suggestion",
          delayMs: 400,
          data: {
            title: "Resolution Confirmed",
            description: "Batches of 30 confirmed working. Offer to help with the remaining imports and suggest filing a product improvement request.",
            actions: [
              "Acknowledge the workaround works",
              "Offer to stay on the line while they process remaining batches",
              "File product improvement request for async/background import",
            ],
            replyText: "I'm glad that worked! I understand it's tedious to do 30 at a time. I'd recommend processing the remaining batches while I stay available, and I'll file a product improvement request to add background/async processing for large imports. We'll also document this workaround so our team can help other customers faster.",
          },
        },
      ],
    },
    {
      afterMessageIndex: 4,
      events: [
        {
          id: "t3-learn-1",
          type: "learn",
          delayMs: 1000,
          data: {
            draftTitle: "PropertySuite: Bulk Resident CSV Import Timeout Workaround",
            draftId: "DRAFT-004",
            sourceTicket: "CS-NEW-IMPORT",
            detectedGap: "No KB articles cover bulk import timeout issues in the Residents module.",
            summary: "CSV imports of 50+ resident records timeout due to server-side request limits. Workaround: split into batches of 25-30 records. Affects PropertySuite 8.4.2+ on all browsers. Product improvement request filed for async background imports.",
          },
        },
      ],
    },
  ],
  suggestedReplies: [
    {
      afterMessageIndex: 0,
      replies: [
        "I'm sorry about that, David. Let me look into the bulk import issue. Can you tell me which version of PropertySuite you're running?",
        "Thanks for reaching out. Let me investigate the timeout. How large is the CSV file?",
      ],
    },
    {
      afterMessageIndex: 2,
      replies: [
        "Thanks for that info. Let's try a smaller batch — around 25-30 records — to see if that gets through the timeout.",
        "Got it. I suspect the server timeout is the issue. Try splitting into batches of 30 and let me know.",
      ],
    },
    {
      afterMessageIndex: 3,
      replies: [
        "I'm glad that worked! I'll file a product improvement request for async imports. Want me to stay on while you process the rest?",
        "Great news! It's a workaround for now. I'll document this and push for a proper fix.",
      ],
    },
  ],
  hasKBMatch: false,
};

// ── Export ────────────────────────────────────────────────────

export const COPILOT_SCENARIOS: CopilotScenario[] = [
  scenario1,
  scenario2,
  scenario3,
];
