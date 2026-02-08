"use client";

import { motion } from "framer-motion";

interface KnowledgeGainedData {
  title: string;
  description: string;
  source: string;
  category: string;
  confidence: number;
}

interface KnowledgeGainedCardProps {
  data: KnowledgeGainedData;
}

export default function KnowledgeGainedCard({ data }: KnowledgeGainedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="border border-teal-300 bg-teal-50 p-3 dark:border-teal-700 dark:bg-teal-950/50"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center bg-teal-100 dark:bg-teal-900">
          <svg
            className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 01-1 1H9a1 1 0 01-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
            <path d="M9 21h6" />
            <path d="M10 17v4" />
            <path d="M14 17v4" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-teal-900 dark:text-teal-200">
            New Knowledge Gained
          </h4>
          <p className="mt-0.5 text-[11px] font-medium text-teal-800 dark:text-teal-300">
            {data.title}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-teal-700 dark:text-teal-400">
            {data.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center bg-teal-200/60 px-1.5 py-0.5 text-[10px] font-medium text-teal-800 dark:bg-teal-800/40 dark:text-teal-300">
              {data.category}
            </span>
            <span className="inline-flex items-center bg-teal-200/60 px-1.5 py-0.5 text-[10px] font-medium text-teal-800 dark:bg-teal-800/40 dark:text-teal-300">
              Confidence: {Math.round(data.confidence * 100)}%
            </span>
            <span className="inline-flex items-center bg-teal-200/60 px-1.5 py-0.5 text-[10px] font-medium text-teal-800 dark:bg-teal-800/40 dark:text-teal-300">
              Source: {data.source}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
