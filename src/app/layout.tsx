import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";

import "./globals.css";
import StoreProvider from "./StoreProvider";

const googleSans = Google_Sans({
    variable: "--font-google-sans",
    subsets: ["latin"],
    display: "swap",
});


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
            className={`${googleSans.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col">
                <StoreProvider>{children}</StoreProvider>
            </body>
        </html>
    );
}
