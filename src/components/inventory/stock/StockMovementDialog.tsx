"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

import { inventoryControlClassName } from "@/components/inventory/InventoryUi";
import type {
    DraftMovement,
    StockTargetKind,
} from "@/components/inventory/stock/stock-draft";
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
import { formatAmount } from "@/lib/inventory-config/units";

/** One way of entering a quantity: the base unit, or a conversion off it. */
export type EntryUnit = {
    id: string;
    label: string;
    /** How many base units one of these is worth. The base unit itself is 1. */
    factor: number;
};

export type MovementTarget = {
    kind: StockTargetKind;
    id: string;
    name: string;
    onHand: number;
    baseUnitLabel: string;
    /** Base unit first, then any conversions the target declares. */
    entryUnits: EntryUnit[];
};

export function StockMovementDialog({
    open,
    onOpenChange,
    target,
    direction,
    onRecord,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    target: MovementTarget | null;
    direction: "IN" | "OUT";
    onRecord: (movement: DraftMovement) => void;
}) {
    const [quantity, setQuantity] = useState("");
    const [unitId, setUnitId] = useState("");
    const [unitCost, setUnitCost] = useState("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    // Reseeded on the way in rather than in an effect, so a cancelled entry
    // cannot leak into the next one.
    const [seededFor, setSeededFor] = useState<string | null>(null);
    const seedKey = open && target ? `${target.id}-${direction}` : null;

    if (seedKey !== seededFor) {
        setSeededFor(seedKey);

        if (open && target) {
            setQuantity("");
            setUnitId(target.entryUnits[0]?.id ?? "");
            setUnitCost("");
            setReason("");
            setError("");
        }
    }

    if (!target) return null;

    const isIn = direction === "IN";
    const unit =
        target.entryUnits.find((entry) => entry.id === unitId) ??
        target.entryUnits[0];
    const typed = Number(quantity);
    const valid = quantity.trim() !== "" && Number.isFinite(typed) && typed > 0;
    // Everything is stored in base units; the chosen unit is only how it was
    // typed. This is where a conversion earns its keep.
    const baseQuantity = valid ? typed * (unit?.factor ?? 1) : 0;
    const resulting = target.onHand + (isIn ? baseQuantity : -baseQuantity);
    const showsConversion = valid && (unit?.factor ?? 1) !== 1;

    function handleRecord() {
        if (!valid) {
            setError("Enter a quantity greater than zero.");
            return;
        }

        if (!isIn && resulting < 0) {
            setError(
                `Only ${formatAmount(target!.onHand)} ${target!.baseUnitLabel} on hand — this would go below zero.`,
            );
            return;
        }

        const cost = unitCost.trim() === "" ? undefined : Number(unitCost);

        if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) {
            setError("Unit cost cannot be negative.");
            return;
        }

        onRecord({
            id: `m-${crypto.randomUUID().slice(0, 8)}`,
            targetKind: target!.kind,
            targetId: target!.id,
            targetName: target!.name,
            direction,
            enteredQuantity: typed,
            enteredUnitLabel: unit?.label ?? target!.baseUnitLabel,
            baseQuantity,
            baseUnitLabel: target!.baseUnitLabel,
            ...(cost === undefined ? {} : { unitCost: cost }),
            reason: reason.trim(),
            at: new Date().toISOString(),
        });
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div
                        className={`mb-3 grid size-11 place-items-center rounded-full ${
                            isIn
                                ? "bg-success/10 text-success"
                                : "bg-warning/15 text-warning"
                        }`}
                    >
                        {isIn ? (
                            <ArrowDownToLine className="size-5" />
                        ) : (
                            <ArrowUpFromLine className="size-5" />
                        )}
                    </div>
                    <DialogTitle>
                        {isIn ? "Stock in" : "Stock out"} — {target.name}
                    </DialogTitle>
                    <DialogDescription>
                        {isIn
                            ? "Receiving stock. Record what arrived and what it cost."
                            : "Removing stock — wastage, transfer, or a count correction."}
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
                        <span className="text-muted-foreground">On hand</span>
                        <span className="font-semibold text-foreground">
                            {formatAmount(target.onHand)}{" "}
                            <span className="font-normal text-muted-foreground">
                                {target.baseUnitLabel}
                            </span>
                        </span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="movement-quantity">Quantity *</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="movement-quantity"
                                type="number"
                                min="0"
                                step="any"
                                autoFocus
                                value={quantity}
                                onChange={(event) => {
                                    setQuantity(event.target.value);
                                    setError("");
                                }}
                                placeholder="10"
                                aria-invalid={Boolean(error)}
                                className={`${inventoryControlClassName} flex-1`}
                            />
                            {target.entryUnits.length > 1 ? (
                                <Select
                                    value={unitId}
                                    onValueChange={(value) =>
                                        setUnitId(value || unitId)
                                    }
                                    items={Object.fromEntries(
                                        target.entryUnits.map((entry) => [
                                            entry.id,
                                            entry.label,
                                        ]),
                                    )}
                                >
                                    <SelectTrigger
                                        aria-label="Unit"
                                        className={`${inventoryControlClassName} w-36 shrink-0`}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {target.entryUnits.map((entry) => (
                                            <SelectItem
                                                key={entry.id}
                                                value={entry.id}
                                            >
                                                {entry.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <span className="shrink-0 text-sm text-muted-foreground">
                                    {target.baseUnitLabel}
                                </span>
                            )}
                        </div>
                        {showsConversion ? (
                            <p className="text-xs text-muted-foreground">
                                {formatAmount(typed)} {unit?.label} ={" "}
                                {formatAmount(baseQuantity)}{" "}
                                {target.baseUnitLabel}
                            </p>
                        ) : null}
                    </div>

                    {isIn ? (
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="movement-cost">
                                Cost per {target.baseUnitLabel || "unit"}
                            </Label>
                            <Input
                                id="movement-cost"
                                type="number"
                                min="0"
                                step="0.01"
                                value={unitCost}
                                onChange={(event) => {
                                    setUnitCost(event.target.value);
                                    setError("");
                                }}
                                placeholder="0.00"
                                className={inventoryControlClassName}
                            />
                            <p className="text-xs text-muted-foreground">
                                Optional. This is what stock value is calculated
                                from.
                            </p>
                        </div>
                    ) : null}

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="movement-reason">Reason</Label>
                        <Input
                            id="movement-reason"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder={
                                isIn
                                    ? "Delivery from supplier"
                                    : "Spillage, transfer, cycle count"
                            }
                            className={inventoryControlClassName}
                        />
                    </div>

                    <div
                        className={`rounded-xl border px-4 py-3 text-sm ${
                            resulting < 0
                                ? "border-danger/30 bg-danger/10 text-danger"
                                : "border-border bg-muted/40 text-foreground"
                        }`}
                        aria-live="polite"
                    >
                        <span className="text-muted-foreground">
                            After this movement
                        </span>
                        <p className="mt-0.5 text-lg font-semibold">
                            {formatAmount(resulting)}{" "}
                            <span className="text-sm font-normal text-muted-foreground">
                                {target.baseUnitLabel}
                            </span>
                        </p>
                    </div>

                    {error ? (
                        <p className="text-xs text-danger" role="alert">
                            {error}
                        </p>
                    ) : null}
                </div>

                <DialogFooter className="mt-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleRecord}>
                        {isIn ? "Record stock in" : "Record stock out"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
