// ============================================================
// Meridian — Mock API Responses
// Shapes mirror the FastAPI endpoints Person 3 will build.
// When Person 3 is ready, flip USE_MOCK=false in lib/api.ts.
// ============================================================

// ---------- POST /api/query  (SCRIPT-type query) ----------
export const mockQueryResponse = {
  query: "advance property date backend script fails",
  predicted_type: "SCRIPT",
  confidence_scores: { SCRIPT: 0.82, KB: 0.31, TICKET: 0.15 },
  primary_results: [
    {
      doc_id: "SCRIPT-0293",
      doc_type: "SCRIPT",
      title: "Accounting / Date Advance - Advance Property Date",
      body: 'use <DATABASE>\ngo\n\nupdate Haprequest\nset hrqTotalAdjPayAmount = <AMOUNT>\nwhere hrqID = <ID>\nand hrqDate = <DATE>\n\nprint "Done – verify in UI"',
      score: 0.74,
      metadata: {
        purpose:
          "Run this backend data-fix script to resolve a Advance Property Date issue in Accounting / Date Advance.",
        inputs: "<AMOUNT>, <DATABASE>, <DATE>, <ID>",
        module: "Accounting / Date Advance",
        category: "Advance Property Date",
      },
      provenance: [],
      rank: 1,
    },
    {
      doc_id: "SCRIPT-0187",
      doc_type: "SCRIPT",
      title: "Accounting / Date Advance - Reset Date Pointer",
      body: 'use <DATABASE>\ngo\n\nupdate PropertyDate\nset pdCurrentDate = <DATE>\nwhere pdPropertyID = <ID>\n\nprint "Date pointer reset"',
      score: 0.68,
      metadata: {
        purpose:
          "Reset the property date pointer when the advance process is stuck.",
        inputs: "<DATABASE>, <DATE>, <ID>",
        module: "Accounting / Date Advance",
        category: "Advance Property Date",
      },
      provenance: [],
      rank: 2,
    },
    {
      doc_id: "SCRIPT-0412",
      doc_type: "SCRIPT",
      title: "Accounting / Date Advance - Clear Pending Batches",
      body: 'use <DATABASE>\ngo\n\ndelete from PendingBatch\nwhere pbPropertyID = <ID>\nand pbStatus = \'STUCK\'\n\nprint "Pending batches cleared"',
      score: 0.62,
      metadata: {
        purpose:
          "Clear stuck pending batches that block the date advance process.",
        inputs: "<DATABASE>, <ID>",
        module: "Accounting / Date Advance",
        category: "Advance Property Date",
      },
      provenance: [],
      rank: 3,
    },
  ],
  secondary_results: {
    KB: [
      {
        doc_id: "KB-SYN-0001",
        doc_type: "KB",
        title:
          "PropertySuite Affordable: Advance Property Date - Unable to advance property date (backend data sync)",
        body: "Summary\n- This article documents a Tier 3-style backend data fix for date advance failures in PropertySuite Affordable.\n\nApplies To\n- ExampleCo PropertySuite Affordable\n- Module: Accounting / Date Advance\n\nSymptoms\n- Date advance fails because a backend voucher reference is invalid\n- Error appears after selecting Settings → Property → Date Advance\n- The process hangs or returns a data-sync error\n\nResolution Steps\n1. Confirm there are no open batches for the property\n2. Verify the current property date in the database\n3. Run SCRIPT-0293 with the correct parameters\n4. Verify the date has advanced in the UI\n5. Confirm with the customer that the workflow completes",
        score: 0.61,
        metadata: {
          source_type: "SYNTH_FROM_TICKET",
          module: "Accounting / Date Advance",
          tags: "PropertySuite, affordable, date-advance",
        },
        provenance: [
          {
            source_type: "Ticket",
            source_id: "CS-38908386",
            relationship: "CREATED_FROM",
            evidence_snippet:
              "Derived from Tier 3 ticket CS-38908386",
          },
          {
            source_type: "Conversation",
            source_id: "CONV-O2RAK1VRJN",
            relationship: "CREATED_FROM",
            evidence_snippet: "Conversation context captured",
          },
          {
            source_type: "Script",
            source_id: "SCRIPT-0293",
            relationship: "REFERENCES",
            evidence_snippet:
              "References SCRIPT-0293 for backend fix",
          },
        ],
        rank: 1,
      },
    ],
    TICKET: [
      {
        doc_id: "CS-38908386",
        doc_type: "TICKET",
        title: "Unable to advance property date (backend data sync)",
        body: "Description: Date advance fails because a backend voucher reference is invalid. The customer reports that the date advance process hangs after selecting the menu path.\n\nResolution: Validated issue, collected exact error context, and escalated to Tier 3. Applied backend data-fix script. Customer confirmed the workflow completed successfully.",
        score: 0.55,
        metadata: {
          tier: 3,
          priority: "High",
          root_cause: "Data inconsistency requiring backend fix",
          module: "Accounting / Date Advance",
          script_id: "SCRIPT-0293",
        },
        provenance: [],
        rank: 1,
      },
    ],
  },
};

// ---------- POST /api/query  (KB-type query) ----------
export const mockKBQueryResponse = {
  query: "how to handle HAP voucher sync failure",
  predicted_type: "KB",
  confidence_scores: { SCRIPT: 0.18, KB: 0.79, TICKET: 0.22 },
  primary_results: [
    {
      doc_id: "KB-SYN-0001",
      doc_type: "KB",
      title:
        "PropertySuite Affordable: Advance Property Date - Unable to advance property date (backend data sync)",
      body: "Summary\n- This article documents a Tier 3-style backend data fix for date advance failures in PropertySuite Affordable.\n\nApplies To\n- ExampleCo PropertySuite Affordable\n- Module: Accounting / Date Advance\n\nSymptoms\n- Date advance fails because a backend voucher reference is invalid\n\nResolution Steps\n1. Confirm there are no open batches\n2. Verify the current property date\n3. Run SCRIPT-0293 with the correct parameters\n4. Verify the date has advanced",
      score: 0.72,
      metadata: {
        source_type: "SYNTH_FROM_TICKET",
        module: "Accounting / Date Advance",
        tags: "PropertySuite, affordable, date-advance",
      },
      provenance: [
        {
          source_type: "Ticket",
          source_id: "CS-38908386",
          relationship: "CREATED_FROM",
          evidence_snippet: "Derived from Tier 3 ticket CS-38908386",
        },
        {
          source_type: "Conversation",
          source_id: "CONV-O2RAK1VRJN",
          relationship: "CREATED_FROM",
          evidence_snippet: "Conversation context captured",
        },
        {
          source_type: "Script",
          source_id: "SCRIPT-0293",
          relationship: "REFERENCES",
          evidence_snippet: "References SCRIPT-0293 for backend fix",
        },
      ],
      rank: 1,
    },
    {
      doc_id: "KB-3FFBFE3C70",
      doc_type: "KB",
      title: "PropertySuite: HAP Voucher Processing Overview",
      body: "Summary\n- Overview of HAP voucher processing within PropertySuite.\n\nApplies To\n- ExampleCo PropertySuite Affordable\n- Module: Affordable / HAP\n\nSteps\n1. Navigate to Affordable → HAP → Voucher Processing\n2. Select the property and date range\n3. Review generated vouchers for accuracy\n4. Submit batch for processing",
      score: 0.65,
      metadata: {
        source_type: "SEED",
        module: "Affordable / HAP",
        tags: "HAP, voucher, processing",
      },
      provenance: [],
      rank: 2,
    },
    {
      doc_id: "KB-SYN-0042",
      doc_type: "KB",
      title: "PropertySuite Affordable: HAP Voucher Sync Error Resolution",
      body: "Summary\n- Documents the resolution for HAP voucher sync errors where voucher amounts do not match the expected totals.\n\nApplies To\n- ExampleCo PropertySuite Affordable\n- Module: Affordable / HAP\n\nSymptoms\n- Voucher sync process reports mismatched amounts\n- The HAP batch fails validation\n\nResolution Steps\n1. Run the voucher reconciliation report\n2. Identify the mismatched entries\n3. Apply correction script SCRIPT-0412\n4. Resubmit the batch",
      score: 0.58,
      metadata: {
        source_type: "SYNTH_FROM_TICKET",
        module: "Affordable / HAP",
        tags: "HAP, voucher, sync-error",
      },
      provenance: [
        {
          source_type: "Ticket",
          source_id: "CS-02155732",
          relationship: "CREATED_FROM",
          evidence_snippet: "Derived from Tier 2 ticket CS-02155732",
        },
      ],
      rank: 3,
    },
  ],
  secondary_results: {
    SCRIPT: [
      {
        doc_id: "SCRIPT-0412",
        doc_type: "SCRIPT",
        title: "Affordable / HAP - Voucher Amount Correction",
        body: 'use <DATABASE>\ngo\n\nupdate HapVoucher\nset hvAmount = <AMOUNT>\nwhere hvID = <ID>\n\nprint "Voucher corrected"',
        score: 0.45,
        metadata: {
          purpose: "Correct HAP voucher amounts that are out of sync.",
          inputs: "<DATABASE>, <AMOUNT>, <ID>",
          module: "Affordable / HAP",
          category: "HAP Voucher",
        },
        provenance: [],
        rank: 1,
      },
    ],
    TICKET: [
      {
        doc_id: "CS-02155732",
        doc_type: "TICKET",
        title: "HAP voucher amounts not syncing correctly",
        body: "Description: Customer reports that HAP voucher amounts are mismatched after the sync process. The batch fails validation.\n\nResolution: Ran reconciliation report, identified mismatched entries, applied SCRIPT-0412 to correct amounts. Resubmitted batch successfully.",
        score: 0.42,
        metadata: {
          tier: 2,
          priority: "Medium",
          root_cause: "Data sync mismatch in voucher processing",
          module: "Affordable / HAP",
          script_id: "SCRIPT-0412",
        },
        provenance: [],
        rank: 1,
      },
    ],
  },
};

// ---------- POST /api/query  (TICKET-type query) ----------
export const mockTicketQueryResponse = {
  query: "customer unable to complete move-out process",
  predicted_type: "TICKET",
  confidence_scores: { SCRIPT: 0.12, KB: 0.25, TICKET: 0.78 },
  primary_results: [
    {
      doc_id: "CS-44219876",
      doc_type: "TICKET",
      title: "Move-out process fails at final step",
      body: "Description: Customer reports the move-out process fails at the final confirmation step. The system displays a generic error.\n\nResolution: Identified that the unit had an outstanding charge that was not cleared. Cleared the charge and completed the move-out process. Customer confirmed success.",
      score: 0.71,
      metadata: {
        tier: 1,
        priority: "Medium",
        root_cause: "Outstanding charge blocking move-out",
        module: "Residents / Move-Out",
      },
      provenance: [],
      rank: 1,
    },
    {
      doc_id: "CS-38908386",
      doc_type: "TICKET",
      title: "Unable to advance property date (backend data sync)",
      body: "Description: Date advance fails because a backend voucher reference is invalid.\n\nResolution: Validated issue, collected exact error context, and escalated to Tier 3. Applied backend data-fix script. Customer confirmed the workflow completed successfully.",
      score: 0.55,
      metadata: {
        tier: 3,
        priority: "High",
        root_cause: "Data inconsistency requiring backend fix",
        module: "Accounting / Date Advance",
        script_id: "SCRIPT-0293",
      },
      provenance: [],
      rank: 2,
    },
    {
      doc_id: "CS-55783210",
      doc_type: "TICKET",
      title: "Move-out charges not calculating correctly",
      body: "Description: The move-out charge calculation is producing incorrect amounts for a unit with multiple lease amendments.\n\nResolution: Recalculated charges manually, identified the amendment that was not being picked up. Applied a data correction and recalculated. Customer confirmed correct amounts.",
      score: 0.49,
      metadata: {
        tier: 2,
        priority: "High",
        root_cause: "Lease amendment not applied in calculation",
        module: "Residents / Move-Out",
      },
      provenance: [],
      rank: 3,
    },
  ],
  secondary_results: {
    KB: [
      {
        doc_id: "KB-3FFBFE3C70",
        doc_type: "KB",
        title: "PropertySuite: Move-Out Process Guide",
        body: "Summary\n- Complete guide to the move-out process in PropertySuite.\n\nApplies To\n- ExampleCo PropertySuite\n- Module: Residents / Move-Out\n\nSteps\n1. Navigate to Residents → Move-Out\n2. Select the unit and resident\n3. Review outstanding charges\n4. Confirm move-out date\n5. Generate final statement",
        score: 0.38,
        metadata: {
          source_type: "SEED",
          module: "Residents / Move-Out",
          tags: "move-out, residents",
        },
        provenance: [],
        rank: 1,
      },
    ],
    SCRIPT: [
      {
        doc_id: "SCRIPT-0098",
        doc_type: "SCRIPT",
        title: "Residents / Move-Out - Clear Outstanding Charges",
        body: 'use <DATABASE>\ngo\n\ndelete from UnitCharge\nwhere ucUnitID = <ID>\nand ucStatus = \'PENDING\'\n\nprint "Charges cleared"',
        score: 0.35,
        metadata: {
          purpose: "Clear outstanding pending charges blocking the move-out process.",
          inputs: "<DATABASE>, <ID>",
          module: "Residents / Move-Out",
          category: "Move-Out",
        },
        provenance: [],
        rank: 1,
      },
    ],
  },
};

// ---------- GET /api/provenance/{doc_id} ----------
export const mockProvenance = {
  kb_article_id: "KB-SYN-0001",
  kb_title:
    "PropertySuite Affordable: Advance Property Date - Unable to advance property date (backend data sync)",
  has_provenance: true,
  sources: [
    {
      source_type: "Ticket",
      source_id: "CS-38908386",
      relationship: "CREATED_FROM",
      evidence_snippet:
        "Derived from Tier 3 ticket CS-38908386: Unable to advance property date",
      detail: {
        subject: "Unable to advance property date (backend data sync)",
        tier: 3,
        resolution:
          "Validated issue, collected exact error context, and escalated to Tier 3. Applied backend data-fix script. Customer confirmed the workflow completed successfully. Steps: Confirm there are no open batches...",
        root_cause: "Data inconsistency requiring backend fix",
        module: "Accounting / Date Advance",
      },
    },
    {
      source_type: "Conversation",
      source_id: "CONV-O2RAK1VRJN",
      relationship: "CREATED_FROM",
      evidence_snippet:
        "Conversation context captured in CONV-O2RAK1VRJN",
      detail: {
        channel: "Chat",
        agent_name: "Alex",
        sentiment: "Neutral",
        issue_summary:
          "Date advance fails because a backend voucher reference is invalid and needs a update correction.",
      },
    },
    {
      source_type: "Script",
      source_id: "SCRIPT-0293",
      relationship: "REFERENCES",
      evidence_snippet:
        "This KB references Script_ID SCRIPT-0293 for the backend fix procedure.",
      detail: {
        title: "Accounting / Date Advance - Advance Property Date",
        purpose:
          "Run this backend data-fix script to resolve a Advance Property Date issue in Accounting / Date Advance.",
        inputs: "<AMOUNT>, <DATABASE>, <DATE>, <ID>",
      },
    },
  ],
  learning_event: {
    event_id: "LEARN-0001",
    trigger_ticket: "CS-38908386",
    detected_gap:
      "No existing KB match above threshold for Advance Property Date issue; escalated to Tier 3.",
    draft_summary:
      "Draft KB created to document backend resolution steps for: Unable to advance property date (backend data sync)",
    final_status: "Approved",
    reviewer_role: "Tier 3 Support",
    timestamp: "2025-02-19T02:05:13",
  },
};

// Empty provenance for a seed KB article
export const mockEmptyProvenance = {
  kb_article_id: "KB-3FFBFE3C70",
  kb_title: "PropertySuite: HAP Voucher Processing Overview",
  has_provenance: false,
  sources: [],
  learning_event: null,
};

// ---------- GET /api/dashboard/stats ----------
export const mockDashboard = {
  knowledge_health: {
    total_articles: 3207,
    seed_articles: 3046,
    learned_articles: 161,
    articles_with_metadata: 199,
    articles_without_metadata: 3008,
    avg_body_length: 2051,
    scripts_total: 714,
    placeholders_total: 25,
  },
  learning_pipeline: {
    total_events: 161,
    approved: 134,
    rejected: 27,
    pending: 3,
    pending_drafts: [
      {
        draft_id: "DRAFT-001",
        title: "PropertySuite Affordable: HAP Voucher Sync Failure Resolution",
        source_ticket: "CS-12345678",
        detected_gap:
          "No existing KB match for HAP voucher sync failure",
        generated_at: "2025-06-15T10:30:00Z",
      },
      {
        draft_id: "DRAFT-002",
        title: "PropertySuite: Move-In Certification Checklist Missing Fields",
        source_ticket: "CS-33445566",
        detected_gap:
          "No KB article covers missing certification fields during move-in",
        generated_at: "2025-06-14T14:22:00Z",
      },
      {
        draft_id: "DRAFT-003",
        title: "Compliance: Annual Recertification Date Mismatch",
        source_ticket: "CS-77889900",
        detected_gap:
          "Gap detected for recertification date mismatch errors in compliance module",
        generated_at: "2025-06-13T09:15:00Z",
      },
    ],
  },
  tickets: {
    total: 400,
    by_tier: { "1": 121, "2": 118, "3": 161 },
    by_priority: { Critical: 50, High: 137, Medium: 146, Low: 67 },
    by_module: {
      General: 123,
      "Accounting / Date Advance": 118,
      "Compliance / Certifications": 38,
      "Affordable / HAP": 36,
      "Residents / Move-Out": 15,
      "Residents / Move-In": 14,
      Other: 56,
    },
  },
  emerging_issues: [
    {
      category: "Advance Property Date",
      module: "Accounting / Date Advance",
      ticket_count: 118,
      avg_similarity: 0.32,
      sample_resolution:
        "Validated issue, collected exact error context, and escalated to Tier 3. Applied backend data-fix script. Customer confirmed the workflow completed successfully.",
    },
    {
      category: "HAP Voucher Processing",
      module: "Affordable / HAP",
      ticket_count: 43,
      avg_similarity: 0.38,
      sample_resolution:
        "Ran reconciliation report, identified mismatched entries, applied correction script. Resubmitted batch successfully.",
    },
    {
      category: "Annual Recertification",
      module: "Compliance / Certifications",
      ticket_count: 38,
      avg_similarity: 0.35,
      sample_resolution:
        "Updated certification dates in the system and re-ran compliance check. All certifications now show correct dates.",
    },
    {
      category: "Move-Out Processing",
      module: "Residents / Move-Out",
      ticket_count: 15,
      avg_similarity: 0.45,
      sample_resolution:
        "Cleared outstanding charges and completed the move-out process. Generated final statement for the resident.",
    },
  ],
  eval_results: {
    retrieval: {
      overall: { "hit@1": 0.35, "hit@3": 0.52, "hit@5": 0.61, "hit@10": 0.73 },
    },
    classification: {
      accuracy: 0.71,
      per_class: {
        SCRIPT: { precision: 0.78, recall: 0.85, f1: 0.81 },
        KB: { precision: 0.55, recall: 0.48, f1: 0.51 },
        TICKET_RESOLUTION: { precision: 0.42, recall: 0.38, f1: 0.4 },
      },
    },
    before_after: {
      before_hit5: 0.48,
      after_hit5: 0.61,
      improvement_pp: 13,
      gaps_closed: 134,
      headline:
        "Self-learning loop improved hit@5 from 48% to 61% (+13 pp)",
    },
  },
};

// ---------- POST /api/qa/score ----------
export const mockQAScore = {
  Evaluation_Mode: "Both",
  Interaction_QA: {
    Conversational_Professional: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Engagement_Personalization: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Tone_Pace: { score: "Yes", tracking_items: [], evidence: "" },
    Language: {
      score: "No",
      tracking_items: ["Used jargon without explanation"],
      evidence:
        "Agent said 'run the hrqTotalAdjPayAmount update' without explaining",
    },
    Objection_Handling_Conversation_Control: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Delivered_Expected_Outcome: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Exhibit_Critical_Thinking: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Educate_Accurately_Handle_Information: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Effective_Use_of_Resources: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Call_Case_Control_Timeliness: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Final_Weighted_Score: "90%",
  },
  Case_QA: {
    Clear_Problem_Summary: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Captured_Key_Context: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Action_Log_Completeness: {
      score: "No",
      tracking_items: ["Steps taken not documented"],
      evidence:
        "Resolution notes do not list individual troubleshooting steps",
    },
    Correct_Categorization: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Customer_Facing_Clarity: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Resolution_Specific_Reproducible: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Uses_Approved_Process_Scripts_When_Required: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Accuracy_of_Technical_Content: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    References_Knowledge_Correctly: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Timeliness_Ownership_Signals: {
      score: "Yes",
      tracking_items: [],
      evidence: "",
    },
    Final_Weighted_Score: "80%",
  },
  Red_Flags: {
    Account_Documentation_Violation: {
      score: "N/A",
      tracking_items: [],
      evidence: "",
    },
    Payment_Compliance_PCI_Violation: {
      score: "N/A",
      tracking_items: [],
      evidence: "",
    },
    Data_Integrity_Confidentiality_Violation: {
      score: "N/A",
      tracking_items: [],
      evidence: "",
    },
    Misbehavior_Unprofessionalism: {
      score: "N/A",
      tracking_items: [],
      evidence: "",
    },
  },
  Business_Intelligence: {
    Knowledge_Article_Attached: "Yes",
    Screen_Recording_Available: "N/A",
    PME_KCS_Attached: "N/A",
    Work_Setup_WIO_WFH: "N/A",
    Issues_IVR_IT_Tool_Audio: "N/A",
  },
  Leader_Action_Required: "No",
  Contact_Summary:
    "Morgan Johnson from Oak & Ivy Management called regarding a date advance failure in PropertySuite Affordable for Heritage Point. The issue was caused by an invalid backend voucher reference.",
  Case_Summary:
    "Tier 3 escalation for backend data sync issue affecting date advance. Agent validated the error, collected context, and applied the backend data-fix script (SCRIPT-0293). Customer confirmed resolution.",
  QA_Recommendation: "Keep doing",
  Overall_Weighted_Score: "87%",
};

// ---------- GET /api/conversations/{ticket_number}  (Chat) ----------
export const mockConversation = {
  ticket_number: "CS-38908386",
  conversation_id: "CONV-O2RAK1VRJN",
  channel: "Chat",
  agent_name: "Alex",
  sentiment: "Neutral",
  issue_summary:
    "Date advance fails because a backend voucher reference is invalid and needs a update correction.",
  transcript: `Alex (ExampleCo): Thanks for contacting ExampleCo Support. My name is Alex — how can I help you today?
Morgan Johnson: Hello — this is Morgan Johnson from Oak & Ivy Management. We're trying to advance the property date for Heritage Point (Property ID 4072) but the process keeps failing.
Alex (ExampleCo): I'm sorry to hear that, Morgan. Let me pull up Heritage Point. Can you tell me the exact error message or what happens when you try to advance?
Morgan Johnson: When I go to Settings → Property → Date Advance and click "Advance," it spins for a moment and then shows a generic "Unable to complete" error. No error code, just that message.
Alex (ExampleCo): Got it. Let me check a few things on the backend. Can you confirm — are there any open batches or pending transactions for this property?
Morgan Johnson: I don't think so, but I'm not sure how to check that on our end.
Alex (ExampleCo): No worries, I can check from here. Give me just a moment.
Alex (ExampleCo): I can see the issue — there's an invalid voucher reference in the HAP request table that's blocking the date advance. This is a known issue that requires a backend data fix.
Morgan Johnson: Oh, okay. Is that something you can fix?
Alex (ExampleCo): I'll need to escalate this to our Tier 3 team for the backend fix, but I can initiate that right now. They'll run a script to correct the data, and you should be able to advance the date after that.
Morgan Johnson: How long will that take?
Alex (ExampleCo): Typically within a few hours. I'll make sure to follow up with you once it's done. Is this the best number to reach you?
Morgan Johnson: Yes, this is fine. Thank you, Alex.
Alex (ExampleCo): You're welcome, Morgan. I've created the escalation ticket. You'll hear from us soon. Is there anything else I can help with?
Morgan Johnson: No, that's all for now. Thanks!
Alex (ExampleCo): Great, have a good day!`,
};

// ---------- GET /api/conversations/{ticket_number}  (Phone) ----------
export const mockPhoneConversation = {
  ticket_number: "CS-02155732",
  conversation_id: "CONV-PH8X4KQRM2",
  channel: "Phone",
  agent_name: "Jordan",
  sentiment: "Frustrated",
  issue_summary:
    "Customer is frustrated because HAP voucher amounts are not syncing correctly after batch processing.",
  transcript: `Jordan (ExampleCo): Thank you for calling ExampleCo Support, this is Jordan. How can I assist you today?
Sarah Chen: Hi Jordan, this is Sarah Chen from Riverside Properties. I'm having a serious issue with our HAP voucher processing. The amounts are completely wrong after the sync.
Jordan (ExampleCo): I understand how frustrating that must be, Sarah. Let me look into this right away. Can you give me your property ID?
Sarah Chen: It's 2891. We ran the batch yesterday and now the amounts in the system don't match what we submitted at all.
Jordan (ExampleCo): I see property 2891 — Riverside Terrace. Let me check the batch processing logs. One moment please.
Sarah Chen: We have a HUD deadline coming up and we really need this resolved quickly.
Jordan (ExampleCo): Absolutely, I understand the urgency. I can see the batch from yesterday. It looks like there's a sync mismatch — the voucher amounts in the system don't match the submitted values.
Sarah Chen: Can you fix it?
Jordan (ExampleCo): Yes, I can help with this. I'm going to run a reconciliation report first to identify exactly which vouchers are affected, and then we have a correction script that can fix the amounts. This should take about 15–20 minutes.
Sarah Chen: Okay, please go ahead.
Jordan (ExampleCo): Done. I've identified 3 mismatched vouchers and corrected them. The batch has been resubmitted. Can you check on your end to confirm the amounts look correct now?
Sarah Chen: Let me check... yes, those look right now. Thank you so much, Jordan.
Jordan (ExampleCo): You're welcome, Sarah. I'm glad we could get that resolved before your deadline. Is there anything else I can help with?
Sarah Chen: No, that's everything. Thanks again!`,
};

// ---------- Conversations lookup map ----------
export const mockConversations: Record<string, typeof mockConversation> = {
  "CS-38908386": mockConversation,
  "CS-02155732": mockPhoneConversation,
};

// ---------- POST /api/kb/approve/{draft_id} ----------
export const mockApproveResponse = {
  status: "approved",
  doc_id: "KB-DRAFT-001",
};

// ---------- POST /api/kb/reject/{draft_id} ----------
export const mockRejectResponse = {
  status: "rejected",
};
