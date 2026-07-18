import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

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
  // PWA manifest — lets Android Chrome + Edge + Samsung Internet offer
  // "Install app" / "Add to Home screen". iOS Safari uses apple-touch-icon +
  // apple-mobile-web-app-* meta tags below.
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/icon-192.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Gig Solutions",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  openGraph: {
    title: "Gig Solutions — Staffing Resource Management System",
    description: "Enterprise staffing platform for Caribbean and global remote talent.",
    type: "website",
  },
};

// Viewport export (Next.js 14+ requires theme-color here, not in metadata)
export const viewport: Viewport = {
  themeColor: "#0B1A2E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
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
        {/* Mount the sonner Toaster once at the root so success/error toasts
            from any component actually render in the DOM. */}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
