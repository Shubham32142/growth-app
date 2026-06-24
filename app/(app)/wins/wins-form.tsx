"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Loader, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Confetti } from "@/components/confetti";

interface WinItem {
  weekNumber: number;
  entries: [string, string, string];
  updatedAt: string;
}

interface Props {
  currentWeek: number;
  initialWins: WinItem[];
}

export default function WinsForm({ currentWeek, initialWins }: Props) {
  const existingCurrent = useMemo(
    () => initialWins.find((w) => w.weekNumber === currentWeek),
    [initialWins, currentWeek],
  );
  const [wins, setWins] = useState<WinItem[]>(initialWins);
  const [entries, setEntries] = useState<[string, string, string]>(
    existingCurrent?.entries ?? ["", "", ""],
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [celebrate, setCelebrate] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = entries.map((entry) => entry.trim()) as [
      string,
      string,
      string,
    ];
    if (trimmed.some((entry) => entry.length === 0)) {
      setError("Please fill all 3 wins.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/wins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekNumber: currentWeek, entries: trimmed }),
    });
    setSaving(false);

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Failed to save wins.");
      return;
    }

    const payload = (await res.json()) as { win: WinItem };
    setWins((prev) => {
      const others = prev.filter((w) => w.weekNumber !== currentWeek);
      return [payload.win, ...others].sort(
        (a, b) => b.weekNumber - a.weekNumber,
      );
    });
    setSaved(true);
    setCelebrate((c) => c + 1);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6">
      <Confetti trigger={celebrate} count={50} origin="top" />
      <Card>
        <CardHeader>
          <CardTitle>Week {currentWeek} — your 3 wins</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="space-y-1.5">
                <Label htmlFor={`win-${idx}`} className="flex items-center gap-1.5">
                  <Star className="h-3 w-3 text-streak" /> Win {idx + 1}
                </Label>
                <Input
                  id={`win-${idx}`}
                  value={entries[idx]}
                  onChange={(e) => {
                    const next = [...entries] as [string, string, string];
                    next[idx] = e.target.value;
                    setEntries(next);
                  }}
                  maxLength={180}
                  placeholder="What went well this week?"
                />
              </div>
            ))}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : saved ? (
                <>
                  <Check className="h-4 w-4" /> Saved
                </>
              ) : (
                "Save weekly wins"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past wins</CardTitle>
        </CardHeader>
        <CardContent>
          {wins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No wins logged yet. The first Friday you fill these in is when
              the streak starts to feel real.
            </p>
          ) : (
            <ul className="space-y-3">
              {wins.map((win) => (
                <li
                  key={win.weekNumber}
                  className="rounded-xl border border-border bg-secondary p-4"
                >
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-streak">
                    Week {win.weekNumber}
                  </p>
                  <ol className="space-y-1.5 text-sm text-foreground">
                    {win.entries.map((entry, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        <span>{entry}</span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
