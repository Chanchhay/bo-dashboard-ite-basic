"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, Loader2, QrCode, RefreshCw } from "lucide-react";

import { formatCurrency } from "@/lib/money";
import type { Khqr, Sale } from "@/lib/api/pos-order";
import { useGetPaymentStatusQuery } from "@/services/posOrderApi";

/** How often to ask whether the customer has paid. */
const POLL_MS = 2000;

export interface KhqrViewProps {
    khqr: Khqr;
    /** Called once, when Bakong confirms and the sale exists. */
    onPaid: (sale: Sale) => void;
    onCancel: () => void;
    onRegenerate: () => void;
    isRegenerating?: boolean;
}

/**
 * The code the customer scans, and the wait for Bakong to confirm.
 *
 * Polling stops the moment the code is settled or expires — a terminal left on
 * this screen must not keep asking about a sale that has already ended.
 */
export function KhqrView({
    khqr,
    onPaid,
    onCancel,
    onRegenerate,
    isRegenerating,
}: KhqrViewProps) {
    const secondsLeft = useCountdown(khqr.expiresAt);
    const expired = secondsLeft === 0;

    const { data } = useGetPaymentStatusQuery(undefined, {
        pollingInterval: POLL_MS,
        skip: expired,
    });

    // Read from the poll rather than mirrored into state, so there is no
    // window where the two disagree about whether the sale is done.
    const paidSale = data?.sale ?? null;
    const settled = Boolean(paidSale);

    // Reporting the sale is a one-shot handoff; a ref keeps a second poll from
    // announcing the same payment twice.
    const reported = useRef(false);

    useEffect(() => {
        if (!paidSale || reported.current) return;

        reported.current = true;
        onPaid(paidSale);
    }, [paidSale, onPaid]);

    return (
        <div className="flex flex-col items-center gap-4 py-2">
            <div className="text-center">
                <p className="text-sm text-gray-500">To pay</p>
                <p className="text-3xl font-bold text-primary">
                    {formatCurrency(khqr.amount)}
                </p>
                {khqr.billNumber && (
                    <p className="mt-1 text-xs text-gray-400">
                        Bill {khqr.billNumber}
                    </p>
                )}
            </div>

            <div className="relative rounded-2xl border border-gray-200 bg-white p-3">
                {khqr.qrImage ? (
                    /* A data URI from the backend — not an external fetch. */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={khqr.qrImage}
                        alt="Scan to pay with KHQR"
                        className="h-56 w-56 object-contain"
                    />
                ) : (
                    <div className="flex h-56 w-56 flex-col items-center justify-center gap-2 text-center text-gray-400">
                        <QrCode className="h-10 w-10" aria-hidden="true" />
                        <p className="px-4 text-xs">
                            The code could not be displayed. Regenerate to try
                            again.
                        </p>
                    </div>
                )}

                {expired && (
                    <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/90">
                        <p className="text-sm font-bold text-brand-red">
                            Code expired
                        </p>
                    </div>
                )}
            </div>

            {/* One live line: what the terminal is doing right now. */}
            <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 text-sm"
            >
                {settled ? (
                    <>
                        <CircleCheck
                            className="h-4 w-4 text-primary"
                            aria-hidden="true"
                        />
                        <span className="font-semibold text-primary">
                            Payment received
                        </span>
                    </>
                ) : expired ? (
                    <span className="text-gray-500">
                        Ask the customer to try again with a new code.
                    </span>
                ) : (
                    <>
                        <Loader2
                            className="h-4 w-4 animate-spin text-gray-400"
                            aria-hidden="true"
                        />
                        <span className="text-gray-500">
                            Waiting for payment
                            {secondsLeft !== null && ` · ${format(secondsLeft)}`}
                        </span>
                    </>
                )}
            </div>

            <div className="flex w-full gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={settled}
                    className="flex-1 rounded-xl border border-brand-red py-3 text-sm font-bold text-brand-red transition-colors hover:bg-brand-red hover:text-white disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onRegenerate}
                    disabled={settled || isRegenerating}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                    <RefreshCw
                        className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
                        aria-hidden="true"
                    />
                    New code
                </button>
            </div>
        </div>
    );
}

/**
 * Seconds until the code expires, or `null` when it never does.
 *
 * The remaining time is computed while rendering rather than mirrored into
 * state — the tick only exists to schedule the next render, so the number on
 * screen is always derived from the clock rather than from a stale copy.
 */
function useCountdown(expiresAt: string | null) {
    const [, tick] = useState(0);

    useEffect(() => {
        if (!expiresAt) return;

        const id = setInterval(() => tick((n) => n + 1), 1000);

        return () => clearInterval(id);
    }, [expiresAt]);

    return remaining(expiresAt);
}

function remaining(expiresAt: string | null) {
    if (!expiresAt) return null;

    const end = new Date(expiresAt).getTime();

    if (Number.isNaN(end)) return null;

    return Math.max(0, Math.round((end - Date.now()) / 1000));
}

function format(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
