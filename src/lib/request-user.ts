import { getCurrentUserId } from "@/lib/current-user";
import { NextRequest } from "next/server";

const DEV_HEADER_NAME = "x-dev-user-id";
const DEV_HEADER_SECRET_NAME = "x-dev-user-secret";

const DEFAULT_ADMIN_USER_IDS = new Set(["admin", "admin-user", "test-admin", "test-owner"]);

function configuredAdminUserIds() {
  const raw = process.env.ADMIN_USER_IDS;
  if (!raw) {
    return DEFAULT_ADMIN_USER_IDS;
  }

  const ids = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (ids.length === 0) {
    return DEFAULT_ADMIN_USER_IDS;
  }

  return new Set(ids);
}

function isDevHeaderEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_USER_HEADER === "true"
  );
}

export async function resolveRequestUserId(request: NextRequest) {
  const sessionUserId = await getCurrentUserId();
  if (sessionUserId) {
    return sessionUserId;
  }

  if (isDevHeaderEnabled()) {
    const expectedSecret = process.env.DEV_USER_HEADER_SECRET;
    if (expectedSecret) {
      const providedSecret = request.headers.get(DEV_HEADER_SECRET_NAME);
      if (providedSecret !== expectedSecret) {
        return null;
      }
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
