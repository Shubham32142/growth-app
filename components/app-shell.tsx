"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Calendar,
  ChartBar,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/cn";

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV: NavLink[] = [
  { href: "/today", label: "Today", icon: Calendar, description: "Daily focus" },
  { href: "/progress", label: "Progress", icon: ChartBar, description: "Streak & charts" },
  { href: "/wins", label: "Wins", icon: Trophy, description: "Weekly journal" },
  { href: "/admin", label: "Settings", icon: Settings, description: "Model & admin" },
];

interface AppShellProps {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const closeMobile = React.useCallback(() => setMobileOpen(false), []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface/80 backdrop-blur lg:flex">
        <SidebarContent user={user} pathname={pathname ?? ""} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/today" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">GrowthPath</span>
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={closeMobile}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 36 }}
              className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-surface shadow-xl"
            >
              <div className="flex items-center justify-end p-3">
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={closeMobile}
                  className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent
                user={user}
                pathname={pathname ?? ""}
                onNavigate={closeMobile}
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  user,
  pathname,
  onNavigate,
}: {
  user: { name?: string | null; email?: string | null };
  pathname: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <div className="flex h-full flex-col">
      <div className="hidden items-center gap-2 px-5 pb-4 pt-5 lg:flex">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">GrowthPath</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Personal growth
          </span>
        </div>
      </div>

      <Separator className="hidden lg:block" />

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative isolate flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 -z-10 rounded-lg bg-primary/10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <div className="flex flex-col leading-tight">
                <span className="font-medium">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {item.description}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="flex items-center gap-3 px-4 py-4">
        <Avatar name={user.name} email={user.email} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user.name ?? "Member"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
