"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "route.error",
        error: error.message,
        digest: error.digest,
        stack: error.stack,
      }),
    );
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The page hit an error rendering. You can try again, or head back
              to today.
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                ref: {error.digest}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={reset}>
              <RefreshCw className="h-4 w-4" /> Try again
            </Button>
            <Link href="/today">
              <Button variant="outline">Back to today</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
