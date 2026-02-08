"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { CopilotEvent } from "@/mock/copilotScenarios";
import type { ConversationData } from "@/hooks/useCopilotSimulation";
import ThinkingStep from "./ThinkingStep";
import ToolCallCard from "./ToolCallCard";
import KBResultCard from "./KBResultCard";
import SuggestionCard from "./SuggestionCard";
import GapDetectionCard from "./GapDetectionCard";
import LearnCard from "./LearnCard";
import ConversationPanel from "@/components/ConversationPanel";
import KnowledgeGainedCard from "./KnowledgeGainedCard";
import SimilarDetectedCard from "./SimilarDetectedCard";

interface CopilotPanelProps {
  events: CopilotEvent[];
  isActive: boolean;
  onInsertReply?: (text: string) => void;
  onApproveDraft?: (draftId: string) => void;
  onRejectDraft?: (draftId: string) => void;
  onViewConversation?: (ticketNumber: string) => void;
  activeConversation?: ConversationData | null;
  onCloseConversation?: () => void;
}

export default function CopilotPanel({
  events,
  isActive,
  onInsertReply,
  onApproveDraft,
  onRejectDraft,
  onViewConversation,
  activeConversation,
  onCloseConversation,
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
        return (
          <KBResultCard
            key={event.id}
            results={event.data.results}
            onViewConversation={onViewConversation}
          />
        );
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
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-6 w-6 items-center justify-center bg-gradient-to-br from-violet-500 to-blue-500">
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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
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

      {/* Conversation slide-over */}
      <AnimatePresence>
        {activeConversation && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-0 z-20 flex flex-col bg-background"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-xs font-medium text-foreground">
                Conversation: {activeConversation.ticket_number}
              </span>
              <button
                onClick={onCloseConversation}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <ConversationPanel conversation={activeConversation} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
