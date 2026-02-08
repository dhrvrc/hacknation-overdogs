"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { chartColors, chartTooltipStyle } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface TicketDistributionProps {
  data: {
    total: number;
    by_tier: Record<string, number>;
    by_priority: Record<string, number>;
    by_module: Record<string, number>;
  };
}

const TIER_COLORS: Record<string, string> = {
  "1": "#10B981",
  "2": "#F59E0B",
  "3": "#EF4444",
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#EF4444",
  High: "#F59E0B",
  Medium: chartColors.input,
  Low: chartColors.mutedForeground,
};

export default function TicketDistribution({ data }: TicketDistributionProps) {
  // Pie data for tiers
  const tierData = Object.entries(data.by_tier).map(([tier, count]) => ({
    name: `Tier ${tier}`,
    value: count,
    color: TIER_COLORS[tier] ?? chartColors.mutedForeground,
  }));

  // Bar data for priority
  const priorityData = Object.entries(data.by_priority).map(([prio, count]) => ({
    name: prio,
    value: count,
    color: PRIORITY_COLORS[prio] ?? chartColors.mutedForeground,
  }));

  // Horizontal bar data for modules (sorted by count desc)
  const moduleData = Object.entries(data.by_module)
    .map(([mod, count]) => ({ name: mod, value: count }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Tier Pie Chart */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">By Tier</h4>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie
                data={tierData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                dataKey="value"
                stroke="none"
              >
                {tierData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {tierData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: d.color }}
                />
                <span className="text-xs text-muted-foreground">{d.name}</span>
                <span className="text-xs font-medium text-foreground">
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Priority Bar Chart */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">
          By Priority
        </h4>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={priorityData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.border}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: chartColors.mutedForeground }}
              axisLine={{ stroke: chartColors.border }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: chartColors.mutedForeground }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
              {priorityData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Module Horizontal Bar Chart */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">By Module</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={moduleData} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.border}
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: chartColors.mutedForeground }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: chartColors.mutedForeground }}
              axisLine={false}
              tickLine={false}
              width={140}
            />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Bar
              dataKey="value"
              fill={chartColors.foreground}
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
