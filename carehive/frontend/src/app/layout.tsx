import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthLoader } from "@/components/AuthLoader";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { AppFrame } from "@/components/AppFrame";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CAREHIVE — AI Chronic Care Assistant",
  description: "Agentic AI healthcare: adherence, lifestyle, and care support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <AuthLoader />
        <ThemeInitializer />
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
