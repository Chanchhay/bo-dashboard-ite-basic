"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useMoney } from "@/hooks/useMoney";
import type { RegisterSession } from "@/lib/api/pos-session";
import { cn } from "@/lib/utils";
import { useGetRegisterSessionsQuery } from "@/services/registerSessionApi";

const pageSizes = [10, 20, 50];

/**
 * When a shift ran, in the reader's own time.
 *
 * The backend sends an instant; a cashier reconciling a drawer thinks in the
 * clock on the wall, so it is rendered in the browser's zone rather than UTC.
 */
function when(value: string | null) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Whether the drawer counted true, said in words rather than only in colour.
 *
 * Over and short are the two outcomes that matter and the two a red-green
 * reader cannot separate by hue alone, so each carries its own word and the
 * amount carries a sign.
 */
function Reconciliation({
    session,
    format,
}: {
    session: RegisterSession;
    format: (value: number) => string;
}) {
    if (session.status === "OPEN") {
        return <span className="text-muted-foreground">Still open</span>;
    }

    const difference = session.differenceAmount ?? 0;

    if (difference === 0) {
        return <span className="text-success">Balanced</span>;
    }

    const over = difference > 0;

    return (
        <span className={over ? "text-warning" : "text-danger"}>
            {over ? "Over " : "Short "}
            <span className="tabular-nums">{format(Math.abs(difference))}</span>
        </span>
    );
}

/**
 * The business's register sessions, a page at a time.
 *
 * Paged against the server rather than filtered in the browser: the history
 * grows by a session every trading day, and the point of the backend paging
 * this endpoint is lost if the screen asks for all of it and slices locally.
 */
export function SessionHistory() {
    const { format } = useMoney();
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);

    const sessionsQuery = useGetRegisterSessionsQuery({ page, size });

    if (sessionsQuery.isLoading) {
        return <InventoryLoading label="Reading your session history" />;
    }

    if (sessionsQuery.error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    sessionsQuery.error,
                    "Unable to read your session history.",
                )}
                retry={sessionsQuery.refetch}
            />
        );
    }

    const sessions = sessionsQuery.data?.content ?? [];
    const totalElements = sessionsQuery.data?.totalElements ?? 0;
    const totalPages = sessionsQuery.data?.totalPages ?? 1;
    const firstIndex = page * size;

    if (totalElements === 0) {
        return (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
                <p className="font-semibold text-foreground">
                    No register sessions yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Open the till and the shift will be recorded here.
                </p>
            </div>
        );
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="min-w-40">Opened</TableHead>
                            <TableHead className="hidden min-w-40 sm:table-cell">
                                Closed
                            </TableHead>
                            <TableHead className="min-w-36">Cashier</TableHead>
                            <TableHead className="hidden text-right lg:table-cell">
                                Orders
                            </TableHead>
                            <TableHead className="hidden text-right md:table-cell">
                                Opening
                            </TableHead>
                            <TableHead className="text-right">
                                Cash sales
                            </TableHead>
                            <TableHead className="hidden text-right md:table-cell">
                                Expected
                            </TableHead>
                            <TableHead className="text-right">
                                Counted
                            </TableHead>
                            <TableHead className="min-w-32">Result</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {sessions.map((session) => (
                            <TableRow key={session.id}>
                                <TableCell className="font-medium">
                                    {when(session.openedAt)}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                    {when(session.closedAt)}
                                </TableCell>
                                <TableCell>
                                    {session.cashierName || "—"}
                                </TableCell>
                                <TableCell className="hidden text-right tabular-nums lg:table-cell">
                                    {session.orderCount ?? 0}
                                </TableCell>
                                <TableCell className="hidden text-right tabular-nums md:table-cell">
                                    {format(
                                        session.openingBalance,
                                        session.currency ?? undefined,
                                    )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {format(
                                        session.totalCashSales,
                                        session.currency ?? undefined,
                                    )}
                                </TableCell>
                                <TableCell className="hidden text-right tabular-nums md:table-cell">
                                    {format(
                                        session.expectedAmount,
                                        session.currency ?? undefined,
                                    )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {session.actualAmount === null
                                        ? "—"
                                        : format(
                                              session.actualAmount,
                                              session.currency ?? undefined,
                                          )}
                                </TableCell>
                                <TableCell className="font-semibold">
                                    <Reconciliation
                                        session={session}
                                        format={(value) =>
                                            format(
                                                value,
                                                session.currency ?? undefined,
                                            )
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div
                className={cn(
                    "flex flex-col gap-3 border-t border-border px-5 py-4",
                    "sm:flex-row sm:items-center sm:justify-between",
                )}
            >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Rows per page</span>
                    <SelectField
                        id="sessions-page-size"
                        name="sessions-page-size"
                        value={String(size)}
                        onValueChange={(value) => {
                            // Back to the first page: page 3 of 20-row pages
                            // is not page 3 of 50-row pages, and keeping the
                            // index would silently skip rows.
                            setSize(Number(value));
                            setPage(0);
                        }}
                        options={pageSizes.map((option) => ({
                            value: String(option),
                            label: String(option),
                        }))}
                        className="h-9 w-20 rounded-xl"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                        {firstIndex + 1}–{firstIndex + sessions.length} of{" "}
                        {totalElements}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Previous page"
                            disabled={page <= 0 || sessionsQuery.isFetching}
                            onClick={() =>
                                setPage((current) => Math.max(0, current - 1))
                            }
                        >
                            <ChevronLeft />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Next page"
                            disabled={
                                page >= totalPages - 1 ||
                                sessionsQuery.isFetching
                            }
                            onClick={() => setPage((current) => current + 1)}
                        >
                            <ChevronRight />
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
