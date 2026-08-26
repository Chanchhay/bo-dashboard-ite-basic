"use client";

import { useMemo, useState } from "react";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";

import { AddOnDialog } from "@/components/inventory/config/AddOnDialog";
import { AddOnSetDialog } from "@/components/inventory/config/AddOnSetDialog";
import {
    ConfigEmpty,
    ConfigSection,
} from "@/components/inventory/config/ConfigUi";
import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type {
    AddOn as ApiAddOn,
    AddOnSet,
    AddOnSetInput,
    Unit as ApiUnit,
} from "@/lib/api/inventory";
import type { AddOn } from "@/lib/inventory-config/types";
import { formatAmount, type Unit } from "@/lib/inventory-config/units";
import {
    useCreateAddOnMutation,
    useCreateAddOnSetMutation,
    useDeleteAddOnMutation,
    useDeleteAddOnSetMutation,
    useGetAddOnSetsQuery,
    useGetAddOnsQuery,
    useGetInventoryItemOptionsQuery,
    useGetInventoryUnitsQuery,
    useUpdateAddOnMutation,
    useUpdateAddOnSetMutation,
} from "@/services/inventoryApi";

function describeRule(set: AddOnSet) {
    const choice =
        set.rule === "UP_TO" ? `up to ${set.maxChoices ?? 1}` : "any number";

    return `${choice} · ${set.required ? "required" : "optional"}`;
}

function toConfigAddOn(addOn: ApiAddOn): AddOn {
    return {
        id: addOn.id,
        name: addOn.name || "Unnamed add-on",
        baseUnitId: addOn.baseUnit?.id || "",
        usePerOrder: addOn.usePerOrder ?? 1,
        conversions: (addOn.uomConversions || [])
            .filter((conversion) => conversion.unit?.id)
            .map((conversion, index) => ({
                id: conversion.id || `${addOn.id}-${index}`,
                unitId: conversion.unit?.id || "",
                factor: conversion.factor ?? 1,
            })),
        ...(addOn.note ? { note: addOn.note } : {}),
    };
}

function toConfigUnit(unit: ApiUnit): Unit {
    return {
        id: unit.id,
        name: unit.name || "Unnamed unit",
        symbol: unit.symbol || "",
        category: unit.category || "COUNT",
        system: unit.system !== false,
        ...(unit.note ? { note: unit.note } : {}),
    };
}

export function AddOnsTab() {
    const { toast } = useToast();
    const addOnsQuery = useGetAddOnsQuery();
    const unitsQuery = useGetInventoryUnitsQuery();
    const itemsQuery = useGetInventoryItemOptionsQuery();
    const [createAddOn, createState] = useCreateAddOnMutation();
    const [updateAddOn, updateState] = useUpdateAddOnMutation();
    const [deleteAddOn, deleteState] = useDeleteAddOnMutation();
    const setsQuery = useGetAddOnSetsQuery();
    const [createSet, createSetState] = useCreateAddOnSetMutation();
    const [updateSet, updateSetState] = useUpdateAddOnSetMutation();
    const [deleteSet, deleteSetState] = useDeleteAddOnSetMutation();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ApiAddOn | null>(null);
    const [setEditorOpen, setSetEditorOpen] = useState(false);
    const [editingSetId, setEditingSetId] = useState<string | null>(null);
    const [deleteSetTarget, setDeleteSetTarget] = useState<AddOnSet | null>(
        null,
    );

    const addOns = useMemo(() => addOnsQuery.data || [], [addOnsQuery.data]);
    const units = useMemo(
        () => (unitsQuery.data || []).map(toConfigUnit),
        [unitsQuery.data],
    );

    const usageByAddOnId = useMemo(() => {
        const counts = new Map<string, number>();

        for (const item of itemsQuery.data || []) {
            for (const addOn of item.addOns || []) {
                counts.set(addOn.id, (counts.get(addOn.id) ?? 0) + 1);
            }
        }

        return counts;
    }, [itemsQuery.data]);

    const editing = addOns.find((addOn) => addOn.id === editingId);
    const sets = useMemo(() => setsQuery.data || [], [setsQuery.data]);
    const editingSet = sets.find((set) => set.id === editingSetId);
    const unitName = (addOn: ApiAddOn) => addOn.baseUnit?.name || "—";
    const unitSymbol = (addOn: ApiAddOn) =>
        addOn.baseUnit?.symbol || addOn.baseUnit?.name || "—";

    function openDialog(id: string | null) {
        setEditingId(id);
        setDialogOpen(true);
    }

    async function handleSave(saved: AddOn) {
        const body = {
            name: saved.name,
            baseUnitId: saved.baseUnitId,
            usePerOrder: saved.usePerOrder,
            uomConversions: saved.conversions.map((conversion) => ({
                unitId: conversion.unitId,
                factor: conversion.factor,
            })),
            note: saved.note || "",
        };

        try {
            const result = editingId
                ? await updateAddOn({ addOnId: editingId, body }).unwrap()
                : await createAddOn(body).unwrap();

            toast({
                tone: "success",
                title: editingId ? "Add-on updated" : "Add-on created",
                description: `${result.name || saved.name} was saved.`,
            });
        } catch (error) {
            toast({
                tone: "error",
                title: editingId
                    ? "Add-on not updated"
                    : "Add-on not created",
                description: getApiErrorMessage(
                    error,
                    "Unable to save that add-on.",
                ),
            });
        }
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return;

        try {
            await deleteAddOn(deleteTarget.id).unwrap();
            toast({
                tone: "success",
                title: `${deleteTarget.name} deleted`,
            });
            setDeleteTarget(null);
        } catch (error) {
            toast({
                tone: "error",
                title: "Add-on not deleted",
                description: getApiErrorMessage(
                    error,
                    "Unable to delete that add-on.",
                ),
            });
        }
    }

    async function handleSaveSet(input: AddOnSetInput) {
        try {
            const saved = editingSetId
                ? await updateSet({ setId: editingSetId, body: input }).unwrap()
                : await createSet(input).unwrap();

            setSetEditorOpen(false);
            toast({
                tone: "success",
                title: editingSetId ? "Set updated" : "Set created",
                description: `${saved.name || input.name} was saved.`,
            });
        } catch (error) {
            toast({
                tone: "error",
                title: editingSetId ? "Set not updated" : "Set not created",
                description: getApiErrorMessage(
                    error,
                    "Unable to save that set.",
                ),
            });
        }
    }

    async function handleConfirmDeleteSet() {
        if (!deleteSetTarget) return;

        try {
            await deleteSet(deleteSetTarget.id).unwrap();
            toast({
                tone: "success",
                title: `${deleteSetTarget.name} deleted`,
            });
            setDeleteSetTarget(null);
        } catch (error) {
            toast({
                tone: "error",
                title: "Set not deleted",
                description: getApiErrorMessage(
                    error,
                    "Unable to delete that set.",
                ),
            });
        }
    }

    if (addOnsQuery.isLoading || unitsQuery.isLoading) {
        return <InventoryLoading label="Loading add-ons" />;
    }

    if (addOnsQuery.error || unitsQuery.error) {
        return (
            <InventoryError
                error={addOnsQuery.error || unitsQuery.error}
                message={getApiErrorMessage(
                    addOnsQuery.error || unitsQuery.error,
                    "Unable to load the add-ons.",
                )}
                retry={() => {
                    addOnsQuery.refetch();
                    unitsQuery.refetch();
                }}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <ConfigSection
                title="Add-ons"
                description="Extras piled on top of an item. Defined once here, shared by every item that uses them, and counted in their own right."
                action={
                    <Button
                        data-tour="new-addon-btn"
                        type="button"
                        disabled={createState.isLoading}
                        onClick={() => openDialog(null)}
                    >
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
                                data-tour="new-addon-btn"
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
                                    <th className="px-5 py-3">Unit</th>
                                    <th className="px-5 py-3">One order uses</th>
                                    <th className="px-5 py-3">Used by</th>
                                    <th className="px-5 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {addOns.map((addOn) => {
                                    const usage =
                                        usageByAddOnId.get(addOn.id) ?? 0;

                                    return (
                                        <tr
                                            key={addOn.id}
                                            className="text-foreground hover:bg-muted/50"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-semibold">
                                                    {addOn.name}
                                                </p>
                                                {addOn.uomConversions?.length ? (
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {addOn.uomConversions
                                                            .map(
                                                                (conversion) =>
                                                                    `1 ${conversion.unit?.symbol || conversion.unit?.name} = ${formatAmount(conversion.factor ?? 1)} ${unitSymbol(addOn)}`,
                                                            )
                                                            .join(" · ")}
                                                    </p>
                                                ) : addOn.note ? (
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {addOn.note}
                                                    </p>
                                                ) : null}
                                            </td>
                                            <td className="px-5 py-4 font-mono text-xs font-semibold text-muted-foreground">
                                                {unitSymbol(addOn)}
                                            </td>
                                            <td className="px-5 py-4">
                                                {formatAmount(
                                                    addOn.usePerOrder ?? 1,
                                                )}{" "}
                                                {unitSymbol(addOn)}
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground">
                                                {usage}{" "}
                                                {usage === 1 ? "item" : "items"}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        disabled={
                                                            updateState.isLoading
                                                        }
                                                        aria-label={`Edit ${addOn.name}`}
                                                        onClick={() =>
                                                            openDialog(addOn.id)
                                                        }
                                                    >
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="hover:bg-red-50 dark:hover:bg-red-950/40"
                                                        disabled={
                                                            deleteState.isLoading
                                                        }
                                                        aria-label={`Delete ${addOn.name}`}
                                                        onClick={() =>
                                                            setDeleteTarget(
                                                                addOn,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="size-4 text-brand-red" />
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
                    <Button
                        data-tour="new-set-btn"
                        type="button"
                        variant="outline"
                        disabled={addOns.length === 0}
                        title={
                            addOns.length === 0
                                ? "Create an add-on first"
                                : undefined
                        }
                        onClick={() => {
                            setEditingSetId(null);
                            setSetEditorOpen(true);
                        }}
                    >
                        <Plus />
                        New set
                    </Button>
                }
            >
                {sets.length === 0 ? (
                    <ConfigEmpty
                        title="No sets yet"
                        description="Group add-ons that belong together, such as toppings."
                    />
                ) : (
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
                                        {(set.addOns || [])
                                            .map((addOn) => addOn.name)
                                            .filter(Boolean)
                                            .join(" · ") || "No add-ons yet"}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Edit ${set.name}`}
                                        onClick={() => {
                                            setEditingSetId(set.id);
                                            setSetEditorOpen(true);
                                        }}
                                    >
                                        <Pencil className="size-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="hover:bg-red-50 dark:hover:bg-red-950/40"
                                        disabled={deleteSetState.isLoading}
                                        aria-label={`Delete ${set.name}`}
                                        onClick={() => setDeleteSetTarget(set)}
                                    >
                                        <Trash2 className="size-4 text-brand-red" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ConfigSection>

            <AddOnSetDialog
                key={editingSetId ?? "new-set"}
                open={setEditorOpen}
                onOpenChange={setSetEditorOpen}
                set={editingSet}
                addOns={addOns}
                busy={createSetState.isLoading || updateSetState.isLoading}
                onSave={handleSaveSet}
            />

            <DestructiveConfirmDialog
                open={Boolean(deleteSetTarget)}
                onOpenChange={(open) => {
                    if (!open) setDeleteSetTarget(null);
                }}
                title={
                    deleteSetTarget
                        ? `Delete ${deleteSetTarget.name}?`
                        : "Delete set?"
                }
                description={
                    <>
                        The grouping is removed. The add-ons inside it stay in
                        the library. This action cannot be undone.
                    </>
                }
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isPending={deleteSetState.isLoading}
                onConfirm={handleConfirmDeleteSet}
            />

            <AddOnDialog
                key={editingId ?? "new"}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                addOn={editing ? toConfigAddOn(editing) : undefined}
                units={units}
                usedByItems={
                    editingId ? (usageByAddOnId.get(editingId) ?? 0) : 0
                }
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
                            <strong className="font-semibold text-foreground">
                                {deleteTarget.name}
                            </strong>{" "}
                            will be removed from the library. An add-on that
                            items still offer cannot be deleted — detach it
                            from them first. This action cannot be undone.
                        </>
                    ) : (
                        "This action cannot be undone."
                    )
                }
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isPending={deleteState.isLoading}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
