"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";

import { CloseRegister } from "@/components/pos/close-register";
import { useToast } from "@/components/ui/toast";
import type { RegisterSession } from "@/lib/api/pos-session";
import { useMoney } from "@/hooks/useMoney";
import { POS_ROUTES } from "@/lib/pos-routes";

export default function PosCloseRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<RegisterSession | null>(null);
  const [closed, setClosed] = useState<RegisterSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await fetch("/api/register/session");
        const current = response.ok ? await response.json() : null;

        if (!active) return;

        if (!current) {
          router.replace(POS_ROUTES.openRegister);
          return;
        }

        setSession(current);
      } catch {
      }

      if (active) setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleConfirm(totalCounted: number) {
    setIsClosing(true);

    try {
      const response = await fetch("/api/register/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualAmount: totalCounted }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast({
          tone: "error",
          title: "Register not closed",
          description: payload?.message ?? "Could not close the register.",
        });
        setIsClosing(false);
        return;
      }

      setClosed(payload);
    } catch {
      toast({
        tone: "error",
        title: "Register not closed",
        description: "Could not reach the server. Check your connection.",
      });
      setIsClosing(false);
    }
  }

  if (isLoading || (!session && !closed)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f4f5]">
        <p className="text-sm text-gray-400">
          {isLoading ? "Loading register session…" : "No open register found."}
        </p>
      </div>
    );
  }

  if (closed) {
    return <Reconciliation session={closed} />;
  }

  return (
    <CloseRegister
      cashierName={session!.cashierName ?? session!.registerName ?? "—"}
      openedAt={formatOpenedAt(session!.openedAt)}
      openingAmount={session!.openingBalance}
      revenue={session!.totalCashSales}
      currency={session!.currency ?? undefined}
      orderCount={session!.orderCount ?? 0}
      onConfirm={handleConfirm}
      isProcessing={isClosing}
    />
  );
}

function Reconciliation({ session }: { session: RegisterSession }) {
  const { format } = useMoney();
  const router = useRouter();
  const difference = session.differenceAmount ?? 0;

  const tone =
    difference === 0
      ? "text-primary"
      : difference < 0
        ? "text-brand-red"
        : "text-primary";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f4f5] p-6">
      <div className="w-full max-w-95 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-2 pb-5 text-center">
          <CircleCheck className="h-10 w-10 text-primary" aria-hidden="true" />
          <h1 className="text-base font-bold text-gray-900">
            Register closed
          </h1>
          <p className="text-sm text-gray-500">
            {[session.registerName, session.cashierName]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <dl className="flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm">
          <Row label="Opening amount" value={format(session.openingBalance, session.currency ?? undefined)} />
          <Row label="Orders" value={String(session.orderCount ?? 0)} />
          <Row label="Cash sales" value={format(session.totalCashSales, session.currency ?? undefined)} />
          <Row label="Paid in" value={format(session.totalPaidIn, session.currency ?? undefined)} />
          <Row label="Paid out" value={format(session.totalPaidOut, session.currency ?? undefined)} />
          <Row label="Expected" value={format(session.expectedAmount, session.currency ?? undefined)} />
          <Row label="Counted" value={format(session.actualAmount, session.currency ?? undefined)} />
        </dl>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <dt className="text-sm font-semibold text-gray-900">Difference</dt>
          <dd className={`text-lg font-bold tabular-nums ${tone}`}>
            {difference > 0 ? "+" : difference < 0 ? "−" : ""}
            {format(Math.abs(difference), session.currency ?? undefined)}
          </dd>
        </div>

        {session.reconciliationStatus && (
          <p className="pt-1 text-right text-xs font-semibold tracking-wide text-gray-500">
            {session.reconciliationStatus}
          </p>
        )}

        <button
          type="button"
          onClick={() => router.replace(POS_ROUTES.openRegister)}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white outline-none transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-semibold tabular-nums text-gray-800">{value}</dd>
    </div>
  );
}

function formatOpenedAt(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
