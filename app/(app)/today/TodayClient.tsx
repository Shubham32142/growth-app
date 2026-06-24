"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Loader,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  RestDayIllustration,
  SproutIllustration,
} from "@/components/illustrations";
import { cn } from "@/lib/cn";
import type { TodayData } from "@/lib/today";
import TaskList from "./TaskList";

interface Props {
  /** Initial server-rendered data for "today" (the calendar day at first paint). */
  initial: TodayData;
}

const WEEKDAY_FMT = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const LONG_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDays(input: Date, delta: number): Date {
  const next = new Date(input);
  next.setDate(next.getDate() + delta);
  return next;
}

function parseISO(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

export default function TodayClient({ initial }: Props) {
  const [data, setData] = useState<TodayData>(initial);
  // Optimistic selected date so the day strip pill animates immediately on
  // click, before the API responds with the new day's data.
  const [selectedISO, setSelectedISO] = useState<string>(initial.dateISO);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const selectedDate = parseISO(selectedISO);
  const todayDate = new Date();
  const todayISO = dateKey(todayDate);

  async function loadDate(iso: string) {
    setError("");
    setSelectedISO(iso);
    const url = iso === todayISO ? "/api/today" : `/api/today?date=${iso}`;
    const res = await fetch(url);
    if (!res.ok) {
      setError("Could not load that day.");
      return;
    }
    const next = (await res.json()) as TodayData;
    startTransition(() => setData(next));
  }

  async function generateThisWeek() {
    if (!data.planId || generating) return;
    setGenerating(true);
    setGenError("");
    const res = await fetch(
      `/api/plans/${data.planId}/generate-week?week=${data.week}`,
      { method: "POST" },
    );
    if (!res.ok) {
      setGenerating(false);
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setGenError(payload.error ?? "Could not generate this week.");
      return;
    }
    // Reload the day's data so the new tasks appear.
    await loadDate(selectedISO);
    setGenerating(false);
  }

  // Day strip: 7 days back, selected, 6 days forward — centred slightly toward
  // history so back-fills are one click away. Days before the plan's start date
  // are dropped — the plan begins on its creation day, so there's nothing to
  // show (or back-fill) earlier than that.
  const stripDays = Array.from({ length: 14 }, (_, index) => {
    const date = shiftDays(selectedDate, index - 7);
    return {
      iso: dateKey(date),
      dayNumber: date.getDate(),
      weekday: WEEKDAY_FMT.format(date),
      isToday: dateKey(date) === todayISO,
    };
  }).filter((d) => !data.planStartISO || d.iso >= data.planStartISO);

  const subtitle = data.isRestDay
    ? "Sunday is your recovery day. Rest is part of the plan."
    : data.isFuture
      ? "Upcoming day — completion is disabled."
      : data.isPast
        ? "Back-filling a past day. Mark anything you actually did."
        : "Focus on these. Everything else can wait.";

  // Keep "today" fresh if the user leaves the tab open across midnight: when
  // the visible day is "today" by ISO, reload on tab refocus.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const nowISO = dateKey(new Date());
      if (data.dateISO === nowISO) loadDate(nowISO);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.dateISO]);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="accent">Month {data.monthNumber}</Badge>
            <Badge variant="outline">
              Week {data.week} of {data.durationWeeks}
            </Badge>
            {data.isFuture && <Badge variant="streak">Preview</Badge>}
            {data.isPast && <Badge variant="default">Back-fill</Badge>}
            <span>{LONG_DATE_FMT.format(selectedDate)}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl text-gradient-accent">
            {data.isToday
              ? "Today"
              : data.isFuture
                ? "Upcoming day"
                : "Past day"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {!data.isToday && (
          <button
            type="button"
            onClick={() => loadDate(todayISO)}
            className="self-start text-xs font-medium text-primary hover:underline sm:self-end"
          >
            Jump to today
          </button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.06 }}
        className="mb-6 flex w-full items-stretch gap-1.5"
      >
        {stripDays.map((day) => {
          const selected = day.iso === selectedISO;
          return (
            <button
              key={day.iso}
              type="button"
              onClick={() => loadDate(day.iso)}
              className={cn(
                "relative isolate flex flex-1 basis-0 flex-col items-center justify-center rounded-xl border px-1.5 py-2 text-center transition-colors",
                selected
                  ? "border-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/50",
              )}
            >
              {selected && (
                <motion.span
                  layoutId="today-strip-pill"
                  className="absolute inset-0 -z-10 rounded-xl bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider",
                  selected
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {day.weekday}
              </span>
              <span className="mt-1 text-base font-semibold leading-none">
                {day.dayNumber}
              </span>
              {day.isToday && !selected && (
                <span className="mt-1 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </motion.div>

      {isPending && (
        <p className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader className="h-3 w-3 animate-spin" /> Loading day…
        </p>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={data.dateISO}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {data.weekNeedsGeneration ? (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Sparkles className="h-5 w-5 animate-float" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      Week {data.week} isn&apos;t ready yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tap to generate your tasks for this week. The AI will
                      calibrate to how you did last week.
                    </p>
                    {genError && (
                      <p className="mt-2 text-xs text-destructive">{genError}</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={generateThisWeek}
                  disabled={generating}
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Generate week {data.week}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : data.tasks.length === 0 ? (
            <EmptyState
              variant={data.isRestDay ? "rest" : "default"}
              title={
                data.isRestDay
                  ? "Rest day"
                  : !data.weekInRange
                    ? "Outside your plan"
                    : `No tasks scheduled for week ${data.week}`
              }
              description={
                data.isRestDay
                  ? "Sunday is your recovery day. Take it easy and come back tomorrow."
                  : !data.weekInRange
                    ? "This date is before your plan started or after it ends. Jump to today to see your current week."
                    : "Looks like nothing is scheduled for this slice. Try another day."
              }
            />
          ) : (
            <TaskList
              tasks={data.tasks}
              total={data.total}
              week={data.week}
              streak={data.streak}
              isRestDay={data.isRestDay}
              isReadOnly={data.isFuture}
              completionDateISO={data.dateISO}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex items-center justify-between text-xs text-muted-foreground">
        {!data.planStartISO || selectedISO > data.planStartISO ? (
          <button
            type="button"
            onClick={() => loadDate(dateKey(shiftDays(selectedDate, -1)))}
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous day
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => loadDate(dateKey(shiftDays(selectedDate, 1)))}
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          Next day <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  variant = "default",
}: {
  title: string;
  description: string;
  variant?: "default" | "rest";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center"
    >
      {variant === "rest" ? (
        <RestDayIllustration className="h-28 w-28" />
      ) : (
        <SproutIllustration className="h-28 w-28" />
      )}
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
}
