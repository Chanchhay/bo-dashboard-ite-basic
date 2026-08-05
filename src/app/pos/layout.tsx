/**
 * Light theme for these routes is forced by the root ThemeProvider, which is
 * the only provider next-themes honours — a second one here renders as a
 * passthrough and would silently do nothing.
 */
export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">{children}</div>
  );
}
