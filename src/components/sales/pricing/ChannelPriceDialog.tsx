"use client";

import { Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { controlClassName } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { InventoryItem } from "@/lib/api/inventory";
import {
    describeOverride,
    effectivePrice,
    overrideKindLabels,
    overrideKinds,
    type OverrideKind,
    type PriceOverride,
} from "@/lib/sale-pricing/pricing";
import {
    toOverride,
    type DraftOverride,
    type SoldLine,
} from "@/components/sales/pricing/channel-lines";

/**
 * Where one item's price on this channel parts ways with the business price.
 *
 * Every line the item sells as is listed, because the question being asked is
 * per line — a case can be discounted on delivery while a single is not. A
 * line with no exception charges the business price, so the form opens saying
 * nothing rather than pre-filling rules nobody asked for.
 *
 * A form on its own rather than a table in a list: an item can carry a dozen
 * of these lines, and opened one at a time the prices being changed are the
 * only prices on screen.
 */
export function ChannelPriceDialog({
    item,
    lines,
    overrides,
    globalRule,
    globalKind,
    channelName,
    editingKeys,
    open,
    format,
    onOpenChange,
    onSetOverride,
    onToggleEditing,
}: {
    item: InventoryItem;
    lines: SoldLine[];
    overrides: Record<string, DraftOverride>;
    /** The rule every line starts from, unless it has one of its own. */
    globalRule?: PriceOverride;
    globalKind: OverrideKind;
    channelName?: string;
    /** Lines whose rule controls are showing but that carry no exception yet. */
    editingKeys: Set<string>;
    open: boolean;
    format: (value: number) => string;
    onOpenChange: (open: boolean) => void;
    onSetOverride: (line: SoldLine, kind: OverrideKind, raw: string) => void;
    onToggleEditing: (key: string) => void;
}) {
    const changed = lines.filter(
        (line) =>
            overrides[line.key]?.kind && overrides[line.key].kind !== "INHERIT",
    ).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl gap-4">
                <DialogHeader>
                    <DialogTitle className="flex flex-wrap items-center gap-2">
                        {item.name || "Unnamed item"}
                        {item.sku ? (
                            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-normal text-muted-foreground">
                                {item.sku}
                            </span>
                        ) : null}
                        {changed ? (
                            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
                                {changed} override{changed === 1 ? "" : "s"}
                            </span>
                        ) : null}
                    </DialogTitle>
                    <DialogDescription>
                        What {channelName || "this channel"} charges for this
                        item. A line with no override follows your normal price,
                        so raising it in Set Price raises it here too.
                    </DialogDescription>
                </DialogHeader>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-160 text-left text-sm">
                        <thead className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            <tr>
                                <th className="pr-4 pb-2">Sold as</th>
                                <th className="pr-4 pb-2">Sell Price</th>
                                <th className="pr-4 pb-2">Sells for</th>
                                <th className="pb-2 text-right">
                                    Pricing Rule &amp; Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {lines.map((line) => {
                                const override = overrides[line.key];
                                const kind = override?.kind ?? "INHERIT";
                                const rule = override
                                    ? toOverride(override.kind, override.value)
                                    : undefined;
                                const editing =
                                    editingKeys.has(line.key) ||
                                    kind !== "INHERIT";
                                const charged = effectivePrice(
                                    line.base,
                                    rule,
                                    globalRule,
                                );

                                // An unpriced line is not sold — unless it
                                // still carries an exception, which has to
                                // stay reachable or it could never be taken
                                // off again.
                                if (line.base === undefined && kind === "INHERIT") {
                                    return (
                                        <tr key={line.key}>
                                            <td className="py-2.5 pr-4 font-medium text-muted-foreground">
                                                {line.label}
                                            </td>
                                            <td
                                                colSpan={3}
                                                className="py-2.5 text-xs text-muted-foreground"
                                            >
                                                No base price — not sold
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr key={line.key}>
                                        <td className="py-2.5 pr-4 font-medium text-foreground">
                                            {line.label}
                                        </td>
                                        <td className="py-2.5 pr-4 text-muted-foreground">
                                            {line.base === undefined
                                                ? "—"
                                                : format(line.base)}
                                        </td>
                                        <td className="py-2.5 pr-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-bold text-foreground">
                                                    {charged === undefined
                                                        ? "—"
                                                        : format(charged)}
                                                </span>
                                                {kind !== "INHERIT" ? (
                                                    <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                                                        Item override (
                                                        {describeOverride(rule)})
                                                    </span>
                                                ) : globalKind !== "INHERIT" ? (
                                                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                                        Global (
                                                        {describeOverride(
                                                            globalRule,
                                                        )}
                                                        )
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                                        Same as base
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-2.5 text-right">
                                            {editing ? (
                                                <div className="flex items-center justify-end gap-2.5">
                                                    <Select
                                                        value={kind}
                                                        onValueChange={(value) =>
                                                            onSetOverride(
                                                                line,
                                                                (value ||
                                                                    "INHERIT") as OverrideKind,
                                                                override?.value ??
                                                                    "",
                                                            )
                                                        }
                                                        items={overrideKindLabels}
                                                    >
                                                        <SelectTrigger
                                                            size="sm"
                                                            aria-label={`${line.label} price rule`}
                                                            className={`${controlClassName} !h-10 w-44 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold shadow-2xs hover:border-primary/40`}
                                                        >
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {overrideKinds.map(
                                                                (option) => (
                                                                    <SelectItem
                                                                        key={option}
                                                                        value={option}
                                                                    >
                                                                        {
                                                                            overrideKindLabels[
                                                                                option
                                                                            ]
                                                                        }
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>

                                                    {kind !== "INHERIT" ? (
                                                        <div className="relative flex items-center">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={
                                                                    override?.value ??
                                                                    ""
                                                                }
                                                                placeholder="0"
                                                                aria-label={`${line.label} rule amount`}
                                                                onChange={(event) =>
                                                                    onSetOverride(
                                                                        line,
                                                                        kind,
                                                                        event.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className={`${controlClassName} !h-10 w-28 rounded-xl bg-card pr-7 pl-3.5 text-sm font-semibold shadow-2xs`}
                                                            />
                                                            <span className="pointer-events-none absolute right-2.5 text-xs font-bold text-muted-foreground">
                                                                {kind ===
                                                                "MARKUP_PERCENT"
                                                                    ? "%"
                                                                    : "$"}
                                                            </span>
                                                        </div>
                                                    ) : null}

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        title="Reset to channel default"
                                                        aria-label={`Reset ${line.label} to the channel default`}
                                                        onClick={() =>
                                                            onSetOverride(
                                                                line,
                                                                "INHERIT",
                                                                "",
                                                            )
                                                        }
                                                        className="!size-10 rounded-xl p-0"
                                                    >
                                                        <RotateCcw className="size-4 text-muted-foreground hover:text-destructive" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        onToggleEditing(line.key)
                                                    }
                                                    className="!h-10 gap-1.5 rounded-xl px-3.5 text-sm font-semibold"
                                                >
                                                    <Plus className="size-4" />
                                                    Add Override
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <DialogFooter>
                    {/* Nothing is saved per item here: the channel is saved as
                        a piece, from the bar on the rule card. */}
                    <span className="mr-auto text-xs text-muted-foreground">
                        Changes are kept until you save the channel.
                    </span>
                    <Button type="button" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
