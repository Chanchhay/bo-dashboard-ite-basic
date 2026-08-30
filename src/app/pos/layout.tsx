import { requireBusiness } from "@/lib/api/business-guard";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Same gate as the dashboard: the register is business-scoped too.
  await requireBusiness();

  return (
    <div className="min-h-screen bg-background text-foreground">{children}</div>
  );
}
