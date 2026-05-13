"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message || "Invalid email or password.");
      return;
    }
    router.push("/today");
    router.refresh();
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/today`,
      },
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to pick up where you left off.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          or continue with
        </span>
        <Separator className="flex-1" />
      </div>

      <Button
        variant="secondary"
        onClick={handleGoogle}
        className="w-full"
        size="lg"
      >
        <Mail className="h-4 w-4" /> Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
