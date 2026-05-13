import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActivePlan } from "@/lib/plan";
import PlanNewClient from "./PlanNewClient";

export default async function PlansNewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  // If the user already has an active plan, bounce them to /today rather
  // than letting them silently create a second one (one active per user).
  const existing = await getActivePlan(session.user.id);
  if (existing) redirect("/today");

  return <PlanNewClient />;
}
