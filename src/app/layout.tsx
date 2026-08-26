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
import { PwaRegister } from "@/components/common/PwaRegister";

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
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <PwaRegister />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <StoreProvider>
            <NetworkStatusBanner />
            <TourProvider>{children}</TourProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
