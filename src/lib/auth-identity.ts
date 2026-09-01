import { createHash } from "node:crypto";

const MAX_ID_LENGTH = 190;

function boundedIdentity(value: string) {
  if (value.length <= MAX_ID_LENGTH) {
    return value;
  }

  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function buildStableUserId(
  provider: string,
  providerAccountId: string,
  fallbackUserId: string,
) {
  if (provider === "credentials") {
    return boundedIdentity(fallbackUserId);
  }

  return boundedIdentity(`${provider}:${providerAccountId}`);
}
