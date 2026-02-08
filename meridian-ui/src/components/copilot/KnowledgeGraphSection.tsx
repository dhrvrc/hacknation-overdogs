"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  KnowledgeGraphData,
  KnowledgeGraphUpdate,
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
} from "@/mock/customerProfiles";
import CustomerKnowledgeGraph from "./CustomerKnowledgeGraph";

type ViewMode = "graph" | "list" | "json";

interface KnowledgeGraphSectionProps {
  baseGraph: KnowledgeGraphData;
  updates: KnowledgeGraphUpdate[];
  isLive: boolean;
}

const NODE_TYPE_ICONS: Record<string, string> = {
  customer: "\u25C6",
  ticket: "\u25A0",
  kb: "\u25B6",
  script: "\u25B2",
  conversation: "\u25CF",
};

export default function KnowledgeGraphSection({
  baseGraph,
  updates,
  isLive,
}: KnowledgeGraphSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("graph");

  // Merge base graph with live updates
  const { mergedNodes, mergedEdges, newNodeIds } = useMemo(() => {
    const allNodes: KnowledgeGraphNode[] = [...baseGraph.nodes];
    const allEdges: KnowledgeGraphEdge[] = [...baseGraph.edges];
    const newIds = new Set<string>();

    for (const update of updates) {
      for (const node of update.nodes) {
        if (!allNodes.some((n) => n.id === node.id)) {
          allNodes.push(node);
          newIds.add(node.id);
        }
      }
      for (const edge of update.edges) {
        if (
          !allEdges.some(
            (e) => e.source === edge.source && e.target === edge.target
          )
        ) {
          allEdges.push(edge);
        }
      }
    }

    return { mergedNodes: allNodes, mergedEdges: allEdges, newNodeIds: newIds };
  }, [baseGraph, updates]);

  // Build nested tree for list view
  const listTree = useMemo(() => {
    const customerNode = mergedNodes.find((n) => n.type === "customer");
    if (!customerNode) return [];

    const customerEdges = mergedEdges.filter((e) => e.source === customerNode.id);
    return customerEdges.map((edge) => {
      const childNode = mergedNodes.find((n) => n.id === edge.target);
      if (!childNode) return null;

      const childEdges = mergedEdges.filter((e) => e.source === childNode.id);
      const grandchildren = childEdges
        .map((ce) => {
          const grandchild = mergedNodes.find((n) => n.id === ce.target);
          return grandchild ? { node: grandchild, relationship: ce.relationship } : null;
        })
        .filter(Boolean);

      return {
        node: childNode,
        relationship: edge.relationship,
        children: grandchildren,
      };
    }).filter(Boolean);
  }, [mergedNodes, mergedEdges]);

  const views: { id: ViewMode; label: string }[] = [
    { id: "graph", label: "Graph" },
    { id: "list", label: "List" },
    { id: "json", label: "JSON" },
  ];

  return (
    <div className="border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left"
        >
          <span className="text-xs font-semibold text-foreground">
            Knowledge Graph
          </span>
          <svg
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {isLive && updates.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              {updates.reduce((n, u) => n + u.nodes.length, 0)} new
            </span>
          )}

          {/* View mode toggle */}
          <div className="flex border border-border bg-muted/50 p-0.5">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => setViewMode(view.id)}
                className={`px-2 py-0.5 text-[10px] font-medium transition-all ${
                  viewMode === view.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              {viewMode === "graph" && (
                <CustomerKnowledgeGraph
                  nodes={mergedNodes}
                  edges={mergedEdges}
                  newNodeIds={newNodeIds}
                />
              )}

              {viewMode === "list" && (
                <div className="space-y-1 py-1">
                  {/* Customer root */}
                  {mergedNodes.find((n) => n.type === "customer") && (
                    <p className="text-[11px] font-medium text-foreground">
                      {NODE_TYPE_ICONS.customer}{" "}
                      {mergedNodes.find((n) => n.type === "customer")!.label}{" "}
                      <span className="text-muted-foreground">(Customer)</span>
                    </p>
                  )}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {listTree.map((item: any) => (
                    <div key={item.node.id} className="ml-3">
                      <p className="text-[11px] text-foreground">
                        <span className="text-muted-foreground">├─</span>{" "}
                        {NODE_TYPE_ICONS[item.node.type] || "·"}{" "}
                        {item.node.label}{" "}
                        <span className="text-[10px] text-muted-foreground">
                          ({item.node.type})
                        </span>{" "}
                        <span className="text-[9px] text-muted-foreground">
                          [{item.relationship}]
                        </span>
                        {newNodeIds.has(item.node.id) && (
                          <span className="ml-1 bg-emerald-100 px-1 py-0.5 text-[8px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                            NEW
                          </span>
                        )}
                      </p>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {item.children?.map((child: any) => (
                        <p
                          key={child.node.id}
                          className="ml-4 text-[11px] text-foreground"
                        >
                          <span className="text-muted-foreground">└─</span>{" "}
                          {NODE_TYPE_ICONS[child.node.type] || "·"}{" "}
                          {child.node.label}{" "}
                          <span className="text-[10px] text-muted-foreground">
                            ({child.node.type})
                          </span>{" "}
                          <span className="text-[9px] text-muted-foreground">
                            [{child.relationship}]
                          </span>
                          {newNodeIds.has(child.node.id) && (
                            <span className="ml-1 bg-emerald-100 px-1 py-0.5 text-[8px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                              NEW
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {viewMode === "json" && (
                <pre className="max-h-60 overflow-auto bg-muted p-3 font-mono text-[10px] text-foreground">
                  {JSON.stringify(
                    { nodes: mergedNodes, edges: mergedEdges },
                    null,
                    2
                  )}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
