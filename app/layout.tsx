import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "山河长明 · 铭记历史 致敬英雄",
  description: "为英雄点亮一支蜡烛。1840至1945年历史事件名称目录，铭记来路，守望和平。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
