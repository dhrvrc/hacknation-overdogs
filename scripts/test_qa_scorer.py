"""
Test the QA Scorer directly (without API server)
Useful for testing template fallback and LLM integration.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_template_fallback():
    """Test QA scorer with template fallback (no API key)"""
    print("=" * 60)
    print("Testing QA Scorer - Template Fallback")
    print("=" * 60)

    from meridian.server.qa_scorer import QAScorer

    # Create a mock datastore with minimal data
    class MockDataStore:
        def __init__(self):
            self.ticket_by_number = {
                "CS-TEST-001": self._mock_ticket_series()
            }
            import pandas as pd
            self.conversations = pd.DataFrame([
                {
                    "Ticket_Number": "CS-TEST-001",
                    "Conversation_ID": "CONV-TEST-001",
                    "Channel": "Chat",
                    "Agent_Name": "Alex",
                    "Sentiment": "Neutral",
                    "Issue_Summary": "Test issue",
                    "Transcript_Text": "Agent: Hello!\nCustomer: I need help.\nAgent: I'll assist you."
                }
            ])

        def _mock_ticket_series(self):
            import pandas as pd
            return pd.Series({
                "Ticket_Number": "CS-TEST-001",
                "Subject": "Test ticket for QA scoring",
                "Description": "This is a test ticket to verify QA scoring works.",
                "Resolution": "Issue resolved successfully through troubleshooting steps.",
                "Tier": 2,
                "Priority": "Medium",
                "Category": "General",
                "Module": "Testing",
                "Root_Cause": "User error",
                "Script_ID": None
            })

    # Initialize scorer with no API key (force template mode)
    ds = MockDataStore()
    scorer = QAScorer(ds, api_key="")

    # Score the test ticket
    result = scorer.score_ticket("CS-TEST-001")

    # Print results
    print(f"\nEvaluation Mode: {result['Evaluation_Mode']}")
    print(f"Overall Score: {result['Overall_Weighted_Score']}")
    print(f"Interaction Score: {result['Interaction_QA']['Final_Weighted_Score']}")
    print(f"Case Score: {result['Case_QA']['Final_Weighted_Score']}")
    print(f"QA Recommendation: {result['QA_Recommendation']}")

    # Verify structure
    assert result["Evaluation_Mode"] == "Both", "Expected 'Both' mode"
    assert result["Overall_Weighted_Score"] == "87%", "Expected 87% overall score"
    assert len(result["Red_Flags"]) == 4, "Expected 4 red flags"

    print("\n✅ Template fallback test PASSED")
    print("=" * 60)


def test_with_llm():
    """Test QA scorer with OpenAI API (if API key available)"""
    api_key = os.environ.get("OPENAI_API_KEY", "")

    if not api_key:
        print("\n[SKIP] No OPENAI_API_KEY set - skipping LLM test")
        return

    print("\n" + "=" * 60)
    print("Testing QA Scorer - OpenAI API")
    print("=" * 60)

    from meridian.server.qa_scorer import QAScorer

    # Use same mock datastore
    class MockDataStore:
        def __init__(self):
            self.ticket_by_number = {
                "CS-TEST-002": self._mock_ticket_series()
            }
            import pandas as pd
            self.conversations = pd.DataFrame([
                {
                    "Ticket_Number": "CS-TEST-002",
                    "Conversation_ID": "CONV-TEST-002",
                    "Channel": "Phone",
                    "Agent_Name": "Jordan",
                    "Sentiment": "Frustrated",
                    "Issue_Summary": "Customer frustrated with slow response",
                    "Transcript_Text": """Jordan: Thank you for calling support.
Customer: Finally! I've been waiting forever!
Jordan: I apologize for the wait. Let me help you with that.
Customer: My report export is broken.
Jordan: I see. Can you tell me which report?
Customer: The monthly rent roll. It just shows a blank PDF.
Jordan: Let me check... I found the issue. Your cache needs to be cleared.
Customer: Why wasn't this documented anywhere?
Jordan: That's a great point. I'll make sure to document this.
Customer: Okay, it's working now. Thanks.
Jordan: You're welcome. Is there anything else?
Customer: No, that's all."""
                }
            ])

        def _mock_ticket_series(self):
            import pandas as pd
            return pd.Series({
                "Ticket_Number": "CS-TEST-002",
                "Subject": "Report export shows blank PDF",
                "Description": "Customer reports that the Monthly Rent Roll report exports as a blank PDF file. The report preview shows data correctly in the UI.",
                "Resolution": "Cleared the report rendering cache via admin console (Settings → Reporting → Clear Cache). Export now works correctly. Advised customer to clear cache after property date advances.",
                "Tier": 2,
                "Priority": "High",
                "Category": "Report Export Failure",
                "Module": "Reporting / Exports",
                "Root_Cause": "Stale cache after property date advance",
                "Script_ID": None
            })

    ds = MockDataStore()
    scorer = QAScorer(ds, api_key=api_key)

    print("\nCalling OpenAI API... (this may take a few seconds)")
    result = scorer.score_ticket("CS-TEST-002")

    # Print results
    print(f"\nEvaluation Mode: {result['Evaluation_Mode']}")
    print(f"Overall Score: {result['Overall_Weighted_Score']}")
    print(f"Interaction Score: {result['Interaction_QA']['Final_Weighted_Score']}")
    print(f"Case Score: {result['Case_QA']['Final_Weighted_Score']}")
    print(f"QA Recommendation: {result['QA_Recommendation']}")

    # Print any failed parameters
    print("\n📋 Parameter Breakdown:")
    for param, data in result["Interaction_QA"].items():
        if param == "Final_Weighted_Score":
            continue
        if data.get("score") == "No":
            print(f"  ❌ {param}: {data.get('tracking_items', [])}")

    for param, data in result["Case_QA"].items():
        if param == "Final_Weighted_Score":
            continue
        if data.get("score") == "No":
            print(f"  ❌ {param}: {data.get('tracking_items', [])}")

    print("\n✅ LLM test PASSED")
    print("=" * 60)


if __name__ == "__main__":
    try:
        test_template_fallback()
        test_with_llm()
        print("\n🎉 All QA Scorer tests passed!")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
