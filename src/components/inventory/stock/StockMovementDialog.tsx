"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight } from "lucide-react";

import { inventoryControlClassName } from "@/components/inventory/InventoryUi";
import { clampStockInput, maxStockQuantity } from "@/lib/api/inventory";
import type { StockTargetKind } from "@/components/inventory/stock/StockTargetSelect";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
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

export type EntryUnit = {
    id: string;
    label: string;
    factor: number;
};

export type RecordedMovement = {
    targetKind: StockTargetKind;
    targetId: string;
    targetVariantId?: string;
    direction: "IN" | "OUT";
    enteredQuantity: number;
    enteredUnitId: string;
    baseQuantity: number;
    unitCost?: number;
    unitSalePrice?: number;
    lotNumber?: string;
    manufacturedAt?: string;
    expiresAt?: string;
    receivedAt?: string;
    reason: string;
};

export type MovementTarget = {
    kind: StockTargetKind;
    id: string;
    variantId?: string;
    name: string;
    onHand: number;
    baseUnitLabel: string;
    entryUnits: EntryUnit[];
};

export function StockMovementDialog({
    open,
    onOpenChange,
    target,
    direction,
    onRecord,
    busy = false,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    target: MovementTarget | null;
    direction: "IN" | "OUT";
    onRecord: (movement: RecordedMovement) => void;
    busy?: boolean;
}) {
    const [quantity, setQuantity] = useState("");
    const [unitId, setUnitId] = useState("");
    const [unitCost, setUnitCost] = useState("");
    const [lotNumber, setLotNumber] = useState("");
    const [manufacturedAt, setManufacturedAt] = useState("");
    const [expiresAt, setExpiresAt] = useState("");
    const [receivedAt, setReceivedAt] = useState("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    const [seededFor, setSeededFor] = useState<string | null>(null);
    const seedKey = open && target ? `${target.id}-${direction}` : null;

    if (seedKey !== seededFor) {
        setSeededFor(seedKey);

        if (open && target) {
            setQuantity("");
            setUnitId(target.entryUnits[0]?.id ?? "");
            setUnitCost("");
            setLotNumber("");
            setManufacturedAt("");
            setExpiresAt("");
            setReceivedAt("");
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
    const baseQuantity = valid ? typed * (unit?.factor ?? 1) : 0;
    const resulting = target.onHand + (isIn ? baseQuantity : -baseQuantity);
    const showsConversion = valid && (unit?.factor ?? 1) !== 1;
    const todayIso = new Date().toLocaleDateString("en-CA");
    const alreadyExpired = Boolean(expiresAt) && expiresAt < todayIso;
    const earliestExpiry =
        manufacturedAt && manufacturedAt > todayIso ? manufacturedAt : todayIso;

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

        const money = unitCost.trim() === "" ? undefined : Number(unitCost);

        if (isIn && money === undefined) {
            setError("Enter what one unit cost. Put 0 if this stock was free.");
            return;
        }

        if (money !== undefined && (!Number.isFinite(money) || money < 0)) {
            setError(
                isIn
                    ? "Unit cost cannot be negative."
                    : "Sale price cannot be negative.",
            );
            return;
        }

        if (manufacturedAt && expiresAt && expiresAt < manufacturedAt) {
            setError("This batch expires before it was made — check the dates.");
            return;
        }

        onRecord({
            targetKind: target!.kind,
            targetId: target!.id,
            ...(target!.variantId ? { targetVariantId: target!.variantId } : {}),
            direction,
            enteredQuantity: typed,
            enteredUnitId: unit?.id ?? "",
            baseQuantity,
            ...(money === undefined
                ? {}
                : isIn
                  ? { unitCost: money }
                  : { unitSalePrice: money }),
            ...(isIn && lotNumber.trim()
                ? { lotNumber: lotNumber.trim() }
                : {}),
            ...(isIn && manufacturedAt ? { manufacturedAt } : {}),
            ...(isIn && expiresAt ? { expiresAt } : {}),
            ...(isIn && receivedAt ? { receivedAt } : {}),
            reason: reason.trim(),
        });
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
                                min="0.001"
                                max={maxStockQuantity}
                                step="any"
                                autoFocus
                                value={quantity}
                                onKeyDown={(e) => {
                                    if (e.key === "-" || e.key === "e" || e.key === "E") {
                                        e.preventDefault();
                                    }
                                }}
                                onChange={(event) => {
                                    const val = clampStockInput(
                                        event.target.value,
                                    );
                                    setQuantity(val);
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

                    <div className="flex flex-col gap-2">
                            <Label htmlFor="movement-cost">
                                {isIn ? "Cost" : "Sale price"} per{" "}
                                {target.baseUnitLabel || "unit"}
                                {isIn ? (
                                    <span className="text-danger">*</span>
                                ) : null}
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
                                {isIn
                                    ? "Stock is valued from this, batch by batch in date order, and it is what a selling price is set against. Enter 0 if it was free."
                                    : "Optional, and only if this was sold away from the till. What it cost comes from the batches it leaves."}
                            </p>
                    </div>

                    {isIn ? (
                        <details className="group rounded-xl border border-border">
                            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-foreground">
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                                Batch details
                                <span className="font-normal text-muted-foreground">
                                    optional
                                </span>
                            </summary>

                            <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
                                <p className="text-xs text-muted-foreground">
                                    For anything that goes off. Stock with an
                                    expiry date is sold before stock without
                                    one, soonest first — so a short-dated
                                    delivery leaves ahead of older stock that
                                    keeps.
                                </p>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="movement-lot">
                                        Lot / batch number
                                    </Label>
                                    <Input
                                        id="movement-lot"
                                        value={lotNumber}
                                        maxLength={80}
                                        onChange={(event) =>
                                            setLotNumber(event.target.value)
                                        }
                                        placeholder="The supplier's reference"
                                        className={inventoryControlClassName}
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="movement-expires">
                                            Expires
                                        </Label>
                                        <DatePicker
                                            id="movement-expires"
                                            value={expiresAt}
                                            min={earliestExpiry}
                                            placeholder="Does not expire"
                                            onValueChange={(value) => {
                                                setExpiresAt(value);
                                                setError("");
                                            }}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="movement-manufactured">
                                            Manufactured
                                        </Label>
                                        <DatePicker
                                            id="movement-manufactured"
                                            value={manufacturedAt}
                                            max={expiresAt || todayIso}
                                            placeholder="Not recorded"
                                            onValueChange={(value) => {
                                                setManufacturedAt(value);
                                                setError("");
                                            }}
                                        />
                                    </div>
                                </div>

                                {alreadyExpired ? (
                                    <p
                                        className="text-xs text-warning"
                                        role="status"
                                    >
                                        That date has already passed. This
                                        batch will be first out and flagged as
                                        expired.
                                    </p>
                                ) : null}

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="movement-received">
                                        Arrived on
                                    </Label>
                                    <DatePicker
                                        id="movement-received"
                                        value={receivedAt}
                                        max={todayIso}
                                        placeholder="Arrived now"
                                        onValueChange={setReceivedAt}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Only if you are recording this delivery
                                        late. Left empty, it arrived now.
                                    </p>
                                </div>
                            </div>
                        </details>
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

                <DialogFooter className="mt-6 grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 sm:flex sm:flex-row sm:justify-end sm:gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="h-11 sm:h-10 w-full sm:w-auto text-xs sm:text-sm order-2 min-[360px]:order-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleRecord}
                        disabled={busy}
                        className="h-11 sm:h-10 w-full sm:w-auto text-xs sm:text-sm order-1 min-[360px]:order-2"
                    >
                        {isIn ? "Record stock in" : "Record stock out"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
