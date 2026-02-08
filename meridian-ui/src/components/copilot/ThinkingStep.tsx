"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ThinkingStepProps {
  steps: string[];
  isLatest?: boolean;
}

export default function ThinkingStep({ steps, isLatest = false }: ThinkingStepProps) {
  const [expanded, setExpanded] = useState(isLatest);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="group"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-2 border border-border bg-card/50 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
      >
        {/* Left accent bar */}
        <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
          <svg
            className="h-4 w-4 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Thinking
            </span>
            {isLatest && (
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 [animation-delay:0.2s]" />
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 [animation-delay:0.4s]" />
              </span>
            )}
            <svg
              className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
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
              className="mt-2 overflow-hidden"
            >
              <div className="space-y-1.5 border-l-2 border-muted pl-3">
                {steps.map((step, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.2 }}
                    className="font-mono text-[11px] leading-relaxed text-muted-foreground"
                    dangerouslySetInnerHTML={{
                      __html: step
                        .replace(
                          /\*\*(.*?)\*\*/g,
                          '<strong class="text-foreground font-semibold">$1</strong>'
                        ),
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </button>
    </motion.div>
  );
}
