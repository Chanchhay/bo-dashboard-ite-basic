"use client";

import { useState, type FormEvent } from "react";
import { Info, Lock, Pencil, Ruler, Trash2, X } from "lucide-react";

import {
    ConfigSection,
    StaticPreviewNotice,
    SystemBadge,
} from "@/components/inventory/config/ConfigUi";
import { inventoryControlClassName } from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
    sampleUnitUsage,
    sampleUnits,
} from "@/lib/inventory-config/sample-data";
import {
    unitCategories,
    unitCategoryLabels,
    unitsByCategory,
    validateUnit,
    type Unit,
    type UnitCategory,
} from "@/lib/inventory-config/units";

type UnitDraft = {
    name: string;
    symbol: string;
    category: UnitCategory;
    note: string;
};

const emptyDraft: UnitDraft = {
    name: "",
    symbol: "",
    category: "COUNT",
    note: "",
};

export function UnitsTab() {
    const { toast } = useToast();
    const [units, setUnits] = useState<Unit[]>(sampleUnits);
    const [draft, setDraft] = useState<UnitDraft>(emptyDraft);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);

    const isEditing = Boolean(editingId);

    function updateDraft(patch: Partial<UnitDraft>) {
        setDraft((current) => ({ ...current, ...patch }));
        setErrors((current) => {
            const touched = Object.keys(patch);
            if (!touched.some((key) => current[key])) return current;

            const next = { ...current };
            for (const key of touched) delete next[key];
            return next;
        });
    }

    function resetForm() {
        setDraft(emptyDraft);
        setEditingId(null);
        setErrors({});
    }

    function startEditing(unit: Unit) {
        setDraft({
            name: unit.name,
            symbol: unit.symbol,
            category: unit.category,
            note: unit.note || "",
        });
        setEditingId(unit.id);
        setErrors({});
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const found = validateUnit(draft, units, editingId ?? undefined);

        if (Object.keys(found).length) {
            setErrors(found);
            toast({
                tone: "error",
                title: `Unit not ${isEditing ? "updated" : "created"}`,
                description: Object.values(found)[0],
            });
            return;
        }

        const saved: Unit = {
            id: editingId ?? `u-${crypto.randomUUID().slice(0, 8)}`,
            name: draft.name.trim(),
            symbol: draft.symbol.trim(),
            category: draft.category,
            system: false,
            ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
        };

        setUnits((current) =>
            editingId
                ? current.map((unit) => (unit.id === editingId ? saved : unit))
                : [...current, saved],
        );
        toast({
            tone: "success",
            title: `Unit ${isEditing ? "updated" : "created"}`,
            description: `${saved.name} was saved.`,
        });
        resetForm();
    }

    function handleConfirmDelete() {
        if (!deleteTarget) return;

        setUnits((current) =>
            current.filter((unit) => unit.id !== deleteTarget.id),
        );
        if (editingId === deleteTarget.id) resetForm();
        toast({ tone: "success", title: `${deleteTarget.name} deleted` });
        setDeleteTarget(null);
    }

    return (
        <div className="flex flex-col gap-4">
            <StaticPreviewNotice />

            <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 sm:px-5">
                <div className="flex items-start gap-3">
                    <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        This is the vocabulary, not the arithmetic. How many
                        grams are in <em>your</em> sack is set on each item,
                        because a sack of rice and a sack of flour do not weigh
                        the same.
                    </p>
                </div>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
                <ConfigSection
                    title="Units"
                    description="Grouped by what they measure. Built-in units can be used but not changed."
                >
                    <div className="divide-y divide-border">
                        {unitsByCategory(units).map(
                            ({ category, units: categoryUnits }) => (
                                <div key={category} className="px-4 py-4 sm:px-5">
                                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            {unitCategoryLabels[category].label}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {unitCategoryLabels[category].hint}
                                        </p>
                                    </div>

                                    {categoryUnits.length === 0 ? (
                                        <p className="mt-3 text-sm text-muted-foreground">
                                            No units of this kind yet.
                                        </p>
                                    ) : (
                                        <ul className="mt-3 flex flex-col gap-1.5">
                                            {categoryUnits.map((unit) => {
                                                const usage =
                                                    sampleUnitUsage[unit.id] ??
                                                    0;

                                                return (
                                                    <li
                                                        key={unit.id}
                                                        className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5"
                                                    >
                                                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-xs font-semibold text-primary">
                                                            {unit.symbol}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="font-medium text-foreground">
                                                                    {unit.name}
                                                                </p>
                                                                {unit.system ? (
                                                                    <SystemBadge />
                                                                ) : null}
                                                            </div>
                                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                                {unit.note ||
                                                                    (usage
                                                                        ? `Used by ${usage} ${usage === 1 ? "item" : "items"}`
                                                                        : "Not used yet")}
                                                            </p>
                                                        </div>
                                                        {unit.system ? null : (
                                                            <div className="flex shrink-0 gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon-sm"
                                                                    aria-label={`Edit ${unit.name}`}
                                                                    onClick={() =>
                                                                        startEditing(
                                                                            unit,
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="icon-sm"
                                                                    // A unit in
                                                                    // use cannot
                                                                    // be removed
                                                                    // without
                                                                    // orphaning
                                                                    // every item
                                                                    // measured
                                                                    // in it.
                                                                    disabled={
                                                                        usage > 0
                                                                    }
                                                                    title={
                                                                        usage > 0
                                                                            ? `In use by ${usage} ${usage === 1 ? "item" : "items"}`
                                                                            : undefined
                                                                    }
                                                                    aria-label={`Delete ${unit.name}`}
                                                                    onClick={() =>
                                                                        setDeleteTarget(
                                                                            unit,
                                                                        )
                                                                    }
                                                                >
                                                                    {usage > 0 ? (
                                                                        <Lock />
                                                                    ) : (
                                                                        <Trash2 />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            ),
                        )}
                    </div>
                </ConfigSection>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                {isEditing ? "Edit unit" : "Add a unit"}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                A name, a symbol, and what it measures.
                            </p>
                        </div>
                        {isEditing ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Cancel editing"
                                onClick={resetForm}
                            >
                                <X />
                            </Button>
                        ) : null}
                    </div>

                    <div className="mt-5 flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="unit-name">Name *</Label>
                            <Input
                                id="unit-name"
                                value={draft.name}
                                onChange={(event) =>
                                    updateDraft({ name: event.target.value })
                                }
                                placeholder="Sack"
                                aria-invalid={Boolean(errors.name)}
                                className={inventoryControlClassName}
                            />
                            {errors.name ? (
                                <p className="text-xs text-danger" role="alert">
                                    {errors.name}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="unit-symbol">Short symbol *</Label>
                            <Input
                                id="unit-symbol"
                                value={draft.symbol}
                                onChange={(event) =>
                                    updateDraft({ symbol: event.target.value })
                                }
                                placeholder="sack"
                                aria-invalid={Boolean(errors.symbol)}
                                className={`${inventoryControlClassName} font-mono`}
                            />
                            {errors.symbol ? (
                                <p className="text-xs text-danger" role="alert">
                                    {errors.symbol}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Shown next to quantities, so keep it short.
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="unit-category">
                                What it measures *
                            </Label>
                            <Select
                                value={draft.category}
                                onValueChange={(value) =>
                                    updateDraft({
                                        category: (value ||
                                            "COUNT") as UnitCategory,
                                    })
                                }
                                items={Object.fromEntries(
                                    unitCategories.map((category) => [
                                        category,
                                        unitCategoryLabels[category].label,
                                    ]),
                                )}
                            >
                                <SelectTrigger
                                    id="unit-category"
                                    className={`${inventoryControlClassName} w-full`}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {unitCategories.map((category) => (
                                        <SelectItem
                                            key={category}
                                            value={category}
                                        >
                                            {unitCategoryLabels[category].label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {unitCategoryLabels[draft.category].hint}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="unit-note">Note</Label>
                            <Textarea
                                id="unit-note"
                                value={draft.note}
                                onChange={(event) =>
                                    updateDraft({ note: event.target.value })
                                }
                                placeholder="Optional — what this unit is for."
                                className="min-h-20 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    <Button type="submit" size="lg" className="mt-5 w-full">
                        <Ruler />
                        {isEditing ? "Save changes" : "Add unit"}
                    </Button>
                </form>
            </div>

            <DestructiveConfirmDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={
                    deleteTarget
                        ? `Delete ${deleteTarget.name}?`
                        : "Delete unit?"
                }
                description={
                    deleteTarget ? (
                        <>
                            <strong className="font-semibold text-foreground">
                                {deleteTarget.name}
                            </strong>{" "}
                            is not used by any item, so nothing will break. This
                            action cannot be undone.
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
