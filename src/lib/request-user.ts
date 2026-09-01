import { getCurrentUserId } from "@/lib/current-user";
import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

const DEV_HEADER_NAME = "x-dev-user-id";
const DEV_HEADER_SECRET_NAME = "x-dev-user-secret";

const DEFAULT_ADMIN_USER_IDS = new Set(["admin", "admin-user", "test-admin"]);

function configuredAdminUserIds() {
  const raw = process.env.ADMIN_USER_IDS;
  if (!raw) {
    return process.env.NODE_ENV === "production" ? new Set<string>() : DEFAULT_ADMIN_USER_IDS;
  }

  const ids = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (ids.length === 0) {
    return process.env.NODE_ENV === "production" ? new Set<string>() : DEFAULT_ADMIN_USER_IDS;
  }

  return new Set(ids);
}

function isDevHeaderEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_USER_HEADER === "true"
  );
}

function secretsMatch(provided: string | null, expected: string) {
  if (!provided) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

/**
 * 요청에서 사용자 ID를 확인하는 진입점.
 * 프로덕션: NextAuth 세션만 허용.
 * 개발/테스트: ALLOW_DEV_USER_HEADER=true 이고 NODE_ENV≠production일 때만 x-dev-user-id 헤더 허용.
 */
export async function resolveRequestUserId(request: NextRequest) {
  const sessionUserId = await getCurrentUserId();
  if (sessionUserId) {
    return sessionUserId;
  }

  if (isDevHeaderEnabled()) {
    const expectedSecret = process.env.DEV_USER_HEADER_SECRET;
    if (expectedSecret) {
      const providedSecret = request.headers.get(DEV_HEADER_SECRET_NAME);
      if (!secretsMatch(providedSecret, expectedSecret)) {
        return null;
      }
    } else if (!["localhost", "127.0.0.1", "::1"].includes(request.nextUrl.hostname)) {
      return null;
    }

    const devUserId = request.headers.get(DEV_HEADER_NAME);
    if (devUserId && devUserId.trim().length > 0 && devUserId.trim().length <= 64) {
      return devUserId.trim();
    }
  }

  return null;
}

export function isAdminUserId(userId: string) {
  return configuredAdminUserIds().has(userId);
}
