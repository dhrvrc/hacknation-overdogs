"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { easeOut } from "@/lib/utils";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, type ViewKey } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

import CopilotView from "@/views/CopilotView";
import DashboardView from "@/views/DashboardView";
import QAScoringView from "@/views/QAScoringView";
import DemoView from "@/views/DemoView";

const views: Record<ViewKey, React.ComponentType> = {
  copilot: CopilotView,
  dashboard: DashboardView,
  qa: QAScoringView,
  about: DemoView,
};

export default function Home() {
  const [activeView, setActiveView] = useState<ViewKey>("copilot");

  const ActiveComponent = views[activeView];

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <SidebarInset>
        <SiteHeader activeView={activeView} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: easeOut }}
              className={
                activeView === "about"
                  ? "flex-1 overflow-auto"
                  : "flex-1 overflow-auto p-4 lg:p-6"
              }
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
