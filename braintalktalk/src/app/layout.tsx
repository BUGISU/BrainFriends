import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrainTalkTalk",
  description: "SaMD 기반 언어 재활 훈련",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        {children}
      </body>
    </html>
  );
}
