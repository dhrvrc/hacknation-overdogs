"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  Brain,
  Search,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import LottieAnimation from "@/components/LottieAnimation";
import * as api from "@/lib/api";
import { easeOut } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 as const },
  transition: { duration: 0.5, ease: easeOut },
};

// ── Step definitions ────────────────────────────────────────

interface DemoStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => Promise<any>;
}

type StepStatus = "idle" | "running" | "done" | "error";

// ── Main Component ──────────────────────────────────────────

export default function DemoView() {
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
  const [stepResults, setStepResults] = useState<Record<string, any>>({});
  const [runningAll, setRunningAll] = useState(false);

  const steps: DemoStep[] = [
    {
      id: "inject",
      title: "Inject Synthetic Tickets",
      description: "Add 6 novel \"Report Export Failure\" tickets to the system.",
      icon: <FileText className="h-4 w-4" />,
      action: api.demoInject,
    },
    {
      id: "gaps",
      title: "Detect Knowledge Gaps",
      description: "Run gap detection — compare each ticket against the KB corpus.",
      icon: <Search className="h-4 w-4" />,
      action: api.demoDetectGaps,
    },
    {
      id: "emerging",
      title: "Flag Emerging Issue",
      description: "Cluster the gaps by category/module to detect a new pattern.",
      icon: <AlertTriangle className="h-4 w-4" />,
      action: api.demoDetectEmerging,
    },
    {
      id: "draft",
      title: "Generate KB Draft",
      description: "Use the LLM to draft a new knowledge article from the first ticket.",
      icon: <Brain className="h-4 w-4" />,
      action: api.demoGenerateDraft,
    },
    {
      id: "approve",
      title: "Approve & Index",
      description: "Approve the draft and add it to the retrieval index.",
      icon: <ShieldCheck className="h-4 w-4" />,
      action: api.demoApprove,
    },
    {
      id: "verify",
      title: "Verify Retrieval",
      description: "Query the copilot — the new article should now appear in results.",
      icon: <Sparkles className="h-4 w-4" />,
      action: api.demoVerify,
    },
  ];

  async function runStep(step: DemoStep) {
    setStepStatuses((prev) => ({ ...prev, [step.id]: "running" }));
    try {
      const result = await step.action();
      setStepResults((prev) => ({ ...prev, [step.id]: result }));
      setStepStatuses((prev) => ({ ...prev, [step.id]: "done" }));
      return true;
    } catch {
      setStepStatuses((prev) => ({ ...prev, [step.id]: "error" }));
      return false;
    }
  }

  async function runAll() {
    setRunningAll(true);
    // Reset first
    try {
      await api.demoReset();
    } catch {
      // ignore reset errors
    }
    setStepStatuses({});
    setStepResults({});

    for (const step of steps) {
      const ok = await runStep(step);
      if (!ok) break;
    }
    setRunningAll(false);
  }

  async function handleReset() {
    try {
      await api.demoReset();
    } catch {
      // ignore
    }
    setStepStatuses({});
    setStepResults({});
  }

  function getStepIcon(stepId: string, defaultIcon: React.ReactNode) {
    const status = stepStatuses[stepId];
    if (status === "running") return <Loader2 className="h-4 w-4 animate-spin" />;
    if (status === "done") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === "error") return <AlertTriangle className="h-4 w-4 text-red-500" />;
    return defaultIcon;
  }

  function formatResult(stepId: string): string | null {
    const result = stepResults[stepId];
    if (!result) return null;

    switch (stepId) {
      case "inject": {
        const count = result?.injected_tickets?.length ?? 0;
        return `${count} tickets injected into the system.`;
      }
      case "gaps": {
        const gaps = result?.gap_results ?? [];
        const gapCount = gaps.filter((g: any) => g.is_gap).length;
        return `${gapCount}/${gaps.length} tickets flagged as knowledge gaps.`;
      }
      case "emerging": {
        const issues = result?.emerging_issues ?? [];
        return issues.length > 0
          ? `${issues.length} emerging issue(s): ${issues.map((i: any) => `${i.category} / ${i.module}`).join(", ")}`
          : "No emerging issues detected.";
      }
      case "draft": {
        const draftId = result?.generated_draft_id;
        return draftId ? `Draft ${draftId} generated.` : "KB draft created.";
      }
      case "approve": {
        const docId = result?.approved_doc_id;
        return docId ? `Article ${docId} approved and indexed.` : "Article approved.";
      }
      case "verify": {
        const verification = result?.verification ?? [];
        const found = verification.filter((v: any) => v.found_new_article).length;
        return `New article found in ${found}/${verification.length} queries.`;
      }
      default:
        return null;
    }
  }

  return (
    <div className="overflow-hidden">
      {/* ── Hero Section ── */}
      <section className="relative flex items-center justify-center texture-dots py-20">
        <div className="absolute inset-0 gradient-wash pointer-events-none" />
        <div className="absolute inset-0 texture-noise pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <LottieAnimation src="/lottie/particles.json" width={500} height={400} />
        </div>

        <div className="relative z-10 mx-auto max-w-[1280px] px-6 md:px-12 lg:px-16 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="mx-auto max-w-3xl text-[clamp(32px,5vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground"
          >
            Support intelligence that learns from every interaction.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
            className="mx-auto mt-6 max-w-2xl text-lg font-normal leading-relaxed text-muted-foreground"
          >
            Meridian gives support agents evidence-grounded answers with full
            provenance tracing — and gets smarter from every resolved ticket.
          </motion.p>
        </div>
      </section>

      {/* ── Live Demo Section ── */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-6 md:px-12 lg:px-16">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-[28px] font-semibold tracking-[-0.01em] text-foreground">
              Live Self-Learning Demo
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Watch the system encounter a novel problem, detect the knowledge gap,
              generate a new article, and then retrieve it — all in real time.
            </p>
          </motion.div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <button
              onClick={runAll}
              disabled={runningAll}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {runningAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Full Pipeline
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={runningAll}
              className="inline-flex items-center gap-2 rounded-full border border-input px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          {/* Step-by-step pipeline */}
          <div className="space-y-0">
            {steps.map((step, i) => {
              const status = stepStatuses[step.id] ?? "idle";
              const result = formatResult(step.id);
              const canRun =
                !runningAll &&
                status !== "running" &&
                (i === 0 || stepStatuses[steps[i - 1].id] === "done");

              return (
                <div key={step.id} className="relative">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="absolute left-[23px] top-14 bottom-0 w-px bg-border" />
                  )}

                  <div className="relative flex gap-4 pb-8">
                    {/* Step icon */}
                    <div
                      className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        status === "done"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                          : status === "running"
                          ? "border-primary bg-primary/10"
                          : status === "error"
                          ? "border-red-500 bg-red-50 dark:bg-red-950"
                          : "border-border bg-card"
                      }`}
                    >
                      {getStepIcon(step.id, step.icon)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-foreground">
                            {step.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                        {status === "idle" && canRun && (
                          <button
                            onClick={() => runStep(step)}
                            className="shrink-0 rounded-full border border-input px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                          >
                            Run
                          </button>
                        )}
                      </div>

                      {/* Result */}
                      {result && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
                        >
                          <p className="text-xs text-foreground">{result}</p>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
