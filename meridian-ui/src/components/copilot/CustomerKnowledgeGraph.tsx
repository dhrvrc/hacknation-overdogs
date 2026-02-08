"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { KnowledgeGraphNode, KnowledgeGraphEdge } from "@/mock/customerProfiles";

interface CustomerKnowledgeGraphProps {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  newNodeIds?: Set<string>;
}

const NODE_COLORS: Record<string, string> = {
  customer: "#8B5CF6",
  ticket: "#10B981",
  kb: "#3B82F6",
  script: "#F59E0B",
  conversation: "#0D9488",
};

const NODE_LABELS: Record<string, string> = {
  customer: "Customer",
  ticket: "Ticket",
  kb: "KB Article",
  script: "Script",
  conversation: "Conversation",
};

function truncateLabel(label: string, max = 14): string {
  return label.length > max ? label.slice(0, max - 1) + "\u2026" : label;
}

export default function CustomerKnowledgeGraph({
  nodes,
  edges,
  newNodeIds,
}: CustomerKnowledgeGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    const cx = 200;
    const cy = 160;

    const customerNode = nodes.find((n) => n.type === "customer");
    if (customerNode) pos.set(customerNode.id, { x: cx, y: cy });

    // Ring 1: tickets and conversations
    const ring1 = nodes.filter(
      (n) => n.type === "ticket" || n.type === "conversation"
    );
    ring1.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / ring1.length - Math.PI / 2;
      pos.set(node.id, {
        x: cx + 90 * Math.cos(angle),
        y: cy + 90 * Math.sin(angle),
      });
    });

    // Ring 2: KB articles and scripts
    const ring2 = nodes.filter((n) => n.type === "kb" || n.type === "script");
    ring2.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / ring2.length - Math.PI / 4;
      pos.set(node.id, {
        x: cx + 145 * Math.cos(angle),
        y: cy + 145 * Math.sin(angle),
      });
    });

    return pos;
  }, [nodes]);

  const hoveredData = useMemo(() => {
    if (!hoveredNode) return null;
    return nodes.find((n) => n.id === hoveredNode) || null;
  }, [hoveredNode, nodes]);

  return (
    <div className="relative">
      <svg viewBox="0 0 400 320" className="h-auto w-full">
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = positions.get(edge.source);
          const to = positions.get(edge.target);
          if (!from || !to) return null;
          return (
            <motion.path
              key={`edge-${i}`}
              d={`M ${from.x},${from.y} L ${to.x},${to.y}`}
              stroke="hsl(var(--border))"
              strokeWidth={1}
              strokeOpacity={0.5}
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: i * 0.04 }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const color = NODE_COLORS[node.type] || "#6B7280";
          const isNew = newNodeIds?.has(node.id);
          const isCenter = node.type === "customer";
          const size = isCenter ? 10 : 7;

          return (
            <motion.g
              key={node.id}
              initial={isNew ? { scale: 0, opacity: 0 } : { scale: 0, opacity: 0 }}
              animate={
                isNew
                  ? { scale: [0, 1.3, 1], opacity: 1 }
                  : { scale: 1, opacity: 1 }
              }
              transition={{
                duration: isNew ? 0.5 : 0.3,
                delay: isNew ? 0 : 0.15 + i * 0.06,
              }}
              style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
            >
              <rect
                x={pos.x - size}
                y={pos.y - size}
                width={size * 2}
                height={size * 2}
                fill={color}
                opacity={hoveredNode === node.id ? 1 : 0.85}
              />
              {isNew && (
                <motion.rect
                  x={pos.x - size - 2}
                  y={pos.y - size - 2}
                  width={size * 2 + 4}
                  height={size * 2 + 4}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              <text
                x={pos.x}
                y={pos.y + size + 12}
                textAnchor="middle"
                className="text-[8px] fill-current"
                style={{ fill: "hsl(var(--muted-foreground))" }}
              >
                {truncateLabel(node.label)}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredData && (
        <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 border border-border bg-card p-2 shadow-md">
          <p className="text-[10px] font-semibold text-foreground">
            {hoveredData.label}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {NODE_LABELS[hoveredData.type] || hoveredData.type} · {hoveredData.id}
          </p>
          {hoveredData.metadata &&
            Object.entries(hoveredData.metadata).map(([k, v]) => (
              <p key={k} className="text-[9px] text-muted-foreground">
                {k}: {v}
              </p>
            ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-1 flex flex-wrap justify-center gap-3 px-2">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="h-2 w-2" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-muted-foreground capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
