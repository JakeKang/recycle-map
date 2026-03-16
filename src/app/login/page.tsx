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

  return <LoginClient callbackUrl={callbackUrl} />;
}
