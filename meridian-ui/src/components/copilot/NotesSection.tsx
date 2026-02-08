"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CustomerNote } from "@/mock/customerProfiles";

interface NotesSectionProps {
  notes: CustomerNote[];
  onAddNote: (text: string) => void;
}

export default function NotesSection({ notes, onAddNote }: NotesSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [noteText, setNoteText] = useState("");

  const handleSave = () => {
    if (!noteText.trim()) return;
    onAddNote(noteText.trim());
    setNoteText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="border border-border bg-card">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
      >
        <span className="text-xs font-semibold text-foreground">
          Notes ({notes.length})
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

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-3 pb-3">
              {/* Existing notes */}
              {notes.map((note) => {
                const date = new Date(note.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                return (
                  <div key={note.id} className="border border-border bg-background p-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="font-medium">{note.author}</span>
                      <span>·</span>
                      <span>{date}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-foreground">
                      {note.text}
                    </p>
                  </div>
                );
              })}

              {/* Add note */}
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a note about this customer..."
                  rows={2}
                  className="w-full border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring resize-none"
                />
                <button
                  onClick={handleSave}
                  disabled={!noteText.trim()}
                  className="bg-foreground px-2.5 py-1 text-[11px] font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40"
                >
                  Save Note
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
