"use client";

import { motion } from "framer-motion";

interface GapDetectionData {
  topic: string;
  module: string;
  description: string;
}

interface GapDetectionCardProps {
  data: GapDetectionData;
}

export default function GapDetectionCard({ data }: GapDetectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/50"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center bg-amber-100 dark:bg-amber-900">
          <svg
            className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            Knowledge Gap Detected
          </h4>
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            {data.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-800/40 dark:text-amber-300">
              Topic: {data.topic}
            </span>
            <span className="inline-flex items-center bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-800/40 dark:text-amber-300">
              Module: {data.module}
            </span>
          </div>
          <p className="mt-2 text-[10px] italic text-amber-700 dark:text-amber-400">
            Resolution will be captured for the learning pipeline.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
