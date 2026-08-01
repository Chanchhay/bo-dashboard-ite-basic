import { redirect } from "next/navigation";

import { SALES_HOME } from "@/lib/pos-routes";

export default function LegacyDashboardPosPage() {
  redirect(SALES_HOME);
}
