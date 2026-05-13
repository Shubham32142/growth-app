"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface WizardInputs {
  topic: string;
  goal: string;
  currentLevel: string;
  hoursPerDay: number;
  learningStyle: "videos" | "reading" | "projects" | "mixed";
  durationWeeks: number;
}

type StepStatus = "pending" | "running" | "done" | "failed";

interface Step {
  id: "outline" | "week1";
  label: string;
  detail: string;
  status: StepStatus;
}

const INITIAL_STEPS: Step[] = [
  {
    id: "outline",
    label: "Designing your outline",
    detail: "Mapping weeks to themes",
    status: "pending",
  },
  {
    id: "week1",
    label: "Crafting week 1 tasks",
    detail: "Tailored to your hours/day and style",
    status: "pending",
  },
];

export default function GeneratingClient() {
  const router = useRouter();
  const startedRef = useRef(false);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [error, setError] = useState("");
  const [planTitle, setPlanTitle] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let inputs: WizardInputs | null = null;
    try {
      const raw = window.sessionStorage.getItem("growthpath:wizard");
      if (raw) inputs = JSON.parse(raw) as WizardInputs;
    } catch {
      /* ignore */
    }

    if (!inputs) {
      router.replace("/plans/new");
      return;
    }

    run(inputs).catch(() => {
      /* errors handled inline */
    });

    async function run(i: WizardInputs) {
      // ── Step 1: outline ─────────────────────────────────────────────────
      setStep("outline", "running");
      const createRes = await fetch("/api/plans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(i),
      });

      if (!createRes.ok) {
        setStep("outline", "failed");
        const payload = (await createRes.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(payload.error ?? "Could not generate the outline.");
        return;
      }

      const created = (await createRes.json()) as {
        planId: string;
        outlineWeeks: number;
      };
      setStep("outline", "done");

      // ── Step 2: week 1 tasks ────────────────────────────────────────────
      setStep("week1", "running");
      const weekRes = await fetch(
        `/api/plans/${created.planId}/generate-week?week=1`,
        { method: "POST" },
      );

      if (!weekRes.ok) {
        setStep("week1", "failed");
        const payload = (await weekRes.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          payload.error ??
            "Outline ready, but generating week 1 tasks failed. You can retry from Today.",
        );
        return;
      }

      setStep("week1", "done");
      setDone(true);

      // Clear the wizard inputs and hand off to /today.
      try {
        window.sessionStorage.removeItem("growthpath:wizard");
      } catch {
        /* ignore */
      }

      // Fetch the plan title for the success card. Best-effort.
      try {
        const planRes = await fetch("/api/plans/active");
        if (planRes.ok) {
          const payload = (await planRes.json()) as {
            plan: { title?: string } | null;
          };
          if (payload.plan?.title) setPlanTitle(payload.plan.title);
        }
      } catch {
        /* ignore */
      }

      // Small linger so the user sees the success state before redirecting.
      setTimeout(() => {
        router.push("/today");
        router.refresh();
      }, 1200);
    }

    function setStep(id: Step["id"], status: StepStatus) {
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s)),
      );
    }
  }, [router]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Badge variant="accent">
          <Sparkles className="h-3 w-3" /> Crafting your plan
        </Badge>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        {done ? (planTitle ?? "Your plan is ready") : "Just a moment…"}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base"
      >
        {done
          ? "Taking you to today's tasks…"
          : "This usually takes 10-30 seconds. The AI is structuring your weeks and writing your first set of tasks."}
      </motion.p>

      <div className="mt-10 w-full space-y-3">
        {steps.map((step, idx) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 + idx * 0.06 }}
          >
            <Card
              className={cn(
                "transition-colors",
                step.status === "running" && "border-primary/60",
                step.status === "done" && "border-primary/40 bg-primary/5",
                step.status === "failed" && "border-destructive/40 bg-destructive/5",
              )}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <StepIcon status={step.status} />
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mt-6 w-full"
          >
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="space-y-3 py-4">
                <p className="text-sm text-destructive">{error}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/plans/new/wizard")}
                  >
                    Try again
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/plans/new")}
                  >
                    Back to start
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <motion.span
        key="done"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 480, damping: 24 }}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <Check className="h-4 w-4" />
      </motion.span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
        <Loader className="h-4 w-4 animate-spin" />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
        <X className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
    </span>
  );
}
