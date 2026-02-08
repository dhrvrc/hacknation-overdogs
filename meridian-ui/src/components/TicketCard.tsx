"use client";

import ProvenanceBadge from "@/components/ProvenanceBadge";

interface TicketResult {
  doc_id: string;
  doc_type: string;
  title: string;
  body: string;
  score: number;
  metadata: {
    tier: number;
    priority: string;
    root_cause: string;
    module: string;
    script_id?: string;
  };
  provenance: Array<{ source_type: string; source_id: string }>;
  rank: number;
}

const TIER_LABELS: Record<number, string> = {
  1: "Tier 1",
  2: "Tier 2",
  3: "Tier 3",
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "text-[#EF4444] bg-red-50 dark:bg-red-950",
  High: "text-[#F59E0B] bg-amber-50 dark:bg-amber-950",
  Medium: "text-muted-foreground bg-muted",
  Low: "text-muted-foreground/60 bg-muted",
};

export default function TicketCard({
  result,
  compact = false,
}: {
  result: TicketResult;
  compact?: boolean;
}) {
  const matchPct = Math.round(result.score * 100);
  const priorityClass =
    PRIORITY_COLORS[result.metadata.priority] ?? PRIORITY_COLORS.Low;

  // Split body on "Resolution:"
  const bodyParts = result.body.split(/Resolution:\s*/);
  const description = bodyParts[0]?.replace(/^Description:\s*/, "").trim();
  const resolution = bodyParts[1]?.trim();

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-border bg-background p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-px">
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#10B981]" />

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

        {/* Tier + Priority badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {TIER_LABELS[result.metadata.tier] ?? `Tier ${result.metadata.tier}`}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityClass}`}
          >
            {result.metadata.priority}
          </span>
          <span className="rounded-full border border-input px-2 py-0.5 text-[11px] text-muted-foreground">
            {result.metadata.module}
          </span>
        </div>

        {/* Body */}
        {!compact && (
          <div className="space-y-3 rounded-[10px] border border-border bg-card p-3">
            {description && (
              <div>
                <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
                  Description
                </h4>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            )}
            {resolution && (
              <div>
                <h4 className="text-[11px] font-medium uppercase tracking-wider text-[#10B981] mb-1">
                  Resolution
                </h4>
                <p className="text-sm text-muted-foreground">{resolution}</p>
              </div>
            )}
          </div>
        )}

        {/* Root cause */}
        {result.metadata.root_cause && !compact && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Root Cause:</span>{" "}
            {result.metadata.root_cause}
          </p>
        )}

        {/* Script reference + Provenance */}
        <div className="flex items-center gap-3 pt-1">
          {result.metadata.script_id && (
            <span className="rounded-full bg-[#FEF3C7] dark:bg-amber-900 px-2 py-0.5 text-[11px] font-mono font-medium text-[#92400E] dark:text-amber-300">
              {result.metadata.script_id}
            </span>
          )}
          <ProvenanceBadge
            docId={result.doc_id}
            provenance={result.provenance}
          />
        </div>
      </div>
    </div>
  );
}
