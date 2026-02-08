"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Minus,
  Shield,
  AlertTriangle,
  Download,
  Copy,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { paramLabel } from "@/lib/qaTrackingItems";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── CircularProgress ────────────────────────────────────────
function CircularProgress({
  percentage,
  size = 120,
}: {
  percentage: number;
  size?: number;
}) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 80
      ? "#10B981"
      : percentage >= 60
      ? "#F59E0B"
      : "#EF4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold" style={{ color }}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

// ── Score icon ──────────────────────────────────────────────
function ScoreIcon({ score }: { score: string }) {
  if (score === "Yes") return <Check className="h-4 w-4 text-[#10B981]" />;
  if (score === "No") return <X className="h-4 w-4 text-[#EF4444]" />;
  return <Minus className="h-4 w-4 text-muted-foreground/60" />;
}

// ── Score badge ─────────────────────────────────────────────
function ScoreBadge({ score }: { score: string }) {
  const cls =
    score === "Yes"
      ? "text-[#10B981] bg-emerald-50 dark:bg-emerald-950"
      : score === "No"
      ? "text-[#EF4444] bg-red-50 dark:bg-red-950"
      : "text-muted-foreground/60 bg-muted";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {score}
    </span>
  );
}

// ── Parameter Report Row ────────────────────────────────────
function ReportParamRow({
  label,
  item,
  index,
  total,
}: {
  label: string;
  item: { score: string; tracking_items: string[]; evidence: string };
  index: number;
  total: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    item.score === "No" &&
    (item.tracking_items.length > 0 || item.evidence);
  const contribution =
    item.score === "Yes"
      ? `${total}/${total}`
      : item.score === "No"
      ? `0/${total}`
      : "\u2014";

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        className={`flex items-center gap-3 py-2.5 ${
          hasDetails ? "cursor-pointer" : ""
        }`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <ScoreIcon score={item.score} />
        <span className="flex-1 min-w-0 text-sm text-foreground">
          {paramLabel(label)}
        </span>
        <span className="text-xs font-mono text-muted-foreground/60 w-10 text-right">
          {contribution}
        </span>
        <ScoreBadge score={item.score} />
        {hasDetails && (
          <span className="text-muted-foreground/60">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        )}
      </div>
      <AnimatePresence>
        {expanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-2.5 pl-7 space-y-1">
              {item.tracking_items.length > 0 && (
                <p className="text-xs text-[#EF4444]">
                  {item.tracking_items.join("; ")}
                </p>
              )}
              {item.evidence && (
                <p className="text-xs italic text-muted-foreground">
                  &ldquo;{item.evidence}&rdquo;
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Evaluation Mode Badge ───────────────────────────────────
function EvalModeBadge({ mode }: { mode: string }) {
  const label =
    mode === "Both"
      ? "Both (70/30)"
      : mode === "Interaction Only"
      ? "Interaction Only"
      : mode === "Case Only"
      ? "Case Only"
      : mode;
  return (
    <span className="inline-block rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

// ── Recommendation Badge ────────────────────────────────────
function RecommendationBadge({ rec }: { rec: string }) {
  const colorMap: Record<string, string> = {
    "Keep doing": "text-[#10B981] bg-emerald-50 dark:bg-emerald-950",
    "Coaching needed": "text-[#F59E0B] bg-amber-50 dark:bg-amber-950",
    Escalate: "text-[#F97316] bg-orange-50 dark:bg-orange-950",
    "Compliance review": "text-[#EF4444] bg-red-50 dark:bg-red-950",
  };
  const cls = colorMap[rec] ?? "text-muted-foreground bg-muted";
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${cls}`}>
      {rec}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main QAScoreReport Component
// ═══════════════════════════════════════════════════════════════

export default function QAScoreReport({ data }: { data: any | null }) {
  const [copied, setCopied] = useState(false);

  if (!data) {
    return (
      <div className="rounded-[14px] border border-border bg-background p-6 flex h-full min-h-[400px] flex-col items-center justify-center">
        <Shield className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No score report yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Select a ticket and click &ldquo;Score with AI&rdquo;, use Manual
          mode, or paste a transcript
        </p>
      </div>
    );
  }

  const overallPct = parseInt(
    (data.Overall_Weighted_Score || "0%").replace("%", "")
  );
  const intPct = parseInt(
    (data.Interaction_QA?.Final_Weighted_Score || "0%").replace("%", "")
  );
  const casePct = parseInt(
    (data.Case_QA?.Final_Weighted_Score || "0%").replace("%", "")
  );
  const hasRedFlags = Object.values(data.Red_Flags || {}).some(
    (rf: any) => rf.score === "Yes"
  );
  const evalMode = data.Evaluation_Mode || "Both";

  // Extract parameter entries (exclude Final_Weighted_Score)
  const interactionParams = Object.entries(data.Interaction_QA || {}).filter(
    ([key]) => key !== "Final_Weighted_Score"
  );
  const caseParams = Object.entries(data.Case_QA || {}).filter(
    ([key]) => key !== "Final_Weighted_Score"
  );
  const redFlagParams = Object.entries(data.Red_Flags || {});

  // ── Export JSON ───────────────────────────────────────────
  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-score-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Copy to clipboard ────────────────────────────────────
  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: noop */
    }
  }

  return (
    <div className="rounded-[14px] border border-border bg-background p-6 space-y-6 overflow-auto max-h-[calc(100vh-200px)]">
      {/* ── Header: Score + Mode ─────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <CircularProgress percentage={overallPct} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
              Overall Score
            </p>
            <div className="mt-1 flex items-center gap-2">
              <EvalModeBadge mode={evalMode} />
            </div>
            {/* Sub-scores */}
            <div className="mt-2 flex gap-3 text-xs">
              <span className="text-muted-foreground">
                Interaction:{" "}
                <span className="font-semibold text-foreground">{intPct}%</span>
              </span>
              <span className="text-muted-foreground">
                Case:{" "}
                <span className="font-semibold text-foreground">{casePct}%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </button>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* ── Red Flags Banner ─────────────────────────────── */}
      {hasRedFlags ? (
        <div className="relative overflow-hidden rounded-[14px] border-l-[3px] border-l-[#EF4444] bg-red-50 dark:bg-red-950 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
            <span className="text-sm font-medium text-[#EF4444]">
              AUTOZERO — Red Flag Detected
            </span>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[14px] border-l-[3px] border-l-[#10B981] bg-emerald-50 dark:bg-emerald-950 p-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-[#10B981]" />
            <span className="text-sm font-medium text-[#10B981]">
              ALL CLEAR — No Red Flags
            </span>
          </div>
        </div>
      )}

      {/* ── Interaction QA Section ───────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-foreground">
            Interaction QA
          </h3>
          <span className="text-xs font-semibold text-muted-foreground">
            {intPct}%
          </span>
        </div>
        <div className="rounded-[10px] border border-border px-4">
          {interactionParams.map(([key, val], i) => (
            <ReportParamRow
              key={key}
              label={key}
              item={val as any}
              index={i}
              total={10}
            />
          ))}
        </div>
      </div>

      {/* ── Case QA Section ──────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-foreground">Case QA</h3>
          <span className="text-xs font-semibold text-muted-foreground">
            {casePct}%
          </span>
        </div>
        <div className="rounded-[10px] border border-border px-4">
          {caseParams.map(([key, val], i) => (
            <ReportParamRow
              key={key}
              label={key}
              item={val as any}
              index={i}
              total={10}
            />
          ))}
        </div>
      </div>

      {/* ── Red Flags Detail ─────────────────────────────── */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Red Flags</h3>
        <div className="rounded-[10px] border border-border px-4">
          {redFlagParams.map(([key, val]) => {
            const item = val as any;
            return (
              <div
                key={key}
                className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0"
              >
                <ScoreIcon score={item.score} />
                <span className="flex-1 min-w-0 text-sm text-foreground">
                  {paramLabel(key)}
                </span>
                <ScoreBadge score={item.score} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Summaries ────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="rounded-[10px] bg-card border border-border p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-1">
            Contact Summary
          </p>
          <p className="text-sm text-foreground">{data.Contact_Summary}</p>
        </div>
        <div className="rounded-[10px] bg-card border border-border p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-1">
            Case Summary
          </p>
          <p className="text-sm text-foreground">{data.Case_Summary}</p>
        </div>
        <div className="rounded-[10px] bg-card border border-border p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-1">
            QA Recommendation
          </p>
          <RecommendationBadge rec={data.QA_Recommendation} />
        </div>
      </div>
    </div>
  );
}
