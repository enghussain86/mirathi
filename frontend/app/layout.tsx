import "./globals.css";
import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import TopNav from "@/components/TopNav";

const arabicFont = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ميراثي",
  description: "حاسبة المواريث الشرعية",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${arabicFont.className} min-h-screen bg-[#f3f4f6] text-slate-900 antialiased`}
      >
        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  );
}