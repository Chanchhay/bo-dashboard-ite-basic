import { ReactNode } from "react";

import { requireBusiness } from "@/lib/api/business-guard";

export default async function PwaTestLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireBusiness();

  return <>{children}</>;
}
