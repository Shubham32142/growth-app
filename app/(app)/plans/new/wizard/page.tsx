import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActivePlan } from "@/lib/plan";
import WizardClient from "./WizardClient";

interface Props {
  searchParams: Promise<{ d?: string }>;
}

export default async function WizardPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const existing = await getActivePlan(session.user.id);
  if (existing) redirect("/today");

  const { d } = await searchParams;
  const parsed = Number(d);
  const durationWeeks =
    Number.isInteger(parsed) && parsed >= 4 && parsed <= 52 ? parsed : null;

  if (!durationWeeks) {
    redirect("/plans/new");
  }

  return <WizardClient durationWeeks={durationWeeks} />;
}
