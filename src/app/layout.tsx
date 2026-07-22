import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Gig Solutions — Staffing Resource Management System",
  description: "Enterprise staffing platform connecting qualified customer support agents with call centers and companies seeking remote talent across the Caribbean and beyond.",
  keywords: ["staffing", "remote talent", "customer support", "call center", "Caribbean", "Gig Solutions", "SRMS"],
  authors: [{ name: "Gig Solutions" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Gig Solutions",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Gig Solutions — Staffing Resource Management System",
    description: "Enterprise staffing platform for Caribbean and global remote talent.",
    type: "website",
    images: [{ url: "/logo-square.png", width: 512, height: 512, alt: "Gig Solutions" }],
  },
  twitter: {
    card: "summary",
    title: "Gig Solutions — Staffing Resource Management System",
    description: "Enterprise staffing platform for Caribbean and global remote talent.",
    images: ["/logo-square.png"],
  },
};

export const viewport = {
  themeColor: "#0B1A2E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
