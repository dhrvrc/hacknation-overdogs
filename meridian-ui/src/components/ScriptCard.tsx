"use client";

import ProvenanceBadge from "@/components/ProvenanceBadge";
import React from "react";

interface ScriptResult {
  doc_id: string;
  doc_type: string;
  title: string;
  body: string;
  score: number;
  metadata: {
    purpose: string;
    inputs: string;
    module: string;
    category: string;
  };
  provenance: Array<{ source_type: string; source_id: string }>;
  rank: number;
}

function highlightPlaceholders(text: string): React.ReactNode[] {
  const parts = text.split(/(<[A-Z_]+>)/g);
  return parts.map((part, i) =>
    /^<[A-Z_]+>$/.test(part) ? (
      <span
        key={i}
        className="rounded bg-[#FEF3C7] dark:bg-amber-900 px-1 py-px text-[#92400E] dark:text-amber-300 font-medium"
      >
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

export default function ScriptCard({
  result,
  compact = false,
}: {
  result: ScriptResult;
  compact?: boolean;
}) {
  const inputs = result.metadata.inputs
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const matchPct = Math.round(result.score * 100);

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-border bg-background p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-px">
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#F59E0B]" />

      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-medium text-foreground truncate">
            {result.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium font-mono uppercase text-muted-foreground">
              {result.doc_id}
            </span>
            <span
              className={`rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium ${
                matchPct > 70 ? "text-[#10B981]" : "text-muted-foreground"
              }`}
            >
              {matchPct}% match
            </span>
          </div>
        </div>

        {/* Purpose */}
        <p className="text-sm text-muted-foreground">{result.metadata.purpose}</p>

        {/* Required Inputs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
            Required:
          </span>
          {inputs.map((inp, i) => (
            <span
              key={i}
              className="rounded bg-[#FEF3C7] dark:bg-amber-900 px-1.5 py-0.5 text-[11px] font-mono text-[#92400E] dark:text-amber-300"
            >
              {inp}
            </span>
          ))}
        </div>

        {/* Script body */}
        {!compact && (
          <pre className="max-h-40 overflow-auto rounded-[10px] border border-border bg-card p-3 text-[13px] font-mono leading-relaxed text-foreground">
            {highlightPlaceholders(result.body)}
          </pre>
        )}

        {/* Provenance */}
        <div className="flex items-center gap-1.5 pt-1">
          <ProvenanceBadge
            docId={result.doc_id}
            provenance={result.provenance}
          />
        </div>
      </div>
    </div>
  );
}
