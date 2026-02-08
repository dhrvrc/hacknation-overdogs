"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "Meridian's provenance tracing changed how we think about knowledge management. Every answer comes with a citation chain — our agents trust it completely.",
    author: "Rachel Torres",
    role: "VP of Support Operations",
    company: "CloudStack Inc.",
  },
  {
    quote:
      "The self-learning loop is what sold us. We went from manually writing KB articles to having AI-drafted articles ready for review in minutes. Our coverage gaps closed 40% faster.",
    author: "Marcus Chen",
    role: "Head of Customer Success",
    company: "Proptech Solutions",
  },
  {
    quote:
      "Before Meridian, our agents spent 8 minutes per ticket searching for answers. Now it's under 2 minutes. The ROI was clear within the first month.",
    author: "Sarah Okonkwo",
    role: "Director of Support",
    company: "ResidentHub",
  },
  {
    quote:
      "The QA scoring feature caught coaching opportunities we were missing entirely. Red flag detection alone has improved our compliance posture significantly.",
    author: "David Park",
    role: "Quality Assurance Manager",
    company: "Enterprise Living Co.",
  },
  {
    quote:
      "What impressed us most was seeing the system get smarter in real-time. After a week, retrieval accuracy improved by 13 percentage points. That's not a demo trick — that's real learning.",
    author: "Amira Hassan",
    role: "CTO",
    company: "PropertyWise",
  },
];

export default function TestimonialCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    slidesToScroll: 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Auto-advance every 5s
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  return (
    <div className="relative">
      {/* Carousel */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="min-w-0 flex-[0_0_85%] px-3 sm:flex-[0_0_60%] lg:flex-[0_0_45%]"
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="rounded-[14px] border border-border bg-background p-6 shadow-sm"
              >
                <p className="mb-4 text-base italic font-normal leading-relaxed text-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  {/* Avatar placeholder */}
                  <div
                    className="h-10 w-10 shrink-0 rounded-full bg-muted"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t.author}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {t.role}, {t.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Arrow nav */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          onClick={scrollPrev}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-input"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === selectedIndex ? "bg-foreground" : "bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>

        <button
          onClick={scrollNext}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-input"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
