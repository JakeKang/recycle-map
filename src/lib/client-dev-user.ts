export function buildClientJsonHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const devUserId = process.env.NEXT_PUBLIC_DEV_USER_ID;
  if (devUserId && devUserId.trim().length > 0) {
    headers["x-dev-user-id"] = devUserId.trim();
  }

  return headers;
}

export function getClientDevUserId() {
  const devUserId = process.env.NEXT_PUBLIC_DEV_USER_ID;
  return devUserId && devUserId.trim().length > 0 ? devUserId.trim() : null;
}

export function buildClientHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const devUserId = process.env.NEXT_PUBLIC_DEV_USER_ID;

  if (devUserId && devUserId.trim().length > 0) {
    headers["x-dev-user-id"] = devUserId.trim();
  }

  return headers;
}
