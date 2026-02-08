"use client";

import { useState } from "react";
import ProvenanceModal from "@/components/ProvenanceModal";

interface ProvenanceBadgeProps {
  docId: string;
  provenance: Array<{
    source_type: string;
    source_id: string;
    [key: string]: unknown;
  }>;
}

export default function ProvenanceBadge({
  docId,
  provenance,
}: ProvenanceBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasProvenance = provenance.length > 0;

  return (
    <>
      {hasProvenance ? (
        <button
          onClick={() => setModalOpen(true)}
          className="text-[12px] font-medium text-[#0D9488] hover:underline cursor-pointer"
        >
          Evidence Chain ({provenance.length} sources)
        </button>
      ) : (
        <span className="text-[12px] text-muted-foreground/60">No chain</span>
      )}

      {modalOpen && (
        <ProvenanceModal docId={docId} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
