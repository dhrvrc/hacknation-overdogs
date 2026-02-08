"use client";

import { useState } from "react";
import * as api from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Draft {
  draft_id: string;
  title: string;
  source_ticket: string;
  detected_gap: string;
  generated_at: string;
}

interface LearningPipelineProps {
  data: {
    total_events: number;
    approved: number;
    rejected: number;
    pending: number;
    pending_drafts: Draft[];
  };
}

// Static recent activity mock (learning events already approved/rejected)
const RECENT_ACTIVITY = [
  { id: "KB-SYN-0001", status: "approved", date: "02/19", role: "Tier 3 Support" },
  { id: "KB-SYN-0002", status: "approved", date: "02/19", role: "Tier 3 Support" },
  { id: "KB-SYN-0042", status: "approved", date: "02/18", role: "Tier 2 Support" },
  { id: "KB-SYN-0158", status: "rejected", date: "02/20", role: "Tier 3 Support" },
  { id: "KB-SYN-0099", status: "approved", date: "02/17", role: "Tier 2 Support" },
];

export default function LearningPipeline({ data }: LearningPipelineProps) {
  const [draftStatuses, setDraftStatuses] = useState<Record<string, "approved" | "rejected" | "pending">>({});
  const [loadingDrafts, setLoadingDrafts] = useState<Record<string, boolean>>({});

  async function handleApprove(draftId: string) {
    setLoadingDrafts((prev) => ({ ...prev, [draftId]: true }));
    try {
      await api.approveDraft(draftId);
      setDraftStatuses((prev) => ({ ...prev, [draftId]: "approved" }));
    } finally {
      setLoadingDrafts((prev) => ({ ...prev, [draftId]: false }));
    }
  }

  async function handleReject(draftId: string) {
    setLoadingDrafts((prev) => ({ ...prev, [draftId]: true }));
    try {
      await api.rejectDraft(draftId);
      setDraftStatuses((prev) => ({ ...prev, [draftId]: "rejected" }));
    } finally {
      setLoadingDrafts((prev) => ({ ...prev, [draftId]: false }));
    }
  }

  const statusRows = [
    { label: "Approved", count: data.approved, color: "#10B981" },
    { label: "Rejected", count: data.rejected, color: "#EF4444" },
    { label: "Pending", count: data.pending, color: "#F59E0B" },
  ];

  return (
    <div className="space-y-4">
      {/* Status rows */}
      <div className="space-y-3">
        {statusRows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium text-foreground">{row.count}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(row.count / data.total_events) * 100}%`,
                  background: row.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Pending Drafts */}
      <div>
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-2">
          Pending Review
        </h4>
        <div className="space-y-2">
          {data.pending_drafts.map((draft) => {
            const status = draftStatuses[draft.draft_id];
            const isLoading = loadingDrafts[draft.draft_id];
            const formattedDate = new Date(draft.generated_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={draft.draft_id}
                className="rounded-[10px] border border-border bg-background p-3"
              >
                <p className="text-xs font-medium text-foreground truncate">
                  {draft.title}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                  Source: {draft.source_ticket} &middot; {formattedDate}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                  {draft.detected_gap}
                </p>

                {status ? (
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        status === "approved"
                          ? "bg-emerald-50 dark:bg-emerald-950 text-[#10B981]"
                          : "bg-red-50 dark:bg-red-950 text-[#EF4444]"
                      }`}
                    >
                      {status === "approved" ? "\u2713 Approved" : "\u2717 Rejected"}
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleApprove(draft.draft_id)}
                      disabled={isLoading}
                      className="rounded-full border border-[#10B981] px-2.5 py-1 text-[11px] font-medium text-[#10B981] hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(draft.draft_id)}
                      disabled={isLoading}
                      className="rounded-full border border-[#EF4444] px-2.5 py-1 text-[11px] font-medium text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-2">
          Recent Activity
        </h4>
        <div className="space-y-1">
          {RECENT_ACTIVITY.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs py-1">
              <span
                className={
                  item.status === "approved" ? "text-[#10B981]" : "text-[#EF4444]"
                }
              >
                {item.status === "approved" ? "\u2713" : "\u2717"}
              </span>
              <span className="font-mono text-[11px] text-foreground">{item.id}</span>
              <span className="text-muted-foreground/60">({item.date})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
