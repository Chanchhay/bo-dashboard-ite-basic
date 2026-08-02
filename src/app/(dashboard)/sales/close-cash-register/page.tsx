import { redirect } from "next/navigation";

import { POS_ROUTES } from "@/lib/pos-routes";

/**
 * Closing a register belongs to the terminal, not the back office — the real
 * screen now lives at `/pos/close`. Kept as a redirect so old links and any
 * bookmarked tab still land somewhere sensible.
 */
export default function LegacyCloseRegisterPage() {
  redirect(POS_ROUTES.closeRegister);
}
