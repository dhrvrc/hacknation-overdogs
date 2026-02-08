"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import * as api from "@/lib/api";
import {
    type CopilotEvent,
    type ChatMessage,
} from "@/mock/copilotScenarios";

// Reuse the same interface as the simulation for compatibility
export interface CopilotState {
    // Scenario is null in real mode
    scenario: any; // Using any to avoid strict null checks in UI if not ready
    messages: ChatMessage[];
    copilotEvents: CopilotEvent[];
    suggestedReplies: string[];
    isPlaying: boolean;
    isResolved: boolean;
    currentMessageIndex: number;
}

export interface CopilotActions {
    startScenario: (id: string) => void;
    sendAgentMessage: (text: string) => void;
    resolveIssue: () => void;
    reset: () => void;
    setSuggestedText: (text: string) => void;
    suggestedText: string;
    approveDraft: (draftId: string) => void;
    rejectDraft: (draftId: string) => void;
}

export function useCopilot(): [CopilotState, CopilotActions] {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [copilotEvents, setCopilotEvents] = useState<CopilotEvent[]>([]);
    const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
    const [isResolved, setIsResolved] = useState(false);
    const [suggestedText, setSuggestedText] = useState("");
    const [isPlaying, setIsPlaying] = useState(false);

    // Helper to add a timeline event
    const addEvent = useCallback((event: CopilotEvent) => {
        setCopilotEvents((prev) => [...prev, event]);
    }, []);

    // Sending a message triggers the API
    const sendAgentMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;

        // 1. Add Agent Message
        const msg: ChatMessage = {
            id: `agent-${Date.now()}`,
            sender: "agent",
            name: "You",
            text: text.trim(),
            timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };

        // Clear previous events if starting a new query? 
        // Usually copilot keeps history, but for this demo let's keep adding.
        setMessages((prev) => [...prev, msg]);
        setSuggestedText("");
        setIsPlaying(true); // Show as "active"

        // 2. Add Thinking Event
        const thinkId = `think-${Date.now()}`;
        // We add it immediately
        setCopilotEvents((prev) => [...prev, {
            id: thinkId,
            type: "thinking",
            delayMs: 0,
            data: {
                steps: [
                    `Analyzing query: "${text}"`,
                    "Identifying intent and key entities...",
                ],
            },
        }]);

        try {
            // 3. Call API
            const result = await api.queryEngine(text);

            const timestamp = Date.now();

            // 4. Update Thinking with Classification / Tool Call
            const classifyEvent: CopilotEvent = {
                id: `tool-classify-${timestamp}`,
                type: "tool_call",
                delayMs: 300,
                data: {
                    tool: "classify_intent",
                    status: "complete",
                    input: { query: text },
                    output: {
                        intent: result.predicted_type,
                        confidence: result.confidence_scores ? result.confidence_scores[result.predicted_type] : 0.99,
                    },
                },
            };

            // 5. Add Search Tool Call
            const searchEvent: CopilotEvent = {
                id: `tool-search-${timestamp}`,
                type: "tool_call",
                delayMs: 300,
                data: {
                    tool: "search_kb",
                    status: "complete",
                    input: { query: text, top_k: 5 },
                    output: {
                        results_count: result.primary_results ? result.primary_results.length : 0,
                        top_match: (result.primary_results && result.primary_results[0])
                            ? `${result.primary_results[0].doc_id} (${Math.round(result.primary_results[0].score * 100)}%)`
                            : "No matches",
                    },
                },
            };

            // Add these events
            setCopilotEvents((prev) => [...prev, classifyEvent, searchEvent]);

            // 6. Display Results
            // Filter results by type
            const primary = result.primary_results || [];
            const kbResults = primary.filter((r: any) => r.doc_type === "KB" || r.doc_type === "SCRIPT");
            const ticketResults = primary.filter((r: any) => r.doc_type === "TICKET");

            if (kbResults.length > 0) {
                setCopilotEvents((prev) => [...prev, {
                    id: `res-kb-${timestamp}`,
                    type: "kb_result",
                    delayMs: 300,
                    data: {
                        results: kbResults,
                    },
                }]);
            }

            if (ticketResults.length > 0) {
                setCopilotEvents((prev) => [...prev, {
                    id: `res-ticket-${timestamp}`,
                    type: "ticket_result",
                    delayMs: 300,
                    data: {
                        results: ticketResults,
                    },
                }]);
            }

            // 7. Add Gap Detection (if no results or low confidence)
            if (primary.length === 0) {
                setCopilotEvents((prev) => [...prev, {
                    id: `gap-${timestamp}`,
                    type: "gap_detection",
                    delayMs: 500,
                    data: {
                        topic: "Unknown Issue",
                        module: "General",
                        description: "No relevant knowledge found. This issue may be a gap in our knowledge base.",
                    }
                }]);
            }

            // 8. Suggestion
            if (primary.length > 0) {
                const best = primary[0];
                setCopilotEvents((prev) => [...prev, {
                    id: `suggest-${timestamp}`,
                    type: "suggestion",
                    delayMs: 600,
                    data: {
                        title: "Recommended Action",
                        description: `Use ${best.title}`,
                        actions: ["Review the result"],
                        replyText: `Based on the search results, I recommend checking ${best.title}.`
                    }
                }]);

                setSuggestedReplies([
                    `Based on ${best.doc_id}, you should...`,
                    `I found a relevant article: ${best.title}`
                ]);
            } else {
                setSuggestedReplies(["I could not find any relevant information."]);
            }


        } catch (e: any) {
            console.error("API Error", e);
            setCopilotEvents((prev) => [...prev, {
                id: `err-${Date.now()}`,
                type: "thinking",
                delayMs: 0,
                data: {
                    steps: [`Error: ${e.message || "Failed to contact server."}`],
                },
            }]);
        } finally {
            setIsPlaying(false);
        }
    }, []);

    const approveDraft = useCallback(async (draftId: string) => {
        try {
            await api.approveDraft(draftId);
            setCopilotEvents((prev) =>
                prev.map((e) =>
                    e.type === "learn" && e.data?.draftId === draftId
                        ? { ...e, data: { ...e.data, status: "approved" } }
                        : e
                )
            );
        } catch (e) {
            console.error("Failed to approve draft", e);
        }
    }, []);

    const rejectDraft = useCallback(async (draftId: string) => {
        try {
            await api.rejectDraft(draftId);
            setCopilotEvents((prev) =>
                prev.map((e) =>
                    e.type === "learn" && e.data?.draftId === draftId
                        ? { ...e, data: { ...e.data, status: "rejected" } }
                        : e
                )
            );
        } catch (e) {
            console.error("Failed to reject draft", e);
        }
    }, []);

    // No-ops for simulation-specific actions
    const startScenario = useCallback((id: string) => {
        console.log("Start scenario ignored in real mode:", id);
    }, []);

    const resolveIssue = useCallback(() => setIsResolved(true), []);

    const reset = useCallback(() => {
        setMessages([]);
        setCopilotEvents([]);
        setSuggestedReplies([]);
        setIsResolved(false);
        setIsPlaying(false);
    }, []);

    const state: CopilotState = {
        scenario: null,
        messages,
        copilotEvents,
        suggestedReplies,
        isPlaying,
        isResolved,
        currentMessageIndex: -1,
    };

    const actions: CopilotActions = {
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
