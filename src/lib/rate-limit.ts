/**
 * 인메모리 슬라이딩-윈도우 레이트 리미터.
 * 단일 인스턴스 환경 전용 — 다중 인스턴스 배포 시 Redis 등 공유 스토어로 교체 필요.
 */
interface RateLimitRule {
  key: string;
  windowMs: number;
  max: number;
}

interface CounterState {
  count: number;
  resetAt: number;
}

const counters = new Map<string, CounterState>();

export function consumeRateLimit(rule: RateLimitRule) {
  const now = Date.now();
  const current = counters.get(rule.key);

  if (!current || current.resetAt <= now) {
    const next: CounterState = {
      count: 1,
      resetAt: now + rule.windowMs,
    };
    counters.set(rule.key, next);
    return {
      allowed: true,
      remaining: Math.max(0, rule.max - 1),
      retryAfterSec: Math.ceil(rule.windowMs / 1000),
    };
  }

  if (current.count >= rule.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  counters.set(rule.key, current);

  return {
    allowed: true,
    remaining: Math.max(0, rule.max - current.count),
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function resetRateLimitForTests() {
  counters.clear();
}
