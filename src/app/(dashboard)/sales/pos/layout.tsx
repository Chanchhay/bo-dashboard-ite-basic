import { Navbar } from "@/components/pos/navbar-pos/navbar";

export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0">
        <Navbar />
      </div>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </section>
  );
}