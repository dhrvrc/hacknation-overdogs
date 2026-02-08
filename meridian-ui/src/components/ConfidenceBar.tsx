"use client";

interface ConfidenceBarProps {
  confidence_scores: { SCRIPT: number; KB: number; TICKET: number };
  predicted_type: string;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bar: string }
> = {
  SCRIPT: {
    label: "SCRIPT",
    color: "text-[#F59E0B]",
    bar: "bg-[#F59E0B]",
  },
  KB: {
    label: "KB",
    color: "text-[#3B82F6]",
    bar: "bg-[#3B82F6]",
  },
  TICKET: {
    label: "TICKET",
    color: "text-[#10B981]",
    bar: "bg-[#10B981]",
  },
};

export default function ConfidenceBar({
  confidence_scores,
  predicted_type,
}: ConfidenceBarProps) {
  const total =
    confidence_scores.SCRIPT + confidence_scores.KB + confidence_scores.TICKET;

  const segments = (["SCRIPT", "KB", "TICKET"] as const).map((type) => ({
    type,
    score: confidence_scores[type],
    pct: Math.round(confidence_scores[type] * 100),
    width: total > 0 ? (confidence_scores[type] / total) * 100 : 33,
    ...TYPE_CONFIG[type],
  }));

  const winner = TYPE_CONFIG[predicted_type] ?? TYPE_CONFIG.SCRIPT;

  return (
    <div className="rounded-[14px] border border-border bg-background p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
          Classification Confidence
        </span>
        <span
          className={`rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium ${winner.color}`}
        >
          Predicted: {winner.label}
        </span>
      </div>

      {/* Stacked bar */}
      <div className="mb-3 flex h-2 w-full gap-0.5 overflow-hidden rounded">
        {segments.map((seg) => (
          <div
            key={seg.type}
            className={`${seg.bar} rounded transition-all duration-500`}
            style={{ width: `${seg.width}%` }}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="flex items-center gap-4">
        {segments.map((seg) => (
          <div key={seg.type} className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-sm ${seg.bar}`} />
            <span className={`text-xs font-medium ${seg.color}`}>
              {seg.label}
            </span>
            <span className="text-xs text-muted-foreground/60">{seg.pct}%</span>
            {seg.type === predicted_type && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                Primary
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
