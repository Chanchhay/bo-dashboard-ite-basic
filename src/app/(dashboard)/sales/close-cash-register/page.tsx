import { redirect } from "next/navigation";

import { POS_ROUTES } from "@/lib/pos-routes";

export default function LegacyCloseRegisterPage() {
  redirect(POS_ROUTES.closeRegister);
}
