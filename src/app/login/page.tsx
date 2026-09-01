import LoginClient from "@/app/login/LoginClient";

function sanitizeCallbackUrl(raw: string | undefined) {
  if (!raw) {
    return "/";
  }

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl);
  const socialProviders = [
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "google" : null,
    process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET ? "kakao" : null,
    process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET ? "naver" : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <LoginClient
      callbackUrl={callbackUrl}
      showDevelopmentLogin={process.env.NODE_ENV !== "production"}
      socialProviders={socialProviders}
    />
  );
}
