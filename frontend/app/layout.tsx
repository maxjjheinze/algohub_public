import "./globals.css";
import type { ReactNode } from "react";
import { Space_Grotesk } from "next/font/google";
import { SmoothScroll } from "../components/ui/SmoothScroll";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap"
});

export const metadata = {
  title: "Algo Hub",
  description: "Premium algo dashboard for MT5 trading performance.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} dark`}>
      <body className="min-h-screen bg-atmosphere text-slate-100 font-sans selection:bg-accent/20 selection:text-accent">
        <SmoothScroll />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
