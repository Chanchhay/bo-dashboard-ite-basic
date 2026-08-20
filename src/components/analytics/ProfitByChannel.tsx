"use client";

import { useState } from "react";
import { Globe, MessageSquare, Send, ShoppingBag, Store } from "lucide-react";

import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import { controlClassName } from "@/components/ui/form-controls";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useMoney } from "@/hooks/useMoney";
import {
    profitRanges,
    profitRangeStart,
    toLocalDateTime,
    type ChannelProfit,
    type ProfitRange,
} from "@/lib/api/sales-report";
import { cn } from "@/lib/utils";
import { useGetSalesProfitQuery } from "@/services/salesReportApi";

const channelIcons: Record<string, React.ElementType> = {
    POS: Store,
    WEB: Globe,
    TELEGRAM: Send,
    MESSENGER: MessageSquare,
};

const channelNames: Record<string, string> = {
    POS: "Point of Sale",
    WEB: "Online Store",
    TELEGRAM: "Telegram",
    MESSENGER: "Messenger",
};

/**
 * Whether a figure is money kept or money lost, said in words as well as red.
 *
 * Red and green are the two colours a red-green colourblind reader cannot tell
 * apart — measured at ΔE 2.1 for deutan, which is nothing. Profit therefore
 * carries an explicit sign and, where there is room, a word: the colour is a
 * second opinion, never the only one.
 */
function Money({
    amount,
    format,
    signed,
    className,
}: {
    amount: number;
    format: (value: number) => string;
    /** Set on figures that can go either way, such as profit. */
    signed?: boolean;
    className?: string;
}) {
    const negative = amount < 0;

    return (
        <span
            className={cn(
                "font-semibold tabular-nums",
                signed
                    ? negative
                        ? "text-danger"
                        : "text-success"
                    : "text-foreground",
                className,
            )}
        >
            {signed && negative ? "−" : null}
            {format(Math.abs(amount))}
        </span>
    );
}

/** A headline figure. No plot, so no hover layer — it is one number. */
function StatTile({
    label,
    children,
    hint,
}: {
    label: string;
    children: React.ReactNode;
    hint?: string;
}) {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
            </p>
            <p className="mt-1.5 text-2xl leading-tight">{children}</p>
            {hint ? (
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    );
}

/**
 * How big this channel's profit is against the best one.
 *
 * A single hue, because the bar encodes magnitude and nothing else — the row
 * already says which channel it is, so the colour carries no identity and
 * there is no palette to tell apart. A loss is drawn from the same baseline in
 * the status colour, with the figure beside it carrying the sign.
 */
function ProfitBar({ value, peak }: { value: number; peak: number }) {
    const width = peak > 0 ? Math.min(100, (Math.abs(value) / peak) * 100) : 0;

    return (
        <span
            aria-hidden
            className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
            <span
                className={cn(
                    "h-full rounded-full",
                    value < 0 ? "bg-danger" : "bg-primary",
                )}
                style={{ width: `${width}%` }}
            />
        </span>
    );
}

export function ProfitByChannel() {
    const { format } = useMoney();
    const [range, setRange] = useState<ProfitRange>("MONTH");

    const start = profitRangeStart(range);
    const profitQuery = useGetSalesProfitQuery({
        ...(start ? { from: toLocalDateTime(start) } : {}),
    });

    if (profitQuery.isLoading) {
        return <InventoryLoading label="Working out your profit" />;
    }

    if (profitQuery.error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    profitQuery.error,
                    "Unable to work out your profit.",
                )}
                retry={profitQuery.refetch}
            />
        );
    }

    const channels = profitQuery.data?.channels ?? [];
    const total: ChannelProfit | undefined = profitQuery.data?.total;
    const peak = Math.max(0, ...channels.map((row) => Math.abs(row.profit)));
    const nothingSold = !total || total.sales === 0;

    return (
        <div className="flex flex-col gap-4">
            {/* One row of controls above the figures, as a filter bar should be. */}
            <div className="flex flex-wrap items-center gap-3">
                <div data-tour="profit-range-select" className="w-44">
                    <Select
                        value={range}
                        items={profitRanges}
                        onValueChange={(value) =>
                            setRange((value || "MONTH") as ProfitRange)
                        }
                    >
                        <SelectTrigger
                            size="sm"
                            aria-label="Period"
                            className={cn(
                                controlClassName,
                                "!h-10 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold",
                            )}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(profitRanges).map(
                                ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <p className="text-xs text-muted-foreground sm:text-sm">
                    Cost is what the stock actually cost, batch by batch, as
                    recorded at each sale.
                </p>
            </div>

            {nothingSold ? (
                <div className="rounded-2xl border border-border bg-card p-10 text-center">
                    <p className="font-semibold text-foreground">
                        Nothing sold in this period
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Take a sale on any channel and it will show up here.
                    </p>
                </div>
            ) : (
                <>
                    <div data-tour="profit-kpi-grid" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatTile
                            label="Revenue"
                            hint={`${total.sales} sale${total.sales === 1 ? "" : "s"} · ${total.itemsSold} item${total.itemsSold === 1 ? "" : "s"}`}
                        >
                            <Money amount={total.revenue} format={format} />
                        </StatTile>

                        <StatTile
                            label="Cost of goods"
                            hint="What those units cost you"
                        >
                            <Money amount={total.cost} format={format} />
                        </StatTile>

                        <StatTile
                            label="Profit"
                            hint={
                                total.profit < 0
                                    ? "Sold below cost over this period"
                                    : "Revenue less what the stock cost"
                            }
                        >
                            <Money
                                amount={total.profit}
                                format={format}
                                signed
                            />
                        </StatTile>

                        <StatTile
                            label="Margin"
                            hint={
                                total.discounts > 0
                                    ? `After ${format(total.discounts)} of discounts`
                                    : "No discounts given"
                            }
                        >
                            <span
                                className={cn(
                                    "font-semibold tabular-nums",
                                    total.marginPercent === null
                                        ? "text-muted-foreground"
                                        : total.marginPercent < 0
                                          ? "text-danger"
                                          : "text-success",
                                )}
                            >
                                {total.marginPercent === null
                                    ? "—"
                                    : `${total.marginPercent}%`}
                            </span>
                        </StatTile>
                    </div>

                    <section data-tour="profit-channel-breakdown" className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                        <div className="border-b border-border p-4 sm:px-5">
                            <h2 className="text-base font-semibold text-foreground">
                                Where it came from
                            </h2>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="min-w-44">
                                            Channel
                                        </TableHead>
                                        <TableHead className="hidden text-right lg:table-cell">
                                            Sales
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Revenue
                                        </TableHead>
                                        <TableHead className="hidden text-right sm:table-cell">
                                            Cost
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Profit
                                        </TableHead>
                                        <TableHead className="w-28 text-right">
                                            Margin
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {channels.map((row) => {
                                        const code = row.channel ?? "";
                                        const Icon =
                                            channelIcons[code] ?? ShoppingBag;

                                        return (
                                            <TableRow key={code}>
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                                            <Icon className="size-4" />
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {channelNames[
                                                                    code
                                                                ] ??
                                                                    code ??
                                                                    "Unknown"}
                                                            </p>
                                                            <span className="mt-1.5 block max-w-40">
                                                                <ProfitBar
                                                                    value={
                                                                        row.profit
                                                                    }
                                                                    peak={peak}
                                                                />
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="hidden text-right text-sm text-muted-foreground tabular-nums lg:table-cell">
                                                    {row.sales}
                                                </TableCell>

                                                <TableCell className="text-right text-sm">
                                                    <Money
                                                        amount={row.revenue}
                                                        format={format}
                                                    />
                                                </TableCell>

                                                <TableCell className="hidden text-right text-sm text-muted-foreground tabular-nums sm:table-cell">
                                                    {format(row.cost)}
                                                </TableCell>

                                                <TableCell className="text-right text-sm">
                                                    <Money
                                                        amount={row.profit}
                                                        format={format}
                                                        signed
                                                    />
                                                </TableCell>

                                                <TableCell className="text-right text-sm">
                                                    <span
                                                        className={cn(
                                                            "font-semibold tabular-nums",
                                                            row.marginPercent ===
                                                                null
                                                                ? "text-muted-foreground"
                                                                : row.marginPercent <
                                                                    0
                                                                  ? "text-danger"
                                                                  : "text-success",
                                                        )}
                                                    >
                                                        {row.marginPercent ===
                                                        null
                                                            ? "—"
                                                            : `${row.marginPercent}%`}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
