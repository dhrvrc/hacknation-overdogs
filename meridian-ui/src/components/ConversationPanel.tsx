"use client";

import { MessageSquare } from "lucide-react";

interface Conversation {
  ticket_number: string;
  conversation_id: string;
  channel: string;
  agent_name: string;
  sentiment: string;
  issue_summary: string;
  transcript: string;
}

interface ParsedMessage {
  sender: string;
  isAgent: boolean;
  text: string;
}

const SENTIMENT_COLORS: Record<string, string> = {
  Neutral: "text-muted-foreground bg-muted",
  Frustrated: "text-[#EF4444] bg-red-50 dark:bg-red-950",
  Relieved: "text-[#10B981] bg-emerald-50 dark:bg-emerald-950",
  Curious: "text-[#3B82F6] bg-blue-50 dark:bg-blue-950",
};

function parseTranscript(
  transcript: string,
  agentName: string
): ParsedMessage[] {
  const lines = transcript.split("\n").filter((l) => l.trim());
  const messages: ParsedMessage[] = [];

  const agentPattern = new RegExp(
    `^${agentName}\\s*\\(.*?\\):\\s*(.*)`,
    "i"
  );

  for (const line of lines) {
    const agentMatch = line.match(agentPattern);
    if (agentMatch) {
      messages.push({
        sender: agentName,
        isAgent: true,
        text: agentMatch[1].trim(),
      });
    } else {
      const customerMatch = line.match(/^(.+?):\s*(.*)/);
      if (customerMatch) {
        messages.push({
          sender: customerMatch[1].trim(),
          isAgent: false,
          text: customerMatch[2].trim(),
        });
      } else {
        messages.push({
          sender: "Unknown",
          isAgent: false,
          text: line.trim(),
        });
      }
    }
  }

  return messages;
}

export default function ConversationPanel({
  conversation,
}: {
  conversation: Conversation | null;
}) {
  if (!conversation) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-[14px] border border-border bg-card p-6">
        <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No conversation loaded</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Select a ticket from the dropdown above
        </p>
      </div>
    );
  }

  const messages = parseTranscript(
    conversation.transcript,
    conversation.agent_name
  );

  const sentimentClass =
    SENTIMENT_COLORS[conversation.sentiment] ?? SENTIMENT_COLORS.Neutral;

  return (
    <div className="flex h-full flex-col rounded-[14px] border border-border bg-card">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Conversation
            </span>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-mono text-muted-foreground">
            {conversation.conversation_id}
          </span>
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 space-y-3 overflow-auto p-6 max-h-[500px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.isAgent ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 ${
                msg.isAgent
                  ? "rounded-[16px] rounded-br-[4px] bg-muted"
                  : "rounded-[16px] rounded-bl-[4px] border border-input bg-background"
              }`}
            >
              <span
                className={`block text-xs font-medium mb-1 ${
                  msg.isAgent ? "text-muted-foreground" : "text-muted-foreground/60"
                }`}
              >
                {msg.sender}
              </span>
              <p className="text-sm leading-relaxed text-foreground">
                {msg.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Metadata */}
      <div className="border-t border-border p-6">
        <div className="rounded-[10px] bg-card p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground/60">Channel</span>
              <span className="ml-2 font-medium text-foreground">
                {conversation.channel}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground/60">Agent</span>
              <span className="ml-2 font-medium text-foreground">
                {conversation.agent_name}
              </span>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <span className="text-muted-foreground/60">Sentiment</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${sentimentClass}`}
              >
                {conversation.sentiment}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
