import { NextRequest } from "next/server";
import { isIP } from "node:net";

export function isSameOriginRequest(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return true;
  }

  const configuredPublicUrl = process.env.NEXTAUTH_URL;
  if (process.env.NODE_ENV === "production" && !configuredPublicUrl) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    if (request.headers.get("sec-fetch-site") === "same-origin") {
      return true;
    }

    return process.env.NODE_ENV !== "production";
  }

  try {
    const expectedOrigin = configuredPublicUrl
      ? new URL(configuredPublicUrl).origin
      : request.nextUrl.origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

export function resolveClientAddress(request: NextRequest) {
  if (process.env.TRUST_PROXY !== "true") {
    return "unknown-ip";
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded && forwarded.trim().length > 0) {
    const candidate = forwarded.split(",")[0]?.trim() ?? "";
    return isIP(candidate) ? candidate : "unknown-ip";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    const candidate = realIp.trim();
    return isIP(candidate) ? candidate : "unknown-ip";
  }

  return "unknown-ip";
}
