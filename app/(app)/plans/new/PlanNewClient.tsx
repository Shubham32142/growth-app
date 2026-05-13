"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  Loader,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

interface DurationOption {
  months: number;
  weeks: number;
  label: string;
  subtitle: string;
  recommended?: boolean;
}

const DURATIONS: DurationOption[] = [
  { months: 3, weeks: 12, label: "3 months", subtitle: "Sprint — focused, intense" },
  {
    months: 6,
    weeks: 24,
    label: "6 months",
    subtitle: "Standard — most popular",
    recommended: true,
  },
  { months: 9, weeks: 36, label: "9 months", subtitle: "Deep — long arc" },
];

export default function PlanNewClient() {
  const router = useRouter();
  const [selectedWeeks, setSelectedWeeks] = useState<number | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customWeeks, setCustomWeeks] = useState<string>("16");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState("");

  const effectiveWeeks = useMemo(() => {
    if (customMode) {
      const n = Number(customWeeks);
      if (Number.isInteger(n) && n >= 4 && n <= 52) return n;
      return null;
    }
    return selectedWeeks;
  }, [customMode, customWeeks, selectedWeeks]);

  function pickDuration(weeks: number) {
    setSelectedWeeks(weeks);
    setCustomMode(false);
  }

  async function handleTemplate() {
    setTemplateLoading(true);
    setTemplateError("");
    const res = await fetch("/api/plans/template", { method: "POST" });
    if (!res.ok) {
      setTemplateLoading(false);
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setTemplateError(payload.error ?? "Failed to create plan.");
      return;
    }
    router.push("/today");
    router.refresh();
  }

  function handleContinue() {
    if (!effectiveWeeks) return;
    router.push(`/plans/new/wizard?d=${effectiveWeeks}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Badge variant="accent">
          <Sparkles className="h-3 w-3" /> Create a plan
        </Badge>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Pick a duration
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Choose how long your plan should run. We&apos;ll then ask 5 quick
          questions to tailor it to you.
        </p>
      </motion.div>

      {/* Duration cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {DURATIONS.map((d, i) => {
          const isSelected = !customMode && selectedWeeks === d.weeks;
          return (
            <motion.button
              key={d.weeks}
              type="button"
              onClick={() => pickDuration(d.weeks)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 + i * 0.05 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative isolate flex flex-col items-start rounded-2xl border bg-card p-5 text-left transition-colors",
                isSelected
                  ? "border-primary"
                  : "border-border hover:border-primary/40",
              )}
            >
              {isSelected && (
                <motion.span
                  layoutId="duration-selected-glow"
                  className="absolute inset-0 -z-10 rounded-2xl bg-primary/10"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <CalendarRange className="h-4 w-4" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold">{d.label}</span>
                {d.recommended && <Badge variant="streak">popular</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{d.subtitle}</p>
              <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                {d.weeks} weeks
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Custom duration */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.22 }}
      >
        <Card
          className={cn(
            "relative isolate transition-colors",
            customMode ? "border-primary" : "border-border",
          )}
        >
          {customMode && (
            <motion.span
              layoutId="duration-selected-glow"
              className="absolute inset-0 -z-10 rounded-2xl bg-primary/10"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <button
                type="button"
                onClick={() => {
                  setCustomMode(true);
                  setSelectedWeeks(null);
                }}
                className="text-left"
              >
                <p className="text-sm font-semibold">Custom duration</p>
                <p className="text-xs text-muted-foreground">
                  Any number between 4 and 52 weeks.
                </p>
              </button>
            </div>
            <AnimatePresence>
              {customMode && (
                <motion.div
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  className="flex items-center gap-2"
                >
                  <Label
                    htmlFor="custom-weeks"
                    className="text-xs text-muted-foreground"
                  >
                    Weeks
                  </Label>
                  <Input
                    id="custom-weeks"
                    type="number"
                    min={4}
                    max={52}
                    value={customWeeks}
                    onChange={(e) => setCustomWeeks(e.target.value)}
                    className="w-24"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Continue button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-xs text-muted-foreground">
          Next: 5 quick questions to personalise your plan.
        </p>
        <Button
          size="lg"
          disabled={!effectiveWeeks}
          onClick={handleContinue}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Divider */}
      <div className="flex items-center gap-3 pt-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          or skip the wizard
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Template card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <Card className="border-streak/40 bg-streak/5">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-streak/15 text-streak">
                <BookOpen className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  Use the curated 6-month dev plan
                </p>
                <p className="text-xs text-muted-foreground">
                  Hand-picked 24-week roadmap. Instant — no AI generation.
                </p>
                {templateError && (
                  <p className="mt-2 text-xs text-destructive">
                    {templateError}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="streak"
              size="lg"
              onClick={handleTemplate}
              disabled={templateLoading}
            >
              {templateLoading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" /> Setting up…
                </>
              ) : (
                <>
                  Use this plan <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <p className="text-center text-xs text-muted-foreground">
        Already created a plan?{" "}
        <Link href="/today" className="text-primary hover:underline">
          Back to today
        </Link>
      </p>
    </div>
  );
}
