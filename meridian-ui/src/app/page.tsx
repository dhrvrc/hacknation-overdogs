"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { easeOut } from "@/lib/utils";
import CopilotView from "@/views/CopilotView";
import DashboardView from "@/views/DashboardView";
import QAScoringView from "@/views/QAScoringView";
import DemoView from "@/views/DemoView";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { key: "copilot", label: "Copilot" },
  { key: "dashboard", label: "Dashboard" },
  { key: "qa", label: "QA Scoring" },
  { key: "about", label: "About" },
] as const;

type ViewKey = (typeof navItems)[number]["key"];

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
    <div className="min-h-screen bg-background">
      {/* Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center px-6 md:px-12 lg:px-16">
          {/* Wordmark */}
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Meridian
          </span>

          {/* Nav Links */}
          <nav className="ml-8 hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`relative px-3 py-2 text-sm transition-colors duration-150 ${
                  activeView === item.key
                    ? "font-medium text-foreground"
                    : "font-normal text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
                {activeView === item.key && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <div className="ml-auto flex items-center gap-3 sm:hidden">
            <select
              value={activeView}
              onChange={(e) => setActiveView(e.target.value as ViewKey)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground"
            >
              {navItems.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
            <ThemeToggle />
          </div>

          {/* Theme toggle + Avatar */}
          <div className="ml-auto hidden items-center gap-3 sm:flex">
            <ThemeToggle />
            <div className="h-8 w-8 rounded-full bg-muted" />
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className={activeView === "about" ? "" : "mx-auto max-w-[1280px] px-6 py-8 md:px-12 lg:px-16"}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
