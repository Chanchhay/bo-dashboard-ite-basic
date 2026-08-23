import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/dark-mode/theme-provider";
import StoreProvider from "./StoreProvider";
import { NetworkStatusBanner } from "@/components/common/NetworkStatusBanner";

const googleSans = Plus_Jakarta_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FluxiBiz - Business Owner Dashboard",
  description: "FluxiBiz business operations platform",
};

import { TourProvider } from "@/lib/tours/TourProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${googleSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NetworkStatusBanner />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreProvider>
            <TourProvider>{children}</TourProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
