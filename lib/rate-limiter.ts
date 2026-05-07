export interface RateLimiter {
  acquire(): Promise<void>;
}

type Clock = () => number;
type Sleep = (ms: number) => Promise<void>;

const defaultClock: Clock = () => Date.now();
const defaultSleep: Sleep = (ms) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Leaky-bucket throttle. The bucket drips one token per `1000 / tokensPerSecond`
 * milliseconds; `acquire()` waits its turn and never overspends.
 *
 * Concurrency note: callers compete for tokens by mutating `nextAvailableAt`
 * before any `await`. Each concurrent caller observes a strictly later slot,
 * so two simultaneous `acquire()` calls at the same `tokensPerSecond` settle
 * one interval apart.
 */
export function createRateLimiter(opts: {
  tokensPerSecond: number;
  clock?: Clock;
  sleep?: Sleep;
}): RateLimiter {
  const clock = opts.clock ?? defaultClock;
  const sleep = opts.sleep ?? defaultSleep;
  const intervalMs = 1_000 / opts.tokensPerSecond;
  let nextAvailableAt = 0;

  return {
    async acquire(): Promise<void> {
      const now = clock();
      const slot = Math.max(now, nextAvailableAt);
      nextAvailableAt = slot + intervalMs;
      const wait = slot - now;
      if (wait > 0) await sleep(wait);
    },
  };
}
