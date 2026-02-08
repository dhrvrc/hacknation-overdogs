"use client";

import { motion } from "framer-motion";
import { easeOut } from "@/lib/utils";
import CopilotPanel from "@/components/copilot/CopilotPanel";
import LiveChannelPanel from "@/components/copilot/LiveChannelPanel";
import { useCopilot } from "@/hooks/useCopilot";

export default function CopilotView() {
  const [state, actions] = useCopilot();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="h-[calc(100vh-6rem)]"
    >
      {/* Two-panel layout: Left = AI Copilot (38%), Right = Live Channel (62%) */}
      <div className="grid h-full grid-cols-1 gap-0 overflow-hidden rounded-xl border border-border lg:grid-cols-[38%_1fr]">
        {/* Left: AI Copilot Panel */}
        <div className="hidden border-r border-border lg:block">
          <CopilotPanel
            events={state.copilotEvents}
            isActive={state.isPlaying}
            onInsertReply={actions.setSuggestedText}
            onApproveDraft={actions.approveDraft}
            onRejectDraft={actions.rejectDraft}
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
