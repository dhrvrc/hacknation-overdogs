"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ToolCallData {
  tool: string;
  status: "running" | "complete";
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

interface ToolCallCardProps {
  data: ToolCallData;
}

const TOOL_COLORS: Record<string, string> = {
  classify_intent: "border-l-teal-500",
  search_kb: "border-l-amber-500",
  search_tickets: "border-l-blue-500",
};

const TOOL_ICONS: Record<string, string> = {
  classify_intent: "🏷️",
  search_kb: "📚",
  search_tickets: "🎫",
};

export default function ToolCallCard({ data }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const accentClass = TOOL_COLORS[data.tool] || "border-l-muted-foreground";
  const icon = TOOL_ICONS[data.tool] || "⚙️";
  const isRunning = data.status === "running";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full border border-border ${accentClass} border-l-[3px] bg-card px-3 py-2 text-left transition-colors hover:bg-muted/30`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="font-mono text-xs font-medium text-foreground">
            {data.tool}
          </span>
          {isRunning ? (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-amber-500" />
              running
            </span>
          ) : (
            <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400">
              ✓ complete
            </span>
          )}
          <svg
            className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mt-2 space-y-2 overflow-hidden"
          >
            {/* Input params */}
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Input
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(data.input).map(([key, val]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                  >
                    <span className="text-muted-foreground">{key}:</span>{" "}
                    {String(val)}
                  </span>
                ))}
              </div>
            </div>

            {/* Output */}
            {!isRunning && data.output && (
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Output
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(data.output).map(([key, val]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      <span className="opacity-70">{key}:</span>{" "}
                      {String(val)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </button>
    </motion.div>
  );
}
