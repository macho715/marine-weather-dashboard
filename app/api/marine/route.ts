import { NextResponse } from "next/server";

import { guardedFetch } from "@/lib/server/guarded-fetch";
import { computeIoiFromMarine } from "@/lib/server/ioi";
import { VESSEL_DATASET } from "@/lib/server/vessel-data";

interface CachedMarine {
  snapshot: {
    hs: number | null;
    windKt: number | null;
    swellPeriod: number | null;
    ioi: number | null;
    fetchedAt: string;
  };
  expiresAt: number;
}

const cache = new Map<string, CachedMarine>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 7 * 1000;
const MAX_RETRIES = 3;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 5 * 60 * 1000;

const circuitBreaker = {
  failures: 0,
  openUntil: 0,
};

function safeNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function recordFailure() {
  circuitBreaker.failures += 1;
  if (circuitBreaker.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    circuitBreaker.openUntil = Date.now() + CIRCUIT_OPEN_MS;
  }
}

function recordSuccess() {
  circuitBreaker.failures = 0;
  circuitBreaker.openUntil = 0;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const port = searchParams.get("port") ?? VESSEL_DATASET.vessel.port;
  const coords = VESSEL_DATASET.ports[port];

  if (!coords) {
    return NextResponse.json({ error: "Unknown port" }, { status: 400 });
  }

  const cached = cache.get(port);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({
      port,
      coords,
      ...cached.snapshot,
      cached: true,
    });
  }

  if (circuitBreaker.openUntil > now) {
    if (cached) {
      return NextResponse.json(
        { port, coords, ...cached.snapshot, stale: true, circuitOpen: true },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { error: "Marine service temporarily unavailable", circuitOpen: true },
      { status: 503 },
    );
  }

  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    hourly: ["wave_height", "wind_speed_10m", "swell_wave_period"].join(","),
    timezone: "auto",
  });

  try {
    const response = await guardedFetch(
      `https://marine-api.open-meteo.com/v1/marine?${params.toString()}`,
      {
        timeoutMs: FETCH_TIMEOUT_MS,
        maxAttempts: MAX_RETRIES,
        backoffMs: 500,
      },
    );

    if (!response.ok) {
      throw new Error(`Marine API responded ${response.status}`);
    }

    const payload = (await response.json()) as {
      hourly?: {
        wave_height?: Array<number | null>;
        wind_speed_10m?: Array<number | null>;
        swell_wave_period?: Array<number | null>;
      };
    };

    const hs = safeNumber(payload?.hourly?.wave_height?.[0]);
    const windMs = safeNumber(payload?.hourly?.wind_speed_10m?.[0]);
    const swellPeriod = safeNumber(payload?.hourly?.swell_wave_period?.[0]);
    const windKt = windMs !== null ? windMs * 1.94384 : null;

    const snapshot = {
      hs,
      windKt,
      swellPeriod,
      ioi: computeIoiFromMarine({ hs, windKt, swellPeriod }),
      fetchedAt: new Date().toISOString(),
    };

    cache.set(port, {
      snapshot,
      expiresAt: now + CACHE_TTL_MS,
    });
    recordSuccess();

    return NextResponse.json({ port, coords, ...snapshot, cached: false });
  } catch (error) {
    recordFailure();
    if (cached) {
      return NextResponse.json(
        {
          port,
          coords,
          ...cached.snapshot,
          stale: true,
          error: "Using cached marine snapshot",
        },
        { status: 200 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Unknown marine error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
