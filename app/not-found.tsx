import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Compass className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Page not found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The URL you tried doesn&apos;t match anything here.
            </p>
          </div>
          <Link href="/today">
            <Button>Go to today</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
