import { ReactNode } from "react";

import { requireBusiness } from "@/lib/api/business-guard";

export default async function CustomerDisplayLayout({
  children,
}: {
  children: ReactNode;
}) {
  // The second screen is driven over BroadcastChannel from the register in the
  // same browser, so it is always the cashier's own signed-in session — and it
  // fetches the business profile to brand itself.
  await requireBusiness();

  return <>{children}</>;
}
