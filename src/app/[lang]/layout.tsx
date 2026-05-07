import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { hasLocale, locales } from "@/dictionaries";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SuomiSocial",
  description:
    "Finlandiya'ya özgü özel günler için otomatik AI sosyal medya & reklam yönetimi",
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

interface Props {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}

export default async function RootLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
