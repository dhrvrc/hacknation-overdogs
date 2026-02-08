"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  COPILOT_SCENARIOS,
  type CopilotScenario,
  type CopilotEvent,
  type ChatMessage,
} from "@/mock/copilotScenarios";
import * as api from "@/lib/api";
import {
  buildQueryEvents,
  buildGapEvents,
  buildLearnEvents,
} from "@/lib/buildCopilotEvents";

// ── Public state & actions interfaces ────────────────────────

export interface SimulationState {
  scenario: CopilotScenario | null;
  messages: ChatMessage[];
  copilotEvents: CopilotEvent[];
  suggestedReplies: string[];
  isPlaying: boolean;
  isResolved: boolean;
  currentMessageIndex: number;
}

export interface SimulationActions {
  startScenario: (id: string) => void;
  sendAgentMessage: (text: string) => void;
  resolveIssue: () => void;
  reset: () => void;
  setSuggestedText: (text: string) => void;
  suggestedText: string;
  approveDraft: (draftId: string) => void;
  rejectDraft: (draftId: string) => void;
}

// ── Hook ─────────────────────────────────────────────────────

export function useCopilotSimulation(): [SimulationState, SimulationActions] {
  const [scenario, setScenario] = useState<CopilotScenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copilotEvents, setCopilotEvents] = useState<CopilotEvent[]>([]);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(-1);
  const [suggestedText, setSuggestedText] = useState("");

  // Refs for timeout management and avoiding stale closures
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scenarioRef = useRef<CopilotScenario | null>(null);
  const messageIndexRef = useRef(-1);

  useEffect(() => {
    scenarioRef.current = scenario;
  }, [scenario]);

  useEffect(() => {
    messageIndexRef.current = currentMessageIndex;
  }, [currentMessageIndex]);

  // ── Timeout helpers ──────────────────────────────────────

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
    return t;
  }, []);

  // ── Event helpers ────────────────────────────────────────

  const addCopilotEvent = useCallback((event: CopilotEvent) => {
    setCopilotEvents((prev) => [...prev, event]);
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  /**
   * Add a list of CopilotEvents with staggered delays for animation.
   * Each event's delayMs is cumulative from the previous.
   */
  const staggerEvents = useCallback(
    (events: CopilotEvent[]) => {
      let cumulative = 0;
      events.forEach((event) => {
        cumulative += event.delayMs;
        addTimeout(() => addCopilotEvent(event), cumulative);
      });
      return cumulative;
    },
    [addCopilotEvent, addTimeout]
  );

  // ── API-driven copilot event triggers ────────────────────

  /**
   * When a customer message arrives at the query trigger index,
   * call the real POST /api/query and build copilot events from
   * the response.
   */
  const triggerQuerySearch = useCallback(
    async (sc: CopilotScenario) => {
      // Show initial "thinking" indicator while API call is in flight
      addCopilotEvent({
        id: `loading-${Date.now()}`,
        type: "thinking",
        delayMs: 0,
        data: {
          steps: [
            `New issue received. Analyzing...`,
            `Searching knowledge base and historical tickets...`,
          ],
        },
      });

      try {
        const response = await api.queryEngine(sc.queryText);
        const events = buildQueryEvents(sc.queryText, response);
        staggerEvents(events);
      } catch (err) {
        console.error("Copilot query failed:", err);
        addCopilotEvent({
          id: `error-${Date.now()}`,
          type: "thinking",
          delayMs: 0,
          data: {
            steps: [
              "Unable to reach the intelligence engine.",
              "The conversation can continue — copilot suggestions are temporarily unavailable.",
            ],
          },
        });
      }
    },
    [addCopilotEvent, staggerEvents]
  );

  /**
   * Trigger scripted follow-up events (thinking + optional suggestion)
   * for messages after the initial query.
   */
  const triggerFollowUp = useCallback(
    (sc: CopilotScenario, msgIndex: number) => {
      const followUp = sc.followUps.find(
        (f) => f.afterMessageIndex === msgIndex
      );
      if (!followUp) return;

      const events: CopilotEvent[] = [];

      // Thinking event
      events.push({
        id: `followup-think-${msgIndex}-${Date.now()}`,
        type: "thinking",
        delayMs: 400,
        data: { steps: followUp.thinkingSteps },
      });

      // Optional suggestion
      if (followUp.suggestion) {
        events.push({
          id: `followup-suggest-${msgIndex}-${Date.now()}`,
          type: "suggestion",
          delayMs: 500,
          data: followUp.suggestion,
        });
      }

      staggerEvents(events);
    },
    [staggerEvents]
  );

  /**
   * Master trigger: decides whether to fire an API query,
   * a scripted follow-up, or both.
   */
  const triggerCopilotEvents = useCallback(
    (msgIndex: number, sc: CopilotScenario) => {
      // Main API query trigger
      if (msgIndex === sc.queryAfterMessageIndex) {
        triggerQuerySearch(sc);
      }

      // Follow-up triggers (for later messages)
      if (msgIndex !== sc.queryAfterMessageIndex) {
        triggerFollowUp(sc, msgIndex);
      }

      // Show suggested replies
      const repliesTrigger = sc.suggestedReplies?.find(
        (r) => r.afterMessageIndex === msgIndex
      );
      if (repliesTrigger) {
        addTimeout(() => {
          setSuggestedReplies(repliesTrigger.replies);
        }, 1500);
      }
    },
    [triggerQuerySearch, triggerFollowUp, addTimeout]
  );

  // ── Message playback ─────────────────────────────────────

  const playNextMessage = useCallback(
    (sc: CopilotScenario, index: number) => {
      if (index >= sc.messages.length) {
        setIsPlaying(false);
        return;
      }

      const scenarioMsg = sc.messages[index];

      if (scenarioMsg.sender === "customer") {
        const msg: ChatMessage = {
          id: `msg-${Date.now()}-${index}`,
          sender: "customer",
          name: scenarioMsg.name,
          text: scenarioMsg.text,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        addMessage(msg);
        setCurrentMessageIndex(index);

        // Trigger copilot events for this message
        triggerCopilotEvents(index, sc);

        // Wait for agent to respond before continuing
      } else {
        // Auto agent message
        const msg: ChatMessage = {
          id: `msg-${Date.now()}-${index}`,
          sender: "agent",
          name: sc.agent.name,
          text: scenarioMsg.text,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        addMessage(msg);
        setCurrentMessageIndex(index);

        // Continue to next message after a delay
        const nextDelay =
          index + 1 < sc.messages.length ? sc.messages[index + 1].delayMs : 0;
        if (index + 1 < sc.messages.length) {
          addTimeout(
            () => playNextMessage(sc, index + 1),
            Math.min(nextDelay, 3000)
          );
        }
      }
    },
    [addMessage, triggerCopilotEvents, addTimeout]
  );

  // ── Public actions ───────────────────────────────────────

  const startScenario = useCallback(
    (id: string) => {
      clearAllTimeouts();

      const sc = COPILOT_SCENARIOS.find((s) => s.id === id);
      if (!sc) return;

      setMessages([]);
      setCopilotEvents([]);
      setSuggestedReplies([]);
      setIsResolved(false);
      setCurrentMessageIndex(-1);
      setSuggestedText("");
      setScenario(sc);
      setIsPlaying(true);

      addTimeout(() => playNextMessage(sc, 0), 800);
    },
    [clearAllTimeouts, playNextMessage, addTimeout]
  );

  const sendAgentMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const sc = scenarioRef.current;
      if (!sc) return;

      const msg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: "agent",
        name: sc.agent.name,
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      addMessage(msg);
      setSuggestedReplies([]);
      setSuggestedText("");

      // After agent sends, trigger the next customer message
      const nextIndex = messageIndexRef.current + 1;
      if (nextIndex < sc.messages.length) {
        const nextMsg = sc.messages[nextIndex];
        const delay = Math.min(nextMsg.delayMs, 3000);
        addTimeout(() => playNextMessage(sc, nextIndex), delay);
      } else {
        setIsPlaying(false);
      }
    },
    [addMessage, playNextMessage, addTimeout]
  );

  /**
   * Resolve the issue. If the scenario has a ticketNumber,
   * check for gaps and potentially generate a KB draft.
   */
  const resolveIssue = useCallback(async () => {
    setIsResolved(true);
    setIsPlaying(false);
    clearAllTimeouts();

    const sc = scenarioRef.current;
    if (!sc?.ticketNumber) return;

    // Only run gap detection for gap scenarios
    if (!sc.isGapScenario) return;

    try {
      // Add thinking event while checking gap
      addCopilotEvent({
        id: `resolve-think-${Date.now()}`,
        type: "thinking",
        delayMs: 0,
        data: {
          steps: [
            "Issue resolved. Checking for knowledge gaps...",
            `Comparing resolution against KB corpus for ticket ${sc.ticketNumber}...`,
          ],
        },
      });

      // Check for gap
      const gapResult = await api.checkGap(sc.ticketNumber);
      const gapEvents = buildGapEvents(gapResult);
      if (gapEvents.length > 0) {
        staggerEvents(gapEvents);

        // Generate KB draft
        addTimeout(async () => {
          try {
            addCopilotEvent({
              id: `gen-think-${Date.now()}`,
              type: "thinking",
              delayMs: 0,
              data: {
                steps: [
                  "Knowledge gap confirmed. Generating KB article draft...",
                  "Extracting resolution steps from ticket and conversation...",
                ],
              },
            });

            const draft = await api.generateKBDraft(sc.ticketNumber!);
            const learnEvents = buildLearnEvents(draft);
            staggerEvents(learnEvents);
          } catch (err) {
            console.error("KB generation failed:", err);
          }
        }, 1500);
      }
    } catch (err) {
      console.error("Gap check failed:", err);
    }
  }, [clearAllTimeouts, addCopilotEvent, staggerEvents, addTimeout]);

  /**
   * Approve a KB draft — calls the real backend API.
   */
  const approveDraft = useCallback(async (draftId: string) => {
    try {
      await api.approveDraft(draftId);
    } catch (err) {
      console.error("Approve draft failed:", err);
    }
    // Update local state regardless (optimistic)
    setCopilotEvents((prev) =>
      prev.map((e) =>
        e.type === "learn" && e.data?.draftId === draftId
          ? { ...e, data: { ...e.data, status: "approved" } }
          : e
      )
    );
  }, []);

  /**
   * Reject a KB draft — calls the real backend API.
   */
  const rejectDraft = useCallback(async (draftId: string) => {
    try {
      await api.rejectDraft(draftId);
    } catch (err) {
      console.error("Reject draft failed:", err);
    }
    // Update local state regardless (optimistic)
    setCopilotEvents((prev) =>
      prev.map((e) =>
        e.type === "learn" && e.data?.draftId === draftId
          ? { ...e, data: { ...e.data, status: "rejected" } }
          : e
      )
    );
  }, []);

  const reset = useCallback(() => {
    clearAllTimeouts();
    setScenario(null);
    setMessages([]);
    setCopilotEvents([]);
    setSuggestedReplies([]);
    setIsPlaying(false);
    setIsResolved(false);
    setCurrentMessageIndex(-1);
    setSuggestedText("");
  }, [clearAllTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  const state: SimulationState = {
    scenario,
    messages,
    copilotEvents,
    suggestedReplies,
    isPlaying,
    isResolved,
    currentMessageIndex,
  };

  const actions: SimulationActions = {
    startScenario,
    sendAgentMessage,
    resolveIssue,
    reset,
    setSuggestedText,
    suggestedText,
    approveDraft,
    rejectDraft,
  };

  return [state, actions];
}
