"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { easeOut } from "@/lib/utils";
import { BentoGrid, BentoCell } from "@/components/BentoGrid";
import LottieAnimation from "@/components/LottieAnimation";
import KnowledgeHealth from "@/components/KnowledgeHealth";
import LearningPipeline from "@/components/LearningPipeline";
import EvalResults from "@/components/EvalResults";
import EmergingIssues from "@/components/EmergingIssues";
import TicketDistribution from "@/components/TicketDistribution";
import * as api from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DashboardView() {
  const [data, setData] = useState<any>(null);

  function loadData() {
    setData(null);
    api.getDashboard().then(setData);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto h-6 w-6 rounded-full border-2 border-input border-t-foreground animate-spin" />
          <p className="mt-3 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="space-y-8"
    >
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Knowledge health, learning pipeline, and evaluation metrics
          </p>
        </div>
        <button
          onClick={loadData}
          className="rounded-full border border-input px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* 1. Knowledge Health (full width) */}
      <KnowledgeHealth data={data.knowledge_health} />

      {/* 2. Learning Pipeline + Eval Results */}
      <BentoGrid>
        <BentoCell span={4} rowSpan={2} index={0}>
          <div className="flex items-center gap-2 mb-4">
            <LottieAnimation
              src="/lottie/document-lightbulb.json"
              width={32}
              height={32}
            />
            <h3 className="text-sm font-medium text-foreground">
              Learning Pipeline
            </h3>
          </div>
          <LearningPipeline data={data.learning_pipeline} />
        </BentoCell>

        <BentoCell span={8} index={1}>
          <EvalResults data={data.eval_results} />
        </BentoCell>
      </BentoGrid>

      {/* 3. Emerging Issues + Ticket Distribution */}
      <BentoGrid>
        <BentoCell span={6} index={0}>
          <div className="flex items-center gap-2 mb-4">
            <LottieAnimation
              src="/lottie/radar.json"
              width={24}
              height={24}
            />
            <h3 className="text-sm font-medium text-foreground">
              Emerging Issues
            </h3>
          </div>
          <EmergingIssues data={data.emerging_issues} />
        </BentoCell>

        <BentoCell span={6} index={1}>
          <h3 className="text-sm font-medium text-foreground mb-4">
            Ticket Distribution
          </h3>
          <TicketDistribution data={data.tickets} />
        </BentoCell>
      </BentoGrid>
    </motion.div>
  );
}
