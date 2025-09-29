#!/usr/bin/env node

import cron from "node-cron";
import fs from "node:fs/promises";
import path from "node:path";

type Slot = "am" | "pm";

type LockMap = Partial<Record<Slot, string>>;

const TIMEZONE = process.env.REPORT_TIMEZONE ?? "Asia/Dubai";
const ENDPOINT =
  process.env.REPORT_ENDPOINT ?? "http://localhost:3000/api/report";
const LOCK_PATH = path.resolve(
  process.env.REPORT_LOCK_FILE ?? ".weather-vessel-report.lock",
);
const LOCK_TTL_MS = 10 * 60 * 1000;

const inflight = new Set<Slot>();

async function readLock(): Promise<LockMap> {
  try {
    const raw = await fs.readFile(LOCK_PATH, "utf8");
    return JSON.parse(raw) as LockMap;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    console.warn("[scheduler] Unable to read lock file", error);
    return {};
  }
}

async function writeLock(lock: LockMap) {
  const dir = path.dirname(LOCK_PATH);
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
  await fs.writeFile(LOCK_PATH, JSON.stringify(lock, null, 2));
}

async function shouldSkip(lock: LockMap, slot: Slot) {
  const value = lock[slot];
  if (!value) return false;
  const last = new Date(value);
  if (Number.isNaN(last.valueOf())) return false;
  return Date.now() - last.valueOf() < LOCK_TTL_MS;
}

async function dispatchReport(slot: Slot) {
  const url = `${ENDPOINT}?slot=${slot}`;
  console.log(
    `[scheduler] Dispatching ${slot.toUpperCase()} report via ${url}`,
  );
  const response = await fetch(url, { method: "GET" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  if (!payload?.ok) {
    console.warn("[scheduler] Report completed with partial failure", payload);
  } else {
    const summary = Array.isArray(payload.sent)
      ? payload.sent
          .map(
            (item: { channel: string; ok: boolean }) =>
              `${item.channel}:${item.ok ? "ok" : "err"}`,
          )
          .join(", ")
      : "no-summary";
    console.log(`[scheduler] Report sent successfully (${summary})`);
  }
}

async function triggerReport(slot: Slot) {
  if (inflight.has(slot)) {
    console.log(`[scheduler] ${slot} report already running`);
    return;
  }
  inflight.add(slot);
  try {
    const lock = await readLock();
    if (await shouldSkip(lock, slot)) {
      console.log(`[scheduler] ${slot} report skipped (recent execution)`);
      return;
    }
    lock[slot] = new Date().toISOString();
    await writeLock(lock);
    await dispatchReport(slot);
  } catch (error) {
    console.error(`[scheduler] Report dispatch error for ${slot}`, error);
  } finally {
    inflight.delete(slot);
  }
}

console.log(
  `[scheduler] Starting with timezone ${TIMEZONE} targeting ${ENDPOINT}`,
);

cron.schedule("0 6 * * *", () => triggerReport("am"), { timezone: TIMEZONE });
cron.schedule("0 17 * * *", () => triggerReport("pm"), { timezone: TIMEZONE });

console.log("[scheduler] Schedules registered for 06:00 and 17:00 local time");

triggerReport("am").catch((error) =>
  console.error("[scheduler] Initial trigger failed", error),
);

process.on("SIGINT", () => {
  console.log("\n[scheduler] Stopping");
  process.exit(0);
});
