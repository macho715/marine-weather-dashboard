import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetGuardedFetchState } from "@/lib/server/guarded-fetch";
import { GET, __resetMarineCacheForTests } from "./route";

describe("/api/marine", () => {
  const port = "AEJEA";
  const coords = { lat: 24.4539, lon: 54.3773, name: "Jebel Ali" };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-17T02:00:00Z"));
    __resetMarineCacheForTests();
    __resetGuardedFetchState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function stubMarineResponse(status = 200, body?: object) {
    const payload =
      body ??
      ({
        hourly: {
          wave_height: [1.2],
          wind_speed_10m: [10],
          swell_wave_period: [9],
        },
      } satisfies Record<string, unknown>);
    const response = new Response(JSON.stringify(payload), { status });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("returns cached snapshot on success", async () => {
    const fetchMock = stubMarineResponse();

    const request = new Request(`https://example.com/api/marine?port=${port}`);
    const response = await GET(request);
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(payload.port).toBe(port);
    expect(payload.coords).toEqual(coords);
    expect(payload.hs).toBeCloseTo(1.2);
    expect(payload.windKt).toBeCloseTo(19.44);
    expect(payload.cached).toBe(false);

    // second call should use cache
    const second = await GET(request);
    const cachedPayload = await second.json();
    expect(cachedPayload.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns stale cache when upstream fails", async () => {
    stubMarineResponse();
    const request = new Request(`https://example.com/api/marine?port=${port}`);
    await GET(request);

    vi.setSystemTime(new Date(Date.now() + 11 * 60 * 1000));
    vi.restoreAllMocks();
    const failingFetch = vi.fn().mockRejectedValue(new Error("timeout"));
    vi.stubGlobal("fetch", failingFetch);

    const pending = GET(request);
    await vi.advanceTimersByTimeAsync(2000);
    const second = await pending;
    const payload = await second.json();
    expect(second.status).toBe(200);
    expect(payload.stale).toBe(true);
    expect(payload.cached).toBe(true);
  });

  it("propagates errors when no cache is available", async () => {
    __resetMarineCacheForTests();
    const failingFetch = vi.fn().mockRejectedValue(new Error("timeout"));
    vi.stubGlobal("fetch", failingFetch);

    const pending = GET(
      new Request(`https://example.com/api/marine?port=${port}`),
    );
    await vi.advanceTimersByTimeAsync(2000);
    const response = await pending;
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error).toMatch(/timeout|guardedFetch failed/i);
  });
});
