"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const viewLabels: Record<string, string> = {
  copilot: "Copilot",
  dashboard: "Dashboard",
  qa: "QA Scoring",
  about: "About",
};

interface SiteHeaderProps {
  activeView: string;
}

export function SiteHeader({ activeView }: SiteHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{viewLabels[activeView] ?? activeView}</h1>
      </div>
    </header>
  );
}
