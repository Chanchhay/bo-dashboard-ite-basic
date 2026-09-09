import { requireBusiness } from "@/lib/api/business-guard";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireBusiness();

  return (
    <div className="min-h-screen bg-background text-foreground">{children}</div>
  );
}
