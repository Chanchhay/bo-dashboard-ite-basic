"use client";

import { useState } from "react";
import { Check } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type {
    AddOn,
    AddOnSelectionRule,
    AddOnSet,
    AddOnSetInput,
} from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

type SetDraft = {
    name: string;
    rule: AddOnSelectionRule;
    maxChoices: string;
    required: boolean;
    addOnIds: string[];
};

const ruleLabels: Record<AddOnSelectionRule, string> = {
    ANY: "Any number",
    UP_TO: "Up to a limit",
};

function toDraft(set: AddOnSet | undefined): SetDraft {
    return {
        name: set?.name ?? "",
        rule: set?.rule ?? "ANY",
        maxChoices: set?.maxChoices ? String(set.maxChoices) : "1",
        required: set?.required ?? false,
        addOnIds: (set?.addOns || []).map((addOn) => addOn.id),
    };
}

export function AddOnSetDialog({
    open,
    onOpenChange,
    set,
    addOns,
    busy = false,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Absent when creating. */
    set?: AddOnSet;
    addOns: readonly AddOn[];
    busy?: boolean;
    onSave: (input: AddOnSetInput) => void;
}) {
    const { toast } = useToast();
    const [draft, setDraft] = useState<SetDraft>(() => toDraft(set));
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reseeded on the way in rather than in an effect, so a cancelled edit
    // cannot leak into the next one.
    const [seededFor, setSeededFor] = useState<string | null>(null);
    const seedKey = open ? (set?.id ?? "new") : null;

    if (seedKey !== seededFor) {
        setSeededFor(seedKey);

        if (open) {
            setDraft(toDraft(set));
            setErrors({});
        }
    }

    const isEditing = Boolean(set);
    const isLimited = draft.rule === "UP_TO";

    function toggleAddOn(id: string) {
        setDraft((current) => ({
            ...current,
            addOnIds: current.addOnIds.includes(id)
                ? current.addOnIds.filter((addOnId) => addOnId !== id)
                : [...current.addOnIds, id],
        }));
        setErrors({});
    }

    function handleSave() {
        const found: Record<string, string> = {};
        const name = draft.name.trim();
        const maxChoices = Number(draft.maxChoices);

        if (!name) {
            found.name = "Name is required.";
        } else if (name.length > 150) {
            found.name = "Name must be 150 characters or fewer.";
        }

        if (draft.addOnIds.length === 0) {
            found.addOnIds = "Pick at least one add-on.";
        }

        if (isLimited) {
            if (!Number.isInteger(maxChoices) || maxChoices < 1) {
                found.maxChoices = "Set how many may be picked.";
            } else if (maxChoices > draft.addOnIds.length) {
                // "Pick up to 5 of these 3" tells a customer nothing.
                found.maxChoices =
                    "The limit cannot exceed how many add-ons are in the set.";
            }
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
            name,
            rule: draft.rule,
            required: draft.required,
            addOnIds: draft.addOnIds,
            ...(isLimited ? { maxChoices } : {}),
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? set?.name : "New set"}
                    </DialogTitle>
                    <DialogDescription>
                        Add-ons offered together, and how many a customer may
                        pick.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-5 flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="set-name">Name *</Label>
                        <Input
                            id="set-name"
                            value={draft.name}
                            onChange={(event) => {
                                setDraft((current) => ({
                                    ...current,
                                    name: event.target.value,
                                }));
                                setErrors({});
                            }}
                            placeholder="Toppings"
                            aria-invalid={Boolean(errors.name)}
                            className={inventoryControlClassName}
                        />
                        {errors.name ? (
                            <p className="text-xs text-danger" role="alert">
                                {errors.name}
                            </p>
                        ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="set-rule">How many</Label>
                            <Select
                                value={draft.rule}
                                onValueChange={(value) =>
                                    setDraft((current) => ({
                                        ...current,
                                        rule: (value ||
                                            "ANY") as AddOnSelectionRule,
                                    }))
                                }
                                items={ruleLabels}
                            >
                                <SelectTrigger
                                    id="set-rule"
                                    className={`${inventoryControlClassName} w-full`}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(
                                        Object.keys(
                                            ruleLabels,
                                        ) as AddOnSelectionRule[]
                                    ).map((rule) => (
                                        <SelectItem key={rule} value={rule}>
                                            {ruleLabels[rule]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {isLimited ? (
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="set-max">At most *</Label>
                                <Input
                                    id="set-max"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={draft.maxChoices}
                                    onChange={(event) => {
                                        setDraft((current) => ({
                                            ...current,
                                            maxChoices: event.target.value,
                                        }));
                                        setErrors({});
                                    }}
                                    aria-invalid={Boolean(errors.maxChoices)}
                                    className={inventoryControlClassName}
                                />
                                {errors.maxChoices ? (
                                    <p
                                        className="text-xs text-danger"
                                        role="alert"
                                    >
                                        {errors.maxChoices}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                    </div>

                    <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold text-foreground">
                                Required
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                                The customer must choose before adding to cart.
                            </span>
                        </span>
                        <Switch
                            aria-label="Required"
                            checked={draft.required}
                            onCheckedChange={(checked) =>
                                setDraft((current) => ({
                                    ...current,
                                    required: checked,
                                }))
                            }
                        />
                    </label>

                    <div className="flex flex-col gap-2">
                        <Label>Add-ons in this set *</Label>
                        {addOns.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                                Create an add-on first — a set groups the ones
                                you already have.
                            </p>
                        ) : (
                            <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                                {addOns.map((addOn) => {
                                    const picked = draft.addOnIds.includes(
                                        addOn.id,
                                    );

                                    return (
                                        <li key={addOn.id}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleAddOn(addOn.id)
                                                }
                                                aria-pressed={picked}
                                                className={cn(
                                                    "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                                                    picked
                                                        ? "border-primary/40 bg-primary/10 font-semibold text-primary"
                                                        : "border-border text-foreground hover:bg-muted/60",
                                                )}
                                            >
                                                <span className="min-w-0 truncate">
                                                    {addOn.name}
                                                    {addOn.baseUnit?.name ? (
                                                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                            {
                                                                addOn.baseUnit
                                                                    .name
                                                            }
                                                        </span>
                                                    ) : null}
                                                </span>
                                                {picked ? (
                                                    <Check className="size-4 shrink-0" />
                                                ) : null}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {errors.addOnIds ? (
                            <p className="text-xs text-danger" role="alert">
                                {errors.addOnIds}
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                {draft.addOnIds.length} selected. They stay in
                                the shared library — a set only groups them.
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button type="button" disabled={busy} onClick={handleSave}>
                        {isEditing ? "Save set" : "Create set"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
