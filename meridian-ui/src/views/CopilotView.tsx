"use client";

import { useState } from "react";
import { Search, MessageSquareText, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { easeOut } from "@/lib/utils";
import ConversationPanel from "@/components/ConversationPanel";
import ResultsPanel from "@/components/ResultsPanel";
import LottieAnimation from "@/components/LottieAnimation";
import * as api from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SAMPLE_TICKETS = [
  { value: "CS-38908386", label: "CS-38908386 — Date Advance (Chat)" },
  { value: "CS-02155732", label: "CS-02155732 — HAP Voucher (Phone)" },
];

export default function CopilotView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [convLoading, setConvLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await api.queryEngine(query);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadConversation(ticketNumber: string) {
    if (!ticketNumber) return;
    setConvLoading(true);
    try {
      const data = await api.getConversation(ticketNumber);
      setConversation(data);
    } finally {
      setConvLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="space-y-6"
    >
      {/* Query Bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question..."
            className="h-12 w-full rounded-xl border border-input bg-background pl-11 pr-14 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-foreground focus:shadow-md focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[10px] bg-primary text-primary-foreground transition-colors hover:bg-primary/80 disabled:bg-muted disabled:text-muted-foreground/60"
          >
            {loading ? (
              <LottieAnimation
                src="/lottie/compass.json"
                width={24}
                height={24}
              />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Conversation loader */}
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-muted-foreground/60" />
          <select
            onChange={(e) => handleLoadConversation(e.target.value)}
            defaultValue=""
            disabled={convLoading}
            className="h-12 rounded-xl border border-input bg-card px-3 pr-8 text-xs text-foreground transition-colors focus:border-foreground focus:outline-none appearance-none cursor-pointer"
          >
            <option value="" disabled>
              Load Conversation
            </option>
            {SAMPLE_TICKETS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[38%_1fr]">
        {/* Left: Conversation */}
        <ConversationPanel conversation={conversation} />

        {/* Right: Results */}
        <ResultsPanel results={results} />
      </div>
    </motion.div>
  );
}
