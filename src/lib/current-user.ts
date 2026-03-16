import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth";

export async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
