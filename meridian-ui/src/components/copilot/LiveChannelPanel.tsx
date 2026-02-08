"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage, CopilotScenario } from "@/mock/copilotScenarios";
import { COPILOT_SCENARIOS } from "@/mock/copilotScenarios";

// ── Types ────────────────────────────────────────────────────

type ChannelMode = "chat" | "video" | "phone";

interface LiveChannelPanelProps {
  messages: ChatMessage[];
  suggestedReplies: string[];
  scenario: CopilotScenario | null;
  isPlaying: boolean;
  suggestedText: string;
  onSendMessage: (text: string) => void;
  onStartScenario: (id: string) => void;
  onSuggestedReplyClick: (text: string) => void;
  onResolveIssue: () => void;
  isResolved: boolean;
}

// ── Channel Mode Tabs ────────────────────────────────────────

function ChannelTabs({
  mode,
  setMode,
  scenario,
}: {
  mode: ChannelMode;
  setMode: (m: ChannelMode) => void;
  scenario: CopilotScenario | null;
}) {
  const tabs: { id: ChannelMode; label: string; icon: React.ReactNode }[] = [
    {
      id: "chat",
      label: "Chat",
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
    },
    {
      id: "video",
      label: "Video",
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      ),
    },
    {
      id: "phone",
      label: "Phone",
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
      {tabs.map((tab) => {
        const isActive = mode === tab.id;
        const isScenarioChannel = scenario?.channel === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${isActive
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {tab.icon}
            {tab.label}
            {isScenarioChannel && scenario && !isActive && (
              <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function LiveChannelPanel({
  messages,
  suggestedReplies,
  scenario,
  isPlaying,
  suggestedText,
  onSendMessage,
  onStartScenario,
  onSuggestedReplyClick,
  onResolveIssue,
  isResolved,
}: LiveChannelPanelProps) {
  const [channelMode, setChannelMode] = useState<ChannelMode>("chat");
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // When suggestedText changes, populate the input
  useEffect(() => {
    if (suggestedText) {
      setInputValue(suggestedText);
      inputRef.current?.focus();
    }
  }, [suggestedText]);

  // Set channel mode from scenario
  useEffect(() => {
    if (scenario?.channel) {
      setChannelMode(scenario.channel);
    }
  }, [scenario]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <ChannelTabs mode={channelMode} setMode={setChannelMode} scenario={scenario} />

        <div className="ml-auto flex items-center gap-2">
          {/* Scenario picker */}
          <select
            value={scenario?.id || ""}
            onChange={(e) => {
              if (e.target.value) onStartScenario(e.target.value);
            }}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors hover:border-muted-foreground/50 focus:ring-1 focus:ring-ring"
          >
            <option value="">Select scenario...</option>
            {COPILOT_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          {/* Resolve button */}
          {scenario && !isResolved && messages.length > 0 && (
            <button
              onClick={onResolveIssue}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 13l4 4L19 7" />
              </svg>
              Resolve
            </button>
          )}
        </div>
      </div>

      {/* Customer info bar */}
      {scenario && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {scenario.customer.name.charAt(0)}
          </div>
          <div>
            <span className="text-xs font-medium text-foreground">
              {scenario.customer.name}
            </span>
            <span className="mx-1.5 text-[10px] text-muted-foreground">•</span>
            <span className="text-[11px] text-muted-foreground">
              {scenario.customer.company}
            </span>
          </div>
          {isPlaying && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Active
            </span>
          )}
          {isResolved && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              ✓ Resolved
            </span>
          )}
        </div>
      )}

      {/* Chat / Video / Phone area */}
      <div className="flex-1 overflow-y-auto">
        {channelMode === "chat" ? (
          <div className="px-4 py-3">
            {messages.length === 0 && !scenario ? (
              <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                  <svg
                    className="h-6 w-6 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  Ready for Inquiry
                </p>
                <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                  Type a customer query or issue description below to trigger the Copilot.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        ) : (
          /* Video / Phone placeholder */
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              {channelMode === "video" ? (
                <svg className="h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              ) : (
                <svg className="h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
              )}
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              {channelMode === "video" ? "Video Call" : "Phone Call"} in Progress
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {scenario
                ? `Connected with ${scenario.customer.name}`
                : "No active call"}
            </p>
            {scenario && (
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  {channelMode === "video" ? "Recording" : "On Call"} — {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggested reply chips + Compose bar */}
      {channelMode === "chat" && (
        <div className="border-t border-border">
          {/* Suggested replies */}
          <AnimatePresence>
            {suggestedReplies.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-border bg-muted/20 px-4 py-2"
              >
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Suggested Replies
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedReplies.map((reply, i) => (
                    <button
                      key={i}
                      onClick={() => onSuggestedReplyClick(reply)}
                      className="max-w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-left text-[11px] text-foreground transition-colors hover:bg-muted"
                    >
                      <span className="line-clamp-2">{reply}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compose bar */}
          <div className="flex items-center gap-2 px-4 py-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a reply..."
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
              disabled={isResolved}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isResolved}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Message Bubble ───────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAgent = message.sender === "agent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${isAgent
          ? "rounded-br-md bg-foreground text-background"
          : "rounded-bl-md border border-border bg-card text-foreground"
          }`}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-semibold ${isAgent ? "text-background/70" : "text-muted-foreground"
              }`}
          >
            {message.name}
          </span>
          <span
            className={`text-[9px] ${isAgent ? "text-background/50" : "text-muted-foreground/60"
              }`}
          >
            {message.timestamp}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed">{message.text}</p>
      </div>
    </motion.div>
  );
}
