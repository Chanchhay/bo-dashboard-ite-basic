"use client";

import { useState, type SubmitEvent } from "react";
import { Trash2 } from "lucide-react";

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
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
    attributeIcon,
    attributeIconKeys,
} from "@/lib/api/attribute-icons";
import {
    itemAttributePlacementLabels,
    itemAttributePlacements,
    itemAttributeTypeLabels,
    itemAttributeTypes,
    type ItemAttributePlacement,
    type ItemAttributeType,
} from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

export type AttributeValueDraft = {
    value: string;
    label: string;
    colorHex: string;
    available: boolean;
};

export type AttributeDraft = {
    id: string;
    name: string;
    type: ItemAttributeType;
    placement: ItemAttributePlacement;
    icon: string;
    values: AttributeValueDraft[];
};

const typeOptions = itemAttributeTypes.map((type) => ({
    value: type,
    label: itemAttributeTypeLabels[type],
}));

const placementOptions = itemAttributePlacements.map((placement) => ({
    value: placement,
    label: itemAttributePlacementLabels[placement].label,
}));

export function emptyValue(): AttributeValueDraft {
    return { value: "", label: "", colorHex: "", available: true };
}

function emptyDraft(): AttributeDraft {
    return {
        id: "",
        name: "",
        type: "TEXT",
        placement: "OPTION",
        icon: "",
        values: [emptyValue()],
    };
}

/** Placements that show one value, so the editor collapses to a single row. */
function isSingleValue(placement: ItemAttributePlacement) {
    return placement === "HIGHLIGHT" || placement === "SPECIFICATION";
}

function valueCopy(
    type: ItemAttributeType,
    placement: ItemAttributePlacement,
) {
    if (isSingleValue(placement)) {
        return {
            label: placement === "HIGHLIGHT" ? "Subtitle" : "Value",
            placeholder:
                placement === "HIGHLIGHT"
                    ? "On orders over $50"
                    : '6.7" Super Retina XDR',
        };
    }

    if (type === "COLOR") {
        return { label: "Colours", placeholder: "Charcoal Gray" };
    }

    if (type === "NUMBER") {
        return { label: "Attribute value", placeholder: "Add a number" };
    }

    return {
        label: "Attribute value",
        placeholder:
            type === "SELECTION" ? "Add an option" : "Add a value",
    };
}

/**
 * Add or edit one item attribute. `placement` is what makes this one editor
 * cover three parts of the storefront — a selectable option, a perk tile under
 * Add to Cart, or a specification tile — so the fields below reshape around it.
 */
export function ItemAttributeDialog({
    open,
    onOpenChange,
    initialAttribute,
    existingNames,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Omitted when adding. */
    initialAttribute?: AttributeDraft;
    /** Lower-cased names already used by other attributes. */
    existingNames: string[];
    onSubmit: (attribute: AttributeDraft) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                {/*
                 * Keyed so the fields re-initialise from the attribute being
                 * edited: the draft lives in mount-time state rather than being
                 * synced by an effect, so a cancelled edit cannot leak into the
                 * next one.
                 */}
                <AttributeForm
                    key={initialAttribute?.id || "new"}
                    initialAttribute={initialAttribute}
                    existingNames={existingNames}
                    onSubmit={onSubmit}
                    onClose={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

function AttributeForm({
    initialAttribute,
    existingNames,
    onSubmit,
    onClose,
}: {
    initialAttribute?: AttributeDraft;
    existingNames: string[];
    onSubmit: (attribute: AttributeDraft) => void;
    onClose: () => void;
}) {
    const draft = initialAttribute || emptyDraft();
    const isEditing = Boolean(initialAttribute);
    const [name, setName] = useState(draft.name);
    const [type, setType] = useState<ItemAttributeType>(draft.type);
    const [placement, setPlacement] = useState<ItemAttributePlacement>(
        draft.placement,
    );
    const [icon, setIcon] = useState(draft.icon);
    const [values, setValues] = useState<AttributeValueDraft[]>(
        draft.values.length ? draft.values : [emptyValue()],
    );
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const takesValues = type !== "TOGGLE";
    const single = isSingleValue(placement);
    const showsIcon = placement === "HIGHLIGHT" || placement === "SPECIFICATION";
    const copy = valueCopy(type, placement);
    const visibleValues = single ? values.slice(0, 1) : values;

    function showError(message: string) {
        setError(message);
        toast({
            tone: "error",
            title: `Attribute not ${isEditing ? "updated" : "added"}`,
            description: message,
        });
    }

    function updateValue(
        index: number,
        patch: Partial<AttributeValueDraft>,
    ) {
        setValues((current) =>
            current.map((value, position) =>
                position === index ? { ...value, ...patch } : value,
            ),
        );
    }

    function removeValue(index: number) {
        setValues((current) => {
            const remaining = current.filter(
                (_, position) => position !== index,
            );

            return remaining.length ? remaining : [emptyValue()];
        });
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        // The dialog is portaled but still a React child of the item form —
        // without this, submitting here would submit the item too.
        event.stopPropagation();

        const trimmedName = name.trim();

        if (!trimmedName) {
            showError("Attribute name is required.");
            return;
        }

        if (existingNames.includes(trimmedName.toLowerCase())) {
            showError("An attribute with this name already exists.");
            return;
        }

        const cleaned = takesValues
            ? visibleValues
                  .map((value) => ({
                      value: value.value.trim(),
                      label: value.label.trim(),
                      colorHex: value.colorHex.trim(),
                      available: value.available,
                  }))
                  .filter((value) => value.value)
            : [];

        if (
            placement === "OPTION" &&
            (type === "SELECTION" || type === "COLOR") &&
            !cleaned.length
        ) {
            showError("Add at least one option for shoppers to choose from.");
            return;
        }

        if (type === "COLOR" && cleaned.some((value) => !value.colorHex)) {
            showError("Every colour needs a hex value such as #3a3a3c.");
            return;
        }

        if (
            type === "NUMBER" &&
            cleaned.some((value) => Number.isNaN(Number(value.value)))
        ) {
            showError("Number attributes only accept numeric values.");
            return;
        }

        onSubmit({
            id: initialAttribute?.id || "",
            name: trimmedName,
            type,
            placement,
            icon: showsIcon ? icon : "",
            values: cleaned,
        });
        onClose();
    }

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-5"
        >
            <DialogHeader>
                <DialogTitle>
                    {isEditing ? "Edit attribute" : "Add attribute"}
                </DialogTitle>
                <DialogDescription>
                    Define attribute for your product
                </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
                <Label
                    htmlFor="attribute-name"
                    className="text-sm font-semibold text-[#424841]"
                >
                    Attribute name
                </Label>
                <Input
                    id="attribute-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Status"
                    autoComplete="off"
                    aria-invalid={Boolean(error) && !name.trim()}
                    className={inventoryControlClassName}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor="attribute-type"
                        className="text-sm font-semibold text-[#424841]"
                    >
                        Attribute type
                    </Label>
                    <SelectField
                        id="attribute-type"
                        options={typeOptions}
                        value={type}
                        onValueChange={(next) => {
                            setType(next as ItemAttributeType);
                            setError(null);
                        }}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor="attribute-placement"
                        className="text-sm font-semibold text-[#424841]"
                    >
                        Show as
                    </Label>
                    <SelectField
                        id="attribute-placement"
                        options={placementOptions}
                        value={placement}
                        onValueChange={(next) => {
                            setPlacement(next as ItemAttributePlacement);
                            setError(null);
                        }}
                    />
                </div>
            </div>
            <p className="-mt-3 text-xs text-[#6b7280]">
                {itemAttributePlacementLabels[placement].hint}
            </p>

            {showsIcon ? (
                <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold text-[#424841]">
                        Icon
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                        {attributeIconKeys.map((key) => {
                            const Glyph = attributeIcon(key);

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    title={key}
                                    aria-label={key}
                                    aria-pressed={icon === key}
                                    onClick={() =>
                                        setIcon(icon === key ? "" : key)
                                    }
                                    className={cn(
                                        "grid size-9 place-items-center rounded-lg border transition-colors",
                                        icon === key
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-[#e8e8e8] bg-white text-[#657064] hover:border-[#cfd6cc]",
                                    )}
                                >
                                    <Glyph className="size-4" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {takesValues ? (
                <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold text-[#424841]">
                        {copy.label}
                    </Label>
                    <div className="flex flex-col gap-2">
                        {visibleValues.map((value, index) => (
                            <div key={index} className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    {type === "COLOR" ? (
                                        <input
                                            type="color"
                                            value={value.colorHex || "#00932a"}
                                            onChange={(event) =>
                                                updateValue(index, {
                                                    colorHex:
                                                        event.target.value,
                                                })
                                            }
                                            aria-label={`Colour ${index + 1}`}
                                            className="size-12 shrink-0 cursor-pointer rounded-xl border border-[#e8e8e8] bg-white p-1"
                                        />
                                    ) : null}
                                    <Input
                                        value={value.value}
                                        onChange={(event) =>
                                            updateValue(index, {
                                                value: event.target.value,
                                            })
                                        }
                                        type={
                                            type === "NUMBER"
                                                ? "number"
                                                : "text"
                                        }
                                        step={
                                            type === "NUMBER"
                                                ? "any"
                                                : undefined
                                        }
                                        placeholder={copy.placeholder}
                                        aria-label={`${copy.label} ${index + 1}`}
                                        className={inventoryControlClassName}
                                    />
                                    {single ? null : (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-lg"
                                            aria-label={`Remove value ${index + 1}`}
                                            onClick={() => removeValue(index)}
                                            className="shrink-0 text-[#657064] hover:text-brand-red"
                                        >
                                            <Trash2 />
                                        </Button>
                                    )}
                                </div>
                                {single ? null : (
                                    <label className="flex items-center gap-2 pl-1 text-xs text-[#6b7280]">
                                        <input
                                            type="checkbox"
                                            checked={!value.available}
                                            onChange={(event) =>
                                                updateValue(index, {
                                                    available:
                                                        !event.target.checked,
                                                })
                                            }
                                            className="size-3.5 accent-[#d14341]"
                                        />
                                        Sold out — show but do not allow
                                        selecting
                                    </label>
                                )}
                            </div>
                        ))}
                    </div>
                    {single ? null : (
                        <Button
                            type="button"
                            variant="link"
                            size="xs"
                            onClick={() =>
                                setValues((current) => [
                                    ...current,
                                    emptyValue(),
                                ])
                            }
                            className="self-start px-0 text-[#657064] no-underline hover:text-primary hover:underline"
                        >
                            + Add more
                        </Button>
                    )}
                </div>
            ) : (
                <p className="rounded-xl bg-[#f7f8f7] px-4 py-3 text-sm text-[#657064]">
                    A toggle attribute is either on or off, so it takes
                    no values.
                </p>
            )}

            {error ? (
                <p className="text-xs text-brand-red" role="alert">
                    {error}
                </p>
            ) : null}

            <DialogFooter>
                <Button
                    type="button"
                    size="lg"
                    onClick={onClose}
                    className="rounded-full bg-brand-red px-8 text-white hover:bg-brand-red/90 focus-visible:ring-brand-red/30"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    size="lg"
                    className="rounded-full px-8"
                >
                    {isEditing ? "Save" : "Add"}
                </Button>
            </DialogFooter>
        </form>
    );
}
