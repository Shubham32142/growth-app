"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Copy,
  Loader,
  PartyPopper,
  RefreshCw,
  Share2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Confetti } from "@/components/confetti";

interface RecapData {
  weekNumber: number;
  content: string;
  achievements: string[];
  growthAreas: string[];
  improvements: string[];
  modelUsed: string;
  shareToken: string | null;
}

interface Props {
  weekNumber: number;
  initial: RecapData | null;
}

export default function RecapClient({ weekNumber, initial }: Props) {
  const [recap, setRecap] = useState<RecapData | null>(initial);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  // Fires on mount if a recap already exists, and again after generation.
  const [celebrate, setCelebrate] = useState(initial ? 1 : 0);
  const [shareUrl, setShareUrl] = useState<string | null>(
    initial?.shareToken ? `/share/${initial.shareToken}` : null,
  );
  const [copying, setCopying] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    setError("");

    const res = await fetch(`/api/recap/${weekNumber}`, { method: "POST" });
    setGenerating(false);

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Failed to generate recap.");
      return;
    }

    const payload = (await res.json()) as { recap: RecapData };
    setRecap(payload.recap);
    setCelebrate((c) => c + 1);
    if (payload.recap.shareToken) {
      setShareUrl(`/share/${payload.recap.shareToken}`);
    }
  }

  async function handleShare() {
    if (shareUrl) {
      await copyUrl(shareUrl);
      return;
    }

    const res = await fetch(`/api/recap/${weekNumber}/share`, {
      method: "POST",
    });
    if (!res.ok) return;

    const payload = (await res.json()) as { shareToken: string };
    const url = `/share/${payload.shareToken}`;
    setShareUrl(url);
    await copyUrl(url);
  }

  async function copyUrl(path: string) {
    setCopying(true);
    const full = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(full).catch(() => {});
    setTimeout(() => setCopying(false), 2000);
  }

  return (
    <div className="space-y-6">
      <Confetti trigger={celebrate} count={60} origin="top" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="streak">
            <Sparkles className="h-3 w-3" /> Weekly recap
          </Badge>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl text-gradient-accent">
            Week {weekNumber} recap
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A short, personal summary of what you completed and how you grew.
          </p>
        </div>
        <Link href="/progress">
          <Button variant="outline" size="sm">
            Back to progress
          </Button>
        </Link>
      </div>

      {!recap && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold">
                No recap generated yet for week {weekNumber}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generation takes about 15 seconds. Pulls from your actual
                completed tasks.
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={generating} size="lg">
              {generating ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  Generate recap <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {recap && (
          <motion.div
            key="recap"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-5"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease: "backOut" }}
            >
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
                  <motion.div
                    initial={{ rotate: -10 }}
                    animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary"
                  >
                    <PartyPopper className="h-6 w-6" />
                  </motion.div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Week {recap.weekNumber} complete
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <Card>
                <CardContent className="py-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {recap.content}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {recap.achievements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Check className="h-4 w-4" /> Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {recap.achievements.map((a, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-foreground"
                        >
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {recap.growthAreas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-streak">
                      <TrendingUp className="h-4 w-4" /> Growth areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {recap.growthAreas.map((g, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-foreground"
                        >
                          <span className="text-muted-foreground">·</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {recap.improvements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                      <ArrowRight className="h-4 w-4" /> Next week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {recap.improvements.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-foreground"
                        >
                          <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="flex flex-wrap items-center gap-2"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader className="h-3.5 w-3.5 animate-spin" />{" "}
                    Regenerating…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleShare}
                disabled={copying}
              >
                {copying ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copied
                  </>
                ) : shareUrl ? (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy share link
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" /> Create share link
                  </>
                )}
              </Button>
              {shareUrl && !copying && (
                <span className="text-xs text-muted-foreground">
                  Anyone with the link can view this recap.
                </span>
              )}
            </motion.div>

            <p className="text-xs text-muted-foreground">
              Generated by {recap.modelUsed}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
