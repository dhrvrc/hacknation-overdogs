"""
Test Synthetic Tickets Module
Validates that all synthetic data meets acceptance criteria.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from meridian.server.synthetic_tickets import (
    get_synthetic_tickets,
    get_synthetic_conversations,
    get_demo_questions,
    validate_synthetic_data,
    ticket_to_dataframe_row,
    conversation_to_dataframe_row
)


def main():
    print("=" * 70)
    print("Synthetic Tickets Test")
    print("=" * 70)

    # Run validation
    validation = validate_synthetic_data()

    if validation["valid"]:
        print("\n✅ All validation checks PASSED\n")
    else:
        print("\n❌ Validation FAILED\n")
        for error in validation["errors"]:
            print(f"  ERROR: {error}")

    if validation["warnings"]:
        print("\n⚠️  Warnings:")
        for warning in validation["warnings"]:
            print(f"  {warning}")

    # Get data
    tickets = get_synthetic_tickets()
    conversations = get_synthetic_conversations()
    questions = get_demo_questions()

    print(f"\n📊 Summary:")
    print(f"  Tickets: {len(tickets)}")
    print(f"  Conversations: {len(conversations)}")
    print(f"  Demo Questions: {len(questions)}")

    # Show details
    print("\n📝 Ticket Details:")
    for i, ticket in enumerate(tickets, 1):
        print(f"\n  {i}. {ticket['Ticket_Number']}")
        print(f"     Subject: {ticket['Subject']}")
        print(f"     Tier: {ticket['Tier']}, Priority: {ticket['Priority']}")
        print(f"     Root Cause: {ticket['Root_Cause']}")

    # Tier distribution
    tier_counts = {}
    priority_counts = {}
    for ticket in tickets:
        tier = ticket.get("Tier")
        priority = ticket.get("Priority")
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
        priority_counts[priority] = priority_counts.get(priority, 0) + 1

    print(f"\n  Tier Distribution: {tier_counts}")
    print(f"  Priority Distribution: {priority_counts}")

    # Test conversion functions
    print("\n🔄 Testing Conversion Functions:")
    test_ticket_row = ticket_to_dataframe_row(tickets[0])
    print(f"  ✅ ticket_to_dataframe_row() - keys: {len(test_ticket_row)}")

    test_conv_row = conversation_to_dataframe_row(conversations[0])
    print(f"  ✅ conversation_to_dataframe_row() - keys: {len(test_conv_row)}")

    # Show demo questions
    print("\n❓ Demo Questions:")
    for i, q in enumerate(questions, 1):
        print(f"\n  {i}. {q['question'][:80]}...")
        print(f"     Expected Type: {q['expected_answer_type']}")

    print("\n" + "=" * 70)

    if validation["valid"]:
        print("✅ All tests PASSED - Synthetic data is ready for demo!")
        print("=" * 70)
        return 0
    else:
        print("❌ Tests FAILED - Fix errors before using in demo")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
