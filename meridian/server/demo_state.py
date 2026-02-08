"""
Meridian Demo State Tracker
Tracks the progression of the live demo flow through each phase.
"""
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class DemoPhase(str, Enum):
    """Demo pipeline progression phases"""
    READY = "ready"                          # System booted, no demo actions taken
    TICKETS_INJECTED = "tickets_injected"    # Synthetic tickets fed into the system
    GAPS_DETECTED = "gaps_detected"          # Gap detection ran on synthetic tickets
    EMERGING_FLAGGED = "emerging_flagged"    # Emerging issue cluster identified
    DRAFT_GENERATED = "draft_generated"      # KB article drafted
    DRAFT_APPROVED = "draft_approved"        # KB article approved and indexed
    DEMO_COMPLETE = "demo_complete"          # New knowledge retrieved successfully


@dataclass
class DemoState:
    """
    Tracks the state of the live demo pipeline.
    This is used to coordinate the 5-step demo flow during the presentation.
    """
    phase: DemoPhase = DemoPhase.READY
    injected_tickets: List[str] = field(default_factory=list)
    gap_results: List[dict] = field(default_factory=list)
    emerging_issues: List[dict] = field(default_factory=list)
    generated_draft_id: Optional[str] = None
    approved_doc_id: Optional[str] = None
    events_log: List[dict] = field(default_factory=list)  # Timestamped event log
    started_at: Optional[str] = None

    def log_event(self, event_type: str, detail: str):
        """Log a timestamped event to the events log."""
        self.events_log.append({
            "timestamp": datetime.now().isoformat(),
            "phase": self.phase.value,
            "event": event_type,
            "detail": detail
        })

    def to_dict(self) -> dict:
        """Convert state to JSON-serializable dict."""
        return {
            "phase": self.phase.value,
            "injected_tickets": self.injected_tickets,
            "gap_results": [
                {
                    "ticket_number": g.get("ticket_number"),
                    "is_gap": g.get("is_gap"),
                    "similarity": round(g.get("similarity", 0), 4),
                    "best_match": g.get("best_match")
                }
                for g in self.gap_results
            ],
            "emerging_issues": self.emerging_issues,
            "generated_draft_id": self.generated_draft_id,
            "approved_doc_id": self.approved_doc_id,
            "events_log": self.events_log,
            "started_at": self.started_at
        }

    def reset(self):
        """Reset to initial state (for re-running the demo)."""
        self.__init__()
