import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/dark-mode/theme-provider";
import StoreProvider from "./StoreProvider";
import { NetworkStatusBanner } from "@/components/common/NetworkStatusBanner";



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
      className="h-full font-sans antialiased">
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
