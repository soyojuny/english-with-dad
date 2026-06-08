import type { Metadata, Viewport } from "next";
import "../styles.css";

export const metadata: Metadata = {
  title: "English with Dad Reading Manager",
  description: "아동별 책 읽기 할 일과 부모 활동 기록을 관리하는 PWA",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/assets/app-icon.svg",
    apple: "/assets/app-icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#315d96",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
