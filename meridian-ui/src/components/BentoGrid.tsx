"use client";

import { motion } from "framer-motion";
import { cn, easeOut } from "@/lib/utils";

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-12 gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}

interface BentoCellProps {
  children: React.ReactNode;
  span?: number;
  rowSpan?: number;
  className?: string;
  index?: number;
  elevated?: boolean;
}

export function BentoCell({
  children,
  span = 4,
  rowSpan = 1,
  className,
  index = 0,
  elevated = false,
}: BentoCellProps) {
  const colSpanClass: Record<number, string> = {
    3: "col-span-12 sm:col-span-6 lg:col-span-3",
    4: "col-span-12 sm:col-span-6 lg:col-span-4",
    6: "col-span-12 lg:col-span-6",
    8: "col-span-12 lg:col-span-8",
    12: "col-span-12",
  };

  const rowSpanClass: Record<number, string> = {
    1: "row-span-1",
    2: "row-span-2",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        ease: easeOut,
      }}
      className={cn(
        "rounded-[14px] border border-border p-6 transition-all duration-300",
        elevated
          ? "bg-background shadow-md"
          : "bg-card shadow-sm",
        "hover:shadow-md hover:-translate-y-px",
        colSpanClass[span] || "col-span-12 lg:col-span-4",
        rowSpanClass[rowSpan] || "row-span-1",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
