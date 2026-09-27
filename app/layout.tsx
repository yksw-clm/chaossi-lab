import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
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
  title: "Chaossi Lab",
  description: "",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="bg-blue-300 py-3 px-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Image src="/favicon.ico" alt="" width={28} height={28} unoptimized />
            Chaossi Lab
          </h1>
        </header>
        {children}
      </body>
    </html>
  );
}
