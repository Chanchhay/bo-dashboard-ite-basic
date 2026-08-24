"use client";

import { useState } from "react";
import {
    AlertTriangle,
    ArrowUpRight,
    Plus,
    Trash2,
} from "lucide-react";

import { inventoryControlClassName } from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import type { AddOn } from "@/lib/inventory-config/types";
import {
    findUnit,
    formatAmount,
    validateConversion,
    type Unit,
    type UomConversion,
} from "@/lib/inventory-config/units";

type AddOnDraft = {
    name: string;
    baseUnitId: string;
    usePerOrder: string;
    conversions: UomConversion[];
};

function toDraft(addOn: AddOn | undefined, fallbackUnitId: string): AddOnDraft {
    return {
        name: addOn?.name ?? "",
        baseUnitId: addOn?.baseUnitId ?? fallbackUnitId,
        usePerOrder: addOn ? String(addOn.usePerOrder) : "1",
        conversions: addOn?.conversions ?? [],
    };
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <fieldset className="flex flex-col gap-3">
            <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {title}
            </legend>
            {children}
        </fieldset>
    );
}

export function AddOnDialog({
    open,
    onOpenChange,
    addOn,
    units,
    usedByItems = 0,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Absent when creating. */
    addOn?: AddOn;
    units: readonly Unit[];
    usedByItems?: number;
    onSave: (addOn: AddOn) => void;
}) {
    const { toast } = useToast();
    const fallbackUnitId = units[0]?.id ?? "";
    const [draft, setDraft] = useState<AddOnDraft>(() =>
        toDraft(addOn, fallbackUnitId),
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [seededFor, setSeededFor] = useState<string | null>(null);
    const seedKey = open ? (addOn?.id ?? "new") : null;

    if (seedKey !== seededFor) {
        setSeededFor(seedKey);

        if (open) {
            setDraft(toDraft(addOn, fallbackUnitId));
            setErrors({});
        }
    }

    const isEditing = Boolean(addOn);
    const symbol = findUnit(units, draft.baseUnitId)?.symbol ?? "";
    const [conversionDraft, setConversionDraft] = useState({
        unitId: "",
        factor: "",
    });

    function updateDraft(patch: Partial<AddOnDraft>) {
        setDraft((current) => ({ ...current, ...patch }));
        setErrors((current) => {
            const touched = Object.keys(patch);
            if (!touched.some((key) => current[key])) return current;

            const next = { ...current };
            for (const key of touched) delete next[key];
            return next;
        });
    }

    function addConversion() {
        const found = validateConversion(
            conversionDraft,
            draft.baseUnitId,
            draft.conversions,
        );

        if (Object.keys(found).length) {
            setErrors({ conversion: Object.values(found)[0] });
            return;
        }

        updateDraft({
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

    function handleSave() {
        const found: Record<string, string> = {};
        const name = draft.name.trim();

        if (!name) {
            found.name = "Name is required.";
        } else if (name.length > 150) {
            found.name = "Name must be 150 characters or fewer.";
        }

        if (!draft.baseUnitId) {
            found.baseUnitId = "Choose a base unit.";
        }

        const usePerOrder = Number(draft.usePerOrder);
        if (!Number.isFinite(usePerOrder) || usePerOrder <= 0) {
            found.usePerOrder = "Must be greater than zero.";
        }

        if (Object.keys(found).length) {
            setErrors(found);
            toast({
                tone: "error",
                title: "Check the highlighted fields",
                description: Object.values(found)[0],
            });
            return;
        }

        onSave({
            id: addOn?.id ?? `a-${crypto.randomUUID().slice(0, 8)}`,
            name,
            baseUnitId: draft.baseUnitId,
            usePerOrder,
            conversions: draft.conversions,
        });
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? addOn?.name : "New add-on"}
                    </DialogTitle>
                    <DialogDescription>
                        An extra piled on top of an item — never scanned, never
                        sold on its own.
                    </DialogDescription>
                </DialogHeader>

                {isEditing && usedByItems > 0 ? (
                    <p
                        className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-xs text-warning"
                        role="status"
                    >
                        <AlertTriangle className="mt-px size-4 shrink-0" />
                        Used by {usedByItems}{" "}
                        {usedByItems === 1 ? "item" : "items"} — changes apply to
                        all of them.
                    </p>
                ) : null}

                <div className="mt-5 flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="addon-name">Name *</Label>
                        <Input
                            id="addon-name"
                            value={draft.name}
                            onChange={(event) =>
                                updateDraft({ name: event.target.value })
                            }
                            placeholder="Pearls"
                            aria-invalid={Boolean(errors.name)}
                            className={inventoryControlClassName}
                        />
                        {errors.name ? (
                            <p className="text-xs text-danger" role="alert">
                                {errors.name}
                            </p>
                        ) : null}
                    </div>

                    <Section title="Units of measure">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="addon-unit">
                                Base unit of measure *
                            </Label>
                            <Select
                                value={draft.baseUnitId}
                                onValueChange={(value) =>
                                    updateDraft({
                                        baseUnitId: value || "",
                                        conversions: [],
                                    })
                                }
                                items={Object.fromEntries(
                                    units.map((candidate) => [
                                        candidate.id,
                                        candidate.name,
                                    ]),
                                )}
                            >
                                <SelectTrigger
                                    id="addon-unit"
                                    className={`${inventoryControlClassName} w-full`}
                                >
                                    <SelectValue placeholder="Choose a unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((candidate) => (
                                        <SelectItem
                                            key={candidate.id}
                                            value={candidate.id}
                                        >
                                            {candidate.name} ({candidate.symbol})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {errors.baseUnitId ||
                                    "The smallest quantity this is used in. Stock is counted in it."}
                            </p>
                        </div>

                        {draft.conversions.length ? (
                            <ul className="flex flex-col gap-2">
                                {draft.conversions.map((conversion) => (
                                    <li
                                        key={conversion.id}
                                        className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5"
                                    >
                                        <p className="min-w-0 flex-1 font-mono text-sm text-foreground">
                                            1{" "}
                                            {findUnit(units, conversion.unitId)
                                                ?.symbol ?? "—"}{" "}
                                            = {formatAmount(conversion.factor)}{" "}
                                            {symbol}
                                        </p>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon-sm"
                                            aria-label="Remove this conversion"
                                            onClick={() =>
                                                updateDraft({
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
                                ))}
                            </ul>
                        ) : null}

                        <div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
                            <div className="flex min-w-0 flex-col gap-2">
                                <Label
                                    htmlFor="addon-conv-unit"
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
                                        units.map((candidate) => [
                                            candidate.id,
                                            candidate.name,
                                        ]),
                                    )}
                                >
                                    <SelectTrigger
                                        id="addon-conv-unit"
                                        className={`${inventoryControlClassName} w-full`}
                                    >
                                        <SelectValue placeholder="Bag" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units
                                            .filter(
                                                (candidate) =>
                                                    candidate.id !==
                                                    draft.baseUnitId,
                                            )
                                            .map((candidate) => (
                                                <SelectItem
                                                    key={candidate.id}
                                                    value={candidate.id}
                                                >
                                                    {candidate.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex min-w-0 flex-col gap-2">
                                <Label
                                    htmlFor="addon-conv-factor"
                                    className="text-xs font-semibold text-muted-foreground"
                                >
                                    Holds ({symbol || "base"})
                                </Label>
                                <Input
                                    id="addon-conv-factor"
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
                                    placeholder="3000"
                                    className={inventoryControlClassName}
                                />
                            </div>
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
                        <p className="text-xs text-muted-foreground">
                            {errors.conversion ||
                                "Optional. How this arrives from your supplier — one bag holds 3000 g."}
                        </p>
                    </Section>

                    <Section title="Usage">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="addon-use">
                                    One order uses *
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="addon-use"
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={draft.usePerOrder}
                                        onChange={(event) =>
                                            updateDraft({
                                                usePerOrder: event.target.value,
                                            })
                                        }
                                        aria-invalid={Boolean(
                                            errors.usePerOrder,
                                        )}
                                        className={`${inventoryControlClassName} flex-1`}
                                    />
                                    <span className="shrink-0 font-mono text-sm text-muted-foreground">
                                        {symbol || "—"}
                                    </span>
                                </div>
                                {errors.usePerOrder ? (
                                    <p
                                        className="text-xs text-danger"
                                        role="alert"
                                    >
                                        {errors.usePerOrder}
                                    </p>
                                ) : null}
                            </div>

                        </div>
                        <p className="text-xs text-muted-foreground">
                            {`How much one selection uses. Leave at 1 for things counted one at a time${
                                symbol ? `, or set 30 ${symbol} for a scoop` : ""
                            }.`}
                        </p>
                    </Section>

                    <Section title="Pricing">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                                Priced per channel in Sale Management.
                            </p>
                            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                        </div>
                    </Section>
                </div>

                <DialogFooter className="mt-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSave}>
                        {isEditing ? "Save add-on" : "Create add-on"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
