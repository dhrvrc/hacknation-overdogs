"use client";

import { Sparkles } from "lucide-react";
import ProvenanceBadge from "@/components/ProvenanceBadge";
import React from "react";

interface KBResult {
  doc_id: string;
  doc_type: string;
  title: string;
  body: string;
  score: number;
  metadata: {
    source_type: string;
    module: string;
    tags: string;
  };
  provenance: Array<{
    source_type: string;
    source_id: string;
    relationship: string;
    evidence_snippet: string;
  }>;
  rank: number;
}

const SECTION_HEADERS = [
  "Summary",
  "Applies To",
  "Symptoms",
  "Resolution Steps",
  "Steps",
];

function renderFormattedBody(body: string): React.ReactNode {
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const isHeader = SECTION_HEADERS.some(
      (h) => line === h || line.startsWith(h + "\n")
    );

    if (isHeader) {
      elements.push(
        <h4 key={i} className="mt-2 mb-1 text-xs font-medium text-[#3B82F6]">
          {line}
        </h4>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="ml-3 text-xs text-muted-foreground list-disc">
          {line.slice(2)}
        </li>
      );
    } else if (/^\d+\./.test(line)) {
      elements.push(
        <li key={i} className="ml-3 text-xs text-muted-foreground list-decimal">
          {line.replace(/^\d+\.\s*/, "")}
        </li>
      );
    } else {
      elements.push(
        <p key={i} className="text-xs text-muted-foreground">
          {line}
        </p>
      );
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

export default function KBCard({
  result,
  compact = false,
}: {
  result: KBResult;
  compact?: boolean;
}) {
  const isLearned = result.metadata.source_type === "SYNTH_FROM_TICKET";
  const tags = result.metadata.tags
    ? result.metadata.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const matchPct = Math.round(result.score * 100);

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-border bg-background p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-px">
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#3B82F6]" />

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

        {/* Source type badge */}
        <div className="flex items-center gap-2 flex-wrap">
          {isLearned ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950 px-2 py-0.5 text-[11px] font-medium text-[#3B82F6]">
              <Sparkles className="h-3 w-3" />
              LEARNED
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              SEED
            </span>
          )}
          {tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-full border border-input px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Body */}
        {!compact && (
          <div className="max-h-48 overflow-auto rounded-[10px] border border-border bg-card p-3">
            {renderFormattedBody(result.body)}
          </div>
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
