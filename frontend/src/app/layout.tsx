import type { Metadata, Viewport } from "next";
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
  title: "Battle Dice",
  description: "Tabuleiro de dados com portais e armadilhas.",
};

// Declared dark, so phone browsers with a forced dark mode (Samsung Internet, Chrome) don't invert the game's colours.
export const viewport: Viewport = { colorScheme: "dark", themeColor: "#0b0d1c" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" style={{ colorScheme: "dark" }}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
