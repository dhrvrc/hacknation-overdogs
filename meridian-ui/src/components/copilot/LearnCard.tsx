"use client";

import { motion } from "framer-motion";

interface LearnData {
  draftTitle: string;
  draftId: string;
  sourceTicket: string;
  detectedGap: string;
  summary: string;
  status?: "approved" | "rejected";
}

interface LearnCardProps {
  data: LearnData;
  onApprove?: (draftId: string) => void;
  onReject?: (draftId: string) => void;
}

export default function LearnCard({ data, onApprove, onReject }: LearnCardProps) {
  const isDecided = data.status === "approved" || data.status === "rejected";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-700 dark:bg-emerald-950/50"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center bg-emerald-100 dark:bg-emerald-900">
          <svg
            className="h-3 w-3 text-emerald-600 dark:text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
            Learning from Resolution
          </h4>
          <p className="mt-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
            Draft KB Article Created
          </p>

          <div className="mt-2 border border-emerald-200 bg-white/60 p-2 dark:border-emerald-800 dark:bg-emerald-950/30">
            <p className="text-[11px] font-semibold text-foreground">
              {data.draftTitle}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              {data.summary}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className="inline-flex items-center bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
                {data.draftId}
              </span>
              <span className="inline-flex items-center bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
                Source: {data.sourceTicket}
              </span>
            </div>
          </div>

          {/* Actions */}
          {!isDecided ? (
            <div className="mt-2.5 flex gap-2">
              <button
                onClick={() => onApprove?.(data.draftId)}
                className="inline-flex items-center gap-1 bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Approve
              </button>
              <button
                onClick={() => onReject?.(data.draftId)}
                className="inline-flex items-center gap-1 border border-red-300 bg-white px-2.5 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/50"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium ${
                  data.status === "approved"
                    ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200"
                    : "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                }`}
              >
                {data.status === "approved" ? "✓ Approved" : "✗ Rejected"}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
