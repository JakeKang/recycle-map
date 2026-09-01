import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";
import { Providers } from "./providers";

const notoSans = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerif = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "RecycleMap | 우리동네 자원순환 알리미",
  description: "시민 참여형 수거함 지도 서비스 - 탐색, 제보, 신뢰관리",
};

const directionContract = `<!--
THESIS: 시민 검증 집계표. 지도와 검증 근거를 한 작업면에서 읽게 하며, 지도 위 둥근 카드가 기능을 대신하는 관습을 거부한다.
OWN-WORLD: 종이빛 바탕, 먹색 텍스트, 얇은 집계선, 신뢰 녹색·대기 호박색·오류 적색만 쓰는 상태 체계다.
STORY: 사용자는 위치를 찾고, 제보의 현재 신뢰도를 이해하고, 근거 있는 한 표로 정보 확정에 참여한다.
FIRST VIEWPORT: 데스크톱은 탐색 레일·넓은 지도·검증 원장을 연속 배치하고, 모바일은 지도 위 최소 도구와 단계형 상세 시트를 둔다. 주 행동은 지도와 상세 경계에 놓인다.
FORM: 시민 투표 집계표와 공공 데이터 원장, 자체 후보 7번, seed 252b29b6.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A per-request CSP nonce requires request-time rendering so Next.js can
  // attach the nonce to every framework and application script.
  await connection();

  return (
    <html lang="ko">
      <body className={`${notoSans.variable} ${notoSerif.variable} antialiased`}>
        <div
          aria-hidden="true"
          hidden
          dangerouslySetInnerHTML={{ __html: directionContract }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
