"use client";

import { motion } from "framer-motion";

interface SimilarDetectedData {
  similarTicketId: string;
  similarity: number;
  description: string;
  conversationId: string;
}

interface SimilarDetectedCardProps {
  data: SimilarDetectedData;
}

export default function SimilarDetectedCard({ data }: SimilarDetectedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="border border-violet-300 bg-violet-50 p-3 dark:border-violet-700 dark:bg-violet-950/50"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center bg-violet-100 dark:bg-violet-900">
          <svg
            className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="18" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <path d="M6 21V9a9 9 0 009 9" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-violet-900 dark:text-violet-200">
            Similar Conversation Detected
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-violet-800 dark:text-violet-300">
            {data.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center bg-violet-200/60 px-1.5 py-0.5 text-[10px] font-medium text-violet-800 dark:bg-violet-800/40 dark:text-violet-300">
              {data.similarTicketId}
            </span>
            <span className="inline-flex items-center bg-violet-200/60 px-1.5 py-0.5 text-[10px] font-medium text-violet-800 dark:bg-violet-800/40 dark:text-violet-300">
              {Math.round(data.similarity * 100)}% match
            </span>
            <span className="inline-flex items-center bg-violet-200/60 px-1.5 py-0.5 text-[10px] font-medium text-violet-800 dark:bg-violet-800/40 dark:text-violet-300">
              {data.conversationId}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
