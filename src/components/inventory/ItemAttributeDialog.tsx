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
import {
    itemAttributeTypeLabels,
    itemAttributeTypes,
    type ItemAttributeType,
} from "@/lib/api/inventory";

export type AttributeDraft = {
    id: string;
    name: string;
    type: ItemAttributeType;
    values: string[];
};

const typeOptions = itemAttributeTypes.map((type) => ({
    value: type,
    label: itemAttributeTypeLabels[type],
}));

/** Copy for the repeating value editor, per attribute type. */
const valueCopy: Record<
    ItemAttributeType,
    { label: string; placeholder: string; addMore: string } | null
> = {
    TEXT: {
        label: "Attribute value",
        placeholder: "Add a value",
        addMore: "Add more",
    },
    SELECTION: {
        label: "Attribute value",
        placeholder: "Add an option",
        addMore: "Add more",
    },
    NUMBER: {
        label: "Attribute value",
        placeholder: "Add a number",
        addMore: "Add more",
    },
    // A toggle is on or off — the API carries no values for it.
    TOGGLE: null,
};

function emptyDraft(): AttributeDraft {
    return { id: "", name: "", type: "TEXT", values: [""] };
}

/**
 * Add or edit one item attribute. Values are edited as a repeating list so a
 * selection can carry its options; text and number attributes use the same
 * list, which is how a "Size: S, M, L" style attribute is entered.
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
            <DialogContent className="max-w-md">
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
    const [values, setValues] = useState<string[]>(
        draft.values.length ? draft.values : [""],
    );
    const [error, setError] = useState<string | null>(null);

    const copy = valueCopy[type];

    function updateValue(index: number, next: string) {
        setValues((current) =>
            current.map((value, position) =>
                position === index ? next : value,
            ),
        );
    }

    function removeValue(index: number) {
        setValues((current) => {
            const remaining = current.filter(
                (_, position) => position !== index,
            );

            return remaining.length ? remaining : [""];
        });
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        // The dialog is portaled but still a React child of the item form —
        // without this, submitting here would submit the item too.
        event.stopPropagation();

        const trimmedName = name.trim();

        if (!trimmedName) {
            setError("Attribute name is required.");
            return;
        }

        if (existingNames.includes(trimmedName.toLowerCase())) {
            setError("An attribute with this name already exists.");
            return;
        }

        const trimmedValues = copy
            ? values.map((value) => value.trim()).filter(Boolean)
            : [];

        if (type === "SELECTION" && !trimmedValues.length) {
            setError("Add at least one option for a selection attribute.");
            return;
        }

        onSubmit({
            id: initialAttribute?.id || "",
            name: trimmedName,
            type,
            values: trimmedValues,
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

            {copy ? (
                <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold text-[#424841]">
                        {copy.label}
                    </Label>
                    <div className="flex flex-col gap-2">
                        {values.map((value, index) => (
                            <div
                                key={index}
                                className="relative flex items-center"
                            >
                                <Input
                                    value={value}
                                    onChange={(event) =>
                                        updateValue(
                                            index,
                                            event.target.value,
                                        )
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
                                    className={`${inventoryControlClassName} pr-12`}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Remove value ${index + 1}`}
                                    onClick={() => removeValue(index)}
                                    className="absolute right-1.5 text-[#657064] hover:text-accent"
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={() =>
                            setValues((current) => [...current, ""])
                        }
                        className="self-start px-0 text-[#657064] no-underline hover:text-primary hover:underline"
                    >
                        + {copy.addMore}
                    </Button>
                </div>
            ) : (
                <p className="rounded-xl bg-[#f7f8f7] px-4 py-3 text-sm text-[#657064]">
                    A toggle attribute is either on or off, so it takes
                    no values.
                </p>
            )}

            {error ? (
                <p className="text-xs text-accent" role="alert">
                    {error}
                </p>
            ) : null}

            <DialogFooter>
                <Button
                    type="button"
                    size="lg"
                    onClick={onClose}
                    className="rounded-full bg-accent px-8 text-white hover:bg-accent/90 focus-visible:ring-accent/30"
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
