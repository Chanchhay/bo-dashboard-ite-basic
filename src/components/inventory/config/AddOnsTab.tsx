"use client";

import { useState } from "react";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";

import { AddOnDialog } from "@/components/inventory/config/AddOnDialog";
import {
    ConfigEmpty,
    ConfigSection,
    StaticPreviewNotice,
} from "@/components/inventory/config/ConfigUi";
import { Button } from "@/components/ui/button";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
    sampleAddOnSets,
    sampleAddOnUsage,
    sampleAddOns,
    sampleUnits,
} from "@/lib/inventory-config/sample-data";
import type { AddOn, AddOnSet } from "@/lib/inventory-config/types";
import { formatAmount } from "@/lib/inventory-config/units";

function describeRule(set: AddOnSet) {
    const choice =
        set.rule === "ANY"
            ? "any number"
            : `up to ${set.maxChoices ?? 1}`;

    return `${choice} · ${set.required ? "required" : "optional"}`;
}

function stockState(addOn: AddOn) {
    if (addOn.onHand <= 0) {
        return { label: "Out of stock", className: "bg-danger/10 text-danger" };
    }

    if (addOn.onHand <= addOn.lowStockThreshold) {
        return { label: "Low", className: "bg-warning/15 text-warning" };
    }

    return { label: "In stock", className: "bg-success/10 text-success" };
}

export function AddOnsTab() {
    const { toast } = useToast();
    const units = sampleUnits;
    const [addOns, setAddOns] = useState<AddOn[]>(sampleAddOns);
    const [sets] = useState<AddOnSet[]>(sampleAddOnSets);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AddOn | null>(null);

    const unitSymbol = (unitId: string) =>
        units.find((unit) => unit.id === unitId)?.symbol ?? "—";
    const editing = addOns.find((addOn) => addOn.id === editingId);

    function openDialog(id: string | null) {
        setEditingId(id);
        setDialogOpen(true);
    }

    function handleSave(saved: AddOn) {
        setAddOns((current) =>
            current.some((addOn) => addOn.id === saved.id)
                ? current.map((addOn) =>
                      addOn.id === saved.id ? saved : addOn,
                  )
                : [...current, saved],
        );
        toast({
            tone: "success",
            title: editingId ? "Add-on updated" : "Add-on created",
            description: `${saved.name} was saved.`,
        });
    }

    function handleConfirmDelete() {
        if (!deleteTarget) return;

        setAddOns((current) =>
            current.filter((addOn) => addOn.id !== deleteTarget.id),
        );
        toast({ tone: "success", title: `${deleteTarget.name} deleted` });
        setDeleteTarget(null);
    }

    return (
        <div className="flex flex-col gap-4">
            <StaticPreviewNotice />

            <ConfigSection
                title="Add-ons"
                description="Extras piled on top of an item. Defined once here, shared by every item that uses them."
                action={
                    <Button type="button" onClick={() => openDialog(null)}>
                        <Plus />
                        New add-on
                    </Button>
                }
            >
                {addOns.length === 0 ? (
                    <ConfigEmpty
                        title="No add-ons yet"
                        description="Create one to offer toppings and extras on your items."
                        action={
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => openDialog(null)}
                            >
                                <Plus />
                                New add-on
                            </Button>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-5 py-3">Name</th>
                                    <th className="px-5 py-3">On hand</th>
                                    <th className="px-5 py-3">One order uses</th>
                                    <th className="px-5 py-3">State</th>
                                    <th className="px-5 py-3">Used by</th>
                                    <th className="px-5 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {addOns.map((addOn) => {
                                    const symbol = unitSymbol(addOn.baseUnitId);
                                    const state = stockState(addOn);
                                    const usage =
                                        sampleAddOnUsage[addOn.id] ?? 0;

                                    return (
                                        <tr
                                            key={addOn.id}
                                            className="text-foreground hover:bg-muted/50"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-semibold">
                                                    {addOn.name}
                                                </p>
                                                {addOn.conversions.length ? (
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {addOn.conversions
                                                            .map(
                                                                (conversion) =>
                                                                    `1 ${unitSymbol(conversion.unitId)} = ${formatAmount(conversion.factor)} ${symbol}`,
                                                            )
                                                            .join(" · ")}
                                                    </p>
                                                ) : null}
                                            </td>
                                            <td className="px-5 py-4 font-semibold">
                                                {formatAmount(addOn.onHand)}{" "}
                                                <span className="font-normal text-muted-foreground">
                                                    {symbol}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground">
                                                {formatAmount(
                                                    addOn.usePerOrder,
                                                )}{" "}
                                                {symbol}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${state.className}`}
                                                >
                                                    {state.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground">
                                                {usage}{" "}
                                                {usage === 1
                                                    ? "item"
                                                    : "items"}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon-sm"
                                                        aria-label={`Edit ${addOn.name}`}
                                                        onClick={() =>
                                                            openDialog(addOn.id)
                                                        }
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon-sm"
                                                        aria-label={`Delete ${addOn.name}`}
                                                        onClick={() =>
                                                            setDeleteTarget(
                                                                addOn,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </ConfigSection>

            <ConfigSection
                title="Sets"
                description="Groups of add-ons offered together, and how many a customer may pick."
                action={
                    <Button type="button" variant="outline" disabled>
                        <Plus />
                        New set
                    </Button>
                }
            >
                <div className="divide-y divide-border">
                    {sets.map((set) => (
                        <div
                            key={set.id}
                            className="flex items-start gap-4 px-4 py-4 sm:px-5"
                        >
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                <Layers className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-foreground">
                                        {set.name}
                                    </p>
                                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                        {describeRule(set)}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {set.addOnIds
                                        .map(
                                            (id) =>
                                                addOns.find(
                                                    (addOn) => addOn.id === id,
                                                )?.name,
                                        )
                                        .filter(Boolean)
                                        .join(" · ") || "No add-ons yet"}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                aria-label={`Edit ${set.name}`}
                                disabled
                            >
                                <Pencil />
                            </Button>
                        </div>
                    ))}
                </div>
            </ConfigSection>

            <AddOnDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                addOn={editing}
                units={units}
                usedByItems={editingId ? (sampleAddOnUsage[editingId] ?? 0) : 0}
                onSave={handleSave}
            />

            <DestructiveConfirmDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={
                    deleteTarget
                        ? `Delete ${deleteTarget.name}?`
                        : "Delete add-on?"
                }
                description={
                    deleteTarget ? (
                        <>
                            {sampleAddOnUsage[deleteTarget.id] ?? 0} item
                            {(sampleAddOnUsage[deleteTarget.id] ?? 0) === 1
                                ? ""
                                : "s"}{" "}
                            currently offer{" "}
                            <strong className="font-semibold text-foreground">
                                {deleteTarget.name}
                            </strong>
                            . They will lose it. This action cannot be undone.
                        </>
                    ) : (
                        "This action cannot be undone."
                    )
                }
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isPending={false}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
