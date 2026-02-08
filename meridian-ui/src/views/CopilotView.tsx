"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { easeOut } from "@/lib/utils";
import TabbedLeftPanel from "@/components/copilot/TabbedLeftPanel";
import LiveChannelPanel from "@/components/copilot/LiveChannelPanel";
import { useCopilotSimulation } from "@/hooks/useCopilotSimulation";
import { CUSTOMER_PROFILES } from "@/mock/customerProfiles";

type MobilePanel = "chat" | "assist";

export default function CopilotView() {
  const [state, actions] = useCopilotSimulation();
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("chat");

  // Resolve full customer profile from scenario
  const customerProfile = useMemo(() => {
    if (!state.scenario) return null;
    return CUSTOMER_PROFILES[state.scenario.customer.name] || null;
  }, [state.scenario]);

  const leftPanel = (
    <TabbedLeftPanel
      events={state.copilotEvents}
      isActive={state.isPlaying}
      onInsertReply={actions.setSuggestedText}
      onApproveDraft={actions.approveDraft}
      onRejectDraft={actions.rejectDraft}
      scenario={state.scenario}
      customerProfile={customerProfile}
      graphUpdates={state.graphUpdates}
      customerNotes={state.customerNotes}
      onAddNote={actions.addNote}
    />
  );

  const rightPanel = (
    <LiveChannelPanel
      messages={state.messages}
      suggestedReplies={state.suggestedReplies}
      scenario={state.scenario}
      isPlaying={state.isPlaying}
      suggestedText={actions.suggestedText}
      onSendMessage={actions.sendAgentMessage}
      onStartScenario={actions.startScenario}
      onSuggestedReplyClick={(text) => actions.setSuggestedText(text)}
      onResolveIssue={actions.resolveIssue}
      isResolved={state.isResolved}
    />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="flex h-full flex-col"
    >
      {/* Mobile toggle bar — visible only below lg breakpoint */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-muted/30 px-3 py-2 lg:hidden">
        <div className="flex border border-border bg-muted/50 p-0.5">
          {([
            { id: "chat" as MobilePanel, label: "Chat", icon: (
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            )},
            { id: "assist" as MobilePanel, label: "Copilot", icon: (
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )},
          ]).map((tab) => {
            const isActive = mobilePanel === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMobilePanel(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
                {/* Notification dot when copilot has events and user is on chat */}
                {tab.id === "assist" && !isActive && state.copilotEvents.length > 0 && state.isPlaying && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {state.isPlaying && (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        )}
      </div>

      {/* Mobile layout — one panel at a time */}
      <div className="flex-1 overflow-hidden lg:hidden">
        {mobilePanel === "chat" ? (
          <div className="h-full">{rightPanel}</div>
        ) : (
          <div className="h-full">{leftPanel}</div>
        )}
      </div>

      {/* Desktop layout — two-panel grid (hidden on mobile) */}
      <div className="hidden h-full min-h-0 overflow-hidden border border-border lg:grid lg:grid-cols-[38%_1fr]">
        {/* Left: Tabbed Panel (Copilot / Profile) */}
        <div className="h-full min-h-0 border-r border-border flex flex-col overflow-hidden">
          {leftPanel}
        </div>

        {/* Right: Live Communication Channel */}
        <div className="h-full min-h-0">
          {rightPanel}
        </div>
      </div>
    </motion.div>
  );
}
