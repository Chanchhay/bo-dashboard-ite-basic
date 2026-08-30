"use client";

import { useState, type SubmitEvent } from "react";

import {
    charCountInputClassName,
    CharCountField,
} from "@/components/inventory/CharLimit";
import { ChoiceImageField } from "@/components/inventory/ChoiceImageField";
import {
    ColorSwatchField,
    paletteNameFor,
} from "@/components/inventory/ColorSwatchField";
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
import { useToast } from "@/components/ui/toast";
import { itemLimits } from "@/lib/api/inventory";

export type ItemColorDraft = {
    id: string;
    value: string;
    colorHex: string;
    imageUrl: string;
};

export function ItemColorDialog({
    open,
    onOpenChange,
    seed,
    color,
    existingNames,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Bumped by the caller on every open, so each one starts on a clean form. */
    seed?: number;
    /** Absent when adding. */
    color?: ItemColorDraft;
    /** Lower-cased, excluding the one being edited. */
    existingNames: string[];
    onSubmit: (color: ItemColorDraft) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <ColorForm
                    key={`${color?.id || "new"}-${seed ?? 0}`}
                    color={color}
                    existingNames={existingNames}
                    onSubmit={onSubmit}
                    onClose={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

function ColorForm({
    color,
    existingNames,
    onSubmit,
    onClose,
}: {
    color?: ItemColorDraft;
    existingNames: string[];
    onSubmit: (color: ItemColorDraft) => void;
    onClose: () => void;
}) {
    const isEditing = Boolean(color);
    const [value, setValue] = useState(color?.value || "");
    const [colorHex, setColorHex] = useState(color?.colorHex || "");
    const [imageUrl, setImageUrl] = useState(color?.imageUrl || "");
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    function showError(message: string) {
        setError(message);
        toast({
            tone: "error",
            title: `Colour not ${isEditing ? "updated" : "added"}`,
            description: message,
        });
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        event.stopPropagation();

        const name = value.trim();

        if (!name) {
            showError("A colour needs a name.");
            return;
        }

        if (existingNames.includes(name.toLowerCase())) {
            showError("This item already has a colour by that name.");
            return;
        }

        onSubmit({
            id: color?.id || "",
            value: name,
            colorHex: colorHex.trim(),
            imageUrl: imageUrl.trim(),
        });
        onClose();
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <DialogHeader>
                <DialogTitle>
                    {isEditing ? "Edit colour" : "Add colour"}
                </DialogTitle>
                <DialogDescription>
                    Named and photographed once. Every option then ticks the
                    colours it comes in.
                </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
                <Label
                    htmlFor="colour-value"
                    className="text-sm font-semibold text-foreground"
                >
                    Name shown to shoppers
                </Label>
                <CharCountField
                    length={value.length}
                    max={itemLimits.colorName}
                >
                    <Input
                        id="colour-value"
                        value={value}
                        maxLength={itemLimits.colorName}
                        onChange={(event) => {
                            setValue(event.target.value);
                            setError(null);
                        }}
                        placeholder={paletteNameFor(colorHex) || "Red"}
                        autoComplete="off"
                        aria-invalid={Boolean(error)}
                        className={`${inventoryControlClassName} ${charCountInputClassName}`}
                    />
                </CharCountField>
                {error ? (
                    <p className="text-xs text-danger" role="alert">
                        {error}
                    </p>
                ) : null}
            </div>

            <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold text-foreground">
                    Swatch
                </Label>
                <ColorSwatchField
                    value={colorHex}
                    onChange={setColorHex}
                    onPickName={(picked) => setValue(picked)}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold text-foreground">
                    Photo
                </Label>
                <ChoiceImageField
                    value={imageUrl}
                    label={`${value.trim() || "Colour"} photo`}
                    onChange={setImageUrl}
                />
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button type="submit">{isEditing ? "Save" : "Add"}</Button>
            </DialogFooter>
        </form>
    );
}
