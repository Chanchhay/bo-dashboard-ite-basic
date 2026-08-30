"use client";

import { useState, type SubmitEvent } from "react";
import { Dices, ImagePlus, LoaderCircle } from "lucide-react";

import {
    charCountInputClassName,
    CharCountField,
} from "@/components/inventory/CharLimit";
import {
    getApiErrorMessage,
    inventoryControlClassName,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useObjectUrls } from "@/components/ui/image-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { itemImageRules, itemLimits } from "@/lib/api/inventory";
import { cn } from "@/lib/utils";
import { useGenerateInventoryBarcodeMutation } from "@/services/inventoryApi";

export type OptionDraft = {
    id: string;
    variantId?: string;
    name: string;
    sku: string;
    barcode: string;
    imageUrl: string;
    colorValues: string[];
    /** Held until the item is saved — option images upload with the form. */
    file?: File;
    previewUrl?: string;
    available: boolean;
    price?: number;
};

export function emptyOption(id: string): OptionDraft {
    return {
        id,
        name: "",
        sku: "",
        barcode: "",
        imageUrl: "",
        colorValues: [],
        available: true,
    };
}

export function ItemOptionDialog({
    open,
    onOpenChange,
    seed,
    option,
    colors,
    existingNames,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Bumped by the caller on every open, so each one starts on a clean form. */
    seed?: number;
    /** Absent when adding. */
    option?: OptionDraft;
    colors: readonly { id: string; value: string; colorHex: string }[];
    /** Lower-cased, excluding the one being edited. */
    existingNames: string[];
    onSubmit: (option: OptionDraft) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <OptionForm
                    key={`${option?.id || "new"}-${seed ?? 0}`}
                    option={option}
                    colors={colors}
                    existingNames={existingNames}
                    onSubmit={onSubmit}
                    onClose={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

function OptionForm({
    option,
    colors,
    existingNames,
    onSubmit,
    onClose,
}: {
    option?: OptionDraft;
    colors: readonly { id: string; value: string; colorHex: string }[];
    existingNames: string[];
    onSubmit: (option: OptionDraft) => void;
    onClose: () => void;
}) {
    const isEditing = Boolean(option);
    const { toast } = useToast();
    const { create, release } = useObjectUrls();
    const [generateBarcode, generateBarcodeState] =
        useGenerateInventoryBarcodeMutation();

    const [name, setName] = useState(option?.name || "");
    const [sku, setSku] = useState(option?.sku || "");
    const [barcode, setBarcode] = useState(option?.barcode || "");
    const [available, setAvailable] = useState(option?.available !== false);
    const [colorValues, setColorValues] = useState<string[]>(
        option?.colorValues || [],
    );
    const [image, setImage] = useState<{
        file?: File;
        previewUrl?: string;
        imageUrl: string;
    }>({
        ...(option?.file ? { file: option.file } : {}),
        ...(option?.previewUrl ? { previewUrl: option.previewUrl } : {}),
        imageUrl: option?.imageUrl || "",
    });
    const [error, setError] = useState<string | null>(null);

    const namedColors = colors.filter((color) => color.value.trim());
    const preview = image.previewUrl || image.imageUrl;
    const label = name.trim() || "this option";

    function showError(message: string) {
        setError(message);
        toast({
            tone: "error",
            title: `Option not ${isEditing ? "updated" : "added"}`,
            description: message,
        });
    }

    function pickImage(file: File) {
        const message = itemImageRules.validate(file);

        if (message) {
            toast({
                tone: "error",
                title: "Option image not selected",
                description: message,
            });
            return;
        }

        release(image.previewUrl);
        setImage({ file, previewUrl: create(file), imageUrl: "" });
    }

    function removeImage() {
        release(image.previewUrl);
        setImage({ imageUrl: "" });
    }

    async function handleGenerateBarcode() {
        try {
            const result = await generateBarcode().unwrap();
            setBarcode(result.barcode);
        } catch (caught) {
            toast({
                tone: "error",
                title: "Barcode not generated",
                description: getApiErrorMessage(
                    caught,
                    "Unable to generate a unique barcode.",
                ),
            });
        }
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        event.stopPropagation();

        const trimmed = name.trim();

        if (!trimmed) {
            showError("An option needs a name.");
            return;
        }

        if (existingNames.includes(trimmed.toLowerCase())) {
            showError("This item already has an option by that name.");
            return;
        }

        onSubmit({
            id: option?.id || "",
            ...(option?.variantId ? { variantId: option.variantId } : {}),
            name: trimmed,
            sku: sku.trim(),
            barcode: barcode.trim(),
            imageUrl: image.imageUrl,
            ...(image.file ? { file: image.file } : {}),
            ...(image.previewUrl ? { previewUrl: image.previewUrl } : {}),
            colorValues,
            available,
            ...(option?.price === undefined ? {} : { price: option.price }),
        });
        onClose();
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <DialogHeader>
                <DialogTitle>
                    {isEditing ? "Edit option" : "Add option"}
                </DialogTitle>
                <DialogDescription>
                    A variation of this item — Small, Medium, Large. It is
                    scanned and counted on its own, and priced per sales channel
                    in Sale Management.
                </DialogDescription>
            </DialogHeader>

            <div className="flex gap-4">
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <Label className="self-start text-xs font-medium text-muted-foreground">
                        Image
                    </Label>
                    <label
                        className="group relative grid size-21.5 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/50 focus-within:border-primary"
                        title={
                            preview
                                ? `Replace the image for ${label}`
                                : `Add an image for ${label}`
                        }
                    >
                        <input
                            type="file"
                            accept={itemImageRules.accept}
                            aria-label={`Image for ${label}`}
                            className="sr-only"
                            onChange={(event) => {
                                const [file] = Array.from(
                                    event.target.files || [],
                                );
                                event.target.value = "";
                                if (file) pickImage(file);
                            }}
                        />
                        {preview ? (
                            <img
                                src={preview}
                                alt=""
                                className="size-full object-cover"
                            />
                        ) : (
                            <ImagePlus className="size-5" aria-hidden="true" />
                        )}
                    </label>
                    {preview ? (
                        <Button
                            type="button"
                            variant="link"
                            size="xs"
                            onClick={removeImage}
                            className="px-0 text-[11px] text-muted-foreground no-underline hover:text-danger hover:underline"
                        >
                            Remove
                        </Button>
                    ) : (
                        <span className="text-[11px] text-muted-foreground">
                            Optional
                        </span>
                    )}
                    {image.file ? (
                        <span className="text-[11px] text-muted-foreground">
                            Not saved yet
                        </span>
                    ) : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                        <Label
                            htmlFor="option-name"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Option name
                        </Label>
                        <CharCountField
                            length={name.length}
                            max={itemLimits.optionName}
                        >
                            <Input
                                id="option-name"
                                value={name}
                                maxLength={itemLimits.optionName}
                                onChange={(event) => {
                                    setName(event.target.value);
                                    setError(null);
                                }}
                                placeholder="e.g. Large"
                                autoComplete="off"
                                aria-invalid={Boolean(error)}
                                className={`${inventoryControlClassName} h-10 ${charCountInputClassName}`}
                            />
                        </CharCountField>
                        {error ? (
                            <p className="text-xs text-danger" role="alert">
                                {error}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label
                            htmlFor="option-sku"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            SKU
                        </Label>
                        <CharCountField
                            length={sku.length}
                            max={itemLimits.sku}
                        >
                            <Input
                                id="option-sku"
                                value={sku}
                                maxLength={itemLimits.sku}
                                onChange={(event) => setSku(event.target.value)}
                                placeholder="e.g. TEA-L"
                                autoComplete="off"
                                className={`${inventoryControlClassName} h-10 ${charCountInputClassName}`}
                            />
                        </CharCountField>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <Label
                    htmlFor="option-barcode"
                    className="text-xs font-medium text-muted-foreground"
                >
                    Barcode
                </Label>
                <div className="flex gap-2">
                    <Input
                        id="option-barcode"
                        value={barcode}
                        maxLength={itemLimits.barcode}
                        onChange={(event) => setBarcode(event.target.value)}
                        placeholder="Scan, type or generate"
                        autoComplete="off"
                        className={`${inventoryControlClassName} h-10 flex-1 font-mono`}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        disabled={generateBarcodeState.isLoading}
                        onClick={handleGenerateBarcode}
                        aria-label="Generate a unique barcode for this option"
                        title="Generate unique barcode"
                        className="shrink-0 self-center"
                    >
                        {generateBarcodeState.isLoading ? (
                            <LoaderCircle className="animate-spin" />
                        ) : (
                            <Dices />
                        )}
                    </Button>
                </div>
            </div>

            {namedColors.length ? (
                <div className="flex flex-col gap-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                        Comes in
                    </Label>
                    <div className="flex flex-wrap gap-2">
                        {namedColors.map((color) => {
                            const value = color.value.trim();
                            const ticked = colorValues.includes(value);

                            return (
                                <button
                                    key={color.id}
                                    type="button"
                                    aria-pressed={ticked}
                                    onClick={() =>
                                        setColorValues((current) =>
                                            ticked
                                                ? current.filter(
                                                      (held) => held !== value,
                                                  )
                                                : [...current, value],
                                        )
                                    }
                                    className={cn(
                                        "flex max-w-48 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                                        ticked
                                            ? "border-primary bg-primary/10 font-medium text-primary"
                                            : "border-border text-muted-foreground hover:border-primary/50",
                                    )}
                                >
                                    <span
                                        className="size-3.5 shrink-0 rounded-full border border-border"
                                        style={{
                                            background:
                                                color.colorHex || "transparent",
                                        }}
                                    />
                                    <span className="truncate">{value}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {colorValues.length
                            ? `${colorValues.length} countable ${colorValues.length === 1 ? "row" : "rows"} — stock is kept per colour.`
                            : "Not sold by colour; stock is kept for this option as a whole."}
                    </p>
                </div>
            ) : null}

            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-3">
                <span className="text-sm font-medium text-foreground">
                    On sale
                </span>
                <Switch
                    aria-label="On sale"
                    checked={available}
                    onCheckedChange={setAvailable}
                />
            </label>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button type="submit">{isEditing ? "Save" : "Add"}</Button>
            </DialogFooter>
        </form>
    );
}
