// ============================================================
// Meridian — Customer Profile Mock Data
// Full customer profiles with past tickets, knowledge graph
// data, and notes for each scenario customer.
// ============================================================

// ── Types ────────────────────────────────────────────────────

export interface CustomerNote {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface PastTicket {
  ticketId: string;
  subject: string;
  status: "Resolved" | "Open" | "Escalated";
  tier: number;
  priority: "Critical" | "High" | "Medium" | "Low";
  createdAt: string;
  resolvedAt?: string;
  module: string;
}

export interface KnowledgeGraphNode {
  id: string;
  type: "customer" | "ticket" | "kb" | "script" | "conversation";
  label: string;
  metadata?: Record<string, string>;
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface KnowledgeGraphUpdate {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface CustomerProfile {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  accountId: string;
  accountType: "Enterprise" | "Professional" | "Standard";
  propertyCount: number;
  slaTier: "Platinum" | "Gold" | "Silver";
  since: string;
  pastTickets: PastTicket[];
  knowledgeGraph: KnowledgeGraphData;
  notes: CustomerNote[];
}

// ── Profiles ─────────────────────────────────────────────────

const morganJohnson: CustomerProfile = {
  id: "CUST-001",
  name: "Morgan Johnson",
  company: "Oak & Ivy Management",
  email: "morgan.johnson@oakivy.com",
  phone: "+1 (555) 234-5678",
  accountId: "ACC-4072",
  accountType: "Enterprise",
  propertyCount: 12,
  slaTier: "Platinum",
  since: "2021-03-15",
  pastTickets: [
    {
      ticketId: "CS-38908386",
      subject: "Unable to advance property date (backend data sync)",
      status: "Resolved",
      tier: 3,
      priority: "High",
      createdAt: "2025-02-19",
      resolvedAt: "2025-02-19",
      module: "Accounting / Date Advance",
    },
    {
      ticketId: "CS-38701122",
      subject: "HAP batch processing delay for Heritage Point",
      status: "Resolved",
      tier: 2,
      priority: "Medium",
      createdAt: "2025-01-10",
      resolvedAt: "2025-01-11",
      module: "Affordable / HAP",
    },
    {
      ticketId: "CS-38500001",
      subject: "Report generation timeout for Heritage Point",
      status: "Resolved",
      tier: 1,
      priority: "Low",
      createdAt: "2024-11-05",
      resolvedAt: "2024-11-05",
      module: "Reports / Generation",
    },
    {
      ticketId: "CS-38422010",
      subject: "Move-out date not syncing after lease termination",
      status: "Resolved",
      tier: 2,
      priority: "Medium",
      createdAt: "2024-09-18",
      resolvedAt: "2024-09-20",
      module: "Leasing / Move-Out",
    },
  ],
  knowledgeGraph: {
    nodes: [
      { id: "cust-001", type: "customer", label: "Morgan Johnson" },
      { id: "CS-38908386", type: "ticket", label: "Date Advance Failure", metadata: { tier: "3", status: "Resolved" } },
      { id: "CS-38701122", type: "ticket", label: "HAP Batch Delay", metadata: { tier: "2", status: "Resolved" } },
      { id: "CS-38500001", type: "ticket", label: "Report Timeout", metadata: { tier: "1", status: "Resolved" } },
      { id: "CS-38422010", type: "ticket", label: "Move-Out Sync", metadata: { tier: "2", status: "Resolved" } },
      { id: "KB-SYN-0001", type: "kb", label: "Date Advance KB" },
      { id: "KB-0412", type: "kb", label: "HAP Processing Guide" },
      { id: "SCRIPT-0293", type: "script", label: "Date Advance Fix" },
      { id: "CONV-O2RAK1VRJN", type: "conversation", label: "Chat: Date Advance" },
      { id: "CONV-HAP-001", type: "conversation", label: "Call: HAP Delay" },
    ],
    edges: [
      { source: "cust-001", target: "CS-38908386", relationship: "OPENED" },
      { source: "cust-001", target: "CS-38701122", relationship: "OPENED" },
      { source: "cust-001", target: "CS-38500001", relationship: "OPENED" },
      { source: "cust-001", target: "CS-38422010", relationship: "OPENED" },
      { source: "CS-38908386", target: "KB-SYN-0001", relationship: "GENERATED" },
      { source: "CS-38908386", target: "SCRIPT-0293", relationship: "USED" },
      { source: "CS-38908386", target: "CONV-O2RAK1VRJN", relationship: "HAS_CONVERSATION" },
      { source: "CS-38701122", target: "KB-0412", relationship: "REFERENCED" },
      { source: "CS-38701122", target: "CONV-HAP-001", relationship: "HAS_CONVERSATION" },
    ],
  },
  notes: [
    {
      id: "note-001",
      text: "Preferred contact method: email. Usually calls for urgent issues only.",
      author: "Alex",
      timestamp: "2025-02-19T14:30:00Z",
    },
  ],
};

const sarahChen: CustomerProfile = {
  id: "CUST-002",
  name: "Sarah Chen",
  company: "Riverside Properties",
  email: "sarah.chen@riverside.com",
  phone: "+1 (555) 891-0123",
  accountId: "ACC-2891",
  accountType: "Professional",
  propertyCount: 6,
  slaTier: "Gold",
  since: "2022-07-20",
  pastTickets: [
    {
      ticketId: "CS-02155732",
      subject: "HAP voucher sync amounts mismatch after batch",
      status: "Resolved",
      tier: 3,
      priority: "Critical",
      createdAt: "2025-01-28",
      resolvedAt: "2025-01-29",
      module: "Affordable / HAP",
    },
    {
      ticketId: "CS-02140088",
      subject: "Certification renewal form not loading",
      status: "Resolved",
      tier: 1,
      priority: "Medium",
      createdAt: "2024-12-15",
      resolvedAt: "2024-12-15",
      module: "Affordable / Certification",
    },
    {
      ticketId: "CS-02100550",
      subject: "HUD reporting data discrepancy",
      status: "Escalated",
      tier: 3,
      priority: "Critical",
      createdAt: "2024-10-02",
      module: "Affordable / HUD Reports",
    },
  ],
  knowledgeGraph: {
    nodes: [
      { id: "cust-002", type: "customer", label: "Sarah Chen" },
      { id: "CS-02155732", type: "ticket", label: "HAP Voucher Sync", metadata: { tier: "3", status: "Resolved" } },
      { id: "CS-02140088", type: "ticket", label: "Cert Form Load", metadata: { tier: "1", status: "Resolved" } },
      { id: "CS-02100550", type: "ticket", label: "HUD Data Issue", metadata: { tier: "3", status: "Escalated" } },
      { id: "KB-SYN-0042", type: "kb", label: "HAP Voucher Sync KB" },
      { id: "SCRIPT-0412", type: "script", label: "Voucher Reconciliation" },
      { id: "CONV-HAP-042", type: "conversation", label: "Call: Voucher Sync" },
    ],
    edges: [
      { source: "cust-002", target: "CS-02155732", relationship: "OPENED" },
      { source: "cust-002", target: "CS-02140088", relationship: "OPENED" },
      { source: "cust-002", target: "CS-02100550", relationship: "OPENED" },
      { source: "CS-02155732", target: "KB-SYN-0042", relationship: "GENERATED" },
      { source: "CS-02155732", target: "SCRIPT-0412", relationship: "USED" },
      { source: "CS-02155732", target: "CONV-HAP-042", relationship: "HAS_CONVERSATION" },
    ],
  },
  notes: [
    {
      id: "note-002",
      text: "Has HUD deadlines — always treat HAP issues as high priority for this account.",
      author: "Jordan",
      timestamp: "2025-01-29T10:15:00Z",
    },
  ],
};

const davidPark: CustomerProfile = {
  id: "CUST-003",
  name: "David Park",
  company: "Summit Housing Group",
  email: "david.park@summithousing.org",
  phone: "+1 (555) 456-7890",
  accountId: "ACC-5500",
  accountType: "Standard",
  propertyCount: 3,
  slaTier: "Silver",
  since: "2023-01-10",
  pastTickets: [
    {
      ticketId: "CS-05500101",
      subject: "Resident portal login failures after update",
      status: "Resolved",
      tier: 1,
      priority: "Medium",
      createdAt: "2024-12-01",
      resolvedAt: "2024-12-01",
      module: "Residents / Portal",
    },
    {
      ticketId: "CS-05500088",
      subject: "Lease renewal template missing fields",
      status: "Resolved",
      tier: 2,
      priority: "Low",
      createdAt: "2024-08-20",
      resolvedAt: "2024-08-22",
      module: "Leasing / Templates",
    },
  ],
  knowledgeGraph: {
    nodes: [
      { id: "cust-003", type: "customer", label: "David Park" },
      { id: "CS-05500101", type: "ticket", label: "Portal Login Fix", metadata: { tier: "1", status: "Resolved" } },
      { id: "CS-05500088", type: "ticket", label: "Lease Template Fix", metadata: { tier: "2", status: "Resolved" } },
      { id: "KB-1024", type: "kb", label: "Portal Access Guide" },
      { id: "CONV-PORT-001", type: "conversation", label: "Chat: Portal Issue" },
    ],
    edges: [
      { source: "cust-003", target: "CS-05500101", relationship: "OPENED" },
      { source: "cust-003", target: "CS-05500088", relationship: "OPENED" },
      { source: "CS-05500101", target: "KB-1024", relationship: "REFERENCED" },
      { source: "CS-05500101", target: "CONV-PORT-001", relationship: "HAS_CONVERSATION" },
    ],
  },
  notes: [],
};

// ── Export ────────────────────────────────────────────────────

export const CUSTOMER_PROFILES: Record<string, CustomerProfile> = {
  "Morgan Johnson": morganJohnson,
  "Sarah Chen": sarahChen,
  "David Park": davidPark,
};
