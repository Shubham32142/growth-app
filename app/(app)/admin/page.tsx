"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Download,
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
import { cn } from "@/lib/cn";

const FREE_MODELS = [
  { id: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B (Meta)" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (Meta)" },
  { id: "google/gemma-3-4b-it:free", label: "Gemma 3 4B (Google)" },
  { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (Mistral)" },
  { id: "deepseek/deepseek-r1-0528:free", label: "DeepSeek R1 (DeepSeek)" },
];

type Source = "db" | "env" | "default";

const SOURCE_META: Record<
  Source,
  { label: string; variant: "accent" | "streak" | "default" }
> = {
  db: { label: "Saved override active", variant: "accent" },
  env: { label: "From OPENROUTER_MODEL env", variant: "streak" },
  default: { label: "Using hardcoded default", variant: "default" },
};

export default function AdminPage() {
  const router = useRouter();
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [source, setSource] = useState<Source>("default");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleExport() {
    window.location.href = "/api/account/export";
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
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setDeleteError(payload.error ?? "Failed to delete account.");
      return;
    }

    // Sign out client-side (the cookie is now invalid anyway) and bounce
    // to the landing page.
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut().catch(() => {});
    router.push("/");
    router.refresh();
  }

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d: { model: string; source: Source }) => {
        setSource(d.source);
        const preset = FREE_MODELS.find((m) => m.id === d.model);
        if (preset) {
          setModel(d.model);
        } else {
          setModel("custom");
          setCustomModel(d.model);
        }
      });
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const value = model === "custom" ? customModel.trim() : model;
    if (!value) {
      setError("Please select or enter a model.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: value }),
    });

    setSaving(false);
    if (res.ok) {
      setSource("db");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = (await res.json()) as { error?: string };
      setError(d.error ?? "Failed to save.");
    }
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
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setResetError(payload.error ?? "Failed to delete plan.");
      return;
    }

    // Plan gone — kick the user back to /plans/new to start over.
    router.push("/plans/new");
    router.refresh();
  }

  async function handleClear() {
    setClearing(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "" }),
    });
    const r = (await fetch("/api/admin/settings").then((x) => x.json())) as {
      model: string;
      source: Source;
    };
    setSource(r.source);
    const preset = FREE_MODELS.find((m) => m.id === r.model);
    setModel(preset ? r.model : "custom");
    if (!preset) setCustomModel(r.model);
    setClearing(false);
  }

  const sourceMeta = SOURCE_META[source];

  return (
    <div className="space-y-6">
      <FadeUp>
        <div>
          <Badge variant="default">
            <SettingsIcon className="h-3 w-3" /> Admin
          </Badge>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Admin settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure the AI model used for resource ranking and recaps.
          </p>
        </div>
      </FadeUp>

      <FadeUp delay={0.08}>
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>OpenRouter model</CardTitle>
                <CardDescription>
                  Free-tier presets below, or paste any model ID you have access
                  to.
                </CardDescription>
              </div>
              <Badge variant={sourceMeta.variant}>{sourceMeta.label}</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {FREE_MODELS.map((m) => (
              <ModelOption
                key={m.id}
                selected={model === m.id}
                onClick={() => setModel(m.id)}
                title={m.label}
                subtitle={m.id}
              />
            ))}
            <ModelOption
              selected={model === "custom"}
              onClick={() => setModel("custom")}
              title="Custom model ID"
              subtitle="Paste any OpenRouter model identifier"
            />
            {model === "custom" && (
              <Input
                type="text"
                placeholder="e.g. google/gemini-flash-1.5:free"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
              />
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap items-center gap-2 pt-2">
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
                  "Save settings"
                )}
              </Button>
              {source === "db" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  disabled={clearing}
                >
                  {clearing ? "Clearing…" : "Clear DB override"}
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
              Delete plan & start over…
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
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
            >
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
                This permanently removes your Supabase Auth user and every
                row you own (plans, tasks, completions, wins, recaps). Type{" "}
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

function ModelOption({
  selected,
  onClick,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40",
      )}
    >
      <span
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-primary bg-primary" : "border-border bg-transparent",
        )}
      >
        {selected && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </button>
  );
}
