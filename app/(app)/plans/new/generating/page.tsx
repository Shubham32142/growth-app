import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import GeneratingClient from "./GeneratingClient";

export default async function GeneratingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  // We intentionally DON'T check for an existing active plan here — the
  // page is reached after wizard submit, before the plan is fully ready.
  // The client reads the wizard inputs from sessionStorage and fires the
  // two LLM calls. If sessionStorage is empty (direct visit / hard reload
  // after success), it bounces back to /plans/new.
  return <GeneratingClient />;
}
