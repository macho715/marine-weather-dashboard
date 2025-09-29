export interface GuardedFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxAttempts?: number;
  backoffMs?: number;
  jitterRatio?: number;
  onRetry?: (context: { attempt: number; error: unknown }) => void;
}

const DEFAULT_TIMEOUT_MS = 7_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 400;
const DEFAULT_JITTER_RATIO = 0.25;

function sleep(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function applyJitter(base: number, ratio: number) {
  const spread = base * ratio;
  return base + (Math.random() * spread - spread / 2);
}

export async function guardedFetch(
  input: RequestInfo | URL,
  options: GuardedFetchOptions = {},
): Promise<Response> {
  const attempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;
  const jitterRatio = options.jitterRatio ?? DEFAULT_JITTER_RATIO;

  let lastError: unknown = null;
  const { signal: externalSignal, onRetry, ...init } = options;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener("abort", () => controller.abort(), {
          once: true,
        });
      }
    }

    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      if (!response.ok && response.status >= 500 && attempt < attempts) {
        lastError = new Error(`HTTP ${response.status}`);
        onRetry?.({ attempt, error: lastError });
        const delay = applyJitter(backoffMs * 2 ** (attempt - 1), jitterRatio);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (
        attempt >= attempts ||
        (controller.signal.aborted && externalSignal?.aborted)
      ) {
        throw error;
      }
      onRetry?.({ attempt, error });
      const delay = applyJitter(backoffMs * 2 ** (attempt - 1), jitterRatio);
      await sleep(delay);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("guardedFetch failed");
}
