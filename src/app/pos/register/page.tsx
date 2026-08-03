import Link from "next/link";
import { redirect } from "next/navigation";

import { CashRegister } from "@/components/pos/cash-register";
import { findCurrentRegisterSession } from "@/lib/api/pos-session-backend";
import { POS_ROUTES, SALES_HOME } from "@/lib/pos-routes";

type OpenRegisterPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function OpenRegisterPage({
  searchParams,
}: OpenRegisterPageProps) {
  const { status } = await searchParams;

  if (status === "join-failed") {
    return (
      <RegisterStatusError message="Could not join the open register." />
    );
  }

  let current;

  try {
    current = await findCurrentRegisterSession();
  } catch {
    return (
      <RegisterStatusError message="Could not check the register status." />
    );
  }

  if (current) {
    redirect("/api/register/join");
  }

  return <CashRegister />;
}

function RegisterStatusError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f4f5] p-6">
      <div className="w-full max-w-95 rounded-3xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-base font-bold text-gray-900">{message}</h1>
        <p className="mt-2 text-sm text-gray-500">
          The register state is unknown, so a new session was not opened.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href={SALES_HOME}
            className="flex h-11 flex-1 items-center justify-center rounded-full border border-gray-200 text-sm font-semibold text-gray-600 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Back
          </Link>
          <Link
            href={POS_ROUTES.openRegister}
            className="flex h-11 flex-1 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Try again
          </Link>
        </div>
      </div>
    </main>
  );
}
