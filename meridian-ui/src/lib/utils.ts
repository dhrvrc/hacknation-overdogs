import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Shared ease-out curve for framer-motion */
export const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Chart color references that respond to dark mode via CSS variables */
export const chartColors = {
  foreground: "hsl(var(--foreground))",
  background: "hsl(var(--background))",
  card: "hsl(var(--card))",
  border: "hsl(var(--border))",
  input: "hsl(var(--input))",
  muted: "hsl(var(--muted))",
  mutedForeground: "hsl(var(--muted-foreground))",
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  // Semantic accents (unchanged across modes)
  amber: "#F59E0B",
  blue: "#3B82F6",
  emerald: "#10B981",
  red: "#EF4444",
  teal: "#0D9488",
};

/** Tooltip style for Recharts that adapts to dark mode */
export const chartTooltipStyle = {
  borderRadius: "10px",
  border: "1px solid hsl(var(--border))",
  fontSize: "12px",
  backgroundColor: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
};
