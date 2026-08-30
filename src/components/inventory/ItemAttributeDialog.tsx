"use client";

import { useState, type SubmitEvent } from "react";
import { Trash2 } from "lucide-react";

import {
    charCountInputClassName,
    CharCountField,
} from "@/components/inventory/CharLimit";
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
import { SelectField, type SelectOption } from "@/components/ui/select-field";
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
    itemLimits,
    type ItemAttributePlacement,
    type ItemAttributeType,
    type StoredItemAttributePlacement,
    type StoredItemAttributeType,
} from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

export type AttributeValueDraft = {
    value: string;
    label: string;
    colorHex?: string;
    available: boolean;
};
export type AttributeDraft = {
    id: string;
    name: string;
    type: StoredItemAttributeType;
    placement: StoredItemAttributePlacement;
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

function withCurrent<T extends string>(
    options: SelectOption[],
    current: T,
    label: string,
) {
    return options.some((option) => option.value === current)
        ? options
        : [...options, { value: current, label }];
}

export function emptyValue(): AttributeValueDraft {
    return { value: "", label: "", available: true };
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

function isSingleValue(placement: StoredItemAttributePlacement) {
    return placement === "HIGHLIGHT" || placement === "SPECIFICATION";
}

function valueCopy(
    type: StoredItemAttributeType,
    placement: StoredItemAttributePlacement,
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

    if (type === "NUMBER") {
        return { label: "Attribute value", placeholder: "Add a number" };
    }

    return {
        label: "Attribute value",
        placeholder:
            type === "SELECTION" ? "Add an option" : "Add a value",
    };
}

export function ItemAttributeDialog({
    open,
    onOpenChange,
    initialAttribute,
    existingNames,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialAttribute?: AttributeDraft;
    existingNames: string[];
    onSubmit: (attribute: AttributeDraft) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
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
    const [type, setType] = useState<StoredItemAttributeType>(draft.type);
    const [placement, setPlacement] = useState<StoredItemAttributePlacement>(
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
    const valuesFull = values.length >= itemLimits.attributeValues;

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
                      available: value.available,
                  }))
                  .filter((value) => value.value)
            : [];

        if (
            placement === "OPTION" &&
            type === "SELECTION" &&
            !cleaned.length
        ) {
            showError("Add at least one option for shoppers to choose from.");
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
                    className="text-sm font-semibold text-[#424841] dark:text-[#cbd5e1]"
                >
                    Attribute name
                </Label>
                <CharCountField
                    length={name.length}
                    max={itemLimits.attributeName}
                >
                    <Input
                        id="attribute-name"
                        value={name}
                        maxLength={itemLimits.attributeName}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Status"
                        autoComplete="off"
                        aria-invalid={Boolean(error) && !name.trim()}
                        className={`${inventoryControlClassName} ${charCountInputClassName}`}
                    />
                </CharCountField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor="attribute-type"
                        className="text-sm font-semibold text-[#424841] dark:text-[#cbd5e1]"
                    >
                        Attribute type
                    </Label>
                    <SelectField
                        id="attribute-type"
                        options={withCurrent(
                            typeOptions,
                            type,
                            itemAttributeTypeLabels[type],
                        )}
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
                        className="text-sm font-semibold text-[#424841] dark:text-[#cbd5e1]"
                    >
                        Show as
                    </Label>
                    <SelectField
                        id="attribute-placement"
                        options={withCurrent(
                            placementOptions,
                            placement,
                            itemAttributePlacementLabels[placement].label,
                        )}
                        value={placement}
                        onValueChange={(next) => {
                            setPlacement(next as ItemAttributePlacement);
                            setError(null);
                        }}
                    />
                </div>
            </div>
            <p className="-mt-3 text-xs text-[#6b7280] dark:text-[#94a3b8]">
                {itemAttributePlacementLabels[placement].hint}
            </p>

            {showsIcon ? (
                <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold text-[#424841] dark:text-[#cbd5e1]">
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
                                            : "border-[#e8e8e8] dark:border-[#2a3042] bg-white dark:bg-[#1e2330] text-[#657064] dark:text-[#cbd5e1] hover:border-[#cfd6cc] dark:hover:border-[#384252]",
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
                    <Label className="text-sm font-semibold text-[#424841] dark:text-[#cbd5e1]">
                        {copy.label}
                    </Label>
                    <div className="flex flex-col gap-2">
                        {visibleValues.map((value, index) => (
                            <div key={index} className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <CharCountField
                                        length={value.value.length}
                                        max={itemLimits.attributeValue}
                                        className="min-w-0 flex-1"
                                    >
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
                                            maxLength={
                                                itemLimits.attributeValue
                                            }
                                            placeholder={copy.placeholder}
                                            aria-label={`${copy.label} ${index + 1}`}
                                            className={`${inventoryControlClassName} ${charCountInputClassName}`}
                                        />
                                    </CharCountField>
                                    {single ? null : (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-lg"
                                            aria-label={`Remove value ${index + 1}`}
                                            onClick={() => removeValue(index)}
                                            className="shrink-0 text-[#657064] dark:text-[#94a3b8] hover:text-danger"
                                        >
                                            <Trash2 className="size-4 text-brand-red" />
                                        </Button>
                                    )}
                                </div>
                                {single ? null : (
                                    <label className="flex items-center gap-2 pl-1 text-xs text-[#6b7280] dark:text-[#94a3b8]">
                                        <input
                                            type="checkbox"
                                            checked={!value.available}
                                            onChange={(event) =>
                                                updateValue(index, {
                                                    available:
                                                        !event.target.checked,
                                                })
                                            }
                                            className="size-3.5 accent-danger"
                                        />
                                        Sold out — show but do not allow
                                        selecting
                                    </label>
                                )}
                            </div>
                        ))}
                    </div>
                    {single ? null : (
                        <div className="flex flex-col items-start gap-1">
                            <Button
                                type="button"
                                variant="link"
                                size="xs"
                                disabled={valuesFull}
                                onClick={() =>
                                    setValues((current) => [
                                        ...current,
                                        emptyValue(),
                                    ])
                                }
                                className="self-start px-0 text-[#657064] dark:text-[#cbd5e1] no-underline hover:text-primary hover:underline"
                            >
                                + Add more
                            </Button>
                            {valuesFull ? (
                                <p className="text-xs text-[#6b7280] dark:text-[#94a3b8]">
                                    {itemLimits.attributeValues} values is the
                                    maximum.
                                </p>
                            ) : null}
                        </div>
                    )}
                </div>
            ) : (
                <p className="rounded-xl bg-[#f7f8f7] dark:bg-[#252a38] px-4 py-3 text-sm text-[#657064] dark:text-[#cbd5e1]">
                    A toggle attribute is either on or off, so it takes
                    no values.
                </p>
            )}

            <DialogFooter>
                <Button
                    type="button"
                    size="lg"
                    onClick={onClose}
                    className="rounded-full bg-brand-red px-8 text-white hover:bg-brand-red/90 focus-visible:ring-danger/30"
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
