import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { guardedFetch } from "./guarded-fetch";

describe("guardedFetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns the first successful response", async () => {
    const response = new Response("ok", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = guardedFetch("https://example.com");
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe(response);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on server error before succeeding", async () => {
    const first = new Response("bad", { status: 500 });
    const second = new Response("ok", { status: 200 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    vi.stubGlobal("fetch", fetchMock);

    const onRetry = vi.fn();
    const resultPromise = guardedFetch("https://example.com", {
      maxAttempts: 3,
      onRetry,
    });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith({
      attempt: 1,
      error: expect.any(Error),
    });
  });

  it("throws after exhausting attempts", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("boom"));
    vi.stubGlobal("fetch", fetchMock);

    const promise = guardedFetch("https://example.com", { maxAttempts: 2 });
    const assertion = expect(promise).rejects.toThrow(/boom/);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
