import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetGuardedFetchState,
  GuardedFetchError,
  guardedFetch,
} from "./guarded-fetch";

describe("guardedFetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetGuardedFetchState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    __resetGuardedFetchState();
  });

  it("resolves on first successful attempt", async () => {
    const payload = { ok: true };
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200 }),
      );
    vi.stubGlobal("fetch", mockFetch);

    const response = await guardedFetch("https://example.com/data");
    expect(await response.json()).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries with exponential backoff on failures", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", mockFetch);

    const promise = guardedFetch("https://example.com", {
      retries: 1,
      backoffMs: 500,
      timeoutMs: 200,
    });

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(500);

    const response = await promise;
    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("opens the circuit after threshold failures", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("boom"));
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      guardedFetch("https://example.com", {
        retries: 0,
        circuitBreakerThreshold: 1,
        timeoutMs: 100,
      }),
    ).rejects.toBeInstanceOf(GuardedFetchError);

    await expect(
      guardedFetch("https://example.com", {
        retries: 0,
        circuitBreakerThreshold: 1,
        timeoutMs: 100,
      }),
    ).rejects.toThrow(/Circuit open/);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("resets the circuit after cooldown elapses", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      guardedFetch("https://example.com", {
        retries: 0,
        circuitBreakerThreshold: 1,
        circuitBreakerCooldownMs: 1000,
        timeoutMs: 100,
      }),
    ).rejects.toBeInstanceOf(GuardedFetchError);

    await vi.advanceTimersByTimeAsync(1000);

    const response = await guardedFetch("https://example.com", {
      retries: 0,
      circuitBreakerThreshold: 1,
      circuitBreakerCooldownMs: 1000,
      timeoutMs: 100,
    });
    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
