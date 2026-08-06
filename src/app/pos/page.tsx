import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PosTerminal } from "@/components/pos/pos-terminal";
import { getCurrentRegisterSession } from "@/lib/api/pos-session-backend";
import { auth } from "@/lib/auth/auth";
import { POS_ROUTES } from "@/lib/pos-routes";

export default async function PosPage() {
  const userSession = await auth.api.getSession({ headers: await headers() });
  /*
   * Selling needs an open drawer: the backend refuses to settle a POS sale
   * without one, so a till reached with no session would take a whole order
   * and only fail at payment.
   *
   * Checked here rather than in the client so there is no flash of a terminal
   * the cashier cannot use. Only a definite `null` redirects — if the backend
   * cannot be reached the answer is unknown, and bouncing on that would fight
   * the open-register screen, which sends an open session straight back here.
   */
  let session;

  try {
    session = await getCurrentRegisterSession();
  } catch {
    session = undefined;
  }

  if (session === null) {
    redirect(POS_ROUTES.openRegister);
  }

  const managerName = userSession?.user.name || "Manager";
  const currentRegisterUser = userSession?.user
    ? {
        id: session?.userId || userSession.user.id,
        name: session?.cashierName?.trim() || userSession.user.name,
      }
    : null;

  return (
    <PosTerminal
      managerName={managerName}
      currentRegisterUser={currentRegisterUser}
      registerCashSales={session?.totalCashSales}
      registerCurrency={session?.currency ?? undefined}
    />
  );
}
