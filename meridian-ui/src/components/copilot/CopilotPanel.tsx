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
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500">
            <svg
              className="h-3.5 w-3.5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-foreground">AI Copilot</h2>
        </div>
        {isActive && (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {events.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
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
              Type a message or query in the chat to start the Co-pilot.
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
