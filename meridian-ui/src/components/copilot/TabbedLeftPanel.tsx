"use client";

import { useState, useEffect, useRef } from "react";
import type { CopilotEvent, CopilotScenario } from "@/mock/copilotScenarios";
import type { CustomerProfile, KnowledgeGraphUpdate, CustomerNote } from "@/mock/customerProfiles";
import CopilotPanel from "./CopilotPanel";
import CustomerProfilePanel from "./CustomerProfilePanel";

type TabMode = "copilot" | "profile";

interface TabbedLeftPanelProps {
  events: CopilotEvent[];
  isActive: boolean;
  onInsertReply?: (text: string) => void;
  onApproveDraft?: (draftId: string) => void;
  onRejectDraft?: (draftId: string) => void;
  scenario: CopilotScenario | null;
  customerProfile: CustomerProfile | null;
  graphUpdates: KnowledgeGraphUpdate[];
  customerNotes: CustomerNote[];
  onAddNote: (text: string) => void;
}

export default function TabbedLeftPanel({
  events,
  isActive,
  onInsertReply,
  onApproveDraft,
  onRejectDraft,
  scenario,
  customerProfile,
  graphUpdates,
  customerNotes,
  onAddNote,
}: TabbedLeftPanelProps) {
  const [activeTab, setActiveTab] = useState<TabMode>("copilot");
  const lastSeenEventsRef = useRef(events.length);
  const [hasUnseenEvents, setHasUnseenEvents] = useState(false);

  // Track unseen events when on profile tab
  useEffect(() => {
    if (activeTab === "copilot") {
      lastSeenEventsRef.current = events.length;
      setHasUnseenEvents(false);
    } else if (events.length > lastSeenEventsRef.current) {
      setHasUnseenEvents(true);
    }
  }, [events.length, activeTab]);

  // When switching to copilot, mark all as seen
  const handleTabChange = (tab: TabMode) => {
    if (tab === "copilot") {
      lastSeenEventsRef.current = events.length;
      setHasUnseenEvents(false);
    }
    setActiveTab(tab);
  };

  // Auto-switch to profile when a scenario starts
  useEffect(() => {
    if (scenario) {
      setActiveTab("profile");
    }
  }, [scenario?.id]);

  const tabs: { id: TabMode; label: string; icon: React.ReactNode }[] = [
    {
      id: "copilot",
      label: "Copilot",
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Tab header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex border border-border bg-muted/50 p-0.5">
          {tabs.map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                  isTabActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
                {/* Notification dot for copilot tab */}
                {tab.id === "copilot" && hasUnseenEvents && !isTabActive && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live indicator */}
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

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === "copilot" ? (
          <CopilotPanel
            events={events}
            isActive={isActive}
            onInsertReply={onInsertReply}
            onApproveDraft={onApproveDraft}
            onRejectDraft={onRejectDraft}
          />
        ) : (
          <CustomerProfilePanel
            profile={customerProfile}
            graphUpdates={graphUpdates}
            customerNotes={customerNotes}
            isLive={isActive}
            onAddNote={onAddNote}
          />
        )}
      </div>
    </div>
  );
}
