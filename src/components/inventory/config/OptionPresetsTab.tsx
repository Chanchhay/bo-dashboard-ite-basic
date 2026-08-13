"use client";

import { useState, type FormEvent } from "react";
import { ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";

import {
    ConfigEmpty,
    ConfigSection,
} from "@/components/inventory/config/ConfigUi";
import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
} from "@/components/inventory/InventoryUi";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { OptionPreset as ApiOptionPreset } from "@/lib/api/inventory";
import {
    useCreateOptionPresetMutation,
    useDeleteOptionPresetMutation,
    useGetOptionPresetsQuery,
    useUpdateOptionPresetMutation,
} from "@/services/inventoryApi";

/** The screen's own shape: values as typed lines, never partial. */
type OptionPreset = {
    id: string;
    name: string;
    type: "SELECTION" | "COLOR";
    required: boolean;
    values: { id: string; value: string; colorHex?: string }[];
};

function toScreenPreset(preset: ApiOptionPreset): OptionPreset {
    return {
        id: preset.id,
        name: preset.name || "Unnamed preset",
        type: preset.type || "SELECTION",
        required: preset.required !== false,
        values: (preset.values || []).map((value, index) => ({
            id: `${preset.id}-${index}`,
            value: value.value || "",
            ...(value.colorHex ? { colorHex: value.colorHex } : {}),
        })),
    };
}

type PresetDraft = {
    name: string;
    type: OptionPreset["type"];
    required: boolean;
    /** One value per line while editing — the same shape the block editor uses. */
    values: string;
};

const emptyDraft: PresetDraft = {
    name: "",
    type: "SELECTION",
    required: true,
    values: "",
};

const typeLabels: Record<OptionPreset["type"], string> = {
    SELECTION: "Pick from a list",
    COLOR: "Colour swatches",
};

function toDraft(preset: OptionPreset): PresetDraft {
    return {
        name: preset.name,
        type: preset.type,
        required: preset.required,
        values: preset.values
            .map((value) =>
                value.colorHex
                    ? `${value.value} ${value.colorHex}`
                    : value.value,
            )
            .join("\n"),
    };
}

/** `Black #161d16` splits into a label and its swatch; the hex is optional. */
function parseValues(raw: string, type: OptionPreset["type"]) {
    return raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
            const match = line.match(/^(.*?)\s*(#[0-9a-fA-F]{6})$/);

            return {
                id: `v-${index}-${line.toLowerCase().replace(/\W+/g, "-")}`,
                value: (match ? match[1] : line).trim(),
                ...(type === "COLOR" && match ? { colorHex: match[2] } : {}),
            };
        });
}

export function OptionPresetsTab() {
    const { toast } = useToast();
    const presetsQuery = useGetOptionPresetsQuery();
    const [createPreset, createState] = useCreateOptionPresetMutation();
    const [updatePreset, updateState] = useUpdateOptionPresetMutation();
    const [deletePreset, deleteState] = useDeleteOptionPresetMutation();
    const presets = (presetsQuery.data || []).map(toScreenPreset);
    const [draft, setDraft] = useState<PresetDraft>(emptyDraft);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [deleteTarget, setDeleteTarget] = useState<OptionPreset | null>(null);

    const isEditing = Boolean(editingId);

    function updateDraft(patch: Partial<PresetDraft>) {
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

    function startEditing(preset: OptionPreset) {
        setDraft(toDraft(preset));
        setEditingId(preset.id);
        setErrors({});
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const found: Record<string, string> = {};
        const name = draft.name.trim();
        const values = parseValues(draft.values, draft.type);

        if (!name) {
            found.name = "Name is required.";
        } else if (
            presets.some(
                (preset) =>
                    preset.id !== editingId &&
                    preset.name.toLowerCase() === name.toLowerCase(),
            )
        ) {
            found.name = "Another preset already uses that name.";
        }

        if (values.length < 2) {
            found.values = "A preset needs at least two values to choose from.";
        } else if (
            new Set(values.map((value) => value.value.toLowerCase())).size !==
            values.length
        ) {
            found.values = "Values must be unique.";
        } else if (
            draft.type === "COLOR" &&
            values.some((value) => !value.colorHex)
        ) {
            found.values =
                "Every colour needs a hex code, for example: Black #161d16";
        }

        if (Object.keys(found).length) {
            setErrors(found);
            toast({
                tone: "error",
                title: `Preset not ${isEditing ? "updated" : "created"}`,
                description: Object.values(found)[0],
            });
            return;
        }

        const body = {
            name,
            type: draft.type,
            required: draft.required,
            values: values.map((value) => ({
                value: value.value,
                colorHex: value.colorHex || "",
            })),
        };

        try {
            const saved = editingId
                ? await updatePreset({ presetId: editingId, body }).unwrap()
                : await createPreset(body).unwrap();

            toast({
                tone: "success",
                title: `Preset ${isEditing ? "updated" : "created"}`,
                description: `${saved.name || name} was saved.`,
            });
            resetForm();
        } catch (error) {
            toast({
                tone: "error",
                title: `Preset not ${isEditing ? "updated" : "created"}`,
                description: getApiErrorMessage(
                    error,
                    "Unable to save that preset.",
                ),
            });
        }
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return;

        try {
            // Nothing depends on a preset once applied — its values were
            // copied onto the item — so deleting one is always safe.
            await deletePreset(deleteTarget.id).unwrap();
            if (editingId === deleteTarget.id) resetForm();
            toast({ tone: "success", title: `${deleteTarget.name} deleted` });
            setDeleteTarget(null);
        } catch (error) {
            toast({
                tone: "error",
                title: "Preset not deleted",
                description: getApiErrorMessage(
                    error,
                    "Unable to delete that preset.",
                ),
            });
        }
    }

    if (presetsQuery.isLoading) {
        return <InventoryLoading label="Loading presets" />;
    }

    if (presetsQuery.error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    presetsQuery.error,
                    "Unable to load the presets.",
                )}
                retry={presetsQuery.refetch}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <p className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground sm:px-5">
                A preset is a starting point, not a live link. Applying one
                copies its values onto the item — editing the preset afterwards
                does not rewrite items already using it, so a tweak here can
                never silently change hundreds of items.
            </p>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
                <ConfigSection
                    title="Option presets"
                    description="Saved lists of choices, so Small / Medium / Large is not retyped on every item."
                >
                    {presets.length === 0 ? (
                        <ConfigEmpty
                            title="No presets yet"
                            description="Save a list of choices to reuse it across items."
                        />
                    ) : (
                        <div className="divide-y divide-border">
                            {presets.map((preset) => {
                                return (
                                    <div
                                        key={preset.id}
                                        className="flex items-start gap-4 px-4 py-4 sm:px-5"
                                    >
                                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                            <ListChecks className="size-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold text-foreground">
                                                    {preset.name}
                                                </p>
                                                {preset.required ? (
                                                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                                                        Required
                                                    </span>
                                                ) : null}
                                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                                    {typeLabels[preset.type]}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                {preset.values.map((value) => (
                                                    <span
                                                        key={value.id}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-foreground"
                                                    >
                                                        {value.colorHex ? (
                                                            <span
                                                                className="size-3 rounded-full border border-border"
                                                                style={{
                                                                    background:
                                                                        value.colorHex,
                                                                }}
                                                            />
                                                        ) : null}
                                                        {value.value}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* A preset is copied onto an item,
                                                not linked to it, so there is no
                                                list of items to count. */}
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                {preset.values.length}{" "}
                                                {preset.values.length === 1
                                                    ? "value"
                                                    : "values"}{" "}
                                                · copied onto an item when
                                                applied
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon-sm"
                                                aria-label={`Edit ${preset.name}`}
                                                onClick={() =>
                                                    startEditing(preset)
                                                }
                                            >
                                                <Pencil />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon-sm"
                                                aria-label={`Delete ${preset.name}`}
                                                onClick={() =>
                                                    setDeleteTarget(preset)
                                                }
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ConfigSection>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                {isEditing ? "Edit preset" : "Add a preset"}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                A name and the choices under it.
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
                            <Label htmlFor="preset-name">Name *</Label>
                            <Input
                                id="preset-name"
                                value={draft.name}
                                onChange={(event) =>
                                    updateDraft({ name: event.target.value })
                                }
                                placeholder="Size"
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
                            <Label htmlFor="preset-type">Shown as *</Label>
                            <Select
                                value={draft.type}
                                onValueChange={(value) =>
                                    updateDraft({
                                        type: (value ||
                                            "SELECTION") as OptionPreset["type"],
                                    })
                                }
                                items={typeLabels}
                            >
                                <SelectTrigger
                                    id="preset-type"
                                    className={`${inventoryControlClassName} w-full`}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(
                                        Object.keys(
                                            typeLabels,
                                        ) as OptionPreset["type"][]
                                    ).map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {typeLabels[type]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="preset-values">Choices *</Label>
                            <textarea
                                id="preset-values"
                                value={draft.values}
                                onChange={(event) =>
                                    updateDraft({ values: event.target.value })
                                }
                                rows={5}
                                placeholder={
                                    draft.type === "COLOR"
                                        ? "Black #161d16\nWhite #f5f5f5"
                                        : "Small\nMedium\nLarge"
                                }
                                aria-invalid={Boolean(errors.values)}
                                className="min-h-28 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary aria-invalid:border-danger"
                            />
                            <p
                                className={
                                    errors.values
                                        ? "text-xs text-danger"
                                        : "text-xs text-muted-foreground"
                                }
                                role={errors.values ? "alert" : undefined}
                            >
                                {errors.values ||
                                    (draft.type === "COLOR"
                                        ? "One per line, each ending in a hex code."
                                        : "One choice per line.")}
                            </p>
                        </div>

                        <div className="flex items-start justify-between gap-4 rounded-xl border border-border px-4 py-3">
                            <div className="min-w-0">
                                <Label
                                    htmlFor="preset-required"
                                    className="text-sm font-semibold text-foreground"
                                >
                                    Required
                                </Label>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    A sale cannot proceed until the customer
                                    picks one.
                                </p>
                            </div>
                            <Switch
                                id="preset-required"
                                checked={draft.required}
                                onCheckedChange={(checked) =>
                                    updateDraft({ required: Boolean(checked) })
                                }
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        disabled={createState.isLoading || updateState.isLoading}
                        className="mt-5 w-full"
                    >
                        <Plus />
                        {isEditing ? "Save changes" : "Add preset"}
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
                        : "Delete preset?"
                }
                description={
                    deleteTarget ? (
                        <>
                            Items already using{" "}
                            <strong className="font-semibold text-foreground">
                                {deleteTarget.name}
                            </strong>{" "}
                            keep their choices — a preset is only a starting
                            point. You just won&apos;t be able to apply it again.
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
