"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  Play,
  Trophy,
  Zap,
} from "lucide-react";
import type { Task as DbTask } from "@/lib/db/schema";
type ITask = { category: DbTask["category"] };
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AliveFlame } from "@/components/alive-flame";
import { Confetti } from "@/components/confetti";
import { cn } from "@/lib/cn";

interface CuratedResource {
  title: string;
  url: string;
  type: string;
  summary: string;
  source: string;
}

interface TaskRow {
  _id: string;
  title: string;
  body?: string;
  category: ITask["category"];
  bucket: string;
  estimatedMinutes?: number;
  completed: boolean;
  curated: CuratedResource[];
}

interface Props {
  tasks: TaskRow[];
  total: number;
  week: number;
  streak: number;
  isRestDay?: boolean;
  isReadOnly?: boolean;
  /** ISO date (YYYY-MM-DD) to use as completedAt — defaults to today. */
  completionDateISO?: string;
}

function categoryLabel(cat: ITask["category"]) {
  if (cat === "technical") return "Technical Growth";
  if (cat === "personal-growth") return "Personal Growth";
  if (cat === "checkpoint") return "Checkpoints";
  return cat;
}

function categoryVariant(
  cat: ITask["category"],
): "accent" | "streak" | "default" {
  if (cat === "technical") return "accent";
  if (cat === "personal-growth") return "streak";
  return "default";
}

const DIRECT_VIDEOS: Record<string, { title: string; url: string }> = {
  JavaScript: {
    title: "JavaScript Full Course",
    url: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
  },
  TypeScript: {
    title: "TypeScript for Beginners",
    url: "https://www.youtube.com/watch?v=30LWjhZzg50",
  },
  React: {
    title: "React Course for Beginners",
    url: "https://www.youtube.com/watch?v=bMknfKXIFA8",
  },
  "Next.js": {
    title: "Next.js Full Course",
    url: "https://www.youtube.com/watch?v=wm5gMKuwSYk",
  },
  "Backend APIs": {
    title: "REST API Crash Course",
    url: "https://www.youtube.com/watch?v=fgTGADljAeg",
  },
  Databases: {
    title: "SQL Tutorial for Beginners",
    url: "https://www.youtube.com/watch?v=HXV3zeQKqGY",
  },
  DSA: {
    title: "Data Structures and Algorithms for Beginners",
    url: "https://www.youtube.com/watch?v=8hly31xKli0",
  },
  "System Design": {
    title: "System Design Basics",
    url: "https://www.youtube.com/watch?v=UzLMhqg3_Wc",
  },
  Career: {
    title: "Software Engineer Interview Prep",
    url: "https://www.youtube.com/watch?v=1qw5ITr3k9E",
  },
  "Technical Growth": {
    title: "Programming Roadmap Explained",
    url: "https://www.youtube.com/watch?v=pEfrdAtAmqk",
  },
  "Personal Growth": {
    title: "How to Build Consistency in Learning",
    url: "https://www.youtube.com/watch?v=TQMbvJNRpLE",
  },
  Checkpoints: {
    title: "Weekly Review Routine",
    url: "https://www.youtube.com/watch?v=ZfMdf6V0v3Y",
  },
};

export default function TaskList({
  tasks,
  total,
  week,
  streak,
  isRestDay = false,
  isReadOnly = false,
  completionDateISO,
}: Props) {
  const [showWinsPrompt, setShowWinsPrompt] = useState(false);
  const [completions, setCompletions] = useState<Set<string>>(
    () => new Set(tasks.filter((t) => t.completed).map((t) => t._id)),
  );
  const [energyTaskId, setEnergyTaskId] = useState<string | null>(null);
  const [energySaving, setEnergySaving] = useState(false);
  const [energyError, setEnergyError] = useState("");
  // Bumped each time the day's last task is checked off → fires confetti.
  const [celebrate, setCelebrate] = useState(0);

  const done = completions.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total && !isReadOnly;

  const allCurated = tasks.flatMap((task) => task.curated);
  const isVideo = (r: { url: string; type: string }) => {
    const url = r.url.toLowerCase();
    return (
      r.type === "video" ||
      url.includes("youtube.com/watch") ||
      url.includes("youtu.be/")
    );
  };
  const curatedVideos = allCurated.filter(isVideo).map((r) => ({
    title: r.title,
    url: r.url,
  }));
  const uniqueBuckets = Array.from(new Set(tasks.map((task) => task.bucket)));
  const bucketVideos = uniqueBuckets
    .map((bucket) => DIRECT_VIDEOS[bucket])
    .filter((video): video is { title: string; url: string } => Boolean(video));
  const combinedVideos = [...curatedVideos, ...bucketVideos];
  const videosToShow = Array.from(
    new Map(combinedVideos.map((v) => [v.url, v])).values(),
  ).slice(0, 6);

  const docsToShow = Array.from(
    new Map(
      allCurated.filter((r) => !isVideo(r)).map((r) => [r.url, r]),
    ).values(),
  ).slice(0, 6);

  const orderedCategories: ITask["category"][] = [
    "technical",
    "personal-growth",
    "checkpoint",
  ];
  const grouped = orderedCategories
    .map((category) => {
      const categoryTasks = tasks.filter((task) => task.category === category);
      if (categoryTasks.length === 0) return null;
      const bucketMap = new Map<string, TaskRow[]>();
      for (const task of categoryTasks) {
        const list = bucketMap.get(task.bucket) ?? [];
        list.push(task);
        bucketMap.set(task.bucket, list);
      }
      return { category, buckets: Array.from(bucketMap.entries()) };
    })
    .filter((group): group is NonNullable<typeof group> => group !== null);

  useEffect(() => {
    const now = new Date();
    const isFridayAfter6pm = now.getDay() === 5 && now.getHours() >= 18;
    if (!isFridayAfter6pm) return;

    let cancelled = false;
    fetch(`/api/wins?week=${week}`)
      .then((r) => r.json())
      .then((payload: { hasEntry?: boolean }) => {
        if (!cancelled) setShowWinsPrompt(!payload.hasEntry);
      })
      .catch(() => {
        if (!cancelled) setShowWinsPrompt(true);
      });

    return () => {
      cancelled = true;
    };
  }, [week]);

  async function toggle(id: string) {
    if (isReadOnly) return;
    const wasDone = completions.has(id);
    const nowDone = !wasDone;

    // Flip the checkbox INSTANTLY — plain state, renders this frame. We only
    // touch the server in the background and revert if it fails. (The previous
    // useOptimistic wiring dropped the optimistic value before the request
    // returned, so the tick appeared to lag by the full round-trip.)
    setCompletions((prev) => {
      const next = new Set(prev);
      if (nowDone) next.add(id);
      else next.delete(id);
      return next;
    });

    if (nowDone) {
      setEnergyTaskId(id);
      setEnergyError("");
      // `completions` here is the pre-toggle set, so +1 = this click finished
      // the day's final task → celebrate.
      if (total > 0 && completions.size + 1 === total) {
        setCelebrate((c) => c + 1);
      }
    } else if (energyTaskId === id) {
      setEnergyTaskId(null);
    }

    const method = nowDone ? "POST" : "DELETE";
    let ok = false;
    try {
      const res = await fetch(`/api/tasks/${id}/complete`, {
        method,
        ...(method === "POST" && completionDateISO
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ at: completionDateISO }),
            }
          : {}),
      });
      ok = res.ok;
    } catch {
      ok = false;
    }

    if (!ok) {
      // Revert the optimistic flip on failure.
      setCompletions((prev) => {
        const next = new Set(prev);
        if (nowDone) next.delete(id);
        else next.add(id);
        return next;
      });
      if (nowDone && energyTaskId === id) setEnergyTaskId(null);
      setEnergyError("Couldn't save that — check your connection and retry.");
    }
  }

  async function saveEnergy(taskId: string, level: 1 | 2 | 3 | 4 | 5) {
    setEnergySaving(true);
    setEnergyError("");

    const res = await fetch(`/api/tasks/${taskId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        energyLevel: level,
        ...(completionDateISO ? { at: completionDateISO } : {}),
      }),
    });

    setEnergySaving(false);
    if (!res.ok) {
      setEnergyError("Could not save energy right now.");
      return;
    }
    setEnergyTaskId(null);
  }

  return (
    <div className="space-y-6">
      <Confetti trigger={celebrate} count={70} origin="top" />

      <AnimatePresence>
        {allDone && (
          <motion.div
            key="day-complete"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Card className="border-primary/50 bg-primary/5 glow-accent">
              <CardContent className="flex items-center gap-4 py-5">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-2xl animate-float">
                  🎉
                </span>
                <div>
                  <p className="text-lg font-bold text-gradient-accent">
                    Day complete!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All {total} tasks done — another day of compounding growth.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {showWinsPrompt && !isReadOnly && (
        <Card className="border-streak/50 bg-streak/5">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-streak/15 text-streak">
                <Trophy className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Friday check-in</p>
                <p className="text-xs text-muted-foreground">
                  Log your 3 weekly wins to lock the momentum.
                </p>
              </div>
            </div>
            <Link href="/wins">
              <Button variant="streak" size="sm">
                Open wins <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {isReadOnly && (
        <div className="rounded-lg border border-streak/40 bg-streak/10 px-3 py-2 text-xs text-streak">
          Read-only preview — completion and submissions are disabled for
          non-today dates.
        </div>
      )}

      {/* Streak + progress card */}
      <Card interactive>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-streak/15 text-streak ring-1 ring-inset ring-streak/20">
              <AliveFlame />
            </span>
            <div>
              <p className="text-lg font-semibold leading-none">
                <span className="tabular-nums">{streak}</span>{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  day{streak !== 1 ? "s" : ""} streak
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isRestDay
                  ? `Week ${week} — rest day`
                  : `${done} of ${total} done today · ${pct}%`}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <Progress value={pct} />
          </div>
          <Link
            href="/progress"
            className="hidden text-xs font-medium text-primary hover:underline sm:inline-flex sm:items-center sm:gap-1"
          >
            View progress <ArrowRight className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>

      {/* Task groups */}
      <div className="space-y-6">
        {grouped.map((group) => (
          <section key={group.category}>
            <div className="mb-3 flex items-center gap-2">
              <Badge variant={categoryVariant(group.category)}>
                {categoryLabel(group.category)}
              </Badge>
            </div>

            <div className="space-y-5">
              {group.buckets.map(([bucket, bucketTasks]) => (
                <div key={`${group.category}-${bucket}`}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {bucket}
                  </p>
                  <ul className="space-y-2">
                    {bucketTasks.map((task, idx) => (
                      <TaskItem
                        key={task._id}
                        index={idx}
                        task={task}
                        completed={completions.has(task._id)}
                        readOnly={isReadOnly}
                        onToggle={() => toggle(task._id)}
                        showEnergy={
                          energyTaskId === task._id &&
                          completions.has(task._id) &&
                          !isReadOnly
                        }
                        energySaving={energySaving}
                        energyError={energyError}
                        onSaveEnergy={(lvl) => saveEnergy(task._id, lvl)}
                        onSkipEnergy={() => setEnergyTaskId(null)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Daily resources
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <ResourceColumn
            heading="Videos"
            icon={<Play className="h-3.5 w-3.5" />}
            items={videosToShow}
            emptyText="No direct videos available for this day."
            highlight
          />
          <ResourceColumn
            heading="Docs & articles"
            icon={<BookOpen className="h-3.5 w-3.5" />}
            items={docsToShow}
            emptyText="No docs available for this day."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function TaskItem({
  index,
  task,
  completed,
  readOnly,
  onToggle,
  showEnergy,
  energySaving,
  energyError,
  onSaveEnergy,
  onSkipEnergy,
}: {
  index: number;
  task: TaskRow;
  completed: boolean;
  readOnly: boolean;
  onToggle: () => void;
  showEnergy: boolean;
  energySaving: boolean;
  energyError: string;
  onSaveEnergy: (level: 1 | 2 | 3 | 4 | 5) => void;
  onSkipEnergy: () => void;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.04 }}
      className={cn(
        "group rounded-xl border bg-card p-4 transition-all duration-200",
        completed
          ? "border-primary/40 bg-primary/5"
          : "border-border hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-black/20",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={readOnly}
          aria-label={completed ? "Mark incomplete" : "Mark complete"}
          aria-pressed={completed}
          className={cn(
            "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
            completed
              ? "border-primary bg-primary"
              : "border-border bg-transparent hover:border-primary",
            readOnly && "cursor-not-allowed opacity-60",
          )}
        >
          <AnimatePresence initial={false}>
            {completed && (
              <motion.span
                key="check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 22 }}
                className="inline-flex"
              >
                <Check className="h-3 w-3 text-primary-foreground" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              completed && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
          {task.body && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {task.body}
            </p>
          )}
        </div>

        {task.estimatedMinutes && (
          <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">
            ~{task.estimatedMinutes}m
          </span>
        )}
      </div>

      {showEnergy && (
        <div className="mt-4 rounded-lg border border-border bg-secondary p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3 w-3 text-streak" /> How was your energy for this
            task?
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                type="button"
                size="sm"
                variant="outline"
                disabled={energySaving}
                onClick={() => onSaveEnergy(n as 1 | 2 | 3 | 4 | 5)}
                className="h-8 w-8 px-0"
              >
                {n}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSkipEnergy}
              className="text-xs text-muted-foreground"
            >
              Skip
            </Button>
          </div>
          {energyError && (
            <p className="mt-2 text-xs text-destructive">{energyError}</p>
          )}
        </div>
      )}
    </motion.li>
  );
}

function ResourceColumn({
  heading,
  icon,
  items,
  emptyText,
  highlight = false,
}: {
  heading: string;
  icon: React.ReactNode;
  items: Array<{ title: string; url: string }>;
  emptyText: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {heading}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.url}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "group inline-flex items-start gap-2 text-sm transition-colors",
                  highlight
                    ? "text-primary hover:text-primary/80"
                    : "text-foreground hover:text-primary",
                )}
              >
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                <span className="line-clamp-2">{item.title}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
