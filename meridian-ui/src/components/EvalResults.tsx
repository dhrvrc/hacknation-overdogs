"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { chartColors, chartTooltipStyle } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface EvalResultsProps {
  data: {
    retrieval: {
      overall: Record<string, number>;
    };
    classification: {
      accuracy: number;
      per_class: Record<string, { precision: number; recall: number; f1: number }>;
    };
    before_after: {
      before_hit5: number;
      after_hit5: number;
      improvement_pp: number;
      gaps_closed: number;
      headline: string;
    };
  };
}

export default function EvalResults({ data }: EvalResultsProps) {
  const ev = data;

  // Check if evaluation has been run (all zeros means not yet)
  const allZero = Object.values(ev.retrieval.overall).every((v) => v === 0);

  if (allZero) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3 opacity-40">&#9776;</div>
        <h4 className="text-sm font-medium text-foreground mb-1">
          No Evaluation Data
        </h4>
        <p className="text-xs text-muted-foreground max-w-[260px]">
          Click <span className="font-medium">&ldquo;Run Evaluation&rdquo;</span> to benchmark retrieval accuracy, classification, and self-learning metrics.
        </p>
      </div>
    );
  }

  // Retrieval bar chart: hit@1, hit@3, hit@5, hit@10 as separate items on X axis
  const retrievalData = Object.entries(ev.retrieval.overall).map(
    ([key, val]) => ({
      name: key,
      value: Math.round(val * 100),
    })
  );

  // Classification confusion-matrix-style grid
  const classTypes = Object.keys(ev.classification.per_class);
  const metrics = ["precision", "recall", "f1"] as const;

  // Before/After
  const ba = ev.before_after;

  return (
    <div className="space-y-6">
      {/* Retrieval Accuracy */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-4">
          Retrieval Accuracy
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={retrievalData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.border}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: chartColors.mutedForeground }}
              axisLine={{ stroke: chartColors.border }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: chartColors.mutedForeground }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              unit="%"
            />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => `${v}%`} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
              {retrievalData.map((_, idx) => {
                const shades = [
                  chartColors.input,
                  chartColors.mutedForeground,
                  chartColors.secondary,
                  chartColors.foreground,
                ];
                return (
                  <rect key={idx} fill={shades[idx] ?? chartColors.foreground} />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Classification */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">
          Classification Performance
        </h4>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[28px] font-semibold text-foreground">
            {Math.round(ev.classification.accuracy * 100)}%
          </span>
          <span className="text-xs text-muted-foreground/60">Overall Accuracy</span>
        </div>

        {/* Confusion matrix heatmap */}
        <div className="overflow-hidden rounded-[10px] border border-border">
          {/* Header row */}
          <div className="grid grid-cols-4 bg-card">
            <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60" />
            {metrics.map((m) => (
              <div
                key={m}
                className="px-3 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60"
              >
                {m}
              </div>
            ))}
          </div>
          {/* Data rows */}
          {classTypes.map((type) => {
            const vals = ev.classification.per_class[type];
            return (
              <div
                key={type}
                className="grid grid-cols-4 border-t border-border"
              >
                <div className="px-3 py-2.5 text-xs font-medium text-foreground">
                  {type}
                </div>
                {metrics.map((m) => {
                  const val = vals[m];
                  const pct = Math.round(val * 100);
                  // Opacity from 0.1 to 0.6 based on value
                  const opacity = 0.1 + val * 0.5;
                  return (
                    <div
                      key={m}
                      className="px-3 py-2.5 text-center text-xs font-medium"
                      style={{
                        backgroundColor: `hsl(var(--foreground) / ${opacity})`,
                        color: val > 0.5 ? `hsl(var(--background))` : `hsl(var(--foreground))`,
                      }}
                    >
                      {pct}%
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Self-Learning Proof */}
      <div className="rounded-[14px] border-2 border-[#10B981]/20 bg-emerald-50/30 dark:bg-emerald-950/30 p-6">
        <h4 className="text-sm font-medium text-foreground mb-2">
          Self-Learning Proof
        </h4>
        <p className="text-xs text-muted-foreground mb-4">{ba.headline}</p>

        <div className="space-y-3">
          {/* Before */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground/60">Before</span>
              <span className="font-medium text-foreground">
                {Math.round(ba.before_hit5 * 100)}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-input transition-all duration-700"
                style={{ width: `${ba.before_hit5 * 100}%` }}
              />
            </div>
          </div>
          {/* After */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground/60">After</span>
              <span className="font-medium text-foreground">
                {Math.round(ba.after_hit5 * 100)}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${ba.after_hit5 * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xl font-semibold text-[#10B981]">
            &#9650; +{ba.improvement_pp} pp
          </span>
          <span className="text-xs text-muted-foreground">improvement</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground/60">
          {ba.gaps_closed} knowledge gaps closed
        </p>
      </div>
    </div>
  );
}
