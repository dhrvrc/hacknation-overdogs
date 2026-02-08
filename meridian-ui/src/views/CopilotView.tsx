"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { easeOut } from "@/lib/utils";
import TabbedLeftPanel from "@/components/copilot/TabbedLeftPanel";
import LiveChannelPanel from "@/components/copilot/LiveChannelPanel";
import { useCopilotSimulation } from "@/hooks/useCopilotSimulation";
import { CUSTOMER_PROFILES } from "@/mock/customerProfiles";

export default function CopilotView() {
  const [state, actions] = useCopilotSimulation();

  // Resolve full customer profile from scenario
  const customerProfile = useMemo(() => {
    if (!state.scenario) return null;
    return CUSTOMER_PROFILES[state.scenario.customer.name] || null;
  }, [state.scenario]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="h-[calc(100svh-5rem)]"
    >
      {/* Two-panel layout: Left = Copilot + Profile (38%), Right = Live Channel (62%) */}
      <div className="grid h-full grid-cols-1 gap-0 overflow-hidden border border-border lg:grid-cols-[38%_1fr]">
        {/* Left: Tabbed Panel (Copilot / Profile) */}
        <div className="hidden border-r border-border lg:block">
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
        </div>

        {/* Right: Live Communication Channel */}
        <div className="min-h-0">
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
        </div>
      </div>
    </motion.div>
  );
}
