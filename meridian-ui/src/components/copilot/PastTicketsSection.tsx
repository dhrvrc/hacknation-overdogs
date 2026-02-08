"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PastTicket } from "@/mock/customerProfiles";

interface PastTicketsSectionProps {
  tickets: PastTicket[];
}

const STATUS_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  Resolved: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-100 dark:bg-emerald-900/50",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  Open: {
    border: "border-l-amber-500",
    bg: "bg-amber-100 dark:bg-amber-900/50",
    text: "text-amber-700 dark:text-amber-300",
  },
  Escalated: {
    border: "border-l-red-500",
    bg: "bg-red-100 dark:bg-red-900/50",
    text: "text-red-700 dark:text-red-300",
  },
};

export default function PastTicketsSection({ tickets }: PastTicketsSectionProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-border bg-card">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
      >
        <span className="text-xs font-semibold text-foreground">
          Past Tickets ({tickets.length})
        </span>
        <svg
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 px-3 pb-3">
              {tickets.map((ticket, i) => {
                const colors = STATUS_COLORS[ticket.status] || STATUS_COLORS.Open;
                return (
                  <motion.div
                    key={ticket.ticketId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.25 }}
                    className={`border border-border bg-background p-2 border-l-[3px] ${colors.border}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {ticket.ticketId}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-foreground truncate">
                          {ticket.subject}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 text-[9px] font-medium ${colors.bg} ${colors.text}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
                        Tier {ticket.tier}
                      </span>
                      <span className="bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
                        {ticket.priority}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {ticket.createdAt}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
