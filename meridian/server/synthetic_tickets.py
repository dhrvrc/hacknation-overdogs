"""
Meridian Synthetic Tickets
6 pre-written support tickets about Report Export Failure - a novel issue type
that does not exist anywhere in the current dataset.

This is the ammunition for the live demo's "learning from the present" proof point.
"""

# ============================================================================
# SYNTHETIC TICKETS - Report Export Failure (Novel Issue)
# ============================================================================

SYNTHETIC_TICKETS = [
    {
        "Ticket_Number": "CS-DEMO-001",
        "Conversation_ID": "CONV-DEMO-001",
        "Subject": "Report export produces blank PDF (Rent Roll Monthly)",
        "Description": "Tenant at Heritage Point site reports that exporting the Monthly Rent Roll report produces a blank PDF. The report preview in the UI shows data correctly, but the exported file is 0 bytes. This started after the latest property date advance. Multiple users at the site are affected.",
        "Resolution": "Investigated the export pipeline. Found that the report rendering service was referencing a stale property date cache after the most recent date advance. Cleared the report cache via the admin console (Settings → Reporting → Clear Cache) and re-triggered the export. PDF generated correctly with all tenant data. Advised customer to clear cache after each date advance until the next patch.",
        "Tier": 2,
        "Priority": "High",
        "Status": "Closed",
        "Category": "Report Export Failure",
        "Module": "Reporting / Exports",
        "Product": "PropertySuite Affordable",
        "Root_Cause": "Stale cache after property date advance",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    },
    {
        "Ticket_Number": "CS-DEMO-002",
        "Conversation_ID": "CONV-DEMO-002",
        "Subject": "HAP Billing Summary export shows incorrect voucher amounts",
        "Description": "Property manager at Meadow Pointe reports that the HAP Billing Summary export contains voucher amounts that don't match the values shown in the Affordable / HAP module. The discrepancy appears in the Total Adjusted Payment column. The exported CSV shows the old amounts from before a recent batch correction.",
        "Resolution": "Confirmed that the report was pulling from a materialized view that hadn't been refreshed after the HAP batch correction. Ran the backend refresh procedure for the reporting materialized views (this is a known gap — the batch correction process doesn't automatically trigger a view refresh). After refresh, the exported CSV matched the corrected voucher amounts. Flagged for engineering to add automatic view refresh to the batch correction workflow.",
        "Tier": 3,
        "Priority": "Critical",
        "Status": "Closed",
        "Category": "Report Export Failure",
        "Module": "Reporting / Exports",
        "Product": "PropertySuite Affordable",
        "Root_Cause": "Materialized view not refreshed after batch correction",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    },
    {
        "Ticket_Number": "CS-DEMO-003",
        "Conversation_ID": "CONV-DEMO-003",
        "Subject": "Compliance Audit Report export times out for large portfolios",
        "Description": "User at Oakwood Properties attempts to export the annual Compliance Audit Report for their full portfolio (12 properties, ~2,400 units). The export process runs for 10+ minutes and then times out with error 'Report generation exceeded maximum allowed time.' Smaller single-property exports work fine.",
        "Resolution": "The export timeout is set to 600 seconds by default, which is insufficient for large multi-property compliance reports. Adjusted the timeout setting for this site via the admin panel (Settings → Reporting → Export Timeout → 1800s). Also recommended the customer export by property group instead of full portfolio as a workaround. Escalated to engineering to optimize the compliance report query for large datasets.",
        "Tier": 2,
        "Priority": "Medium",
        "Status": "Closed",
        "Category": "Report Export Failure",
        "Module": "Reporting / Exports",
        "Product": "PropertySuite Affordable",
        "Root_Cause": "Export timeout too low for large datasets",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    },
    {
        "Ticket_Number": "CS-DEMO-004",
        "Conversation_ID": "CONV-DEMO-004",
        "Subject": "Exported Rent Roll CSV has garbled characters in tenant names",
        "Description": "Site admin at Pine Valley Apartments reports that exported Rent Roll CSVs display garbled characters (mojibake) in tenant names containing accents or special characters (e.g., 'García' shows as 'GarcÃ­a'). This only happens in the CSV export — the PDF export and UI display show names correctly.",
        "Resolution": "The CSV export was using Windows-1252 encoding instead of UTF-8. This is a known encoding issue in the reporting module's CSV writer. Workaround: instructed the customer to open the CSV in Excel using Data → From Text/CSV → select UTF-8 encoding. Permanent fix: updated the site-level export configuration to force UTF-8 encoding with BOM (Settings → Reporting → CSV Encoding → UTF-8 with BOM). Verified the exported file now displays all characters correctly.",
        "Tier": 1,
        "Priority": "Medium",
        "Status": "Closed",
        "Category": "Report Export Failure",
        "Module": "Reporting / Exports",
        "Product": "PropertySuite Affordable",
        "Root_Cause": "CSV encoding set to Windows-1252 instead of UTF-8",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    },
    {
        "Ticket_Number": "CS-DEMO-005",
        "Conversation_ID": "CONV-DEMO-005",
        "Subject": "Scheduled report delivery stopped working after email server migration",
        "Description": "Property manager at Riverside Commons reports that their scheduled weekly Rent Roll and Monthly HAP Summary reports stopped being delivered via email 2 weeks ago. The reports still generate correctly when manually exported. The issue started around the time their organization migrated to a new email server. No error messages are shown in the UI.",
        "Resolution": "Checked the scheduled report delivery logs in the admin console. Found SMTP connection failures starting on the date of the email migration. The old SMTP server credentials were still configured in PropertySuite. Updated the SMTP settings (Settings → Notifications → Email Server) with the new server address, port, and credentials. Sent a test report — delivered successfully. Re-enabled the weekly schedule. All 3 pending reports from the last 2 weeks were manually triggered and delivered.",
        "Tier": 1,
        "Priority": "High",
        "Status": "Closed",
        "Category": "Report Export Failure",
        "Module": "Reporting / Exports",
        "Product": "PropertySuite Affordable",
        "Root_Cause": "SMTP credentials not updated after email server migration",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    },
    {
        "Ticket_Number": "CS-DEMO-006",
        "Conversation_ID": "CONV-DEMO-006",
        "Subject": "Report Export Failure — backend data sync causing duplicate rows in Move-Out Summary",
        "Description": "Accounting team at Birchwood Manor reports that the Move-Out Summary report contains duplicate rows for tenants who moved out in the last 30 days. Each move-out appears 2-3 times with identical data. This is causing incorrect totals in their accounting reconciliation. The duplication is visible in both PDF and CSV exports.",
        "Resolution": "Investigated the Move-Out Summary report query. Found that a recent backend data sync created duplicate entries in the move-out events table due to a race condition during the sync process. Ran a deduplication script on the move-out events table for the affected site (identified 47 duplicate records across 19 tenants). After cleanup, the report generated correctly with unique rows. Escalated to Tier 3 to investigate the sync race condition for a permanent fix.",
        "Tier": 3,
        "Priority": "Critical",
        "Status": "Closed",
        "Category": "Report Export Failure",
        "Module": "Reporting / Exports",
        "Product": "PropertySuite Affordable",
        "Root_Cause": "Duplicate entries from backend data sync race condition",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    }
]

# ============================================================================
# SYNTHETIC CONVERSATIONS - Matching transcripts for each ticket
# ============================================================================

SYNTHETIC_CONVERSATIONS = [
    {
        "Conversation_ID": "CONV-DEMO-001",
        "Ticket_Number": "CS-DEMO-001",
        "Channel": "Chat",
        "Agent_Name": "Jordan",
        "Customer_Sentiment": "Frustrated",
        "Issue_Summary": "Monthly Rent Roll export produces blank PDF after property date advance.",
        "Transcript_Text": """Jordan (ExampleCo): Thanks for contacting ExampleCo Support! I'm Jordan. How can I help you today?
Sarah Chen: Hi Jordan — this is Sarah Chen from Heritage Point management. We're having a serious issue with our monthly Rent Roll report. When we try to export it as a PDF, we get a blank file. Zero bytes.
Jordan (ExampleCo): I'm sorry to hear that, Sarah. Let me look into this right away. Can you confirm — does the report preview show data correctly in the UI before you export?
Sarah Chen: Yes, the preview looks fine. All tenant data is there. It's only when we click Export to PDF that we get a blank file. And it's not just me — two other property managers at our site have the same issue.
Jordan (ExampleCo): Got it — so the data is rendering correctly in-app but the export pipeline is failing. When did this start happening? Did anything change recently?
Sarah Chen: It started Monday. We did our monthly property date advance on Friday.
Jordan (ExampleCo): That's a helpful clue. Let me check the report cache status for your site. I suspect the date advance may have left a stale cache that the export process is reading from. One moment...
Jordan (ExampleCo): Confirmed — the report cache for Heritage Point hasn't refreshed since before your date advance. I'm going to clear it now via the admin console and we'll re-try the export.
Sarah Chen: OK, fingers crossed.
Jordan (ExampleCo): Cache cleared. Can you try the export again now?
Sarah Chen: Let me try... It's generating... Yes! The PDF has all the data now. Thank you!
Jordan (ExampleCo): Great news! So the issue was a stale report cache after your date advance. For now, I'd recommend clearing the cache after each date advance — you can ask us to do it or I can show you where the setting is. We're also flagging this for a patch so it refreshes automatically.
Sarah Chen: That would be great — please show me where the setting is so we don't have to call every month.
Jordan (ExampleCo): Sure — go to Settings → Reporting → Clear Cache. You'll see a button there. Just click it after each date advance and you should be good.
Sarah Chen: Perfect, thank you Jordan. This was really helpful.
Jordan (ExampleCo): Happy to help, Sarah! I'll document this in your ticket. If it happens again or you have any other issues, don't hesitate to reach out. Have a great day!"""
    },
    {
        "Conversation_ID": "CONV-DEMO-002",
        "Ticket_Number": "CS-DEMO-002",
        "Channel": "Phone",
        "Agent_Name": "Alex",
        "Customer_Sentiment": "Frustrated",
        "Issue_Summary": "HAP Billing Summary export shows stale voucher amounts after batch correction.",
        "Transcript_Text": """Alex (ExampleCo): Thank you for calling ExampleCo Support, this is Alex. How can I assist you today?
David Martinez: Hi Alex, this is David Martinez, property manager at Meadow Pointe. I've got a critical issue with our HAP Billing Summary. The exported report is showing the wrong voucher amounts.
Alex (ExampleCo): I understand that's concerning, David. Can you tell me more — what specifically is wrong with the amounts?
David Martinez: We did a batch correction last week to fix some voucher calculations. The HAP module shows the corrected amounts, but when I export the Billing Summary, it still shows the old numbers. The Total Adjusted Payment column is completely wrong.
Alex (ExampleCo): So the HAP module itself shows the correct amounts, but the export doesn't reflect the batch correction. That tells me the reporting layer might be pulling from a cached data source. Let me investigate.
David Martinez: Please hurry — we need to submit this to HUD by end of week.
Alex (ExampleCo): Understood, I'm on it now. I'm checking the materialized views that the reporting module uses... David, I found the issue. The reporting materialized view hasn't been refreshed since before your batch correction. The batch correction process doesn't automatically trigger a view refresh — this is a known gap.
David Martinez: So the report is looking at old data?
Alex (ExampleCo): Exactly. I'm going to run the backend refresh procedure now. This should take a couple of minutes. I'll need to escalate this to Tier 3 for the actual refresh command but I can stay on the line.
David Martinez: OK, please do whatever you need to do.
Alex (ExampleCo): The refresh is complete. Can you try exporting the HAP Billing Summary again?
David Martinez: Running it now... The amounts match now. The Total Adjusted Payment column has the corrected figures. Thank you.
Alex (ExampleCo): I'm glad that's resolved. I'm going to flag this for engineering so they add automatic view refreshes to the batch correction workflow. In the meantime, if you do another batch correction, let us know and we'll trigger the refresh. Is there anything else I can help with?
David Martinez: No, that's all. Thanks for the quick turnaround, Alex.
Alex (ExampleCo): Of course, David. Good luck with the HUD submission. Have a great day!"""
    },
    {
        "Conversation_ID": "CONV-DEMO-003",
        "Ticket_Number": "CS-DEMO-003",
        "Channel": "Chat",
        "Agent_Name": "Morgan",
        "Customer_Sentiment": "Neutral",
        "Issue_Summary": "Compliance Audit Report export times out for large multi-property portfolio.",
        "Transcript_Text": """Morgan (ExampleCo): Hi there! Welcome to ExampleCo Support. I'm Morgan. What can I help you with today?
Lisa Park: Hi Morgan — Lisa Park from Oakwood Properties. I'm trying to export our annual Compliance Audit Report but it keeps timing out.
Morgan (ExampleCo): I'm sorry about that, Lisa. Can you give me more details? How large is the report you're trying to generate?
Lisa Park: It's our full portfolio — 12 properties, about 2,400 units total. The export runs for about 10 minutes and then I get an error that says "Report generation exceeded maximum allowed time."
Morgan (ExampleCo): I see. And do smaller exports work — like a single property?
Lisa Park: Yes, single property exports work fine. It's only when I try to do all 12 at once.
Morgan (ExampleCo): That makes sense. The export timeout is set to 600 seconds by default, which is likely not enough for a portfolio that size. Let me adjust the timeout for your site and we'll try again.
Lisa Park: Is there a permanent fix?
Morgan (ExampleCo): I'm going to increase your timeout to 1800 seconds — that should be plenty. I'm also going to recommend that engineering optimizes the compliance report query for large datasets. In the meantime, you could also export by property group if you need results faster.
Lisa Park: OK, let me try with the longer timeout... It's running... still going... The report generated! Took about 14 minutes but it completed.
Morgan (ExampleCo): Excellent! That confirms the timeout was the issue. With the new setting, it should work consistently going forward. I'll document this and escalate the optimization request to engineering.
Lisa Park: Thank you Morgan, appreciate the help.
Morgan (ExampleCo): You're welcome, Lisa! Don't hesitate to reach out if you need anything else."""
    },
    {
        "Conversation_ID": "CONV-DEMO-004",
        "Ticket_Number": "CS-DEMO-004",
        "Channel": "Chat",
        "Agent_Name": "Taylor",
        "Customer_Sentiment": "Neutral",
        "Issue_Summary": "CSV export has garbled characters (mojibake) in tenant names with accents.",
        "Transcript_Text": """Taylor (ExampleCo): Hello! I'm Taylor from ExampleCo Support. How can I help?
Roberto Diaz: Hi Taylor — Roberto Diaz at Pine Valley Apartments. Our Rent Roll CSV exports have garbled text. Tenant names with accents are messed up — like García shows as GarcÃ­a.
Taylor (ExampleCo): That sounds like a character encoding issue. Let me ask — does this happen in the PDF export too, or just CSV?
Roberto Diaz: Just CSV. The PDF and the screen display look fine.
Taylor (ExampleCo): That helps narrow it down. The CSV writer is probably using the wrong encoding. I'll check your site's export configuration. One moment...
Taylor (ExampleCo): Found it — your site's CSV export is set to Windows-1252 encoding instead of UTF-8. That's what's causing the garbled characters for names with accents and special characters.
Roberto Diaz: Can you fix it?
Taylor (ExampleCo): Yes — I'm updating the setting now. Settings → Reporting → CSV Encoding → UTF-8 with BOM. The BOM (byte order mark) helps Excel recognize the encoding automatically. Done. Can you try an export now?
Roberto Diaz: Let me try... Exporting... Opened in Excel... García looks correct now! All the names look good.
Taylor (ExampleCo): Perfect! The fix is permanent for your site. All future CSV exports will use UTF-8. Is there anything else I can help with?
Roberto Diaz: No, that's everything. Thanks Taylor!
Taylor (ExampleCo): You're welcome, Roberto! Have a great day."""
    },
    {
        "Conversation_ID": "CONV-DEMO-005",
        "Ticket_Number": "CS-DEMO-005",
        "Channel": "Phone",
        "Agent_Name": "Jordan",
        "Customer_Sentiment": "Relieved",
        "Issue_Summary": "Scheduled report delivery via email stopped after organization's email server migration.",
        "Transcript_Text": """Jordan (ExampleCo): ExampleCo Support, this is Jordan. How can I help?
Amanda Foster: Hi Jordan, Amanda Foster from Riverside Commons. Our scheduled reports stopped coming through about two weeks ago. We used to get the weekly Rent Roll and monthly HAP Summary automatically by email but they just stopped.
Jordan (ExampleCo): Hi Amanda. Sorry about the disruption. Let me check a few things — can you manually export those reports from the UI?
Amanda Foster: Yes, manual exports still work. It's just the automatic scheduled delivery that stopped.
Jordan (ExampleCo): OK, so the reports themselves generate fine — it's the email delivery that's broken. Did anything change with your email setup recently?
Amanda Foster: Actually, yes — our organization migrated to a new email server about two weeks ago. Could that be related?
Jordan (ExampleCo): That's almost certainly the cause. PropertySuite stores the SMTP server credentials for email delivery, and if your organization changed servers, those credentials would be pointing to the old server. Let me check the delivery logs... Yes, I can see SMTP connection failures starting exactly on your migration date.
Amanda Foster: Oh, that makes sense. Can you update the settings?
Jordan (ExampleCo): Absolutely. I'll need the new SMTP server address, port, and credentials. Do you have those or should I coordinate with your IT team?
Amanda Foster: I have them here — let me give them to you.
Jordan (ExampleCo): Got it, updating now... Settings → Notifications → Email Server... credentials saved. Let me send a test report... Amanda, can you check your inbox?
Amanda Foster: Just got it! The test report came through.
Jordan (ExampleCo): I'm going to re-enable your weekly schedule and also manually trigger the 3 pending reports from the last 2 weeks so you're caught up. You should see those in the next few minutes.
Amanda Foster: That's amazing — thank you so much, Jordan. I was worried we'd lost those reports.
Jordan (ExampleCo): All set! The schedule is active again and the backlog is on its way. If anything else comes up, let us know."""
    },
    {
        "Conversation_ID": "CONV-DEMO-006",
        "Ticket_Number": "CS-DEMO-006",
        "Channel": "Phone",
        "Agent_Name": "Alex",
        "Customer_Sentiment": "Frustrated",
        "Issue_Summary": "Move-Out Summary report has duplicate rows caused by backend data sync race condition.",
        "Transcript_Text": """Alex (ExampleCo): ExampleCo Support, this is Alex. How may I help you?
James Wilson: Alex, this is James Wilson from Birchwood Manor. We've got a big problem with our Move-Out Summary report. It's showing duplicate entries for every tenant who moved out in the last month.
Alex (ExampleCo): That's definitely not right. Can you tell me more about the duplicates — are they exact copies or slightly different?
James Wilson: Exact copies. Each move-out shows up 2 or 3 times with the same data. It's throwing off our accounting reconciliation because the totals are inflated.
Alex (ExampleCo): Understood — that's impacting your financial reporting. Let me investigate immediately. Is this happening in both PDF and CSV exports?
James Wilson: Yes, both. And I can see the duplicates in the report preview too, so it's not just an export issue.
Alex (ExampleCo): Good observation — that means the underlying data has duplicates, not just the export. Let me check the move-out events table for your site... James, I found the issue. There are duplicate entries in the move-out events table. It looks like a recent backend data sync created duplicate records — there's a known race condition that can cause this during the sync process.
James Wilson: Can you fix the data?
Alex (ExampleCo): I can clean up the duplicates. I'm identifying all duplicate records for your site now... I found 47 duplicate records across 19 tenants. I'm going to run a deduplication cleanup. This will need Tier 3 approval for the backend modification. Let me escalate this now.
James Wilson: Please. We need this fixed for our month-end close.
Alex (ExampleCo): I understand the urgency. The cleanup is done — the deduplication script removed the 47 duplicate records. Can you pull the Move-Out Summary again?
James Wilson: Running it... The duplicates are gone. Each tenant shows only once. The totals look correct now.
Alex (ExampleCo): I'm also escalating the root cause — the sync race condition — to Tier 3 for a permanent fix so this doesn't happen again. I'll make sure your ticket is tracked against that engineering work. Is there anything else?
James Wilson: No, that's it. Thank you, Alex — this was critical.
Alex (ExampleCo): Of course, James. Good luck with month-end. We'll keep you posted on the permanent fix."""
    }
]

# ============================================================================
# DEMO QUESTIONS - For the live demo query moment
# ============================================================================

DEMO_QUESTIONS = [
    {
        "question": "A customer is getting blank PDFs when exporting their Rent Roll report. The preview shows data fine but the export is empty. What should I check?",
        "expected_answer_type": "KB",
        "description": "Should match the new KB article about Report Export Failure after it's been created and approved."
    },
    {
        "question": "We have a site where the HAP Billing Summary export shows old voucher amounts that don't match what's in the system after a batch correction. How do we fix this?",
        "expected_answer_type": "KB",
        "description": "Should match the materialized view refresh resolution."
    },
    {
        "question": "Multiple users across different sites are reporting issues with report exports — blank files, wrong data, timeouts. Is this a known issue?",
        "expected_answer_type": "KB",
        "description": "Should match the general Report Export Failure KB article."
    }
]

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_synthetic_tickets() -> list:
    """Return the list of synthetic ticket dicts."""
    return SYNTHETIC_TICKETS


def get_synthetic_conversations() -> list:
    """Return the list of synthetic conversation dicts."""
    return SYNTHETIC_CONVERSATIONS


def get_demo_questions() -> list:
    """Return the demo questions."""
    return DEMO_QUESTIONS


def ticket_to_dataframe_row(ticket: dict) -> dict:
    """
    Convert a synthetic ticket dict to a row dict that matches
    the Tickets DataFrame schema exactly. Fill in any missing
    columns with sensible defaults.

    The Tickets DataFrame has these columns (based on the schema):
    - Ticket_Number, Conversation_ID, Subject, Description, Resolution
    - Tier, Priority, Status, Category, Module, Product
    - Root_Cause, Script_ID, KB_Article_ID, Generated_KB_Article_ID

    This function ensures all required columns are present.
    """
    # Start with a copy of the ticket
    row = ticket.copy()

    # Add any missing required columns with defaults
    defaults = {
        "Status": "Closed",
        "Product": "PropertySuite Affordable",
        "Script_ID": None,
        "KB_Article_ID": None,
        "Generated_KB_Article_ID": None
    }

    for key, default_value in defaults.items():
        if key not in row:
            row[key] = default_value

    return row


def conversation_to_dataframe_row(conversation: dict) -> dict:
    """
    Convert a synthetic conversation dict to a row dict that matches
    the Conversations DataFrame schema exactly.

    The Conversations DataFrame has these columns:
    - Conversation_ID, Ticket_Number, Channel, Agent_Name
    - Customer_Sentiment (note: the synthetic data uses 'Customer_Sentiment',
      but the schema might use 'Sentiment' - this function handles both)
    - Issue_Summary, Transcript_Text
    """
    row = conversation.copy()

    # Handle the Sentiment vs Customer_Sentiment discrepancy
    if "Customer_Sentiment" in row and "Sentiment" not in row:
        row["Sentiment"] = row["Customer_Sentiment"]

    return row


# ============================================================================
# VALIDATION
# ============================================================================

def validate_synthetic_data():
    """
    Validate that the synthetic data meets all acceptance criteria.
    Returns a dict with validation results.
    """
    results = {
        "valid": True,
        "errors": [],
        "warnings": []
    }

    # Check ticket count
    if len(SYNTHETIC_TICKETS) != 6:
        results["valid"] = False
        results["errors"].append(f"Expected 6 tickets, got {len(SYNTHETIC_TICKETS)}")

    # Check conversation count
    if len(SYNTHETIC_CONVERSATIONS) != 6:
        results["valid"] = False
        results["errors"].append(f"Expected 6 conversations, got {len(SYNTHETIC_CONVERSATIONS)}")

    # Check all tickets have correct category and module
    for ticket in SYNTHETIC_TICKETS:
        if ticket.get("Category") != "Report Export Failure":
            results["valid"] = False
            results["errors"].append(
                f"Ticket {ticket['Ticket_Number']} has wrong category: {ticket.get('Category')}"
            )

        if ticket.get("Module") != "Reporting / Exports":
            results["valid"] = False
            results["errors"].append(
                f"Ticket {ticket['Ticket_Number']} has wrong module: {ticket.get('Module')}"
            )

    # Check matching conversations
    ticket_nums = {t["Ticket_Number"] for t in SYNTHETIC_TICKETS}
    conv_ticket_nums = {c["Ticket_Number"] for c in SYNTHETIC_CONVERSATIONS}

    if ticket_nums != conv_ticket_nums:
        results["valid"] = False
        results["errors"].append(
            f"Ticket/Conversation mismatch. Tickets: {ticket_nums}, Conversations: {conv_ticket_nums}"
        )

    # Check tier distribution (should be 2 each of Tier 1, 2, 3)
    tier_counts = {}
    for ticket in SYNTHETIC_TICKETS:
        tier = ticket.get("Tier")
        tier_counts[tier] = tier_counts.get(tier, 0) + 1

    expected_tiers = {1: 2, 2: 2, 3: 2}
    if tier_counts != expected_tiers:
        results["warnings"].append(
            f"Tier distribution is {tier_counts}, expected {expected_tiers}"
        )

    # Check demo questions
    if len(DEMO_QUESTIONS) != 3:
        results["valid"] = False
        results["errors"].append(f"Expected 3 demo questions, got {len(DEMO_QUESTIONS)}")

    return results


if __name__ == "__main__":
    # Run validation when executed directly
    validation = validate_synthetic_data()

    print("=" * 60)
    print("Synthetic Tickets Validation")
    print("=" * 60)

    if validation["valid"]:
        print("✅ All validation checks PASSED")
    else:
        print("❌ Validation FAILED")
        for error in validation["errors"]:
            print(f"  ERROR: {error}")

    if validation["warnings"]:
        print("\n⚠️  Warnings:")
        for warning in validation["warnings"]:
            print(f"  {warning}")

    print(f"\n📊 Summary:")
    print(f"  Tickets: {len(SYNTHETIC_TICKETS)}")
    print(f"  Conversations: {len(SYNTHETIC_CONVERSATIONS)}")
    print(f"  Demo Questions: {len(DEMO_QUESTIONS)}")

    # Show tier distribution
    tier_counts = {}
    for ticket in SYNTHETIC_TICKETS:
        tier = ticket.get("Tier")
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
    print(f"  Tier Distribution: {tier_counts}")
