import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

describe("/api/marine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-17T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("serves live data and caches the response", async () => {
    const payload = {
      hourly: {
        wave_height: [1.2],
        wind_speed_10m: [8],
        swell_wave_period: [10],
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("https://example.com/api/marine?port=AEJEA"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cached).toBe(false);
    expect(body.hs).toBeCloseTo(1.2);
    expect(body.windKt).toBeCloseTo(15.55, 2);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // second call should use cache without invoking fetch again
    const second = await GET(
      new Request("https://example.com/api/marine?port=AEJEA"),
    );
    const cachedBody = await second.json();
    expect(cachedBody.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns stale cache when refresh fails after TTL", async () => {
    const payload = {
      hourly: {
        wave_height: [1.5],
        wind_speed_10m: [10],
        swell_wave_period: [11],
      },
    };
    const successFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200 }),
      );
    vi.stubGlobal("fetch", successFetch);
    const { GET } = await loadRoute();
    const okResponse = await GET(
      new Request("https://example.com/api/marine?port=AEJEA"),
    );
    expect(okResponse.status).toBe(200);
    await okResponse.json();

    // advance time beyond cache ttl (10 minutes)
    vi.setSystemTime(new Date("2025-03-17T00:12:00Z"));

    const failureFetch = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", failureFetch);
    const stalePromise = GET(
      new Request("https://example.com/api/marine?port=AEJEA"),
    );
    await vi.runAllTimersAsync();
    const staleResponse = await stalePromise;
    const staleBody = await staleResponse.json();

    expect(staleResponse.status).toBe(200);
    expect(staleBody.stale).toBe(true);
    expect(staleBody.hs).toBeCloseTo(1.5);
    expect(failureFetch).toHaveBeenCalled();
  });

  it("opens the circuit breaker after repeated failures", async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error("boom"));
    vi.stubGlobal("fetch", failingFetch);
    const { GET } = await loadRoute();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const responsePromise = GET(
        new Request("https://example.com/api/marine?port=AEJEA"),
      );
      await vi.runAllTimersAsync();
      const response = await responsePromise;
      expect(response.status).toBe(502);
    }

    const openPromise = GET(
      new Request("https://example.com/api/marine?port=AEJEA"),
    );
    await vi.runAllTimersAsync();
    const openResponse = await openPromise;
    expect(openResponse.status).toBe(503);
    const body = await openResponse.json();
    expect(body.circuitOpen).toBe(true);
  });
});
