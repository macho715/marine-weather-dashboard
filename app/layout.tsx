import type React from "react";
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Geist as V0_Font_Geist } from "next/font/google";

// Initialize fonts
const geist = V0_Font_Geist({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Logistics Control Tower v2.5",
  description:
    "Advanced vessel tracking and maritime logistics management system with real-time simulation, weather integration, and AI-powered analytics",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
      </body>
    </html>
  );
}
