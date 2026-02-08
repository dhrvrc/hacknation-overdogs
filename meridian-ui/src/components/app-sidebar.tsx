"use client";

import { Bot, LayoutDashboard, ClipboardCheck, Info } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export type ViewKey = "copilot" | "dashboard" | "qa" | "about";

const navItems = [
  { key: "copilot" as const, label: "Copilot", icon: Bot },
  { key: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { key: "qa" as const, label: "QA Scoring", icon: ClipboardCheck },
  { key: "about" as const, label: "About", icon: Info },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeView: ViewKey;
  onViewChange: (view: ViewKey) => void;
}

export function AppSidebar({
  activeView,
  onViewChange,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="pointer-events-none data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500">
                <svg
                  className="size-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Meridian</span>
                <span className="text-xs text-muted-foreground">
                  Support Copilot
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={activeView === item.key}
                    onClick={() => onViewChange(item.key)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <ThemeToggle />
              <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                Toggle theme
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
