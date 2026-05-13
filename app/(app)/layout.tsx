import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
    >
      {children}
    </AppShell>
  );
}
