"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Layers,
  Loader,
  Play,
  Sparkles,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

type LearningStyle = "videos" | "reading" | "projects" | "mixed";

const STYLES: Array<{
  id: LearningStyle;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "videos",
    label: "Videos",
    description: "I learn best by watching",
    icon: Video,
  },
  {
    id: "reading",
    label: "Reading",
    description: "Docs and articles",
    icon: BookOpen,
  },
  {
    id: "projects",
    label: "Projects",
    description: "Hands-on building",
    icon: Play,
  },
  {
    id: "mixed",
    label: "Mixed",
    description: "A bit of everything",
    icon: Layers,
  },
];

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

interface Props {
  durationWeeks: number;
}

export default function WizardClient({ durationWeeks }: Props) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<string>(LEVELS[0]);
  const [hoursPerDay, setHoursPerDay] = useState("2");
  const [style, setStyle] = useState<LearningStyle>("mixed");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Rehydrate from sessionStorage so users coming back via "Back to start"
  // after a failed generation don't have to retype everything.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("growthpath:wizard");
      if (!raw) return;
      const prev = JSON.parse(raw) as Partial<{
        topic: string;
        goal: string;
        currentLevel: string;
        hoursPerDay: number;
        learningStyle: LearningStyle;
      }>;
      if (typeof prev.topic === "string") setTopic(prev.topic);
      if (typeof prev.goal === "string") setGoal(prev.goal);
      if (typeof prev.currentLevel === "string") setLevel(prev.currentLevel);
      if (typeof prev.hoursPerDay === "number")
        setHoursPerDay(String(prev.hoursPerDay));
      if (
        prev.learningStyle === "videos" ||
        prev.learningStyle === "reading" ||
        prev.learningStyle === "projects" ||
        prev.learningStyle === "mixed"
      ) {
        setStyle(prev.learningStyle);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function valid(): boolean {
    if (topic.trim().length < 3) return false;
    if (goal.trim().length < 3) return false;
    if (level.trim().length < 1) return false;
    const hours = Number(hoursPerDay);
    if (!Number.isInteger(hours) || hours < 1 || hours > 12) return false;
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid() || submitting) return;
    setSubmitting(true);
    setError("");

    const hours = Number(hoursPerDay);

    try {
      // Stash inputs so /generating can recover if the user reloads.
      window.sessionStorage.setItem(
        "growthpath:wizard",
        JSON.stringify({
          topic: topic.trim(),
          goal: goal.trim(),
          currentLevel: level.trim(),
          hoursPerDay: hours,
          learningStyle: style,
          durationWeeks,
        }),
      );
    } catch {
      /* ignore — sessionStorage can fail in private modes */
    }

    router.push("/plans/new/generating");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/plans/new"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Change duration
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            <Sparkles className="h-3 w-3" /> 5 quick questions
          </Badge>
          <Badge variant="outline">{durationWeeks} weeks</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Tell us about your plan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          The more specific you are, the better the AI can tailor your weekly
          themes and daily tasks.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Topic */}
        <FieldCard delay={0.05}>
          <Label htmlFor="topic" className="text-sm">
            <span className="text-primary">1.</span> What do you want to learn or
            change?
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Be specific. e.g. &quot;React + TypeScript for production apps&quot;
            beats &quot;web dev&quot;.
          </p>
          <Input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="React + TypeScript for production apps"
            className="mt-3"
            required
            autoFocus
          />
        </FieldCard>

        {/* 2. Goal */}
        <FieldCard delay={0.1}>
          <Label htmlFor="goal" className="text-sm">
            <span className="text-primary">2.</span> What does success look like
            at the end?
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            One concrete sentence about the outcome.
          </p>
          <Input
            id="goal"
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Land a junior React job with 2 portfolio projects"
            className="mt-3"
            required
          />
        </FieldCard>

        {/* 3. Current level */}
        <FieldCard delay={0.15}>
          <Label className="text-sm">
            <span className="text-primary">3.</span> Where are you starting from?
          </Label>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  level === l
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <Input
            type="text"
            value={!LEVELS.includes(level as (typeof LEVELS)[number]) ? level : ""}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="Or describe in your own words (e.g. 'know HTML, never touched JS frameworks')"
            className="mt-2"
          />
        </FieldCard>

        {/* 4. Hours per day */}
        <FieldCard delay={0.2}>
          <Label htmlFor="hours" className="text-sm">
            <span className="text-primary">4.</span> How many hours per day can
            you commit?
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Be realistic — the AI will size each day&apos;s task list around
            this.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Input
              id="hours"
              type="number"
              min={1}
              max={12}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(e.target.value)}
              className="w-24"
              required
            />
            <span className="text-xs text-muted-foreground">hours / day</span>
          </div>
        </FieldCard>

        {/* 5. Learning style */}
        <FieldCard delay={0.25}>
          <Label className="text-sm">
            <span className="text-primary">5.</span> How do you learn best?
          </Label>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STYLES.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setStyle(id)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                  style === id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    style === id ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-[11px] text-muted-foreground">
                  {description}
                </span>
              </button>
            ))}
          </div>
        </FieldCard>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.32 }}
          className="flex items-center justify-end"
        >
          <Button
            type="submit"
            size="lg"
            disabled={!valid() || submitting}
          >
            {submitting ? (
              <>
                <Loader className="h-4 w-4 animate-spin" /> Preparing…
              </>
            ) : (
              <>
                Generate my plan <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}

function FieldCard({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card>
        <CardContent className="py-5">{children}</CardContent>
      </Card>
    </motion.div>
  );
}
