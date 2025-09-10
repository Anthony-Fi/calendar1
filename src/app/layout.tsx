import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "Loviisa Online",
    template: "%s | Loviisa Online",
  },
  description: "Discover upcoming events in Loviisa and nearby.",
  metadataBase: new URL("https://www.loviisa.online"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Loviisa Online",
    description: "Discover upcoming events in Loviisa and nearby.",
    url: "https://www.loviisa.online",
    siteName: "Loviisa Online",
    images: [
      { url: "/next.svg", width: 1200, height: 630, alt: "Loviisa Online" },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Loviisa Online",
    description: "Discover upcoming events in Loviisa and nearby.",
    images: ["/next.svg"],
  },
  robots: {
    index: true,
    follow: true,
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
