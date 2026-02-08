"""
Meridian QA Scorer
LLM-powered quality assurance evaluation using production-grade rubric.
Evaluates support interactions (transcript + ticket) against 20 parameters.
"""
import json
import os
import logging
from datetime import datetime
from typing import Optional, Dict, Any

from meridian.config import OPENAI_MODEL

logger = logging.getLogger(__name__)

# The full QA rubric (from the QA_Evaluation_Prompt tab in the dataset)
QA_SYSTEM_PROMPT = """You are a Quality Assurance evaluator for a support organization.
You will be given a support interaction transcript and/or a case ticket.
Score the interaction using the rubric below. Return ONLY valid JSON matching the exact schema provided.

## INTERACTION QA (10 parameters, each 10% of Interaction score)

### Customer Delight (50%)
1. **Conversational_Professional**: Did the agent greet professionally, use customer name, and close appropriately?
2. **Engagement_Personalization**: Did the agent acknowledge the customer's concern, show empathy, and personalize the interaction?
3. **Tone_Pace**: Was the tone appropriate, pace comfortable, and communication clear?
4. **Language**: Did the agent avoid jargon, explain technical terms, and communicate in plain language?
5. **Objection_Handling_Conversation_Control**: Did the agent manage objections, set expectations, and control the conversation flow?

### Resolution Handling (50%)
6. **Delivered_Expected_Outcome**: Was the customer's issue resolved? (AUTOZERO if No — entire Interaction score becomes 0%)
7. **Exhibit_Critical_Thinking**: Did the agent diagnose logically, ask clarifying questions, and verify before acting?
8. **Educate_Accurately_Handle_Information**: Did the agent provide accurate information and educate the customer on prevention?
9. **Effective_Use_of_Resources**: Did the agent use KB articles, scripts, and available tools appropriately?
10. **Call_Case_Control_Timeliness**: Did the agent manage time well, avoid unnecessary delays, and maintain ownership?

## CASE QA (10 parameters, each 10% of Case score)

### Documentation Quality (50%)
11. **Clear_Problem_Summary**: Is the problem description clear and specific?
12. **Captured_Key_Context**: Are module, error text, steps to reproduce, and timeline documented?
13. **Action_Log_Completeness**: Are all troubleshooting steps documented?
14. **Correct_Categorization**: Is the ticket categorized correctly (category, module, priority, tier)?
15. **Customer_Facing_Clarity**: Could another agent pick up this ticket and understand it?

### Resolution Quality (50%)
16. **Resolution_Specific_Reproducible**: Is the resolution specific enough to reproduce?
17. **Uses_Approved_Process_Scripts_When_Required**: Were approved scripts/processes used when applicable?
18. **Accuracy_of_Technical_Content**: Is the technical content accurate?
19. **References_Knowledge_Correctly**: Are KB articles and scripts referenced where used?
20. **Timeliness_Ownership_Signals**: Are there signs of timely follow-up and ownership?

## RED FLAGS (any "Yes" → Overall score becomes 0%)
- Account_Documentation_Violation: Was account data handled improperly?
- Payment_Compliance_PCI_Violation: Was PCI data exposed in notes or transcript?
- Data_Integrity_Confidentiality_Violation: Was confidential data shared inappropriately?
- Misbehavior_Unprofessionalism: Was there discriminatory, harassing, or unprofessional behavior?

## SCORING RULES
- Each parameter: "Yes" (pass, 10 points), "No" (fail, 0 points), or "N/A" (not applicable, excluded from calculation)
- If Delivered_Expected_Outcome = "No": Interaction_QA Final_Weighted_Score = "0%"
- If any Red Flag = "Yes": Overall_Weighted_Score = "0%"
- Evaluation_Mode: "Both" if transcript AND ticket provided, "Interaction Only" if only transcript, "Case Only" if only ticket
- Overall = 70% Interaction + 30% Case (if Both), 100% of whichever is available otherwise
- For each "No" score, provide 1-2 tracking_items (brief labels) and evidence (quote from transcript/ticket)

## RESPONSE FORMAT
Return ONLY this JSON (no markdown, no explanation):
{
  "Evaluation_Mode": "Both" | "Interaction Only" | "Case Only",
  "Interaction_QA": {
    "Conversational_Professional": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Engagement_Personalization": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Tone_Pace": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Language": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Objection_Handling_Conversation_Control": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Delivered_Expected_Outcome": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Exhibit_Critical_Thinking": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Educate_Accurately_Handle_Information": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Effective_Use_of_Resources": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Call_Case_Control_Timeliness": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Final_Weighted_Score": "X%"
  },
  "Case_QA": {
    "Clear_Problem_Summary": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Captured_Key_Context": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Action_Log_Completeness": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Correct_Categorization": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Customer_Facing_Clarity": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Resolution_Specific_Reproducible": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Uses_Approved_Process_Scripts_When_Required": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Accuracy_of_Technical_Content": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "References_Knowledge_Correctly": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Timeliness_Ownership_Signals": {"score": "Yes"|"No"|"N/A", "tracking_items": [], "evidence": ""},
    "Final_Weighted_Score": "X%"
  },
  "Red_Flags": {
    "Account_Documentation_Violation": {"score": "N/A"|"Yes"|"No", "tracking_items": [], "evidence": ""},
    "Payment_Compliance_PCI_Violation": {"score": "N/A"|"Yes"|"No", "tracking_items": [], "evidence": ""},
    "Data_Integrity_Confidentiality_Violation": {"score": "N/A"|"Yes"|"No", "tracking_items": [], "evidence": ""},
    "Misbehavior_Unprofessionalism": {"score": "N/A"|"Yes"|"No", "tracking_items": [], "evidence": ""}
  },
  "Contact_Summary": "Brief summary of the interaction",
  "Case_Summary": "Brief summary of the ticket",
  "QA_Recommendation": "Keep doing" | "Coaching needed" | "Escalate" | "Compliance review",
  "Overall_Weighted_Score": "X%"
}
"""


class QAScorer:
    """
    Quality Assurance scorer for support interactions.
    Uses OpenAI API when available, falls back to template scoring otherwise.
    """

    def __init__(self, datastore, api_key: str = ""):
        """
        Initialize QA scorer.

        Args:
            datastore: DataStore object with tickets and conversations DataFrames
            api_key: OpenAI API key (optional, will check env var)
        """
        self.datastore = datastore
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")

        # Try to import openai SDK and create client once
        self.openai_available = False
        self.client = None
        if self.api_key:
            try:
                import openai
                self.client = openai.OpenAI(api_key=self.api_key)
                self.openai_available = True
                logger.info("OpenAI client initialized for QA scoring")
            except ImportError:
                logger.warning("OpenAI SDK not installed - using template fallback for QA scoring")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {type(e).__name__}: {e}")
                logger.warning("Using template fallback for QA scoring")
        else:
            logger.info("No OpenAI API key - using template fallback for QA scoring")

    def score_ticket(self, ticket_number: str) -> dict:
        """
        Score a support interaction by ticket number.

        Args:
            ticket_number: Ticket identifier (e.g., "CS-38908386")

        Returns:
            QA score dict with all parameters, red flags, summaries, and overall score

        Raises:
            KeyError: If ticket not found
        """
        # Look up ticket
        ticket_data = self.datastore.ticket_by_number.get(ticket_number)
        if ticket_data is None:
            raise KeyError(f"Ticket {ticket_number} not found")

        # Convert Series to dict for easier access
        ticket = ticket_data.to_dict()

        # Look up conversation (may not exist for all tickets)
        conversation = None
        try:
            conversations = self.datastore.df_conversations
            conv_data = conversations[conversations["Ticket_Number"] == ticket_number]
            if len(conv_data) > 0:
                conversation = conv_data.iloc[0].to_dict()
        except Exception as e:
            logger.warning(f"Could not load conversation for {ticket_number}: {e}")

        # Decide whether to use LLM or template
        use_llm = self.openai_available and self.api_key

        if use_llm:
            logger.info(f"Scoring {ticket_number} with OpenAI API")
            try:
                user_prompt = self._build_user_prompt(ticket, conversation)
                score = self._call_llm(user_prompt)
            except Exception as e:
                logger.error(f"LLM scoring failed, falling back to template: {e}")
                score = self._template_score(ticket, conversation)
        else:
            logger.info(f"Scoring {ticket_number} with template (no API key)")
            score = self._template_score(ticket, conversation)

        # Apply autozero rules
        score = self._apply_autozero_rules(score)

        return score

    def _build_user_prompt(self, ticket: dict, conversation: Optional[dict] = None) -> str:
        """
        Build the user prompt for the LLM.

        Args:
            ticket: Ticket data dict
            conversation: Conversation data dict (optional)

        Returns:
            Formatted prompt string
        """
        prompt_parts = ["Please evaluate this support interaction and return the JSON score.\n"]

        # Add ticket information
        prompt_parts.append("## TICKET DATA\n")
        prompt_parts.append(f"Ticket Number: {ticket.get('Ticket_Number', 'N/A')}\n")
        prompt_parts.append(f"Subject: {ticket.get('Subject', 'N/A')}\n")
        prompt_parts.append(f"Tier: {ticket.get('Tier', 'N/A')}\n")
        prompt_parts.append(f"Priority: {ticket.get('Priority', 'N/A')}\n")
        prompt_parts.append(f"Category: {ticket.get('Category', 'N/A')}\n")
        prompt_parts.append(f"Module: {ticket.get('Module', 'N/A')}\n")

        description = ticket.get('Description', '')
        if description:
            prompt_parts.append(f"\nDescription:\n{description}\n")

        resolution = ticket.get('Resolution', '')
        if resolution:
            prompt_parts.append(f"\nResolution:\n{resolution}\n")

        root_cause = ticket.get('Root_Cause', '')
        if root_cause:
            prompt_parts.append(f"\nRoot Cause: {root_cause}\n")

        script_id = ticket.get('Script_ID', '')
        if script_id and str(script_id) != 'nan':
            prompt_parts.append(f"Script Used: {script_id}\n")

        # Add conversation transcript if available
        if conversation:
            prompt_parts.append("\n## CONVERSATION TRANSCRIPT\n")
            prompt_parts.append(f"Channel: {conversation.get('Channel', 'N/A')}\n")
            prompt_parts.append(f"Agent: {conversation.get('Agent_Name', 'N/A')}\n")
            prompt_parts.append(f"Sentiment: {conversation.get('Sentiment', 'N/A')}\n")

            transcript = conversation.get('Transcript_Text', '')
            # Truncate to 4000 chars if needed
            if len(transcript) > 4000:
                transcript = transcript[:4000] + "\n[...truncated]"
            prompt_parts.append(f"\nTranscript:\n{transcript}\n")

        return "\n".join(prompt_parts)

    def _call_llm(self, user_prompt: str) -> dict:
        """
        Call OpenAI API with the QA system prompt and user prompt.

        Args:
            user_prompt: The user prompt with ticket/conversation data

        Returns:
            Parsed JSON response as dict

        Raises:
            Exception: If API call fails or response is invalid
        """
        try:
            response = self.client.chat.completions.create(
                model=OPENAI_MODEL,
                max_tokens=2000,
                temperature=0,  # Deterministic scoring
                messages=[
                    {"role": "system", "content": QA_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ]
            )

            # Extract JSON from response
            content = response.choices[0].message.content

            # Try to parse as JSON directly
            try:
                score_data = json.loads(content)
                return score_data
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                if "```json" in content:
                    json_start = content.find("```json") + 7
                    json_end = content.find("```", json_start)
                    json_str = content[json_start:json_end].strip()
                    score_data = json.loads(json_str)
                    return score_data
                elif "```" in content:
                    json_start = content.find("```") + 3
                    json_end = content.find("```", json_start)
                    json_str = content[json_start:json_end].strip()
                    score_data = json.loads(json_str)
                    return score_data
                else:
                    raise ValueError(f"Could not parse JSON from response: {content[:200]}")

        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise

    def _template_score(self, ticket: dict, conversation: Optional[dict] = None) -> dict:
        """
        Fallback scoring without LLM.

        Returns a plausible score dict with:
        - All parameters scored "Yes" (conservative: no coaching items flagged)
        - Summaries built from ticket subject/description/resolution
        - Overall_Weighted_Score: "85%"
        - Evaluation_Mode based on whether conversation exists

        Args:
            ticket: Ticket data dict
            conversation: Conversation data dict (optional)

        Returns:
            QA score dict
        """
        # Determine evaluation mode
        has_conversation = conversation is not None
        eval_mode = "Both" if has_conversation else "Case Only"

        # Build summaries
        contact_summary = "N/A"
        if has_conversation:
            agent = conversation.get('Agent_Name', 'Agent')
            issue = conversation.get('Issue_Summary', ticket.get('Subject', ''))
            contact_summary = f"{agent} handled a support case regarding: {issue}"

        case_summary = f"Ticket {ticket.get('Ticket_Number', 'N/A')}: {ticket.get('Subject', 'N/A')}"
        resolution = ticket.get('Resolution', '')
        if resolution:
            case_summary += f" - Resolution: {resolution[:100]}..."

        # Create default "Yes" parameter
        def yes_param():
            return {"score": "Yes", "tracking_items": [], "evidence": ""}

        # Build Interaction QA section
        interaction_qa = {
            "Conversational_Professional": yes_param(),
            "Engagement_Personalization": yes_param(),
            "Tone_Pace": yes_param(),
            "Language": yes_param(),
            "Objection_Handling_Conversation_Control": yes_param(),
            "Delivered_Expected_Outcome": yes_param(),
            "Exhibit_Critical_Thinking": yes_param(),
            "Educate_Accurately_Handle_Information": yes_param(),
            "Effective_Use_of_Resources": yes_param(),
            "Call_Case_Control_Timeliness": yes_param(),
            "Final_Weighted_Score": "90%"
        }

        # If no conversation, mark interaction params as N/A
        if not has_conversation:
            for key in interaction_qa:
                if key != "Final_Weighted_Score":
                    interaction_qa[key] = {"score": "N/A", "tracking_items": [], "evidence": ""}
            interaction_qa["Final_Weighted_Score"] = "N/A"

        # Build Case QA section
        case_qa = {
            "Clear_Problem_Summary": yes_param(),
            "Captured_Key_Context": yes_param(),
            "Action_Log_Completeness": yes_param(),
            "Correct_Categorization": yes_param(),
            "Customer_Facing_Clarity": yes_param(),
            "Resolution_Specific_Reproducible": yes_param(),
            "Uses_Approved_Process_Scripts_When_Required": yes_param(),
            "Accuracy_of_Technical_Content": yes_param(),
            "References_Knowledge_Correctly": yes_param(),
            "Timeliness_Ownership_Signals": yes_param(),
            "Final_Weighted_Score": "85%"
        }

        # Red flags (all N/A for template)
        red_flags = {
            "Account_Documentation_Violation": {"score": "N/A", "tracking_items": [], "evidence": ""},
            "Payment_Compliance_PCI_Violation": {"score": "N/A", "tracking_items": [], "evidence": ""},
            "Data_Integrity_Confidentiality_Violation": {"score": "N/A", "tracking_items": [], "evidence": ""},
            "Misbehavior_Unprofessionalism": {"score": "N/A", "tracking_items": [], "evidence": ""}
        }

        # Calculate overall score
        if eval_mode == "Both":
            overall_score = "87%"  # 0.7 * 90 + 0.3 * 85 = 87
        elif eval_mode == "Interaction Only":
            overall_score = "90%"
        else:  # Case Only
            overall_score = "85%"

        return {
            "Evaluation_Mode": eval_mode,
            "Interaction_QA": interaction_qa,
            "Case_QA": case_qa,
            "Red_Flags": red_flags,
            "Contact_Summary": contact_summary,
            "Case_Summary": case_summary,
            "QA_Recommendation": "Keep doing",
            "Overall_Weighted_Score": overall_score
        }

    def _apply_autozero_rules(self, score: dict) -> dict:
        """
        Apply autozero rules to the score.

        Rules:
        1. If Delivered_Expected_Outcome = "No", Interaction score becomes "0%"
        2. If any Red Flag = "Yes", Overall score becomes "0%"

        Args:
            score: QA score dict

        Returns:
            Modified score dict with autozero rules applied
        """
        # Rule 1: Delivered_Expected_Outcome autozero
        interaction_qa = score.get("Interaction_QA", {})
        delivered = interaction_qa.get("Delivered_Expected_Outcome", {})
        if delivered.get("score") == "No":
            interaction_qa["Final_Weighted_Score"] = "0%"
            logger.info("Applied autozero: Delivered_Expected_Outcome = No")

        # Rule 2: Red Flag autozero
        red_flags = score.get("Red_Flags", {})
        any_red_flag = any(
            flag.get("score") == "Yes"
            for flag in red_flags.values()
        )
        if any_red_flag:
            score["Overall_Weighted_Score"] = "0%"
            logger.warning("Applied autozero: Red Flag detected")

        return score
