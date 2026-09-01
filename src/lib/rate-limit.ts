import { createHash } from "node:crypto";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function consumeMemoryRateLimit(rule: RateLimitRule) {
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

export async function consumeRateLimit(rule: RateLimitRule) {
  if (process.env.NODE_ENV !== "production") {
    return consumeMemoryRateLimit(rule);
  }

  try {
    const client = createSupabaseServerClient();
    if (!client) {
      return { allowed: false, remaining: 0, retryAfterSec: 60 };
    }

    const key = `rl:${createHash("sha256").update(rule.key).digest("hex")}`;
    const { data, error } = await client
      .rpc("consume_security_rate_limit", {
        p_key: key,
        p_window_ms: rule.windowMs,
        p_max: rule.max,
      })
      .single();

    if (error || !data) {
      return { allowed: false, remaining: 0, retryAfterSec: 60 };
    }

    const result = data as {
      allowed: boolean;
      remaining: number;
      retry_after_sec: number;
    };
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      retryAfterSec: result.retry_after_sec,
    };
  } catch {
    return { allowed: false, remaining: 0, retryAfterSec: 60 };
  }
}

export function resetRateLimitForTests() {
  counters.clear();
}
