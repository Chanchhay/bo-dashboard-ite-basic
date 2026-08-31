import { ReactNode } from "react";

import { requireBusiness } from "@/lib/api/business-guard";

export default async function PwaTestLayout({
  children,
}: {
  children: ReactNode;
}) {
  // An internal diagnostics screen, gated like the rest of the app rather than
  // left as the one page a business-less account can reach.
  await requireBusiness();

  return <>{children}</>;
}
