/**
 * Tiny structured logger — single JSON line per event so Vercel's log
 * panel can parse and filter. Free, no external service.
 *
 * Usage:
 *   log.info("plan.created", { userId, planId });
 *   log.warn("ratelimit.hit", { userId, key });
 *   log.error("ai.outline.failed", err, { userId });
 */

type Level = "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

function emit(level: Level, message: string, context?: LogContext, error?: unknown) {
  const record: Record<string, unknown> = {
    level,
    msg: message,
    ts: new Date().toISOString(),
  };
  if (context) Object.assign(record, context);
  if (error) {
    record.error = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && error.stack) record.stack = error.stack;
  }
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info(message: string, context?: LogContext) {
    emit("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    emit("warn", message, context);
  },
  error(message: string, error?: unknown, context?: LogContext) {
    emit("error", message, context, error);
  },
};
