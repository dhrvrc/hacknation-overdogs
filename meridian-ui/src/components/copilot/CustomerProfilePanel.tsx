"use client";

import { motion } from "framer-motion";
import type { CustomerProfile, KnowledgeGraphUpdate, CustomerNote } from "@/mock/customerProfiles";
import ProfileInfoSection from "./ProfileInfoSection";
import PastTicketsSection from "./PastTicketsSection";
import KnowledgeGraphSection from "./KnowledgeGraphSection";
import NotesSection from "./NotesSection";

interface CustomerProfilePanelProps {
  profile: CustomerProfile | null;
  graphUpdates: KnowledgeGraphUpdate[];
  customerNotes: CustomerNote[];
  isLive: boolean;
  onAddNote: (text: string) => void;
}

export default function CustomerProfilePanel({
  profile,
  graphUpdates,
  customerNotes,
  isLive,
  onAddNote,
}: CustomerProfilePanelProps) {
  if (!profile) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center px-4">
        <div className="flex h-12 w-12 items-center justify-center bg-muted">
          <svg
            className="h-6 w-6 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">
          No Customer Selected
        </p>
        <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">
          Select a scenario to view the customer&apos;s profile and history.
        </p>
      </div>
    );
  }

  // Merge profile notes with session notes
  const allNotes = [...profile.notes, ...customerNotes];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col overflow-y-auto"
    >
      <div className="space-y-2 p-3">
        <ProfileInfoSection profile={profile} />
        <PastTicketsSection tickets={profile.pastTickets} />
        <KnowledgeGraphSection
          baseGraph={profile.knowledgeGraph}
          updates={graphUpdates}
          isLive={isLive}
        />
        <NotesSection notes={allNotes} onAddNote={onAddNote} />
      </div>
    </motion.div>
  );
}
