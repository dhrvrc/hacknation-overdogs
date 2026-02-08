"use client";

import { motion } from "framer-motion";
import type { CustomerProfile } from "@/mock/customerProfiles";

interface ProfileInfoSectionProps {
  profile: CustomerProfile;
}

export default function ProfileInfoSection({ profile }: ProfileInfoSectionProps) {
  const sinceDate = new Date(profile.since).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const fields = [
    { label: "Email", value: profile.email },
    { label: "Phone", value: profile.phone },
    { label: "Account ID", value: profile.accountId },
    { label: "Account Type", value: profile.accountType },
    { label: "Properties", value: String(profile.propertyCount) },
    { label: "SLA Tier", value: profile.slaTier },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-border bg-card p-4"
    >
      {/* Header: avatar + name */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-semibold text-white">
          {profile.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {profile.name}
          </h3>
          <p className="text-[11px] text-muted-foreground truncate">
            {profile.company}
          </p>
        </div>
      </div>

      {/* Detail grid */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {fields.map((field) => (
          <div key={field.label}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {field.label}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground truncate">
              {field.value}
            </p>
          </div>
        ))}
      </div>

      {/* Customer since */}
      <div className="mt-3 border-t border-border pt-2">
        <p className="text-[10px] text-muted-foreground">
          Customer since <span className="font-medium text-foreground">{sinceDate}</span>
        </p>
      </div>
    </motion.div>
  );
}
