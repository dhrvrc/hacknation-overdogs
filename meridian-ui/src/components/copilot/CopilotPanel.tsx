"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import type { CopilotEvent } from "@/mock/copilotScenarios";
import ThinkingStep from "./ThinkingStep";
import ToolCallCard from "./ToolCallCard";
import KBResultCard from "./KBResultCard";
import SuggestionCard from "./SuggestionCard";
import GapDetectionCard from "./GapDetectionCard";
import LearnCard from "./LearnCard";
import KnowledgeGainedCard from "./KnowledgeGainedCard";
import SimilarDetectedCard from "./SimilarDetectedCard";

interface CopilotPanelProps {
  events: CopilotEvent[];
  isActive: boolean;
  onInsertReply?: (text: string) => void;
  onApproveDraft?: (draftId: string) => void;
  onRejectDraft?: (draftId: string) => void;
}

export default function CopilotPanel({
  events,
  isActive,
  onInsertReply,
  onApproveDraft,
  onRejectDraft,
}: CopilotPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  const renderEvent = (event: CopilotEvent, index: number) => {
    const isLatest = index === events.length - 1;

    switch (event.type) {
      case "thinking":
        return (
          <ThinkingStep
            key={event.id}
            steps={event.data.steps}
            isLatest={isLatest}
          />
        );
      case "tool_call":
        return <ToolCallCard key={event.id} data={event.data} />;
      case "kb_result":
      case "ticket_result":
        return <KBResultCard key={event.id} results={event.data.results} />;
      case "suggestion":
        return (
          <SuggestionCard
            key={event.id}
            data={event.data}
            onInsertReply={onInsertReply}
          />
        );
      case "gap_detection":
        return <GapDetectionCard key={event.id} data={event.data} />;
      case "learn":
        return (
          <LearnCard
            key={event.id}
            data={event.data}
            onApprove={onApproveDraft}
            onReject={onRejectDraft}
          />
        );
      case "knowledge_gained":
        return <KnowledgeGainedCard key={event.id} data={event.data} />;
      case "similar_detected":
        return <SimilarDetectedCard key={event.id} data={event.data} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {events.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center bg-muted">
              <svg
                className="h-6 w-6 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              Copilot Ready
            </p>
            <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">
              Select a scenario from the channel panel to see the AI copilot in action.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {events.map((event, i) => renderEvent(event, i))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
