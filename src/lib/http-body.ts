import { NextRequest } from "next/server";

export async function readJsonBody(request: NextRequest): Promise<{
  ok: true;
  data: unknown;
} | {
  ok: false;
  message: string;
}> {
  try {
    const data = await request.json();
    return { ok: true, data };
  } catch {
    return { ok: false, message: "유효한 JSON 요청 본문이 필요합니다." };
  }
}
