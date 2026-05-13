import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { recaps } from "@/lib/db/schema";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Sparkles, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FadeUp } from "@/components/motion-fade-up";

// Public read-only recap. Shareable links never change once issued, so we
// can let Next.js cache the rendered page for an hour at the edge. The
// owner can still revoke by deleting the recap row.
export const revalidate = 3600;

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;

  if (!token || typeof token !== "string" || token.length !== 40) {
    notFound();
  }

  const [recap] = await db
    .select()
    .from(recaps)
    .where(eq(recaps.shareToken, token))
    .limit(1);
  if (!recap) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <FadeUp>
          <div className="mb-8 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                GrowthPath
              </p>
              <h1 className="text-xl font-semibold tracking-tight">
                Week {recap.weekNumber} Recap
              </h1>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.08}>
          <Card className="mb-4">
            <CardContent className="py-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {recap.content}
              </p>
            </CardContent>
          </Card>
        </FadeUp>

        {recap.achievements.length > 0 && (
          <FadeUp delay={0.16}>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Check className="h-4 w-4" /> Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recap.achievements.map((a: string, i: number) => (
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
          </FadeUp>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {recap.growthAreas.length > 0 && (
            <FadeUp delay={0.24}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-streak">
                  <TrendingUp className="h-4 w-4" /> Growth areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {recap.growthAreas.map((g: string, i: number) => (
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
            </FadeUp>
          )}

          {recap.improvements.length > 0 && (
            <FadeUp delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="h-4 w-4" /> Next week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {recap.improvements.map((s: string, i: number) => (
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
            </FadeUp>
          )}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Shared via GrowthPath · Read-only view
        </p>
      </div>
    </div>
  );
}
