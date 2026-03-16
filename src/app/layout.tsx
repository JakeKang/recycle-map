import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

const notoSans = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "RecycleMap | 우리동네 자원순환 알리미",
  description: "시민 참여형 수거함 지도 서비스 - 탐색, 제보, 신뢰관리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSans.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Script
          src="https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
