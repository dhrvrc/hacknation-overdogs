"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Sparkles,
  PenLine,
  ClipboardPaste,
  Calculator,
  Send,
} from "lucide-react";
import LottieAnimation from "@/components/LottieAnimation";
import * as api from "@/lib/api";
import {
  INTERACTION_PARAMS,
  CASE_PARAMS,
  RED_FLAG_PARAMS,
  PARAMETER_TRACKING_ITEMS,
  paramLabel,
} from "@/lib/qaTrackingItems";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── 8 sample tickets (spec says 5-10) ──────────────────────
const SAMPLE_TICKETS = [
  { value: "CS-38908386", label: "CS-38908386 — Date Advance" },
  { value: "CS-02155732", label: "CS-02155732 — HAP Voucher" },
  { value: "CS-44219876", label: "CS-44219876 — Move-Out Failure" },
  { value: "CS-55783210", label: "CS-55783210 — Move-Out Charges" },
  { value: "CS-12345678", label: "CS-12345678 — HAP Sync" },
  { value: "CS-33445566", label: "CS-33445566 — Certification Fields" },
  { value: "CS-77889900", label: "CS-77889900 — Recertification Date" },
  { value: "CS-99001122", label: "CS-99001122 — General Inquiry" },
];

type ScoreValue = "Yes" | "No" | "N/A";
type Mode = "ai" | "manual" | "paste";

interface ParamState {
  score: ScoreValue;
  tracking_items: string[];
  evidence: string;
}

function defaultParamState(): ParamState {
  return { score: "N/A", tracking_items: [], evidence: "" };
}

// ── Segmented Toggle (Yes / No / N/A) ──────────────────────
function SegmentedToggle({
  value,
  onChange,
  options = ["Yes", "No", "N/A"],
}: {
  value: string;
  onChange: (v: ScoreValue) => void;
  options?: string[];
}) {
  const colors: Record<string, string> = {
    Yes: "bg-emerald-500 text-white",
    No: "bg-red-500 text-white",
    "N/A": "bg-input text-muted-foreground",
  };
  return (
    <div className="inline-flex rounded-full border border-input overflow-hidden text-[11px] font-medium">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt as ScoreValue)}
          className={`px-3 py-1 transition-colors ${
            value === opt ? colors[opt] : "bg-background text-muted-foreground/60 hover:bg-muted"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Tracking Item Autocomplete ──────────────────────────────
function TrackingAutocomplete({
  suggestions,
  selected,
  onSelect,
}: {
  suggestions: string[];
  selected: string[];
  onSelect: (items: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(query.toLowerCase()) && !selected.includes(s)
  );

  return (
    <div ref={ref} className="relative mt-1.5">
      <input
        type="text"
        placeholder="Search tracking items..."
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none"
      />
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-20 mt-1 max-h-36 w-full overflow-auto rounded-lg border border-input bg-background shadow-md"
          >
            {filtered.map((item) => (
              <li
                key={item}
                onClick={() => {
                  onSelect([...selected, item]);
                  setQuery("");
                  setOpen(false);
                }}
                className="cursor-pointer px-3 py-1.5 text-xs text-foreground hover:bg-muted"
              >
                {item}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950 px-2 py-0.5 text-[10px] font-medium text-[#EF4444]"
            >
              {item}
              <button
                type="button"
                onClick={() => onSelect(selected.filter((s) => s !== item))}
                className="ml-0.5 hover:text-red-700"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Manual Parameter Row ────────────────────────────────────
function ManualParamRow({
  paramKey,
  state,
  onChange,
}: {
  paramKey: string;
  state: ParamState;
  onChange: (updated: ParamState) => void;
}) {
  const suggestions = PARAMETER_TRACKING_ITEMS[paramKey] ?? [];

  return (
    <div className="py-2.5 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-foreground flex-1 min-w-0">
          {paramLabel(paramKey)}
        </span>
        <SegmentedToggle
          value={state.score}
          onChange={(v) => onChange({ ...state, score: v })}
        />
      </div>
      <AnimatePresence>
        {state.score === "No" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 ml-1 space-y-1.5 rounded-lg bg-red-50/50 dark:bg-red-950/30 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#EF4444]">
                Tracking Item
              </p>
              <TrackingAutocomplete
                suggestions={suggestions}
                selected={state.tracking_items}
                onSelect={(items) =>
                  onChange({ ...state, tracking_items: items })
                }
              />
              <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-[#EF4444]">
                Evidence
              </p>
              <textarea
                rows={2}
                value={state.evidence}
                onChange={(e) =>
                  onChange({ ...state, evidence: e.target.value })
                }
                placeholder="Describe what was observed..."
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none resize-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Red Flag Row (N/A / Yes only) ───────────────────────────
function RedFlagRow({
  paramKey,
  state,
  onChange,
}: {
  paramKey: string;
  state: ParamState;
  onChange: (updated: ParamState) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-b-0">
      <span className="text-sm text-foreground flex-1 min-w-0">
        {paramLabel(paramKey)}
      </span>
      <SegmentedToggle
        value={state.score}
        onChange={(v) => onChange({ ...state, score: v })}
        options={["N/A", "Yes"]}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main QAScoreForm Component
// ═══════════════════════════════════════════════════════════════

export default function QAScoreForm({
  onScoreReady,
  loading,
}: {
  onScoreReady: (data: any) => void;
  loading: boolean;
}) {
  const [mode, setMode] = useState<Mode>("ai");
  const [ticket, setTicket] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Manual scoring state
  const [interactionState, setInteractionState] = useState<
    Record<string, ParamState>
  >(() =>
    Object.fromEntries(
      INTERACTION_PARAMS.map((p) => [p, defaultParamState()])
    )
  );
  const [caseState, setCaseState] = useState<Record<string, ParamState>>(() =>
    Object.fromEntries(CASE_PARAMS.map((p) => [p, defaultParamState()]))
  );
  const [redFlagState, setRedFlagState] = useState<
    Record<string, ParamState>
  >(() =>
    Object.fromEntries(RED_FLAG_PARAMS.map((p) => [p, defaultParamState()]))
  );

  // Paste mode state
  const [transcript, setTranscript] = useState("");
  const [ticketData, setTicketData] = useState("");

  // ── AI scoring ────────────────────────────────────────────
  async function handleAIScore() {
    if (!ticket) return;
    setAiLoading(true);
    try {
      const data = await api.scoreQA(ticket);
      onScoreReady(data);
    } finally {
      setAiLoading(false);
    }
  }

  // ── Manual score calculation ──────────────────────────────
  function calculateManualScore() {
    // Build interaction section
    const interactionEntries: Record<string, any> = {};
    let intYes = 0,
      intTotal = 0;
    for (const key of INTERACTION_PARAMS) {
      const s = interactionState[key];
      interactionEntries[key] = {
        score: s.score,
        tracking_items: s.tracking_items,
        evidence: s.evidence,
      };
      if (s.score !== "N/A") {
        intTotal++;
        if (s.score === "Yes") intYes++;
      }
    }

    // Build case section
    const caseEntries: Record<string, any> = {};
    let caseYes = 0,
      caseTotal = 0;
    for (const key of CASE_PARAMS) {
      const s = caseState[key];
      caseEntries[key] = {
        score: s.score,
        tracking_items: s.tracking_items,
        evidence: s.evidence,
      };
      if (s.score !== "N/A") {
        caseTotal++;
        if (s.score === "Yes") caseYes++;
      }
    }

    // Build red flags
    const redFlagEntries: Record<string, any> = {};
    let anyRedFlag = false;
    for (const key of RED_FLAG_PARAMS) {
      const s = redFlagState[key];
      redFlagEntries[key] = {
        score: s.score,
        tracking_items: s.tracking_items,
        evidence: s.evidence,
      };
      if (s.score === "Yes") anyRedFlag = true;
    }

    // Calculate percentages
    let intPct = intTotal > 0 ? Math.round((intYes / intTotal) * 100) : 0;
    let casePct = caseTotal > 0 ? Math.round((caseYes / caseTotal) * 100) : 0;

    // Autozero: Delivered_Expected_Outcome = No → interaction 0
    if (interactionState.Delivered_Expected_Outcome.score === "No") {
      intPct = 0;
    }

    // Determine evaluation mode
    const hasInt = intTotal > 0;
    const hasCase = caseTotal > 0;
    let evalMode = "Both";
    let overallPct = 0;

    if (hasInt && hasCase) {
      evalMode = "Both";
      overallPct = Math.round(intPct * 0.7 + casePct * 0.3);
    } else if (hasInt) {
      evalMode = "Interaction Only";
      overallPct = intPct;
    } else if (hasCase) {
      evalMode = "Case Only";
      overallPct = casePct;
    }

    // Red flag autozero
    if (anyRedFlag) {
      overallPct = 0;
    }

    // Recommendation
    let recommendation = "Keep doing";
    if (overallPct < 80) recommendation = "Coaching needed";
    if (overallPct < 60) recommendation = "Escalate";
    if (anyRedFlag) recommendation = "Compliance review";

    interactionEntries.Final_Weighted_Score = `${intPct}%`;
    caseEntries.Final_Weighted_Score = `${casePct}%`;

    const scoreJson = {
      Evaluation_Mode: evalMode,
      Interaction_QA: interactionEntries,
      Case_QA: caseEntries,
      Red_Flags: redFlagEntries,
      Business_Intelligence: {
        Knowledge_Article_Attached: "N/A",
        Screen_Recording_Available: "N/A",
        PME_KCS_Attached: "N/A",
        Work_Setup_WIO_WFH: "N/A",
        Issues_IVR_IT_Tool_Audio: "N/A",
      },
      Leader_Action_Required: anyRedFlag ? "Yes" : "No",
      Contact_Summary: "Manually scored — no AI summary generated.",
      Case_Summary: "Manually scored — no AI summary generated.",
      QA_Recommendation: recommendation,
      Overall_Weighted_Score: `${overallPct}%`,
    };

    onScoreReady(scoreJson);
  }

  // ── Paste mode submit ─────────────────────────────────────
  async function handlePasteSubmit() {
    setAiLoading(true);
    try {
      const data = await api.scoreQA("paste");
      onScoreReady(data);
    } finally {
      setAiLoading(false);
    }
  }

  const isLoading = loading || aiLoading;

  return (
    <div className="rounded-[14px] border border-border bg-card p-6 space-y-5 overflow-auto max-h-[calc(100vh-200px)]">
      {/* Mode tabs */}
      <div className="flex items-center gap-1 rounded-full bg-muted p-1">
        {[
          { key: "ai" as Mode, label: "AI Score", icon: Sparkles },
          { key: "manual" as Mode, label: "Manual", icon: PenLine },
          { key: "paste" as Mode, label: "Paste", icon: ClipboardPaste },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all ${
              mode === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ═══════ AI Mode ═══════ */}
      {mode === "ai" && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Select Case
            </label>
            <div className="relative">
              <select
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                className="w-full rounded-[10px] border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-foreground focus:outline-none appearance-none cursor-pointer pr-8"
              >
                <option value="">Choose a ticket...</option>
                {SAMPLE_TICKETS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            </div>
          </div>

          <button
            onClick={handleAIScore}
            disabled={!ticket || isLoading}
            className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all duration-150 hover:bg-primary/80 disabled:bg-muted disabled:text-muted-foreground/60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <LottieAnimation
                  src="/lottie/checklist.json"
                  width={20}
                  height={20}
                />
                Scoring...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Score with AI
              </>
            )}
          </button>
        </div>
      )}

      {/* ═══════ Manual Mode ═══════ */}
      {mode === "manual" && (
        <div className="space-y-5">
          {/* Interaction QA Section */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Interaction QA{" "}
              <span className="text-muted-foreground/60 font-normal">(10 params)</span>
            </h4>
            <div className="rounded-[10px] border border-border bg-background px-4">
              {INTERACTION_PARAMS.map((key) => (
                <ManualParamRow
                  key={key}
                  paramKey={key}
                  state={interactionState[key]}
                  onChange={(updated) =>
                    setInteractionState((prev) => ({
                      ...prev,
                      [key]: updated,
                    }))
                  }
                />
              ))}
            </div>
          </div>

          {/* Case QA Section */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Case QA{" "}
              <span className="text-muted-foreground/60 font-normal">(10 params)</span>
            </h4>
            <div className="rounded-[10px] border border-border bg-background px-4">
              {CASE_PARAMS.map((key) => (
                <ManualParamRow
                  key={key}
                  paramKey={key}
                  state={caseState[key]}
                  onChange={(updated) =>
                    setCaseState((prev) => ({ ...prev, [key]: updated }))
                  }
                />
              ))}
            </div>
          </div>

          {/* Red Flags */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#EF4444] mb-2">
              Red Flags{" "}
              <span className="text-muted-foreground/60 font-normal">(4 items)</span>
            </h4>
            <div className="rounded-[10px] border border-red-100 dark:border-red-900 bg-red-50/30 dark:bg-red-950/30 px-4">
              {RED_FLAG_PARAMS.map((key) => (
                <RedFlagRow
                  key={key}
                  paramKey={key}
                  state={redFlagState[key]}
                  onChange={(updated) =>
                    setRedFlagState((prev) => ({ ...prev, [key]: updated }))
                  }
                />
              ))}
            </div>
          </div>

          <button
            onClick={calculateManualScore}
            disabled={isLoading}
            className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all duration-150 hover:bg-primary/80 disabled:bg-muted disabled:text-muted-foreground/60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Calculator className="h-4 w-4" />
            Calculate Score
          </button>
        </div>
      )}

      {/* ═══════ Paste Mode ═══════ */}
      {mode === "paste" && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Paste Transcript
            </label>
            <textarea
              rows={6}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the raw chat/phone transcript here..."
              className="w-full rounded-[10px] border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Paste Ticket Data
            </label>
            <textarea
              rows={4}
              value={ticketData}
              onChange={(e) => setTicketData(e.target.value)}
              placeholder="Paste ticket details (description, resolution, metadata)..."
              className="w-full rounded-[10px] border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={handlePasteSubmit}
            disabled={(!transcript && !ticketData) || isLoading}
            className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all duration-150 hover:bg-primary/80 disabled:bg-muted disabled:text-muted-foreground/60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <LottieAnimation
                  src="/lottie/checklist.json"
                  width={20}
                  height={20}
                />
                Scoring...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit for Scoring
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
