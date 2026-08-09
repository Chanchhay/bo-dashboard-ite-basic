"use client";

import { useState } from "react";
import { ArrowLeftRight, Boxes, Plus, Trash2 } from "lucide-react";

import { inventoryControlClassName } from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { Unit as ApiUnit } from "@/lib/api/inventory";
import { sampleUnits } from "@/lib/inventory-config/sample-data";
import {
    findUnit,
    formatAmount,
    validateConversion,
    type UomConversion,
} from "@/lib/inventory-config/units";

export type ItemUomDraft = {
    /** Empty until picked. Stock and thresholds are all expressed in this. */
    baseUnitId: string;
    conversions: UomConversion[];
};

export const emptyUomDraft: ItemUomDraft = {
    baseUnitId: "",
    conversions: [],
};

/**
 * Units of measure for one item, following the CartonCloud model: a **base unit
 * of measure** — the smallest sellable, pickable quantity — plus conversions
 * declared against it.
 *
 * Conversions live here rather than on the unit because they are only true of
 * this item: a sack of rice and a sack of flour are both sacks and do not weigh
 * the same. It also means packaging needs no separate concept — "sold by the
 * bottle, holds 750 ml" is just a conversion on an item based in millilitres.
 */
export function ItemUomCard({
    apiUnits,
    lowStockDefault,
    lowStockError,
    draft,
    onDraftChange,
}: {
    /** Units the live API knows about, used for the saved `unitId` field. */
    apiUnits: readonly ApiUnit[];
    lowStockDefault: number;
    lowStockError?: string;
    draft: ItemUomDraft;
    onDraftChange: (patch: Partial<ItemUomDraft>) => void;
}) {
    const { toast } = useToast();
    const units = sampleUnits;
    const [conversionDraft, setConversionDraft] = useState({
        unitId: "",
        factor: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const base = findUnit(units, draft.baseUnitId);
    const baseSymbol = base?.symbol ?? "";

    function addConversion() {
        if (!draft.baseUnitId) {
            toast({
                tone: "error",
                title: "Pick a base unit first",
                description: "Conversions are measured against it.",
            });
            return;
        }

        const found = validateConversion(
            conversionDraft,
            draft.baseUnitId,
            draft.conversions,
        );

        if (Object.keys(found).length) {
            setErrors(found);
            return;
        }

        onDraftChange({
            conversions: [
                ...draft.conversions,
                {
                    id: `c-${crypto.randomUUID().slice(0, 8)}`,
                    unitId: conversionDraft.unitId,
                    factor: Number(conversionDraft.factor),
                },
            ],
        });
        setConversionDraft({ unitId: "", factor: "" });
        setErrors({});
    }

    /** Fixes the inverted factor people type: 1/6 becomes 6. */
    function swapConversionDraft() {
        const factor = Number(conversionDraft.factor);

        if (Number.isFinite(factor) && factor > 0) {
            setConversionDraft((current) => ({
                ...current,
                factor: String(Math.round((1 / factor) * 1e6) / 1e6),
            }));
            setErrors({});
        }
    }


    return (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
            <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Boxes className="size-5" />
                </span>
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Units of measure
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Stock is counted in one unit. Conversions let you buy and
                        sell it in bigger ones without a second stock number.
                    </p>
                </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                    <Label
                        htmlFor="unitId"
                        className="text-sm font-semibold text-foreground"
                    >
                        Base unit of measure *
                    </Label>
                    <Select
                        name="unitId"
                        value={draft.baseUnitId || "__none"}
                        onValueChange={(value) =>
                            onDraftChange({
                                baseUnitId: value === "__none" ? "" : value || "",
                                // A different base makes every conversion below
                                // meaningless, so they go with it.
                                conversions: [],
                            })
                        }
                        items={{
                            __none: "No unit",
                            ...Object.fromEntries(
                                apiUnits.map((unit) => [
                                    unit.id,
                                    unit.name || "Unnamed unit",
                                ]),
                            ),
                        }}
                    >
                        <SelectTrigger
                            id="unitId"
                            className={`${inventoryControlClassName} w-full`}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none">No unit</SelectItem>
                            {units.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                    {unit.name} ({unit.symbol})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        The smallest quantity you sell — a can, a gram, a cup.
                        All stock is counted in this. Changing it clears the
                        conversions below.
                    </p>
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                    <Label
                        htmlFor="lowStockDefault"
                        className="text-sm font-semibold text-foreground"
                    >
                        Warn me below
                    </Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="lowStockDefault"
                            name="lowStockDefault"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={lowStockDefault}
                            aria-invalid={Boolean(lowStockError)}
                            className={`${inventoryControlClassName} flex-1`}
                        />
                        <span className="shrink-0 font-mono text-sm text-muted-foreground">
                            {baseSymbol || "—"}
                        </span>
                    </div>
                    {lowStockError ? (
                        <p className="text-xs text-danger" role="alert">
                            {lowStockError}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Leave at 0 and this item is only ever flagged once it
                            hits zero.
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                                Conversions
                            </h3>
                            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning">
                                Preview — not saved yet
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Bigger units this item can be received or sold in — a
                            six-pack, a case, a sack. Stock stays a single number
                            in the base unit; these just say what each one is
                            worth. Price them in Sale Management to sell them.
                        </p>
                    </div>
                </div>

                {draft.conversions.length ? (
                    <ul className="mt-4 flex flex-col gap-2">
                        {draft.conversions.map((conversion) => {
                            const unit = findUnit(units, conversion.unitId);

                            return (
                                <li
                                    key={conversion.id}
                                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-foreground">
                                            1 {unit?.name ?? "—"}
                                            <span className="mx-2 font-normal text-muted-foreground">
                                                =
                                            </span>
                                            {formatAmount(conversion.factor)}{" "}
                                            {base?.name ?? ""}
                                        </p>
                                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                            1 {unit?.symbol} ={" "}
                                            {formatAmount(conversion.factor)}{" "}
                                            {baseSymbol}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon-sm"
                                        aria-label={`Remove the ${unit?.name} conversion`}
                                        onClick={() =>
                                            onDraftChange({
                                                conversions:
                                                    draft.conversions.filter(
                                                        (row) =>
                                                            row.id !==
                                                            conversion.id,
                                                    ),
                                            })
                                        }
                                    >
                                        <Trash2 />
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                ) : null}

                <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <div className="flex min-w-0 flex-col gap-2">
                        <Label
                            htmlFor="conversion-unit"
                            className="text-xs font-semibold text-muted-foreground"
                        >
                            One of
                        </Label>
                        <Select
                            value={conversionDraft.unitId}
                            onValueChange={(value) =>
                                setConversionDraft((current) => ({
                                    ...current,
                                    unitId: value || "",
                                }))
                            }
                            items={Object.fromEntries(
                                units.map((unit) => [unit.id, unit.name]),
                            )}
                        >
                            <SelectTrigger
                                id="conversion-unit"
                                className={`${inventoryControlClassName} w-full`}
                            >
                                <SelectValue placeholder="Sack" />
                            </SelectTrigger>
                            <SelectContent>
                                {units
                                    .filter(
                                        (unit) => unit.id !== draft.baseUnitId,
                                    )
                                    .map((unit) => (
                                        <SelectItem
                                            key={unit.id}
                                            value={unit.id}
                                        >
                                            {unit.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex min-w-0 flex-col gap-2">
                        <Label
                            htmlFor="conversion-factor"
                            className="text-xs font-semibold text-muted-foreground"
                        >
                            Holds ({baseSymbol || "base units"})
                        </Label>
                        <Input
                            id="conversion-factor"
                            type="number"
                            min="0"
                            step="any"
                            value={conversionDraft.factor}
                            onChange={(event) =>
                                setConversionDraft((current) => ({
                                    ...current,
                                    factor: event.target.value,
                                }))
                            }
                            placeholder="25000"
                            className={inventoryControlClassName}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-lg"
                            aria-label="Swap the conversion direction"
                            title="I had it backwards"
                            onClick={swapConversionDraft}
                        >
                            <ArrowLeftRight />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={addConversion}
                        >
                            <Plus />
                            Add
                        </Button>
                    </div>
                </div>

                {errors.unitId || errors.factor ? (
                    <p className="mt-2 text-xs text-danger" role="alert">
                        {errors.unitId || errors.factor}
                    </p>
                ) : null}

            </div>

        </section>
    );
}
