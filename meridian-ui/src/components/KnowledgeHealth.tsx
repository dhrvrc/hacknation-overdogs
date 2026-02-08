"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BentoGrid, BentoCell } from "@/components/BentoGrid";
import { chartColors, chartTooltipStyle } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface KnowledgeHealthProps {
  data: {
    total_articles: number;
    seed_articles: number;
    learned_articles: number;
    articles_with_metadata: number;
    articles_without_metadata: number;
    avg_body_length: number;
    scripts_total: number;
    placeholders_total: number;
  };
}

export default function KnowledgeHealth({ data }: KnowledgeHealthProps) {
  const stats = [
    { label: "Total Articles", value: data.total_articles.toLocaleString() },
    { label: "Scripts", value: data.scripts_total.toLocaleString() },
    { label: "Learned Articles", value: data.learned_articles.toLocaleString(), accent: true },
    { label: "Placeholders", value: data.placeholders_total.toLocaleString() },
  ];

  const donutData = [
    { name: "Seed", value: data.seed_articles, color: chartColors.input },
    { name: "Learned", value: data.learned_articles, color: chartColors.foreground },
  ];

  const metadataPct = Math.round(
    (data.articles_with_metadata / data.total_articles) * 100
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">Knowledge Health</h3>

      {/* Stat cards */}
      <BentoGrid>
        {stats.map((stat, i) => (
          <BentoCell key={stat.label} span={3} index={i}>
            <p className="text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-[28px] font-semibold leading-none text-foreground">
              {stat.value}
              {stat.accent && <span className="ml-1 text-sm text-[#F59E0B]">&#10024;</span>}
            </p>
          </BentoCell>
        ))}
      </BentoGrid>

      {/* Donut + Metadata */}
      <BentoGrid>
        <BentoCell span={6} index={0}>
          <h4 className="text-sm font-medium text-foreground mb-4">
            Knowledge Composition
          </h4>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ background: d.color }}
                  />
                  <span className="text-xs text-muted-foreground">{d.name}</span>
                  <span className="text-xs font-medium text-foreground">
                    {d.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </BentoCell>

        <BentoCell span={6} index={1}>
          <h4 className="text-sm font-medium text-foreground mb-4">
            Metadata Coverage
          </h4>
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-[28px] font-semibold text-foreground">
                {metadataPct}%
              </span>
              <span className="text-xs text-muted-foreground/60">
                {data.articles_with_metadata} / {data.total_articles} articles
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${metadataPct}%` }}
              />
            </div>
          </div>
        </BentoCell>
      </BentoGrid>
    </div>
  );
}
