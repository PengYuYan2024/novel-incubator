import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小说孵化器",
  description: "私人长期小说创作资料管理站",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
