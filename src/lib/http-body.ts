import { NextRequest } from "next/server";

export const MAX_JSON_BODY_BYTES = 64 * 1024;

export async function readJsonBody(request: NextRequest): Promise<{
  ok: true;
  data: unknown;
} | {
  ok: false;
  message: string;
}> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    return { ok: false, message: "요청 본문이 너무 큽니다." };
  }

  try {
    if (!request.body) {
      return { ok: false, message: "유효한 JSON 요청 본문이 필요합니다." };
    }

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, message: "요청 본문이 너무 큽니다." };
      }
      chunks.push(value);
    }

    const data = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
    return { ok: true, data };
  } catch {
    return { ok: false, message: "유효한 JSON 요청 본문이 필요합니다." };
  }
}
