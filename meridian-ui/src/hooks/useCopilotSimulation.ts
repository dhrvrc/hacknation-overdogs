"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  COPILOT_SCENARIOS,
  type CopilotScenario,
  type CopilotEvent,
  type ChatMessage,
} from "@/mock/copilotScenarios";
import type { KnowledgeGraphUpdate, CustomerNote } from "@/mock/customerProfiles";

// ── Public timeline item (message or copilot event) ──────────

export interface TimelineItem {
  id: string;
  kind: "message" | "copilot";
  /** For messages */
  message?: ChatMessage;
  /** For copilot events */
  event?: CopilotEvent;
  /** Timestamp of insertion */
  ts: number;
}

export interface SimulationState {
  /** Currently selected scenario */
  scenario: CopilotScenario | null;
  /** All messages in the conversation */
  messages: ChatMessage[];
  /** Copilot timeline events */
  copilotEvents: CopilotEvent[];
  /** Suggested reply chips currently visible */
  suggestedReplies: string[];
  /** Whether the simulation is currently playing */
  isPlaying: boolean;
  /** Whether the issue has been resolved */
  isResolved: boolean;
  /** The current message index in the scenario */
  currentMessageIndex: number;
  /** Accumulated knowledge graph updates from the conversation */
  graphUpdates: KnowledgeGraphUpdate[];
  /** Agent notes added during the session */
  customerNotes: CustomerNote[];
}

export interface SimulationActions {
  /** Start playing a scenario by ID */
  startScenario: (id: string) => void;
  /** Agent sends a message (typed or suggested) */
  sendAgentMessage: (text: string) => void;
  /** Mark the issue as resolved (triggers learn event for gap scenarios) */
  resolveIssue: () => void;
  /** Reset simulation to initial state */
  reset: () => void;
  /** Insert text into compose bar from a suggestion card */
  setSuggestedText: (text: string) => void;
  /** Current compose bar suggestion text */
  suggestedText: string;
  /** Approve a KB draft */
  approveDraft: (draftId: string) => void;
  /** Reject a KB draft */
  rejectDraft: (draftId: string) => void;
  /** Add a note to the customer record */
  addNote: (text: string) => void;
}

export function useCopilotSimulation(): [SimulationState, SimulationActions] {
  const [scenario, setScenario] = useState<CopilotScenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copilotEvents, setCopilotEvents] = useState<CopilotEvent[]>([]);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(-1);
  const [suggestedText, setSuggestedText] = useState("");
  const [graphUpdates, setGraphUpdates] = useState<KnowledgeGraphUpdate[]>([]);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);

  // Refs for timeout management
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scenarioRef = useRef<CopilotScenario | null>(null);
  const messageIndexRef = useRef(-1);

  // Keep refs in sync
  useEffect(() => {
    scenarioRef.current = scenario;
  }, [scenario]);

  useEffect(() => {
    messageIndexRef.current = currentMessageIndex;
  }, [currentMessageIndex]);

  // Cleanup all pending timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // Add a copilot event
  const addCopilotEvent = useCallback((event: CopilotEvent) => {
    setCopilotEvents((prev) => [...prev, event]);
  }, []);

  // Add a message
  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Trigger copilot events for a given message index
  const triggerCopilotEvents = useCallback(
    (msgIndex: number, sc: CopilotScenario) => {
      const trigger = sc.copilotTriggers.find(
        (t) => t.afterMessageIndex === msgIndex
      );
      if (!trigger) return;

      let cumulativeDelay = 0;
      trigger.events.forEach((event) => {
        cumulativeDelay += event.delayMs;
        const t = setTimeout(() => {
          addCopilotEvent(event);
        }, cumulativeDelay);
        timeoutsRef.current.push(t);
      });

      // Update suggested replies
      const repliesTrigger = sc.suggestedReplies?.find(
        (r) => r.afterMessageIndex === msgIndex
      );
      if (repliesTrigger) {
        const t = setTimeout(() => {
          setSuggestedReplies(repliesTrigger.replies);
        }, cumulativeDelay + 200);
        timeoutsRef.current.push(t);
      }

      // Process knowledge graph updates
      const graphTrigger = sc.graphUpdates?.find(
        (g) => g.afterMessageIndex === msgIndex
      );
      if (graphTrigger) {
        const t = setTimeout(() => {
          setGraphUpdates((prev) => [
            ...prev,
            { nodes: graphTrigger.newNodes, edges: graphTrigger.newEdges },
          ]);
        }, cumulativeDelay + (graphTrigger.delayMs || 0));
        timeoutsRef.current.push(t);
      }
    },
    [addCopilotEvent]
  );

  // Play the next customer message
  const playNextMessage = useCallback(
    (sc: CopilotScenario, index: number) => {
      if (index >= sc.messages.length) {
        setIsPlaying(false);
        return;
      }

      const scenarioMsg = sc.messages[index];
      // Only auto-play customer messages; agent messages are sent manually
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
        // The next customer message will be triggered after agent sends a message
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
          const t = setTimeout(() => {
            playNextMessage(sc, index + 1);
          }, Math.min(nextDelay, 3000));
          timeoutsRef.current.push(t);
        }
      }
    },
    [addMessage, triggerCopilotEvents]
  );

  // Start a scenario
  const startScenario = useCallback(
    (id: string) => {
      clearAllTimeouts();

      const sc = COPILOT_SCENARIOS.find((s) => s.id === id);
      if (!sc) return;

      // Reset state
      setMessages([]);
      setCopilotEvents([]);
      setSuggestedReplies([]);
      setIsResolved(false);
      setCurrentMessageIndex(-1);
      setSuggestedText("");
      setGraphUpdates([]);
      setCustomerNotes([]);
      setScenario(sc);
      setIsPlaying(true);

      // Start playing after a short delay
      const t = setTimeout(() => {
        playNextMessage(sc, 0);
      }, 800);
      timeoutsRef.current.push(t);
    },
    [clearAllTimeouts, playNextMessage]
  );

  // Agent sends a message
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
        const t = setTimeout(() => {
          playNextMessage(sc, nextIndex);
        }, delay);
        timeoutsRef.current.push(t);
      } else {
        setIsPlaying(false);
      }
    },
    [addMessage, playNextMessage]
  );

  // Resolve issue
  const resolveIssue = useCallback(() => {
    setIsResolved(true);
    setIsPlaying(false);
    clearAllTimeouts();
  }, [clearAllTimeouts]);

  // Reset
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
    setGraphUpdates([]);
    setCustomerNotes([]);
  }, [clearAllTimeouts]);

  // Approve draft
  const approveDraft = useCallback((draftId: string) => {
    setCopilotEvents((prev) =>
      prev.map((e) =>
        e.type === "learn" && e.data?.draftId === draftId
          ? { ...e, data: { ...e.data, status: "approved" } }
          : e
      )
    );
  }, []);

  // Add a note to the customer record
  const addNote = useCallback((text: string) => {
    const note: CustomerNote = {
      id: `note-${Date.now()}`,
      text,
      author: scenarioRef.current?.agent.name || "Agent",
      timestamp: new Date().toISOString(),
    };
    setCustomerNotes((prev) => [...prev, note]);
  }, []);

  // Reject draft
  const rejectDraft = useCallback((draftId: string) => {
    setCopilotEvents((prev) =>
      prev.map((e) =>
        e.type === "learn" && e.data?.draftId === draftId
          ? { ...e, data: { ...e.data, status: "rejected" } }
          : e
      )
    );
  }, []);

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
    graphUpdates,
    customerNotes,
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
    addNote,
  };

  return [state, actions];
}
