import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AiConsentProvider from "@/components/AiConsentProvider";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import StorageNotice from "@/components/StorageNotice";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "은행 면접도우미 A to Z",
  description: "BEI·AI 리터러시·토론 면접을 혼자 연습하는 은행·금융권 면접 준비 앱",
};

// Design Ref: §2.1 — 모든 화면: 헤더(위) / 내용 / 저장 안내·삭제 버튼·개인정보 안내(아래), AI 전달 동의 창
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AiConsentProvider>
          <SiteHeader />
          <div className="mx-auto w-full max-w-3xl px-4 pt-3 empty:hidden">
            <StorageNotice />
          </div>
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
        </AiConsentProvider>
      </body>
    </html>
  );
}
