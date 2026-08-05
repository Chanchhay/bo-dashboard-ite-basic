import { ThemeProvider } from "@/components/dark-mode/theme-provider";

export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light">
      <div className="light min-h-screen bg-background text-foreground">
        {children}
      </div>
    </ThemeProvider>
  );
}
