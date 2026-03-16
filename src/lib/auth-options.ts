import { findTestAccountById } from "@/constants/test-accounts";
import { timingSafeEqual } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const TEST_ACCOUNT_LOGIN_ENABLED =
  process.env.ENABLE_TEST_ACCOUNTS === "true" || !IS_PRODUCTION;

const TEST_ACCOUNT_PASSWORD =
  process.env.TEST_ACCOUNT_PASSWORD ?? (IS_PRODUCTION ? "" : "recycle-map-local");

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
    authorize(credentials) {
      const rawAccountId = credentials?.accountId;
      const rawPasscode = credentials?.passcode;
      const accountId =
        typeof rawAccountId === "string" ? rawAccountId.trim() : "";
      const passcode =
        typeof rawPasscode === "string" ? rawPasscode.trim() : "";

      if (accountId && passcode) {
        if (!TEST_ACCOUNT_LOGIN_ENABLED || !TEST_ACCOUNT_PASSWORD) {
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
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id =
          typeof token.userId === "string"
            ? token.userId
            : typeof token.sub === "string"
              ? token.sub
              : "";
      }

      return session;
    },
  },
};
