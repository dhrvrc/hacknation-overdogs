"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Ticket, MessageSquare, Terminal, ClipboardList, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { easeOut } from "@/lib/utils";
import LottieAnimation from "@/components/LottieAnimation";
import * as api from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ProvenanceModalProps {
  docId: string;
  onClose: () => void;
}

const SOURCE_CONFIG: Record<
  string,
  { icon: typeof Ticket; color: string; border: string; label: string }
> = {
  Ticket: {
    icon: Ticket,
    color: "text-[#10B981]",
    border: "border-l-[3px] border-l-[#10B981]",
    label: "Source Ticket",
  },
  Conversation: {
    icon: MessageSquare,
    color: "text-[#3B82F6]",
    border: "border-l-[3px] border-l-[#3B82F6]",
    label: "Source Conversation",
  },
  Script: {
    icon: Terminal,
    color: "text-[#F59E0B]",
    border: "border-l-[3px] border-l-[#F59E0B]",
    label: "Referenced Script",
  },
};

const RELATIONSHIP_STYLE: Record<string, string> = {
  CREATED_FROM: "text-[#3B82F6] bg-blue-50 dark:bg-blue-950",
  REFERENCES: "text-muted-foreground bg-muted",
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="shrink-0 font-medium text-muted-foreground/60 w-24">
        {label}:
      </span>
      <span className="text-foreground">{String(value)}</span>
    </div>
  );
}

function SourceNode({ source }: { source: any }) {
  const config = SOURCE_CONFIG[source.source_type] ?? SOURCE_CONFIG.Ticket;
  const Icon = config.icon;
  const relStyle =
    RELATIONSHIP_STYLE[source.relationship] ?? RELATIONSHIP_STYLE.REFERENCES;

  const detailEntries = source.detail
    ? Object.entries(source.detail).filter(
        ([, v]) => v != null && v !== ""
      )
    : [];

  return (
    <div
      className={`rounded-[14px] border border-border bg-card p-4 space-y-2 ${config.border}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.color}`} />
          <span className="text-xs font-medium text-foreground">
            {config.label}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
            {source.source_id}
          </span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${relStyle}`}
        >
          {source.relationship}
        </span>
      </div>

      {/* Detail fields */}
      {detailEntries.length > 0 && (
        <div className="space-y-1 pl-6">
          {detailEntries.map(([key, val]) => (
            <DetailRow
              key={key}
              label={key.replace(/_/g, " ")}
              value={val as string | number}
            />
          ))}
        </div>
      )}

      {/* Evidence snippet */}
      {source.evidence_snippet && (
        <blockquote className="ml-6 border-l-2 border-input pl-3 text-xs italic text-muted-foreground">
          {source.evidence_snippet}
        </blockquote>
      )}
    </div>
  );
}

function LearningEventNode({ event }: { event: any }) {
  const isApproved = event.final_status === "Approved";
  const formattedDate = new Date(event.timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-[14px] border border-dashed border-input bg-background p-4 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            Learning Event
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
            {event.event_id}
          </span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            isApproved
              ? "text-[#10B981] bg-emerald-50 dark:bg-emerald-950"
              : "text-[#EF4444] bg-red-50 dark:bg-red-950"
          }`}
        >
          {event.final_status}
        </span>
      </div>

      {/* Gap detected */}
      <blockquote className="ml-6 border-l-2 border-input pl-3 text-xs italic text-muted-foreground">
        Gap: {event.detected_gap}
      </blockquote>

      {/* Draft summary */}
      <p className="ml-6 text-xs text-foreground">{event.draft_summary}</p>

      {/* Reviewer + date */}
      <div className="ml-6 flex items-center gap-3 text-xs text-muted-foreground/60">
        <span>
          Reviewed by:{" "}
          <span className="font-medium text-foreground">
            {event.reviewer_role}
          </span>
        </span>
        <span>{formattedDate}</span>
      </div>
    </div>
  );
}

export default function ProvenanceModal({
  docId,
  onClose,
}: ProvenanceModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await api.getProvenance(docId);
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: easeOut }}
          className="relative mx-4 max-h-[85vh] w-full max-w-[640px] overflow-auto rounded-[20px] bg-background p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-input"
          >
            <X className="h-4 w-4" />
          </button>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-8 w-8 rounded-full border-2 border-input border-t-foreground animate-spin" />
              <p className="mt-3 text-sm text-muted-foreground">
                Loading evidence chain...
              </p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Lottie animation */}
              <div className="flex justify-center">
                <LottieAnimation
                  src="/lottie/connected-nodes.json"
                  width={200}
                  height={60}
                  loop={false}
                />
              </div>

              {/* Header */}
              <div className="pr-8">
                <h2 className="text-lg font-medium text-foreground">
                  {data.kb_title}
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {data.kb_article_id}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    Evidence Chain
                  </span>
                </div>
              </div>

              {/* Intro */}
              <p className="text-sm text-muted-foreground">
                This article was automatically generated from resolved support
                data. Below is the full provenance chain tracing every source.
              </p>

              {/* Timeline */}
              {data.has_provenance && data.sources?.length > 0 ? (
                <div className="relative space-y-0">
                  {/* Vertical connecting line */}
                  <div className="absolute left-6 top-4 bottom-4 w-px bg-input" />

                  {data.sources.map((source: any, i: number) => (
                    <div key={i} className="relative">
                      <SourceNode source={source} />
                      {/* Connector arrow */}
                      {(i < data.sources.length - 1 ||
                        data.learning_event) && (
                        <div className="flex justify-center py-1.5">
                          <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Learning Event */}
                  {data.learning_event && (
                    <LearningEventNode event={data.learning_event} />
                  )}
                </div>
              ) : (
                <div className="rounded-[14px] border border-border bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No provenance data available for this article.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    This article predates the learning system.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
