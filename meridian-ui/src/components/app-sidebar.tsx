"use client";

import {
  Radar,
  Bot,
  LayoutDashboard,
  ClipboardCheck,
  User,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export type ViewKey = "copilot" | "dashboard" | "qa";

const navItems = [
  { key: "copilot" as const, label: "Copilot", icon: Bot },
  { key: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { key: "qa" as const, label: "QA Scoring", icon: ClipboardCheck },
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
      {/* Header: Monochrome logo + theme toggle */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full">
              <SidebarMenuButton
                size="lg"
                className="pointer-events-none data-[slot=sidebar-menu-button]:!p-1.5 flex-1"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-foreground">
                  <Radar className="size-4 text-background" />
                </div>
                <span className="font-semibold">Meridian</span>
              </SidebarMenuButton>
              <div className="group-data-[collapsible=icon]:hidden">
                <ThemeToggle />
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
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

      {/* Footer: Profile section */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Profile">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  <User className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Support Agent</span>
                <span className="truncate text-xs text-muted-foreground">
                  agent@meridian.ai
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
