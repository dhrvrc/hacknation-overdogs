// ============================================================
// Meridian — Copilot Scenarios (API-driven)
//
// Each scenario defines conversation messages and metadata.
// Copilot events are built dynamically from real API responses
// by the useCopilotSimulation hook + buildCopilotEvents utility.
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

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

/** Scripted follow-up thinking/suggestion shown after a specific message. */
export interface FollowUp {
  afterMessageIndex: number;
  thinkingSteps: string[];
  suggestion?: {
    title: string;
    description: string;
    actions: string[];
    replyText?: string;
  };
}

export interface CopilotScenario {
  id: string;
  title: string;
  channel: "chat" | "video" | "phone";
  customer: { name: string; company: string };
  agent: { name: string };

  /** Sequential conversation messages with delays */
  messages: ScenarioMessage[];

  /** Suggested reply chips shown to the agent at certain points */
  suggestedReplies: Array<{
    afterMessageIndex: number;
    replies: string[];
  }>;

  // ── API-driven fields ──────────────────────────────────────

  /** The search query to send to POST /api/query */
  queryText: string;
  /** Which customer message index triggers the main API search */
  queryAfterMessageIndex: number;

  /** Scripted follow-up thinking/suggestions for later messages */
  followUps: FollowUp[];

  /** Real ticket number to check for gaps on resolve (optional) */
  ticketNumber?: string;
  /** Whether this scenario demonstrates the gap detection + learning flow */
  isGapScenario: boolean;
}

// ── Scenario 1: Date Advance (KB + Script match) ────────────

const scenario1: CopilotScenario = {
  id: "date-advance",
  title: "Date Advance Failure (Chat)",
  channel: "chat",
  customer: { name: "Morgan Johnson", company: "Oak & Ivy Management" },
  agent: { name: "You" },

  queryText: "advance property date failing unable to complete",
  queryAfterMessageIndex: 1,
  ticketNumber: "CS-38908386",
  isGapScenario: false,

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

  followUps: [
    {
      afterMessageIndex: 2,
      thinkingSteps: [
        "Customer unsure about open batches. Checking backend directly...",
        "Based on retrieval results: need to verify current property date and check for invalid voucher reference.",
        "Preparing response with diagnostic findings.",
      ],
      suggestion: {
        title: "Backend Check Complete",
        description:
          "Inform the customer about the invalid voucher reference found in the HAP request table. Recommend Tier 3 escalation.",
        actions: [
          "Report findings: invalid voucher reference in HAP request table",
          "Initiate Tier 3 escalation for script execution",
        ],
        replyText:
          "No worries, I can check from here. I can see the issue — there's an invalid voucher reference in the HAP request table that's blocking the date advance. This is a known issue that requires a backend data fix. I'll need to escalate this to our Tier 3 team, but I can initiate that right now.",
      },
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
};

// ── Scenario 2: HAP Voucher Sync (KB match) ─────────────────

const scenario2: CopilotScenario = {
  id: "hap-voucher",
  title: "HAP Voucher Sync Error (Phone)",
  channel: "phone",
  customer: { name: "Sarah Chen", company: "Riverside Properties" },
  agent: { name: "You" },

  queryText: "HAP voucher amounts wrong after sync mismatch",
  queryAfterMessageIndex: 1,
  ticketNumber: "CS-02155732",
  isGapScenario: false,

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

  followUps: [
    {
      afterMessageIndex: 2,
      thinkingSteps: [
        "Customer confirms HUD deadline urgency. Prioritizing resolution.",
        "Reconciliation + correction script approach confirmed from retrieval results.",
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
};

// ── Scenario 3: Repayment Plan (Knowledge Gap — real ticket) ─

const scenario3: CopilotScenario = {
  id: "repayment-gap",
  title: "Repayment Plan Balance Error (Phone)",
  channel: "phone",
  customer: { name: "Lisa Tran", company: "Hilltop Grove Apartments" },
  agent: { name: "You" },

  queryText: "repayment plan ending balance incorrect after posting installments",
  queryAfterMessageIndex: 1,
  ticketNumber: "CS-03758997",
  isGapScenario: true,

  messages: [
    {
      sender: "customer",
      name: "Lisa Tran",
      text: "Hi, I'm Lisa Tran from Hilltop Grove Apartments. We set up a repayment plan for one of our residents, but after posting the first few installments the ending balance is completely wrong.",
      delayMs: 1500,
    },
    {
      sender: "customer",
      name: "Lisa Tran",
      text: "The original balance was $2,400 and we've posted three installments of $200 each, but the system shows the remaining balance as $2,100 instead of $1,800. It's like one installment didn't apply.",
      delayMs: 5000,
    },
    {
      sender: "customer",
      name: "Lisa Tran",
      text: "We checked the installment history and all three show as posted. Is this a known issue?",
      delayMs: 12000,
    },
    {
      sender: "customer",
      name: "Lisa Tran",
      text: "That worked! The balance is showing correctly now after re-validating. But why did it happen in the first place?",
      delayMs: 22000,
    },
    {
      sender: "customer",
      name: "Lisa Tran",
      text: "Okay, that makes sense. Thank you for documenting this.",
      delayMs: 30000,
    },
  ],

  followUps: [
    {
      afterMessageIndex: 2,
      thinkingSteps: [
        "Customer confirms installments show as posted but balance is off by one installment.",
        "No existing documentation for this issue. Reasoning from first principles:",
        "  - Repayment schedule validation may not have recalculated after posting.",
        "  - Recommend: re-validate the repayment schedule to force a recalculation.",
      ],
      suggestion: {
        title: "Troubleshooting Approach (No KB Match)",
        description:
          "No existing documentation found. Based on analysis: the repayment schedule may need re-validation after posting installments to force a balance recalculation.",
        actions: [
          "Navigate to the repayment plan and re-validate installment amounts",
          "Check if the balance updates correctly after re-validation",
          "Document this as a potential configuration issue for future reference",
        ],
        replyText:
          "That's a great question, Lisa. I don't see this documented as a known issue, but based on what you're describing, it sounds like the repayment schedule may not have recalculated after posting. Let me walk you through re-validating the schedule — go to the repayment plan, edit the schedule, verify the installment amounts, and save. That should force a recalculation.",
      },
    },
    {
      afterMessageIndex: 3,
      thinkingSteps: [
        "Confirmed: re-validating the repayment schedule fixed the balance.",
        "Root cause: schedule validation doesn't auto-trigger after installment posting.",
        "This is a confirmed workaround. Should document this for the knowledge base.",
      ],
      suggestion: {
        title: "Resolution Confirmed",
        description:
          "Re-validation fixed the balance. This is an undocumented issue worth capturing for the knowledge base.",
        actions: [
          "Acknowledge the workaround works",
          "Explain the likely root cause (schedule doesn't auto-recalculate)",
          "Note that this will be documented for future reference",
        ],
        replyText:
          "Great, glad that resolved it! What likely happened is that the repayment schedule doesn't automatically recalculate the ending balance after each installment posts — it requires a manual re-validation step. I'm going to document this as a known workaround so our team can help other customers faster if this comes up again.",
      },
    },
  ],

  suggestedReplies: [
    {
      afterMessageIndex: 0,
      replies: [
        "I'm sorry about that, Lisa. Let me look into the repayment plan. Can you confirm the resident's account details?",
        "Thanks for reaching out. Let me pull up the repayment plan for that property.",
      ],
    },
    {
      afterMessageIndex: 2,
      replies: [
        "I don't see this as a known issue, but let me walk you through a re-validation step that should fix it.",
        "Let me check something. Can you try re-validating the repayment schedule?",
      ],
    },
    {
      afterMessageIndex: 3,
      replies: [
        "That's likely a recalculation issue. I'll document this workaround for our knowledge base.",
        "Good news! I'll make sure this gets documented so other agents know about it.",
      ],
    },
  ],
};

// ── Export ────────────────────────────────────────────────────

export const COPILOT_SCENARIOS: CopilotScenario[] = [
  scenario1,
  scenario2,
  scenario3,
];
