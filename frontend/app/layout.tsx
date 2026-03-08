import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import MirathiAssistant from "@/components/MirathiAssistant";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "ميراثي",
  description: "تطبيق لحساب المواريث وفق القانون الإماراتي والفقه الإسلامي",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.variable}>
        {children}
        <Suspense fallback={null}>
          <MirathiAssistant />
        </Suspense>
      </body>
    </html>
  );
}