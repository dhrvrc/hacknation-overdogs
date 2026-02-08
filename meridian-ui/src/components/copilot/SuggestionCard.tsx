"use client";

import { motion } from "framer-motion";

interface SuggestionData {
  title: string;
  description: string;
  actions: string[];
  replyText?: string;
}

interface SuggestionCardProps {
  data: SuggestionData;
  onInsertReply?: (text: string) => void;
}

export default function SuggestionCard({ data, onInsertReply }: SuggestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/50"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center bg-blue-100 dark:bg-blue-900">
          <svg
            className="h-3 w-3 text-blue-600 dark:text-blue-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200">
            {data.title}
          </h4>
          <p className="mt-0.5 text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
            {data.description}
          </p>

          {/* Action steps */}
          <div className="mt-2 space-y-1">
            {data.actions.map((action, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 text-[11px] text-blue-700 dark:text-blue-300"
              >
                <span className="mt-0.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center bg-blue-200 text-[9px] font-bold text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                  {i + 1}
                </span>
                <span>{action}</span>
              </div>
            ))}
          </div>

          {/* Insert Reply button */}
          {data.replyText && onInsertReply && (
            <button
              onClick={() => onInsertReply(data.replyText!)}
              className="mt-2.5 inline-flex items-center gap-1.5 bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Insert Reply
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
