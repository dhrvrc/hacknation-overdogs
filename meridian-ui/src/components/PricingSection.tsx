"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { easeOut } from "@/lib/utils";

interface PricingTier {
  name: string;
  price: string;
  priceSuffix: string;
  subtitle: string;
  features: string[];
  cta: string;
  recommended?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: "Starter",
    price: "$0",
    priceSuffix: "/month",
    subtitle: "For evaluation and small teams",
    features: [
      "Up to 500 queries/month",
      "Basic retrieval (KB + Scripts)",
      "5 users",
      "Community support",
    ],
    cta: "Get Started",
  },
  {
    name: "Professional",
    price: "$49",
    priceSuffix: "/agent/month",
    subtitle: "For growing support organizations",
    features: [
      "Unlimited queries",
      "Full provenance tracing",
      "Self-learning pipeline",
      "QA scoring (20 rubric parameters)",
      "50 users",
      "Priority support",
      "API access",
    ],
    cta: "Start Free Trial",
    recommended: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceSuffix: "",
    subtitle: "For organizations with compliance requirements",
    features: [
      "Everything in Professional",
      "SSO & SAML",
      "Custom compliance rules",
      "Dedicated success manager",
      "SLA guarantee",
      "On-premise deployment option",
    ],
    cta: "Contact Sales",
  },
];

export default function PricingSection({ onNavigate }: { onNavigate?: (view: string) => void }) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
              duration: 0.4,
              delay: i * 0.06,
              ease: easeOut,
            }}
            className={`relative flex flex-col rounded-[14px] border p-6 transition-all duration-300 ${
              tier.recommended
                ? "border-primary border-2 bg-background shadow-md hover:shadow-lg"
                : "border-input bg-background shadow-sm hover:shadow-md"
            }`}
          >
            {tier.recommended && (
              <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground">
                Most Popular
              </span>
            )}

            <h3 className="text-lg font-medium text-foreground">{tier.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-foreground">
                {tier.price}
              </span>
              {tier.priceSuffix && (
                <span className="text-sm text-muted-foreground/60">{tier.priceSuffix}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{tier.subtitle}</p>

            <ul className="mt-6 flex-1 space-y-3">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => onNavigate?.("copilot")}
              className={`mt-6 w-full rounded-full py-2.5 text-sm font-medium transition-all duration-150 ${
                tier.recommended
                  ? "bg-primary text-primary-foreground hover:bg-primary/80 shadow-sm"
                  : "border border-input bg-transparent text-foreground hover:bg-card hover:border-muted-foreground/40"
              }`}
            >
              {tier.cta}
            </button>
          </motion.div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground/60">
        All plans include 14-day free trial. No credit card required.
      </p>
    </div>
  );
}
