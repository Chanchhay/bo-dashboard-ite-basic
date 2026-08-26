import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/dark-mode/theme-provider";
import { NetworkStatusBanner } from "@/components/common/NetworkStatusBanner";

import StoreProvider from "./StoreProvider";
import { TourProvider } from "@/lib/tours/TourProvider";
import { PwaManager } from "@/components/pwa/PwaManager";
import { PwaInstallProvider } from "@/components/pwa/PwaInstallProvider";

export const metadata: Metadata = {
  title: "FluxiBiz - Business Owner Dashboard",
  description: "FluxiBiz business operations platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full font-sans antialiased"
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <PwaManager />

        <PwaInstallProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {/* NetworkStatusBanner reads offline sync state through
                usePosOffline -> useDispatch, so it has to sit inside
                StoreProvider. */}
            <StoreProvider>
              <NetworkStatusBanner />

              <TourProvider>
                {children}
              </TourProvider>
            </StoreProvider>
          </ThemeProvider>
        </PwaInstallProvider>
      </body>
    </html>
  );
}