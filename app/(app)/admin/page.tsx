"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Download,
  ExternalLink,
  KeyRound,
  Loader,
  RefreshCw,
  Settings as SettingsIcon,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FadeUp } from "@/components/motion-fade-up";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AI_PROVIDERS, PROVIDER_META, type AiProvider } from "@/lib/ai-providers";
import { cn } from "@/lib/cn";

export default function AdminPage() {
  const router = useRouter();

  // ── BYOK AI provider settings ─────────────────────────────────────────────
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [model, setModel] = useState(PROVIDER_META.openai.defaultModel);
  const [apiKey, setApiKey] = useState("");
  const [configured, setConfigured] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const meta = PROVIDER_META[provider];

  useEffect(() => {
    fetch("/api/account/ai-settings")
      .then((r) => r.json())
      .then(
        (d: { configured: boolean; provider: AiProvider | null; model: string | null }) => {
          setConfigured(d.configured);
          if (d.provider) setProvider(d.provider);
          if (d.model) setModel(d.model);
        },
      )
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
  }, []);

  function pickProvider(p: AiProvider) {
    setProvider(p);
    setModel(PROVIDER_META[p].defaultModel);
    setApiKey("");
    setTestResult(null);
    setError("");
  }

  async function handleTest() {
    setTestResult(null);
    setError("");
    if (!apiKey.trim()) {
      setTestResult({ ok: false, msg: "Enter a key to test." });
      return;
    }
    setTesting(true);
    const res = await fetch("/api/account/ai-settings?action=test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model: model.trim(), apiKey: apiKey.trim() }),
    });
    const d = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      modelUsed?: string;
    };
    setTesting(false);
    setTestResult(
      res.ok && d.ok
        ? { ok: true, msg: `Works${d.modelUsed ? ` — ${d.modelUsed}` : ""}.` }
        : { ok: false, msg: d.error ?? "Key test failed." },
    );
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    setTestResult(null);
    if (!model.trim()) {
      setError("Please choose a model.");
      return;
    }
    if (!configured && !apiKey.trim()) {
      setError("Please paste your API key.");
      return;
    }
    setSaving(true);
    const body: Record<string, string> = { provider, model: model.trim() };
    if (apiKey.trim()) body.apiKey = apiKey.trim();

    const res = await fetch("/api/account/ai-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setConfigured(true);
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "Failed to save.");
    }
  }

  async function handleRemoveKey() {
    setRemoving(true);
    setError("");
    await fetch("/api/account/ai-settings", { method: "DELETE" });
    setRemoving(false);
    setConfigured(false);
    setApiKey("");
    setTestResult(null);
  }

  async function handleExport() {
    window.location.href = "/api/account/export";
  }

  async function handleReset() {
    if (resetConfirmText !== "RESET") {
      setResetError("Type RESET to confirm.");
      return;
    }
    setResetting(true);
    setResetError("");
    const res = await fetch("/api/plans/active", { method: "DELETE" });
    if (!res.ok) {
      setResetting(false);
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setResetError(payload.error ?? "Failed to delete plan.");
      return;
    }
    router.push("/plans/new");
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") {
      setDeleteError("Type DELETE to confirm.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setDeleteError(payload.error ?? "Failed to delete account.");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut().catch(() => {});
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <FadeUp>
        <div>
          <Badge variant="default">
            <SettingsIcon className="h-3 w-3" /> Settings
          </Badge>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your own AI provider. Your key powers plan generation,
            weekly tasks, recaps, and resource ranking.
          </p>
        </div>
      </FadeUp>

      {/* BYOK AI provider */}
      <FadeUp delay={0.08}>
        <form onSubmit={handleSave}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" /> AI provider (your key)
                  </CardTitle>
                  <CardDescription>
                    Bring your own key. It&apos;s stored encrypted and never
                    shown again.
                  </CardDescription>
                </div>
                <Badge variant={configured ? "accent" : "default"}>
                  {loadingSettings
                    ? "Loading…"
                    : configured
                      ? "Key saved"
                      : "Not set up"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Provider */}
              <div className="space-y-2">
                <Label className="text-sm">Provider</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {AI_PROVIDERS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => pickProvider(p)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm transition-colors",
                        provider === p
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      {PROVIDER_META[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* API key */}
              <div className="space-y-1.5">
                <Label htmlFor="api-key" className="text-sm">
                  API key
                </Label>
                <Input
                  id="api-key"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    configured
                      ? "•••••••• stored — leave blank to keep"
                      : `Paste your key (${meta.keyHint})`
                  }
                />
                <a
                  href={meta.keysUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Get a {meta.label} key <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Model — dropdown for fixed-catalog providers; free-text for
                  OpenRouter (huge, changing model catalog). */}
              <div className="space-y-1.5">
                <Label htmlFor="model" className="text-sm">
                  Model
                </Label>
                {provider === "openrouter" ? (
                  <>
                    <Input
                      id="model"
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder={meta.defaultModel}
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {meta.models.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setModel(m)}
                          className={cn(
                            "rounded-md border px-2 py-1 text-[11px] transition-colors",
                            model === m
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Any OpenRouter model id works — pick a preset or type your
                      own.
                    </p>
                  </>
                ) : (
                  <select
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className={cn(
                      "flex h-10 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-ring",
                    )}
                  >
                    {Array.from(new Set([...meta.models, model]))
                      .filter(Boolean)
                      .map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {testResult && (
                <p
                  className={cn(
                    "text-sm",
                    testResult.ok ? "text-primary" : "text-destructive",
                  )}
                >
                  {testResult.ok ? "✓ " : "✗ "}
                  {testResult.msg}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
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
                    "Save"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing || !apiKey.trim()}
                >
                  {testing ? "Testing…" : "Test key"}
                </Button>
                {configured && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRemoveKey}
                    disabled={removing}
                  >
                    {removing ? "Removing…" : "Remove key"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </FadeUp>

      <Separator />

      {/* Danger zone: reset plan */}
      <FadeUp delay={0.16}>
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <RefreshCw className="h-4 w-4" /> Reset plan
            </CardTitle>
            <CardDescription>
              Permanently deletes your current plan, all completions, energy
              logs, wins, and recaps. Sends you back to <code>/plans/new</code>{" "}
              to create a new plan from scratch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!resetOpen ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setResetOpen(true);
                  setResetError("");
                }}
              >
                Delete plan &amp; start over…
              </Button>
            ) : (
              <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-foreground">
                  This is permanent. Type{" "}
                  <span className="font-mono font-semibold text-destructive">
                    RESET
                  </span>{" "}
                  to confirm.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-confirm" className="text-xs">
                    Confirmation
                  </Label>
                  <Input
                    id="reset-confirm"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="RESET"
                    autoFocus
                  />
                </div>
                {resetError && (
                  <p className="text-sm text-destructive">{resetError}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={resetting || resetConfirmText !== "RESET"}
                    onClick={handleReset}
                  >
                    {resetting ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" /> Resetting…
                      </>
                    ) : (
                      "Yes, delete my plan"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setResetOpen(false);
                      setResetConfirmText("");
                      setResetError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeUp>

      <Separator />

      {/* Your data — export + permanent account deletion */}
      <FadeUp delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Your data
            </CardTitle>
            <CardDescription>
              Download a JSON archive of everything you&apos;ve done here, or
              delete your account permanently.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4" /> Export my data
              </Button>
            </div>

            <Separator />

            {!deleteOpen ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setDeleteOpen(true);
                  setDeleteError("");
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete my account…
              </Button>
            ) : (
              <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-foreground">
                  This permanently removes your Supabase Auth user and every row
                  you own (plans, tasks, completions, wins, recaps, AI key). Type{" "}
                  <span className="font-mono font-semibold text-destructive">
                    DELETE
                  </span>{" "}
                  to confirm.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="delete-confirm" className="text-xs">
                    Confirmation
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    autoFocus
                  />
                </div>
                {deleteError && (
                  <p className="text-sm text-destructive">{deleteError}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleting || deleteConfirmText !== "DELETE"}
                    onClick={handleDeleteAccount}
                  >
                    {deleting ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" /> Deleting…
                      </>
                    ) : (
                      "Yes, delete my account"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDeleteOpen(false);
                      setDeleteConfirmText("");
                      setDeleteError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeUp>
    </div>
  );
}
