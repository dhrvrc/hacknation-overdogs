"use client";

import { motion } from "framer-motion";
import {
  Search,
  Shield,
  Brain,
  MessageCircle,
  BarChart3,
  Lock,
} from "lucide-react";
import { BentoGrid, BentoCell } from "@/components/BentoGrid";
import LottieAnimation from "@/components/LottieAnimation";
import TestimonialCarousel from "@/components/TestimonialCarousel";
import PricingSection from "@/components/PricingSection";

import { easeOut } from "@/lib/utils";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 as const },
  transition: { duration: 0.5, ease: easeOut },
};

/* Placeholder logos for the trust bar */
const logos = [
  "Zendesk",
  "Salesforce",
  "Intercom",
  "Slack",
  "Jira",
  "HubSpot",
];

export default function DemoView({ onEnterApp }: { onEnterApp?: () => void }) {
  return (
    <div className="overflow-hidden">
      {/* =============================================
          Section A — Hero
          ============================================= */}
      <section className="relative min-h-screen flex items-center justify-center texture-dots">
        {/* Gradient wash overlay */}
        <div className="absolute inset-0 gradient-wash pointer-events-none" />
        <div className="absolute inset-0 texture-noise pointer-events-none" />

        {/* Background Lottie */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <LottieAnimation
            src="/lottie/particles.json"
            width={500}
            height={400}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-[1280px] px-6 py-20 md:px-12 lg:px-16 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="mx-auto max-w-3xl text-[clamp(32px,5vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground"
          >
            Support intelligence that learns from every interaction.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.2,
              ease: easeOut,
            }}
            className="mx-auto mt-6 max-w-2xl text-lg font-normal leading-relaxed text-muted-foreground"
          >
            Meridian gives support agents evidence-grounded answers with full
            provenance tracing — and gets smarter from every resolved ticket.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.4,
              ease: easeOut,
            }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <button
              onClick={onEnterApp}
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all duration-150 hover:bg-primary/80 hover:shadow-sm"
            >
              Try the Copilot
            </button>
            <button className="rounded-full border border-input bg-transparent px-6 py-3 text-sm font-medium text-foreground transition-all duration-150 hover:bg-card hover:border-muted-foreground/40">
              Watch it learn
            </button>
          </motion.div>
        </div>
      </section>

      {/* =============================================
          Section B — Trust Bar
          ============================================= */}
      <section className="py-8 border-b border-border">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12 lg:px-16">
          <motion.p
            {...fadeInUp}
            className="text-center text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground/60 mb-6"
          >
            Integrates with your existing stack
          </motion.p>
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {logos.map((name, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="flex h-8 items-center"
              >
                <span className="text-sm font-medium text-muted-foreground/40">
                  {name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =============================================
          Section C — Feature Bento Grid
          ============================================= */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12 lg:px-16">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-[28px] font-semibold tracking-[-0.01em] text-foreground">
              Three surfaces. One learning loop.
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Copilot creates value. Learning engine compounds it. Dashboard
              governs it.
            </p>
          </motion.div>

          <BentoGrid>
            {/* Cell 1: Copilot (8 cols, 2 rows) */}
            <BentoCell span={8} rowSpan={2} index={0}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-foreground">
                    Evidence-Grounded Copilot
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md">
                    Real-time, citation-backed recommendations for every support
                    interaction. Every answer traces to its source.
                  </p>
                </div>
                <LottieAnimation
                  src="/lottie/chat-bubbles.json"
                  width={80}
                  height={80}
                  className="shrink-0 opacity-60"
                />
              </div>
              {/* Mock copilot screenshot */}
              <div className="mt-6 rounded-[10px] border border-border bg-background p-4">
                <div className="flex gap-3">
                  <div className="flex-[38%] space-y-2">
                    <div className="h-3 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                  </div>
                  <div className="flex-[62%] space-y-2">
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-5/6 rounded bg-muted" />
                    <div className="h-3 w-4/5 rounded bg-muted" />
                  </div>
                </div>
              </div>
            </BentoCell>

            {/* Cell 2: Classification Engine (4 cols) */}
            <BentoCell span={4} index={1}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-medium text-foreground">
                    Classification Engine
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Routes questions to scripts, articles, or past tickets with
                    71% accuracy.
                  </p>
                </div>
                <Search className="h-6 w-6 shrink-0 text-muted-foreground/40" />
              </div>
            </BentoCell>

            {/* Cell 3: Provenance Tracing (4 cols) */}
            <BentoCell span={4} index={2}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-medium text-foreground">
                    Provenance Tracing
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Every answer traces to its source ticket, conversation, and
                    script.
                  </p>
                </div>
                <LottieAnimation
                  src="/lottie/connected-nodes.json"
                  width={60}
                  height={30}
                  className="shrink-0 opacity-60"
                />
              </div>
            </BentoCell>

            {/* Cell 4: Gap Detection (4 cols) */}
            <BentoCell span={4} index={3}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-medium text-foreground">
                    Gap Detection
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Automatically spots when new issues lack knowledge base
                    coverage.
                  </p>
                </div>
                <LottieAnimation
                  src="/lottie/radar.json"
                  width={40}
                  height={40}
                  className="shrink-0 opacity-60"
                />
              </div>
            </BentoCell>

            {/* Cell 5: Self-Learning Loop (4 cols) */}
            <BentoCell span={4} index={4}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-medium text-foreground">
                    Self-Learning Loop
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Drafts KB articles from resolved tickets, reviewed by
                    humans, indexed automatically.
                  </p>
                </div>
                <LottieAnimation
                  src="/lottie/document-lightbulb.json"
                  width={40}
                  height={40}
                  className="shrink-0 opacity-60"
                />
              </div>
            </BentoCell>

            {/* Cell 6: QA Scoring (8 cols) */}
            <BentoCell span={8} index={5}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    QA Scoring
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-lg">
                    Production-grade rubric scoring with 20 parameters, red flag
                    detection, and coaching recommendations.
                  </p>
                </div>
                <LottieAnimation
                  src="/lottie/checklist.json"
                  width={48}
                  height={48}
                  className="shrink-0 opacity-60"
                />
              </div>
            </BentoCell>
          </BentoGrid>
        </div>
      </section>

      {/* Gradient divider */}
      <div className="gradient-divider mx-auto max-w-[1280px]" />

      {/* =============================================
          Section D — How It Works
          ============================================= */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12 lg:px-16">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-[28px] font-semibold tracking-[-0.01em] text-foreground">
              How it works
            </h2>
          </motion.div>

          <div className="mx-auto max-w-2xl">
            {[
              {
                step: "1",
                title: "Ask",
                desc: "Agent types a question. The copilot classifies the intent and retrieves evidence-grounded answers from scripts, KB articles, and past tickets.",
                icon: MessageCircle,
              },
              {
                step: "2",
                title: "Resolve",
                desc: "Agent uses the citation-backed answer to resolve the issue. The ticket closes with a full audit trail of what was referenced.",
                icon: Shield,
              },
              {
                step: "3",
                title: "Learn",
                desc: "The system detects knowledge gaps, drafts new articles from resolved tickets, and improves retrieval accuracy — automatically.",
                icon: Brain,
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.15,
                  ease: easeOut,
                }}
                className="relative flex gap-6 pb-12 last:pb-0"
              >
                {/* Vertical connector line */}
                {i < 2 && (
                  <div className="absolute left-[23px] top-14 bottom-0 w-px bg-input" />
                )}

                {/* Step number */}
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card border border-input">
                  <span className="text-xl font-light text-muted-foreground/60">
                    {item.step}
                  </span>
                </div>

                {/* Content */}
                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-medium text-foreground">
                      {item.title}
                    </h3>
                    <item.icon className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gradient divider */}
      <div className="gradient-divider mx-auto max-w-[1280px]" />

      {/* =============================================
          Section E — Testimonials
          ============================================= */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12 lg:px-16">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-[28px] font-semibold tracking-[-0.01em] text-foreground">
              Built for support teams that care about trust
            </h2>
          </motion.div>

          <TestimonialCarousel />
        </div>
      </section>

      {/* Gradient divider */}
      <div className="gradient-divider mx-auto max-w-[1280px]" />

      {/* =============================================
          Section F — Pricing
          ============================================= */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12 lg:px-16">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-[28px] font-semibold tracking-[-0.01em] text-foreground">
              Simple, transparent pricing
            </h2>
          </motion.div>

          <PricingSection />
        </div>
      </section>

      {/* =============================================
          Section G — Footer
          ============================================= */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-[1280px] px-6 py-8 md:px-12 lg:px-16">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm font-semibold text-foreground">
              Meridian
            </span>
            <div className="flex items-center gap-6">
              {["Documentation", "GitHub", "API Reference", "Contact"].map(
                (link) => (
                  <a
                    key={link}
                    href="#"
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link}
                  </a>
                )
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
