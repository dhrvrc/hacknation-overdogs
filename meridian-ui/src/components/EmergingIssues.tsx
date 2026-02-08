"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Issue {
  category: string;
  module: string;
  ticket_count: number;
  avg_similarity: number;
  sample_resolution: string;
}

interface EmergingIssuesProps {
  data: Issue[];
}

function getSeverity(avgSim: number): { color: string; dot: string; label: string } {
  if (avgSim < 0.3) return { color: "text-[#EF4444]", dot: "bg-[#EF4444]", label: "High" };
  if (avgSim <= 0.4) return { color: "text-[#F59E0B]", dot: "bg-[#F59E0B]", label: "Medium" };
  return { color: "text-[#10B981]", dot: "bg-[#10B981]", label: "Low" };
}

export default function EmergingIssues({ data }: EmergingIssuesProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // Sort by ticket_count descending
  const sorted = [...data].sort((a, b) => b.ticket_count - a.ticket_count);

  function toggleRow(idx: number) {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  return (
    <div>
      <div className="overflow-hidden rounded-[10px] border border-border">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Issue
              </th>
              <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Tickets
              </th>
              <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Avg Sim
              </th>
              <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Severity
              </th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((issue, i) => {
              const severity = getSeverity(issue.avg_similarity);
              const isExpanded = expanded[i] ?? false;

              return (
                <tr
                  key={i}
                  className="border-b border-border last:border-b-0 hover:bg-card transition-colors cursor-pointer"
                  onClick={() => toggleRow(i)}
                >
                  <td className="px-3 py-2.5" colSpan={isExpanded ? undefined : undefined}>
                    <p className="text-xs font-medium text-foreground">
                      {issue.category}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {issue.module}
                    </p>
                    {isExpanded && (
                      <div className="mt-2 rounded-md bg-card p-2 border border-border">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          <span className="font-medium text-foreground">Sample Resolution: </span>
                          {issue.sample_resolution}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                    {issue.ticket_count}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {issue.avg_similarity.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${severity.dot}`} />
                      <span className={`text-xs ${severity.color}`}>
                        {severity.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/60" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
