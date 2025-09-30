const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF_MS = 400;
const DEFAULT_BACKOFF_FACTOR = 2;

export type GuardedFetchCircuitState = {
  failureCount: number;
  openedAt: number | null;
};

type GuardedFetchGlobalState = Record<string, GuardedFetchCircuitState>;

const circuits: GuardedFetchGlobalState = {};

export interface GuardedFetchOptions extends RequestInit {
  /**
   * Unique identifier for tracking the circuit breaker state.
   * Defaults to the URL string when omitted.
   */
  key?: string;
  /** Maximum duration in milliseconds before the request is aborted. */
  timeoutMs?: number;
  /** Number of retry attempts after the initial request. */
  retries?: number;
  /** Initial delay in milliseconds used for exponential backoff. */
  backoffMs?: number;
  /** Multiplier applied to the delay on every retry attempt. */
  backoffFactor?: number;
  /**
   * Number of consecutive failures before the circuit opens. When the circuit is open,
   * the fetch short-circuits until the cooldown period elapses.
   */
  circuitBreakerThreshold?: number;
  /** Cooldown duration in milliseconds before the circuit attempts another request. */
  circuitBreakerCooldownMs?: number;
}

export class GuardedFetchError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GuardedFetchError";
  }
}

function getCircuit(key: string): GuardedFetchCircuitState {
  if (!circuits[key]) {
    circuits[key] = { failureCount: 0, openedAt: null };
  }
  return circuits[key];
}

function circuitAllowsAttempt(key: string, cooldownMs: number): boolean {
  const circuit = getCircuit(key);
  if (circuit.openedAt == null) {
    return true;
  }
  if (Date.now() - circuit.openedAt >= cooldownMs) {
    circuit.openedAt = null;
    circuit.failureCount = 0;
    return true;
  }
  return false;
}

function markFailure(key: string, threshold: number) {
  const circuit = getCircuit(key);
  circuit.failureCount += 1;
  if (circuit.failureCount >= threshold) {
    circuit.openedAt = Date.now();
  }
}

function markSuccess(key: string) {
  const circuit = getCircuit(key);
  circuit.failureCount = 0;
  circuit.openedAt = null;
}

export async function guardedFetch(
  input: URL | RequestInfo,
  options: GuardedFetchOptions = {},
): Promise<Response> {
  const key =
    options.key ??
    (typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;
  const backoffFactor = options.backoffFactor ?? DEFAULT_BACKOFF_FACTOR;
  const threshold = Math.max(1, options.circuitBreakerThreshold ?? retries + 1);
  const cooldownMs = options.circuitBreakerCooldownMs ?? timeoutMs * 2;

  if (!circuitAllowsAttempt(key, cooldownMs)) {
    throw new GuardedFetchError("Circuit open");
  }

  let attempt = 0;
  let delay = backoffMs;
  let lastError: unknown;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, {
        ...options,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new GuardedFetchError(`HTTP ${response.status}`);
      }
      markSuccess(key);
      return response;
    } catch (error) {
      lastError = error;
      markFailure(key, threshold);
      if (attempt >= retries) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= backoffFactor;
    } finally {
      clearTimeout(timeout);
    }
    attempt += 1;
  }

  throw new GuardedFetchError("guardedFetch failed", lastError);
}

export function __resetGuardedFetchState() {
  Object.keys(circuits).forEach((key) => delete circuits[key]);
}
