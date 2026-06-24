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

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/today`,
      },
    });
    setLoading(false);

    // Diagnostics: surface exactly what Supabase returned so "no email"
    // problems are debuggable from the browser console.
    //  - identities.length === 0  → email already registered; NO email is sent
    //    (Supabase hides this to prevent account enumeration).
    //  - confirmation_sent_at set → a confirmation email was dispatched to SMTP.
    //  - session present          → confirmation is OFF (auto-confirmed).
    const identitiesCount = data?.user?.identities?.length ?? null;
    const confirmationSentAt = (data?.user as { confirmation_sent_at?: string } | null)
      ?.confirmation_sent_at;
    console.info("[signup] result", {
      email,
      error: signUpError?.message ?? null,
      hasSession: !!data?.session,
      userId: data?.user?.id ?? null,
      identitiesCount,
      confirmationSentAt: confirmationSentAt ?? null,
      hint:
        identitiesCount === 0
          ? "Email already registered → no confirmation email sent. Try signing in or use a different email."
          : data?.session
            ? "Auto-confirmed (Confirm email is OFF in Supabase) → no email expected."
            : confirmationSentAt
              ? "Confirmation email dispatched to SMTP. If it doesn't arrive, check Supabase → Logs → Auth and Brevo → Transactional → Logs (also Spam/Promotions)."
              : "No session and no confirmation_sent_at — check that Confirm email is ON and SMTP is configured.",
    });

    if (signUpError) {
      setError(signUpError.message || "Something went wrong.");
      return;
    }

    // Email already registered: Supabase returns a user with empty identities
    // and sends nothing. Tell the user instead of a misleading "check email".
    if (identitiesCount === 0) {
      setError(
        "That email is already registered. Try signing in, or use a different email.",
      );
      return;
    }

    // If email confirmation is enabled in Supabase, session will be null —
    // user has to click the link in their email. If it's disabled, we have
    // a session immediately and can move on.
    if (data.session) {
      router.push("/today");
      router.refresh();
    } else {
      setInfo(
        "Check your email (and spam) to confirm your account. After confirming, sign in.",
      );
    }
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a 6-month plan today — takes 30 seconds.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
          {info}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Name{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            autoComplete="name"
          />
        </div>
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
          <Label htmlFor="password">
            Password{" "}
            <span className="text-muted-foreground font-normal">
              (min. 8 characters)
            </span>
          </Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" /> Creating account…
            </>
          ) : (
            "Get started"
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
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
