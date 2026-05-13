import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadTodayData } from "@/lib/today";
import TodayClient from "./TodayClient";

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const initial = await loadTodayData(session.user.id, new Date());
  if (!initial.hasPlan) redirect("/plans/new");
  return <TodayClient initial={initial} />;
}
