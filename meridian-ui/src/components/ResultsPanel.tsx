"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import ConfidenceBar from "@/components/ConfidenceBar";
import ScriptCard from "@/components/ScriptCard";
import KBCard from "@/components/KBCard";
import TicketCard from "@/components/TicketCard";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface QueryResponse {
  query: string;
  predicted_type: string;
  confidence_scores: { SCRIPT: number; KB: number; TICKET: number };
  primary_results: any[];
  secondary_results: Record<string, any[]>;
}

const QA_NUDGES: Record<string, string[]> = {
  SCRIPT: [
    "Verify script inputs before execution",
    "Confirm resolution with customer after applying",
  ],
  KB: [
    "Verify article is current (check Updated_At)",
    "Walk customer through steps, don't just read them",
  ],
  TICKET: [
    "Confirm the customer's issue matches the referenced case",
    "Document your resolution clearly for future KB generation",
  ],
};

function ResultCard({ result }: { result: any }) {
  switch (result.doc_type) {
    case "SCRIPT":
      return <ScriptCard result={result} />;
    case "KB":
      return <KBCard result={result} />;
    case "TICKET":
      return <TicketCard result={result} />;
    default:
      return null;
  }
}

function CompactCard({ result }: { result: any }) {
  switch (result.doc_type) {
    case "SCRIPT":
      return <ScriptCard result={result} compact />;
    case "KB":
      return <KBCard result={result} compact />;
    case "TICKET":
      return <TicketCard result={result} compact />;
    default:
      return null;
  }
}

export default function ResultsPanel({
  results,
}: {
  results: QueryResponse | null;
}) {
  const [secondaryExpanded, setSecondaryExpanded] = useState(false);

  if (!results) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-[14px] border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">No results yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Enter a query above to search the knowledge base
        </p>
      </div>
    );
  }

  // Collect secondary results
  const secondaryItems: any[] = [];
  for (const [, items] of Object.entries(results.secondary_results)) {
    secondaryItems.push(...items);
  }

  const nudges = QA_NUDGES[results.predicted_type] ?? QA_NUDGES.TICKET;

  return (
    <div className="space-y-4">
      {/* Confidence Bar */}
      <ConfidenceBar
        confidence_scores={results.confidence_scores}
        predicted_type={results.predicted_type}
      />

      {/* Primary Results */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
          Primary Results
        </h3>
        {results.primary_results.map((r: any, i: number) => (
          <ResultCard key={r.doc_id ?? i} result={r} />
        ))}
      </div>

      {/* Secondary Results */}
      {secondaryItems.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setSecondaryExpanded(!secondaryExpanded)}
            className="flex w-full items-center justify-between rounded-[14px] border border-border bg-background px-5 py-3 text-left transition-colors hover:bg-card"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
              Also Relevant ({secondaryItems.length})
            </span>
            {secondaryExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground/60" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
            )}
          </button>
          {secondaryExpanded && (
            <div className="space-y-3">
              {secondaryItems.map((r: any, i: number) => (
                <CompactCard key={r.doc_id ?? i} result={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* QA Nudges */}
      <div className="rounded-[14px] border border-[#FEF3C7] dark:border-amber-800 bg-[#FFFBEB] dark:bg-amber-950 p-4 space-y-2">
        <h4 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#F59E0B]">
          <AlertTriangle className="h-3.5 w-3.5" />
          QA Nudges
        </h4>
        {nudges.map((nudge, i) => (
          <p
            key={i}
            className="flex items-start gap-2 text-sm text-[#92400E] dark:text-amber-300"
          >
            <span className="shrink-0 mt-0.5 text-xs">&#9888;</span>
            {nudge}
          </p>
        ))}
      </div>
    </div>
  );
}
