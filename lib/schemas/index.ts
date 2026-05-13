import { z } from "zod";
import { NextResponse } from "next/server";

/**
 * Helper: validate an API request body against a Zod schema and return a
 * NextResponse 400 if it fails. Pairs schema enforcement with a consistent
 * error envelope across every API route.
 *
 *   const parsed = await parseBody(req, mySchema);
 *   if (!parsed.ok) return parsed.response;
 *   // parsed.data is the typed object
 */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<
  | { ok: true; data: z.infer<T> }
  | { ok: false; response: NextResponse }
> {
  let raw: unknown;
  try {
    const text = await req.text();
    raw = text ? JSON.parse(text) : {};
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      ),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Invalid input",
          issues: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: result.data };
}

export * from "./plan";
export * from "./task";
export * from "./wins";
export * from "./admin";
