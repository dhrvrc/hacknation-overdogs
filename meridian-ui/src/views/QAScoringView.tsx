"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { easeOut } from "@/lib/utils";
import QAScoreForm from "@/components/QAScoreForm";
import QAScoreReport from "@/components/QAScoreReport";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function QAScoringView() {
  const [scoreData, setScoreData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="space-y-6"
    >
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">QA Scoring</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Production-grade rubric evaluation for support interactions
        </p>
      </div>

      {/* Two-panel layout: 38% form | 62% report */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[38%_1fr]">
        <QAScoreForm
          onScoreReady={(data) => {
            setScoreData(data);
            setLoading(false);
          }}
          loading={loading}
        />
        <QAScoreReport data={scoreData} />
      </div>
    </motion.div>
  );
}
