"use client";

import { useState } from "react";
import { motion } from "framer-motion";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface KBResultCardProps {
  results: any[];
}

function getDocIcon(docType: string) {
  switch (docType) {
    case "SCRIPT":
      return "📜";
    case "KB":
      return "📖";
    case "TICKET":
      return "🎫";
    default:
      return "📄";
  }
}

function getScoreColor(score: number) {
  if (score >= 0.7) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 0.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

export default function KBResultCard({ results }: KBResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-1.5"
    >
      {results.map((result: any, i: number) => (
        <ResultItem key={result.doc_id || i} result={result} index={i} />
      ))}
    </motion.div>
  );
}

function ResultItem({ result, index }: { result: any; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.25 }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{getDocIcon(result.doc_type)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                {result.doc_id}
              </span>
              {result.score && (
                <span className={`text-[10px] font-medium ${getScoreColor(result.score)}`}>
                  {Math.round(result.score * 100)}% match
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-foreground">
              {result.title}
            </p>
          </div>
          <svg
            className={`h-3 w-3 flex-shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
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
            className="mt-2 overflow-hidden border-t border-border pt-2"
          >
            <p className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-muted-foreground">
              {result.body?.slice(0, 400)}
              {result.body?.length > 400 ? "..." : ""}
            </p>
            {result.metadata?.module && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span className="bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">
                  {result.metadata.module}
                </span>
                {result.metadata?.category && (
                  <span className="bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">
                    {result.metadata.category}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </button>
    </motion.div>
  );
}
