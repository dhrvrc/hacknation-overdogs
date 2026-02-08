// ============================================================
// QA Tracking Items Library
// Verbatim from the production QA rubric dataset.
// Used for autocomplete when a QA analyst marks "No" on a parameter.
// ============================================================

export const INTERACTION_DELIGHT_ITEMS = [
  "Did not greet the customer or introduce self",
  "Did not use professional closing",
  "Did not use customer name when available",
  "Did not confirm preferred contact method / callback details when needed",
  "Did not acknowledge customer concern or show empathy",
  "Talked over customer / interrupted frequently",
  "Unprofessional tone (rude, dismissive, sarcastic)",
  "Excessive filler words or unclear communication",
  "Spoke too fast / too slow without adapting",
  "Used jargon without explanation",
  "Did not set expectations or agenda for the call/chat",
  "Did not control the conversation (rambling / no structure)",
  "Did not address customer objections or concerns",
];

export const INTERACTION_RESOLUTION_ITEMS = [
  "Did not confirm the issue or restate problem clearly",
  "Did not ask clarifying questions",
  "Did not verify key details before troubleshooting",
  "Provided incorrect or conflicting information",
  "Did not troubleshoot logically (random steps / guessing)",
  "Did not use available resources when appropriate (KB, scripts, peer help)",
  "Did not document or summarize steps taken during the interaction",
  "Did not confirm resolution with the customer",
  "Did not provide next steps or escalation path when unresolved",
  "Excessive hold time or delays without explanation",
  "Did not manage case ownership / follow-up expectations",
];

export const CASE_DOCUMENTATION_ITEMS = [
  "Case description is vague or incomplete",
  "Missing key context (module, error text, what changed, date/time)",
  "Steps taken not documented",
  "Resolution notes missing or unclear",
  "Incorrect category/subcategory selection",
  "Priority or tier does not match impact/urgency described",
  "Ticket not actionable for another agent",
  "Internal notes contain unnecessary or confusing content",
];

export const CASE_RESOLUTION_ITEMS = [
  "Resolution not reproducible / lacks verification steps",
  "Did not reference script when script-required",
  "Did not reference knowledge article when used",
  "Knowledge article should have been created or updated but was not",
  "Technical content appears inaccurate or unsupported by evidence",
  "No escalation notes when escalation is required",
  "No follow-up plan when issue is pending",
];

export const RED_FLAG_ITEMS = [
  "Included payment card data (PCI) in transcript or case notes",
  "Requested or stored sensitive authentication credentials",
  "Shared confidential customer data inappropriately",
  "Instructed unsafe data changes that risk data integrity",
  "Discriminatory, harassing, or otherwise unprofessional behavior",
];

// --- Parameter definitions ---

export const INTERACTION_PARAMS = [
  "Conversational_Professional",
  "Engagement_Personalization",
  "Tone_Pace",
  "Language",
  "Objection_Handling_Conversation_Control",
  "Delivered_Expected_Outcome",
  "Exhibit_Critical_Thinking",
  "Educate_Accurately_Handle_Information",
  "Effective_Use_of_Resources",
  "Call_Case_Control_Timeliness",
] as const;

export const CASE_PARAMS = [
  "Clear_Problem_Summary",
  "Captured_Key_Context",
  "Action_Log_Completeness",
  "Correct_Categorization",
  "Customer_Facing_Clarity",
  "Resolution_Specific_Reproducible",
  "Uses_Approved_Process_Scripts_When_Required",
  "Accuracy_of_Technical_Content",
  "References_Knowledge_Correctly",
  "Timeliness_Ownership_Signals",
] as const;

export const RED_FLAG_PARAMS = [
  "Account_Documentation_Violation",
  "Payment_Compliance_PCI_Violation",
  "Data_Integrity_Confidentiality_Violation",
  "Misbehavior_Unprofessionalism",
] as const;

// Map each parameter key to its relevant tracking items for autocomplete
export const PARAMETER_TRACKING_ITEMS: Record<string, string[]> = {
  // Interaction — Customer Delight
  Conversational_Professional: INTERACTION_DELIGHT_ITEMS.slice(0, 3),
  Engagement_Personalization: INTERACTION_DELIGHT_ITEMS.slice(3, 5),
  Tone_Pace: INTERACTION_DELIGHT_ITEMS.slice(5, 10),
  Language: INTERACTION_DELIGHT_ITEMS.slice(7, 10),
  Objection_Handling_Conversation_Control: INTERACTION_DELIGHT_ITEMS.slice(10, 13),
  // Interaction — Resolution Handling
  Delivered_Expected_Outcome: INTERACTION_RESOLUTION_ITEMS.slice(0, 3),
  Exhibit_Critical_Thinking: INTERACTION_RESOLUTION_ITEMS.slice(3, 5),
  Educate_Accurately_Handle_Information: INTERACTION_RESOLUTION_ITEMS.slice(3, 6),
  Effective_Use_of_Resources: INTERACTION_RESOLUTION_ITEMS.slice(5, 7),
  Call_Case_Control_Timeliness: INTERACTION_RESOLUTION_ITEMS.slice(7, 11),
  // Case — Documentation Quality
  Clear_Problem_Summary: CASE_DOCUMENTATION_ITEMS.slice(0, 2),
  Captured_Key_Context: CASE_DOCUMENTATION_ITEMS.slice(1, 3),
  Action_Log_Completeness: CASE_DOCUMENTATION_ITEMS.slice(2, 4),
  Correct_Categorization: CASE_DOCUMENTATION_ITEMS.slice(4, 6),
  Customer_Facing_Clarity: CASE_DOCUMENTATION_ITEMS.slice(6, 8),
  // Case — Resolution Quality
  Resolution_Specific_Reproducible: CASE_RESOLUTION_ITEMS.slice(0, 1),
  Uses_Approved_Process_Scripts_When_Required: CASE_RESOLUTION_ITEMS.slice(1, 3),
  Accuracy_of_Technical_Content: CASE_RESOLUTION_ITEMS.slice(3, 5),
  References_Knowledge_Correctly: CASE_RESOLUTION_ITEMS.slice(2, 4),
  Timeliness_Ownership_Signals: CASE_RESOLUTION_ITEMS.slice(5, 7),
  // Red Flags
  Account_Documentation_Violation: RED_FLAG_ITEMS.slice(0, 2),
  Payment_Compliance_PCI_Violation: RED_FLAG_ITEMS.slice(0, 2),
  Data_Integrity_Confidentiality_Violation: RED_FLAG_ITEMS.slice(2, 4),
  Misbehavior_Unprofessionalism: RED_FLAG_ITEMS.slice(4, 5),
};

/** Human-readable label from a parameter key */
export function paramLabel(key: string): string {
  return key.replace(/_/g, " ");
}
