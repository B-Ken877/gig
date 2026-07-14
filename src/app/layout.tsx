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
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='16' fill='%230B1A2E'/><text x='50' y='66' font-size='44' font-weight='bold' fill='%23C9A84C' text-anchor='middle' font-family='sans-serif'>GS</text></svg>",
  },
  openGraph: {
    title: "Gig Solutions — Staffing Resource Management System",
    description: "Enterprise staffing platform for Caribbean and global remote talent.",
    type: "website",
  },
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
