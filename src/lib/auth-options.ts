import { findTestAccountById } from "@/constants/test-accounts";
import { isAdminUserId } from "@/lib/request-user";
import { buildStableUserId } from "@/lib/auth-identity";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { migrateLegacyUserIdentity } from "@/lib/user-identity-migration";
import { timingSafeEqual } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const TEST_ACCOUNT_LOGIN_ENABLED =
  !IS_PRODUCTION && process.env.ENABLE_TEST_ACCOUNTS !== "false";

const TEST_ACCOUNT_PASSWORD =
  process.env.TEST_ACCOUNT_PASSWORD ?? (IS_PRODUCTION ? "" : "recycle-map-local");

function stableUserIdFor(
  userId: string,
  account: { provider: string; providerAccountId: string } | null,
) {
  return buildStableUserId(
    account?.provider ?? "credentials",
    account?.providerAccountId ?? userId,
    userId,
  );
}

function isSameSecret(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

const providers = [
  Credentials({
    name: "TestAccount",
    credentials: {
      accountId: { label: "계정 ID", type: "text" },
      passcode: { label: "패스코드", type: "password" },
      nickname: { label: "닉네임(개발용)", type: "text" },
    },
    async authorize(credentials) {
      const rawAccountId = credentials?.accountId;
      const rawPasscode = credentials?.passcode;
      const accountId =
        typeof rawAccountId === "string" ? rawAccountId.trim() : "";
      const passcode =
        typeof rawPasscode === "string" ? rawPasscode : "";

      if (accountId && passcode) {
        if (!TEST_ACCOUNT_LOGIN_ENABLED || !TEST_ACCOUNT_PASSWORD) {
          return null;
        }

        const rateLimit = await consumeRateLimit({
          key: `auth:credentials:${accountId}`,
          windowMs: 15 * 60_000,
          max: 10,
        });
        if (!rateLimit.allowed) {
          return null;
        }

        const account = findTestAccountById(accountId);
        if (!account || !isSameSecret(passcode, TEST_ACCOUNT_PASSWORD)) {
          return null;
        }

        return {
          id: `test-${account.id}`,
          name: account.name,
        };
      }

      const rawNickname = credentials?.nickname;
      const nickname =
        typeof rawNickname === "string" && rawNickname.trim().length > 0
          ? rawNickname.trim()
          : "데모 사용자";

      if (IS_PRODUCTION) {
        return null;
      }

      return {
        id: `demo-${nickname}`,
        name: nickname,
      };
    },
  }),
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
  ...(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET
    ? [
        Kakao({
          clientId: process.env.KAKAO_CLIENT_ID,
          clientSecret: process.env.KAKAO_CLIENT_SECRET,
        }),
      ]
    : []),
  ...(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET
    ? [
        Naver({
          clientId: process.env.NAVER_CLIENT_ID,
          clientSecret: process.env.NAVER_CLIENT_SECRET,
        }),
      ]
    : []),
];

export const authOptions: NextAuthOptions = {
  providers,
  useSecureCookies: IS_PRODUCTION,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  jwt: {
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.id) {
        return false;
      }
      const stableUserId = stableUserIdFor(user.id, account);
      await migrateLegacyUserIdentity(
        account?.provider ?? "credentials",
        user.id,
        stableUserId,
      );
      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.userId = stableUserIdFor(user.id, account);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const resolvedId =
          typeof token.userId === "string"
            ? token.userId
            : typeof token.sub === "string"
              ? token.sub
              : "";
        session.user.id = resolvedId;
        session.user.isAdmin = resolvedId ? isAdminUserId(resolvedId) : false;
      }

      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      const provider = account?.provider ?? "credentials";
      const stableUserId = user.id ? stableUserIdFor(user.id, account) : null;

      await recordSecurityAuditEvent({
        actorId: stableUserId,
        action: "auth.sign_in",
        outcome: "success",
        details: { provider },
      });
    },
  },
};
