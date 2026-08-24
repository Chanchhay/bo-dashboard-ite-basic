"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type SubmitEvent,
} from "react";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Dices,
    Download,
    Eye,
    ImagePlus,
    LoaderCircle,
    Pencil,
    Plus,
    Save,
    Trash2,
} from "lucide-react";
import { attributeIcon } from "@/lib/api/attribute-icons";
import {
    itemAttributePlacementLabels,
    itemAttributeTypeLabels,
} from "@/lib/api/inventory";

import { cn } from "@/lib/utils";
import { BarcodePreview } from "@/components/inventory/BarcodePreview";
import { ChoiceImageField } from "@/components/inventory/ChoiceImageField";
import { ColorSwatchButton } from "@/components/inventory/ColorSwatchField";
import {
    createBlockId,
    DescriptionBlockEditor,
    type BlockDraft,
} from "@/components/inventory/DescriptionBlockEditor";
import {
    emptyValue,
    ItemAttributeDialog,
    type AttributeDraft,
} from "@/components/inventory/ItemAttributeDialog";
import { AddOnDialog } from "@/components/inventory/config/AddOnDialog";
import { ItemPickerDialog } from "@/components/inventory/ItemPickerDialog";
import {
    ItemPreviewDialog,
    type PreviewItem,
} from "@/components/inventory/ItemPreviewDialog";
import {
    emptyUomDraft,
    ItemUomCard,
    type ItemUomDraft,
} from "@/components/inventory/ItemUomCard";
import {
    getApiErrorMessage,
    InventoryError,
    InventoryLoading,
    InventoryPageHeader,
    inventoryControlClassName,
    inventoryTextareaClassName,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { ImageDropzone, useObjectUrls } from "@/components/ui/image-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/hooks/useMoney";
import {
    inventoryItemSchema,
    itemImageRules,
    itemStatuses,
    itemTypeLabels,
    itemTypes,
    maxItemImages,
    type AddOn,
    type DescriptionBlock,
    type OptionPreset,
    type InventoryItem,
    type ItemAttribute,
    type ItemAttributePlacement,
    type StoredItemType,
} from "@/lib/api/inventory";
import { formatAmount } from "@/lib/inventory-config/units";
import {
    useCreateAddOnMutation,
    useCreateInventoryItemMutation,
    useDeleteItemImageMutation,
    useGenerateInventoryBarcodeMutation,
    useGetAddOnsQuery,
    useGetInventoryItemQuery,
    useGetOptionPresetsQuery,
    useGetInventoryUnitsQuery,
    useGetItemGroupsQuery,
    useReorderItemImagesMutation,
    useUpdateInventoryItemMutation,
} from "@/services/inventoryApi";
import { useUploadAssetMutation } from "@/services/assetApi";

type PickedImage = {
    id: string;
    file: File;
    previewUrl: string;
};

type FieldProps = {
    label: string;
    name: string;
    error?: string;
    children: ReactNode;
};

function Field({ label, name, error, children }: FieldProps) {
    return (
        <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={name} className="text-sm font-semibold text-foreground">
                {label}
            </Label>
            {children}
            {error ? (
                <p className="text-xs text-danger" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function ImageTile({
    url,
    label,
    busy,
    onRemove,
    onMoveBack,
    onMoveForward,
}: {
    url: string;
    label: string;
    busy: boolean;
    onRemove: () => void;
    onMoveBack?: () => void;
    onMoveForward?: () => void;
}) {
    return (
        <li className="group relative overflow-hidden rounded-xl border border-border bg-muted">
            <span className="block aspect-square">
                <img src={url} alt="" className="size-full object-cover" />
            </span>
            <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-[11px] text-white">
                {label}
            </span>
            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {onMoveBack ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={busy}
                        aria-label={`Move ${label} earlier`}
                        onClick={onMoveBack}
                        className="size-8"
                    >
                        <ChevronLeft />
                    </Button>
                ) : null}
                {onMoveForward ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={busy}
                        aria-label={`Move ${label} later`}
                        onClick={onMoveForward}
                        className="size-8"
                    >
                        <ChevronRight />
                    </Button>
                ) : null}
                <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    disabled={busy}
                    aria-label={`Remove ${label}`}
                    onClick={onRemove}
                    className="size-8"
                >
                    <Trash2 />
                </Button>
            </div>
        </li>
    );
}

function SectionHeading({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

function createRowId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toAttributeDrafts(
    attributes: ItemAttribute[] | undefined,
): AttributeDraft[] {
    return (attributes || []).map((attribute) => ({
        id: createRowId(),
        name: attribute.name || "",
        type: attribute.type || "TEXT",
        placement: attribute.placement || "OPTION",
        icon: attribute.icon || "",
        values: (attribute.values || []).map((value) => ({
            value: value.value || "",
            label: value.label || "",
            colorHex: value.colorHex || "",
            available: value.available !== false,
        })),
    }));
}

function describeAttribute(attribute: AttributeDraft) {
    if (attribute.type === "TOGGLE") {
        return "On or off";
    }

    return attribute.values.length
    ? attribute.values.map((value) => value.label || value.value).join(", ")
        : "No values";
}

function toBlockDrafts(blocks: DescriptionBlock[] | undefined): BlockDraft[] {
    return (blocks || []).map((block) => ({
        id: createBlockId(),
        type: block.type || "PARAGRAPH",
        text: block.text || "",
        items: (block.items || []).join("\n"),
        url: block.url || "",
        caption: block.caption || "",
        columns: (block.columns || []).map((column) => ({
            id: createBlockId(),
            blocks: toBlockDrafts(column.blocks),
        })),
    }));
}

function hasUploadingImage(blocks: BlockDraft[]): boolean {
    return blocks.some(
        (block) =>
            block.uploading ||
            block.columns.some((column) => hasUploadingImage(column.blocks)),
    );
}

type BlockPayload = {
    type: BlockDraft["type"];
    text: string;
    items: string[];
    url: string;
    caption: string;
    columns: { blocks: BlockPayload[] }[];
};

function fromBlockDraft(block: BlockDraft): BlockPayload {
    return {
        type: block.type,
        text: block.text,
        items: block.items
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        url: block.url,
        caption: block.caption,
        columns: block.columns.map((column) => ({
            blocks: column.blocks.map(fromBlockDraft),
        })),
    };
}

function preservedCommerceFields(initialItem: InventoryItem | undefined) {
    return {
        price: initialItem?.price,
        compareAtPrice: initialItem?.compareAtPrice,
        variants: (initialItem?.variants || [])
            .filter((variant) => variant.name?.trim())
            .map((variant) => ({
                name: variant.name || "",
                available: variant.available !== false,
                ...(variant.price == null ? {} : { price: variant.price }),
            })),
    };
}
type ItemColorDraft = {
    id: string;
    value: string;
    colorHex: string;
    imageUrl: string;
};

function toVariantRows(rows: OptionRow[]) {
    return rows.flatMap((row) => {
        const size = row.name.trim();

        if (!row.colorValues.length) {
            return [
                {
                    name: size,
                    sku: row.sku.trim(),
                    barcode: row.barcode.trim(),
                    imageUrl: row.imageUrl,
                    optionName: size,
                    colorValue: "",
                    available: row.available,
                    ...(row.price === undefined ? {} : { price: row.price }),
                },
            ];
        }

        return row.colorValues.map((colour, index) => ({
            name: `${size} / ${colour}`,
            sku: index === 0 ? row.sku.trim() : "",
            barcode: index === 0 ? row.barcode.trim() : "",
            imageUrl: row.imageUrl,
            optionName: size,
            colorValue: colour,
            available: row.available,
            ...(row.price === undefined ? {} : { price: row.price }),
        }));
    });
}

function emptyOption(): OptionRow {
    return {
        id: createRowId(),
        name: "",
        sku: "",
        barcode: "",
        imageUrl: "",
        colorValues: [],
        available: true,
    };
}

type OptionRow = {
    id: string;
    variantId?: string;
    name: string;
    sku: string;
    barcode: string;
    imageUrl: string;
    colorValues: string[];
    file?: File;
    previewUrl?: string;
    available: boolean;
    price?: number;
};

function OptionImageField({
    option,
    index,
    disabled,
    onChange,
}: {
    option: OptionRow;
    index: number;
    disabled: boolean;
    onChange: (patch: Partial<OptionRow>) => void;
}) {
    const { create, release } = useObjectUrls();
    const { toast } = useToast();
    const preview = option.previewUrl || option.imageUrl;
    const label = option.name || `Option ${index + 1}`;

    function handlePick(file: File) {
        const message = itemImageRules.validate(file);

        if (message) {
            toast({
                tone: "error",
                title: "Option image not selected",
                description: message,
            });
            return;
        }

        release(option.previewUrl);
        onChange({ file, previewUrl: create(file), imageUrl: "" });
    }

    function handleRemove() {
        release(option.previewUrl);
        onChange({ file: undefined, previewUrl: undefined, imageUrl: "" });
    }

    return (
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
                    disabled={disabled}
                    aria-label={`Image for ${label}`}
                    className="sr-only"
                    onChange={(event) => {
                        const [file] = Array.from(event.target.files || []);
                        event.target.value = "";
                        if (file) handlePick(file);
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
                    onClick={handleRemove}
                    className="px-0 text-[11px] text-muted-foreground no-underline hover:text-danger hover:underline"
                >
                    Remove
                </Button>
            ) : (
        <span className="text-[11px] text-muted-foreground">Optional</span>
            )}
            {option.file ? (
        <span className="text-[11px] text-muted-foreground">Not saved yet</span>
            ) : null}
        </div>
    );
}

const fieldLabels: Record<string, string> = {
    itemGroupId: "Category",
    unitId: "Base unit of measure",
    name: "Item name",
    sku: "SKU",
    code: "Internal code",
    description: "Description",
    badge: "Badge",
    barcode: "Barcode",
    price: "Price",
    compareAtPrice: "Compare-at price",
    itemType: "Item type",
    attributes: "Attributes",
    descriptionBlocks: "Store page",
    variants: "Variants",
    lowStockDefault: "Low-stock threshold",
    status: "Status",
};

function fieldErrorsFromIssues(
    issues: { path: PropertyKey[]; message: string }[],
) {
    const errors: Record<string, string> = {};

    for (const issue of issues) {
        const field = String(issue.path[0] || "form");
        errors[field] ||= issue.message;
    }

    return errors;
}

function ProductEditor({ initialItem }: { initialItem?: InventoryItem }) {
    const router = useRouter();
    const { toast } = useToast();
    const { data: groups, error: groupsError } = useGetItemGroupsQuery();
    const { data: units, error: unitsError } = useGetInventoryUnitsQuery();
    const { format: formatMoney } = useMoney();
    const [createItem, createState] = useCreateInventoryItemMutation();
    const [updateItem, updateState] = useUpdateInventoryItemMutation();
    const [generateBarcode, generateBarcodeState] =
        useGenerateInventoryBarcodeMutation();
    const [trackInventory, setTrackInventory] = useState<boolean>(
        () => initialItem?.trackInventory ?? (initialItem?.itemType ? initialItem.itemType === "PHYSICAL" : true),
    );
    const [attributes, setAttributes] = useState(() =>
        toAttributeDrafts(initialItem?.attributes),
    );
    const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
    const [editingAttributeId, setEditingAttributeId] = useState<string | null>(
        null,
    );
    const [newPlacement, setNewPlacement] =
        useState<ItemAttributePlacement>("OPTION");
    const [attachedAddOnIds, setAttachedAddOnIds] = useState<string[]>(() =>
        (initialItem?.addOns || []).map((addOn) => addOn.id),
    );
    const [addOnPickerOpen, setAddOnPickerOpen] = useState(false);
    const [presetPickerOpen, setPresetPickerOpen] = useState(false);
    const { data: optionPresets } = useGetOptionPresetsQuery();
    const [newAddOnOpen, setNewAddOnOpen] = useState(false);
    const updateOption = (id: string, patch: Partial<OptionRow>) =>
        setOptions((current) =>
            current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
        );

    const [options, setOptions] = useState<OptionRow[]>(() => {
        const rows: OptionRow[] = [];
        const bySize = new Map<string, OptionRow>();

        for (const variant of initialItem?.variants || []) {
            const size = (variant.optionName || variant.name || "").trim();
            const colour = (variant.colorValue || "").trim();
            const key = size.toLowerCase();
            const held = bySize.get(key);

            if (held) {
                if (colour && !held.colorValues.includes(colour)) {
                    held.colorValues.push(colour);
                }
                continue;
            }

            const row: OptionRow = {
                id: variant.id || createRowId(),
                ...(variant.id ? { variantId: variant.id } : {}),
                name: size,
                sku: variant.sku || "",
                barcode: variant.barcode || "",
                imageUrl: variant.imageUrl || "",
                colorValues: colour ? [colour] : [],
                available: variant.available !== false,
                price: variant.price ?? undefined,
            };

            bySize.set(key, row);
            rows.push(row);
        }

        return rows;
    });

    const [colors, setColors] = useState<ItemColorDraft[]>(() =>
        (initialItem?.colors || []).map((color) => ({
            id: createRowId(),
            value: color.value || "",
            colorHex: color.colorHex || "",
            imageUrl: color.imageUrl || "",
        })),
    );
    const { data: addOnLibrary } = useGetAddOnsQuery();
    const [createAddOnRecord, createAddOnState] = useCreateAddOnMutation();
    const [uomDraft, setUomDraft] = useState<ItemUomDraft>(() => ({
        ...emptyUomDraft,
        baseUnitId: initialItem?.unit?.id || "",
        conversions: (() => {
            const sizeOfVariant = new Map<string, string>();
            for (const variant of initialItem?.variants || []) {
                if (variant.id) {
                    sizeOfVariant.set(
                        variant.id,
                        (variant.optionName || variant.name || "").trim().toLowerCase(),
                    );
                }
            }

            const rowOfSize = new Map<string, string>();
            for (const row of options) {
                rowOfSize.set(row.name.trim().toLowerCase(), row.id);
            }

            const seen = new Set<string>();

            return (initialItem?.uomConversions || [])
                .filter((conversion) => conversion.unit?.id)
                .flatMap((conversion) => {
                    const size = conversion.variantId
            ? (sizeOfVariant.get(conversion.variantId) ?? "")
                        : "";
                    const rowId = size ? rowOfSize.get(size) : undefined;

                    const key = `${conversion.unit?.id}|${size}`;
                    if (seen.has(key)) return [];
                    seen.add(key);

                    return [
                        {
                            id: conversion.id || createRowId(),
                            unitId: conversion.unit?.id || "",
                            factor: conversion.factor ?? 1,
                            ...(rowId ? { variantId: rowId } : {}),
                        },
                    ];
                });
        })(),
    }));
    const namedColors = useMemo(
        () => colors.filter((color) => color.value.trim()),
        [colors],
    );

    const namedOptions = useMemo(
        () =>
            options
                .filter((option) => option.name.trim())
                .map((option) => ({ id: option.id, name: option.name.trim() })),
        [options],
    );
    function removeOption(rowId: string) {
        const orphaned = uomDraft.conversions.filter(
            (conversion) => conversion.variantId === rowId,
        );
        setOptions((current) => current.filter((row) => row.id !== rowId));

        if (orphaned.length) {
            setUomDraft((current) => ({
                ...current,
                conversions: current.conversions.filter(
                    (conversion) => conversion.variantId !== rowId,
                ),
            }));
            toast({
                tone: "info",
                title: `${orphaned.length === 1 ? "A conversion was" : `${orphaned.length} conversions were`} removed too`,
                description:
                    "They were declared for that option, so they went with it.",
            });
        }
    }
    const [barcodePreview, setBarcodePreview] = useState(
        initialItem?.barcode || "",
    );
    const storedImages = useMemo(
        () =>
            (initialItem?.images || [])
                .filter((image) => image.url)
                .sort((a, b) => (a.position || 0) - (b.position || 0)),
        [initialItem?.images],
    );
    const [pickedImages, setPickedImages] = useState<PickedImage[]>([]);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const { create: createObjectUrl, release: releaseObjectUrl } =
        useObjectUrls();
    const [blocks, setBlocks] = useState(() =>
        toBlockDrafts(initialItem?.descriptionBlocks),
    );
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const [deleteImage, deleteImageState] = useDeleteItemImageMutation();
    const [uploadAsset] = useUploadAssetMutation();
    const [reorderImages, reorderImagesState] = useReorderItemImagesMutation();
    const isEditing = Boolean(initialItem);
    const isSaving = createState.isLoading || updateState.isLoading;
    const isUploadingBlockImage = hasUploadingImage(blocks);
    const galleryCount = storedImages.length + pickedImages.length;
    const galleryUrls = [
        ...storedImages.map((image) => image.url || ""),
        ...pickedImages.map((image) => image.previewUrl),
    ].filter(Boolean);

    function handleImagesPicked(picked: File[]) {
        setPickedImages((current) => [
            ...current,
            ...picked.map((file) => ({
                id: createRowId(),
                file,
                previewUrl: createObjectUrl(file),
            })),
        ]);
    }

    async function handleGenerateBarcode() {
        try {
            const result = await generateBarcode().unwrap();
            setBarcodePreview(result.barcode);
            setFieldErrors((current) => {
                if (!current.barcode) return current;

                const next = { ...current };
                delete next.barcode;
                return next;
            });
        } catch (error) {
            toast({
                tone: "error",
                title: "Barcode not generated",
                description: getApiErrorMessage(
                    error,
                    "Unable to generate a unique barcode.",
                ),
            });
        }
    }

    async function generateOptionBarcode(id: string) {
        try {
            const result = await generateBarcode().unwrap();
            updateOption(id, { barcode: result.barcode });
        } catch (error) {
            toast({
                tone: "error",
                title: "Barcode not generated",
                description: getApiErrorMessage(
                    error,
                    "Unable to generate a unique barcode.",
                ),
            });
        }
    }

    function removePickedImage(id: string) {
        setPickedImages((current) => {
            const removed = current.find((image) => image.id === id);
            releaseObjectUrl(removed?.previewUrl);

            return current.filter((image) => image.id !== id);
        });
    }

    async function moveStoredImage(index: number, delta: number) {
        const target = index + delta;

        if (target < 0 || target >= storedImages.length || !initialItem) {
            return;
        }

        const order = storedImages.map((image) => image.id || "");
        [order[index], order[target]] = [order[target], order[index]];

        try {
            await reorderImages({
                itemId: initialItem.id,
                imageIds: order,
            }).unwrap();
            toast({
                tone: "success",
                title: "Images reordered",
                description: "The item gallery order was updated.",
            });
        } catch (error) {
            toast({
                tone: "error",
                title: "Images not reordered",
        description: getApiErrorMessage(error, "Unable to reorder the images."),
            });
        }
    }

    async function removeStoredImage(imageId: string) {
        if (!initialItem) return;

        try {
            await deleteImage({ itemId: initialItem.id, imageId }).unwrap();
            toast({ tone: "success", title: "Item image deleted" });
        } catch (error) {
            toast({
                tone: "error",
                title: "Item image not deleted",
        description: getApiErrorMessage(error, "Unable to remove that image."),
            });
        }
    }

    const categoryGroups = useMemo(
        () =>
            (groups || []).map((group) => ({
                id: group.id,
                label: group.name || "Unnamed category",
                subGroups: (group.subGroups || []).map((subGroup) => ({
                    id: subGroup.id,
                    label: subGroup.name || "Unnamed",
                })),
            })),
        [groups],
    );

    const categoryOptions = useMemo(
        () =>
            categoryGroups.flatMap((group) =>
        group.subGroups.length
          ? group.subGroups.map((subGroup) => ({
                    id: subGroup.id,
                    label: `${group.label} / ${subGroup.label}`,
            }))
          : [{ id: group.id, label: group.label }],
            ),
        [categoryGroups],
    );

    const editingAttribute = attributes.find(
        (attribute) => attribute.id === editingAttributeId,
    );
    const dialogAttribute: AttributeDraft = editingAttribute ?? {
        id: "",
        name: "",
        type: newPlacement === "OPTION" ? "SELECTION" : "TEXT",
        placement: newPlacement,
        icon: "",
        values: [emptyValue()],
    };

    function openAttributeDialog(
        id: string | null,
        placement: ItemAttributePlacement = "OPTION",
    ) {
        setEditingAttributeId(id);
        if (!id) setNewPlacement(placement);
        setAttributeDialogOpen(true);
    }

    function saveAttribute(draft: AttributeDraft) {
        setAttributes((current) =>
            draft.id
                ? current.map((attribute) =>
                    attribute.id === draft.id ? draft : attribute,
                )
                : [...current, { ...draft, id: createRowId() }],
        );
    }

    function applyPreset(preset: OptionPreset) {
        const existing = options.filter((row) => row.name.trim());
    const taken = new Set(existing.map((row) => row.name.trim().toLowerCase()));

        if (preset.type === "COLOR") {
            const held = new Set(
                colors.map((color) => color.value.trim().toLowerCase()),
            );
            const fresh = (preset.values || [])
                .filter((value) => {
                    const name = (value.value || "").trim();
                    return name && !held.has(name.toLowerCase());
                })
                .map((value) => ({
                    id: createRowId(),
                    value: (value.value || "").trim(),
                    colorHex: value.colorHex || "",
                    imageUrl: value.imageUrl || "",
                }));

            if (!fresh.length) {
                toast({
                    tone: "error",
                    title: `${preset.name} not added`,
                    description: "This item already has every one of those colours.",
                });
                return;
            }

            setColors((current) => [...current, ...fresh]);
            toast({
                tone: "success",
                title: `${preset.name} added`,
                description: "Tick the sizes that come in them.",
            });
            return;
        }

        const added: OptionRow[] = (preset.values || [])
            .filter((value) => {
                const name = (value.value || "").trim();
                return name && !taken.has(name.toLowerCase());
            })
            .map((value) => ({
                ...emptyOption(),
                name: (value.value || "").trim(),
            }));

        if (!added.length) {
            toast({
                tone: "error",
                title: `${preset.name} not added`,
                description: "This item already has every one of those options.",
            });
            return;
        }

        setOptions([...existing, ...added]);
        toast({
            tone: "success",
            title: `${preset.name} added`,
            description: `${added.length} ${added.length === 1 ? "option" : "options"} added — adjust them for this item as needed.`,
        });
    }

    const attachedAddOns = attachedAddOnIds
        .map((id) => (addOnLibrary || []).find((addOn) => addOn.id === id))
        .filter((addOn) => addOn !== undefined);

    const describeAddOnUse = (addOn: AddOn) =>
        `Uses ${formatAmount(addOn.usePerOrder ?? 1)} ${
            addOn.baseUnit?.name || "unit"
        } per order`;

    const configUnits = useMemo(
        () =>
            (units || []).map((unit) => ({
                id: unit.id,
                name: unit.name || "Unnamed unit",
                symbol: unit.symbol || "",
                category: unit.category || ("COUNT" as const),
                system: unit.system !== false,
            })),
        [units],
    );

    async function createAddOn(draft: {
        name: string;
        baseUnitId: string;
        usePerOrder: number;
        conversions: { unitId: string; factor: number }[];
    }) {
        try {
            const created = await createAddOnRecord({
                name: draft.name,
                baseUnitId: draft.baseUnitId,
                usePerOrder: draft.usePerOrder,
                uomConversions: draft.conversions.map((conversion) => ({
                    unitId: conversion.unitId,
                    factor: conversion.factor,
                })),
                note: "",
            }).unwrap();

            attachAddOns([created.id]);
            toast({
                tone: "success",
                title: `${created.name || draft.name} created`,
                description: "Attached to this item and added to the library.",
            });
        } catch (error) {
            toast({
                tone: "error",
                title: "Add-on not created",
        description: getApiErrorMessage(error, "Unable to create that add-on."),
            });
        }
    }

    function detachAddOn(id: string) {
        setAttachedAddOnIds((current) =>
            current.filter((addOnId) => addOnId !== id),
        );
    }

    function attachAddOns(ids: string[]) {
        setAttachedAddOnIds((current) => [
            ...current,
            ...ids.filter((id) => !current.includes(id)),
        ]);
    }
    function openPreview() {
        const form = formRef.current;
        if (!form) return;

        const formData = new FormData(form);
        const read = (field: string) => String(formData.get(field) || "");
        const categoryId = read("itemGroupId");
        const unitId = read("unitId");
        const preserved = preservedCommerceFields(initialItem);

        setPreviewItem({
            name: read("name"),
            description: read("description"),
            images: galleryUrls,
            badge: read("badge"),
            price: preserved.price ?? undefined,
            compareAtPrice: preserved.compareAtPrice ?? undefined,
            sku: read("sku"),
            categoryName:
        categoryOptions.find((option) => option.id === categoryId)?.label || "",
      unitName: (units || []).find((unit) => unit.id === unitId)?.name || "",
            itemType: (read("itemType") || "PHYSICAL") as StoredItemType,
      status: (read("status") || "ACTIVE") as (typeof itemStatuses)[number],
            attributes: attributes.map((attribute) => ({
                name: attribute.name,
                type: attribute.type,
                placement: attribute.placement,
                icon: attribute.icon,
                values: attribute.values,
            })),
            descriptionBlocks: blocks.map(fromBlockDraft),
            variants: options
                .filter((option) => option.name.trim())
                .map((option) => ({
                    name: option.name.trim(),
                    price: option.price,
                    available: option.available,
                    imageUrl: option.previewUrl || option.imageUrl,
                    colorValues: option.colorValues,
                })),
            colors: colors
                .filter((color) => color.value.trim())
                .map((color) => ({
                    value: color.value.trim(),
                    colorHex: color.colorHex.trim() || undefined,
                    imageUrl: color.imageUrl.trim() || undefined,
                })),
            packs: uomDraft.conversions
                .map((conversion) => {
                    const unit = (units || []).find(
                        (row) => row.id === conversion.unitId,
                    );
          const option = options.find((row) => row.id === conversion.variantId);
                    const variantName = option?.name.trim() || "";
                    const saved = (initialItem?.uomConversions || []).find(
                        (row) =>
                            row.unit?.id === conversion.unitId &&
                            (row.variantName || "") === variantName,
                    );

                    return {
                        unitName: unit?.name || "Pack",
                        factor: conversion.factor,
                        price: saved?.price ?? undefined,
                        ...(variantName ? { variantName } : {}),
                    };
                })
                .filter((packRow) => packRow.factor > 0),
        });
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const namedRows = options.filter((option) => option.name.trim());
        const attributeValues = attributes.map((attribute) => ({
            name: attribute.name,
            type: attribute.type,
            placement: attribute.placement,
            icon: attribute.icon,
            values: attribute.values,
        }));
        if (namedOptions.length) {
            const stray = uomDraft.conversions.find(
                (conversion) =>
          !namedOptions.some((option) => option.id === conversion.variantId),
            );

            if (stray) {
        const unit = (units || []).find((row) => row.id === stray.unitId);

                toast({
                    tone: "error",
                    title: `Item not ${isEditing ? "updated" : "created"}`,
                    description: `This item is sold in options, so the ${
                        unit?.name || "larger"
                    } conversion has to say which one it is for. Pick an option on the highlighted row under Conversions, or remove it.`,
                });
                document
                    .getElementById("conversion-option")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
            }
        }

        const result = inventoryItemSchema.safeParse({
            itemGroupId: String(formData.get("itemGroupId") || ""),
            unitId: uomDraft.baseUnitId || String(formData.get("unitId") || ""),
            name: String(formData.get("name") || ""),
            sku: String(formData.get("sku") || ""),
            code: initialItem?.code || "",
            description: String(formData.get("description") || ""),
            badge: String(formData.get("badge") || ""),
            barcode: String(formData.get("barcode") || ""),
            itemType: String(formData.get("itemType") || ""),
            trackInventory,
            attributes: attributeValues,
            descriptionBlocks: blocks.map(fromBlockDraft),
            lowStockDefault: Number(formData.get("lowStockDefault") || 0),
            status: String(formData.get("status") || ""),
            ...preservedCommerceFields(initialItem),
            variants: toVariantRows(namedRows),
            colors: colors
                .filter((color) => color.value.trim())
                .map((color) => ({
                    value: color.value.trim(),
                    colorHex: color.colorHex.trim(),
                    imageUrl: color.imageUrl.trim(),
                })),
            addOnIds: attachedAddOnIds,
            uomConversions: uomDraft.conversions.flatMap((conversion) => {
                const option = options.find(
                    (row) => row.id === conversion.variantId,
                );
                const saved = (initialItem?.uomConversions || []).find(
                    (row) => row.id && row.id === conversion.id,
                );

                const base = {
                    unitId: conversion.unitId,
                    factor: conversion.factor,
                    ...(saved?.price == null ? {} : { price: saved.price }),
                };

                const size = option?.name.trim();

                if (!size) return [base];

                if (!option?.colorValues.length) {
                    return [
                        {
                            ...base,
              ...(option?.variantId ? { variantId: option.variantId } : {}),
                            variantName: size,
                        },
                    ];
                }

                return option.colorValues.map((colour) => ({
                    ...base,
                    variantName: `${size} / ${colour}`,
                }));
            }),
        });

        if (!result.success) {
            const errors = fieldErrorsFromIssues(result.error.issues);
            setFieldErrors(errors);

            const [firstIssue] = result.error.issues;
            const field = String(firstIssue?.path[0] ?? "form");
            const label = fieldLabels[field];

            toast({
                tone: "error",
                title: `Item not ${isEditing ? "updated" : "created"}`,
                description: label
                    ? `${label}: ${firstIssue?.message}`
          : (firstIssue?.message ?? "Check the highlighted item information."),
            });

            document
                .getElementById(field)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        setFieldErrors({});

        let variants = result.data.variants;

        try {
            variants = await Promise.all(
                variants.map(async (variant, index) => {
                    const file = namedRows[index]?.file;

                    if (!file) return variant;

                    const asset = await uploadAsset(file).unwrap();

                    if (!asset.url) {
                        throw new Error("The upload returned no URL.");
                    }

                    return { ...variant, imageUrl: asset.url };
                }),
            );
        } catch (error) {
            toast({
                tone: "error",
                title: "Option image not uploaded",
                description: getApiErrorMessage(
                    error,
                    "Unable to upload an option image, so nothing was saved. Try again.",
                ),
            });
            return;
        }

        const body = { ...result.data, variants };

        try {
            const files = pickedImages.map((image) => image.file);

            if (initialItem) {
                await updateItem({
                    itemId: initialItem.id,
                    body,
                    files,
                }).unwrap();
            } else {
                await createItem({ body, files }).unwrap();
            }
            toast({
                tone: "success",
                title: `Item ${isEditing ? "updated" : "created"}`,
                description: `${result.data.name} was saved successfully.`,
            });
            router.push("/inventory");
        } catch (error) {
            toast({
                tone: "error",
                title: `Item not ${isEditing ? "updated" : "created"}`,
                description: getApiErrorMessage(
                    error,
                    `Unable to ${isEditing ? "update" : "create"} the item.`,
                ),
            });
        }
    }

    if (groupsError || unitsError) {
    return <InventoryError message="Unable to load the item form options." />;
    }

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            className="-mb-8 flex h-full min-h-0 flex-col"
        >
            <div className="shrink-0 pb-5">
                <InventoryPageHeader
                    title={isEditing ? "Edit item" : "Create item"}
                    description="Define the item before it can be sold or tracked."
                    action={
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={openPreview}
                                className="h-10 gap-2"
                            >
                                <Eye />
                                Preview
                            </Button>
                            <Button
                                variant="outline"
                                render={<Link href="/inventory" />}
                                nativeButton={false}
                                className="h-10 gap-2"
                            >
                                <ArrowLeft />
                                Back to items
                            </Button>
                        </div>
                    }
                />
            </div>

            <div className="-mx-5 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pt-1 pb-6 lg:-mx-8 lg:px-8">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                <SectionHeading
                    title="Basics"
                    description="What this item is called and how it is identified."
                />
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <div data-tour="item-form-name">
                        <Field
                            label="Item name *"
                            name="name"
                            error={fieldErrors.name}
                        >
                            <Input
                                id="name"
                                name="name"
                                defaultValue={initialItem?.name}
                                placeholder="Ice Latte"
                                aria-invalid={Boolean(fieldErrors.name)}
                                className={inventoryControlClassName}
                            />
                        </Field>
                    </div>
                    <div data-tour="item-form-sku">
                        <Field label="SKU" name="sku" error={fieldErrors.sku}>
                            <Input
                                id="sku"
                                name="sku"
                                defaultValue={initialItem?.sku}
                                placeholder="LAT-001"
                                aria-invalid={Boolean(fieldErrors.sku)}
                                className={inventoryControlClassName}
                            />
                        </Field>
                    </div>
                    <div data-tour="item-form-barcode">
                        <Field
                            label="Barcode"
                            name="barcode"
                            error={fieldErrors.barcode}
                        >
                            <div className="flex gap-2">
                                <Input
                                    id="barcode"
                                    name="barcode"
                                    value={barcodePreview}
                  onChange={(event) => setBarcodePreview(event.target.value)}
                                    placeholder="3547908987678"
                                    aria-invalid={Boolean(fieldErrors.barcode)}
                                    className={`${inventoryControlClassName} flex-1 font-mono`}
                                />
                                {!isEditing ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon-sm"
                                        disabled={generateBarcodeState.isLoading}
                                        onClick={handleGenerateBarcode}
                                        aria-label="Generate a unique barcode"
                                        title="Generate unique barcode"
                                        className="shrink-0 self-center"
                                    >
                                        {generateBarcodeState.isLoading ? (
                                            <LoaderCircle className="animate-spin" />
                                        ) : (
                                            <Dices />
                                        )}
                                    </Button>
                                ) : null}
                            </div>
                        </Field>
                    </div>
                    <div data-tour="item-form-category">
                        <Field
                            label="Category"
                            name="itemGroupId"
                            error={fieldErrors.itemGroupId}
                        >
                        <Select
                            name="itemGroupId"
                            defaultValue={initialItem?.itemGroup?.id || ""}
                            items={Object.fromEntries(
                  categoryOptions.map((option) => [option.id, option.label]),
                            )}
                        >
                            <SelectTrigger
                                id="itemGroupId"
                                className={`${inventoryControlClassName} w-full`}
                            >
                                <SelectValue placeholder="Choose a category" />
                            </SelectTrigger>
                            <SelectContent>
                  {categoryGroups.map((group) =>
                    group.subGroups.length ? (
                                    <SelectGroup key={group.id}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.subGroups.map((subGroup) => (
                                                <SelectItem
                                                    key={subGroup.id}
                                                    value={subGroup.id}
                            className="pl-6"
                                                >
                                                    {subGroup.label}
                                                </SelectItem>
                                ))}
                      </SelectGroup>
                    ) : (
                      <SelectGroup key={group.id}>
                        <SelectItem value={group.id}>{group.label}</SelectItem>
                      </SelectGroup>
                    ),
                  )}
                            </SelectContent>
                        </Select>
              {categoryGroups.length ? null : (
                            <p className="text-xs text-muted-foreground">
                  An item is filed under a category. Add onein{" "}
                                <Link
                                    href="/inventory/categories"
                                    className="font-medium text-primary underline underline-offset-2"
                                >
                                    Categories
                                </Link>{" "}
                                first.
                            </p>
                        )}
                    </Field>
                    </div>
                    <Field
                        label="Item type *"
                        name="itemType"
                        error={fieldErrors.itemType}
                    >
                        <Select
                            name="itemType"
                            defaultValue={initialItem?.itemType || "PHYSICAL"}
                            items={itemTypeLabels}
                        >
                            <SelectTrigger
                                id="itemType"
                                className={`${inventoryControlClassName} w-full`}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                  {categoryGroups.map((group) => (
                    <SelectGroup key={group.id}>
                      <SelectItem
                        value={group.id}
                        className="text-xs text-[#6b7280] data-selected:text-primary dark:data-selected:text-primary-foreground"
                      >
                        {group.label}
                                    </SelectItem>
                      ))
                    </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3.5">
                        <div className="space-y-0.5">
                            <Label htmlFor="trackInventorySwitch" className="text-sm font-semibold text-foreground cursor-pointer">
                                Track Inventory / Stock
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Enable stock tracking, low-stock warnings, and inventory deductions upon checkout.
                            </p>
                        </div>
                        <Switch
                            id="trackInventorySwitch"
                            checked={trackInventory}
                            onCheckedChange={setTrackInventory}
                        />
                    </div>
                    <div data-tour="item-form-status">
                        <Field
                            label="Status *"
                            name="status"
                            error={fieldErrors.status}
                        >
                        <Select
                            name="status"
                            defaultValue={initialItem?.status || "ACTIVE"}
                            items={{ ACTIVE: "Active", INACTIVE: "Inactive" }}
                        >
                            <SelectTrigger
                                id="status"
                                className={`${inventoryControlClassName} w-full`}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {itemStatuses.map((statusValue) => (
                    <SelectItem key={statusValue} value={statusValue}>
                      {statusValue === "ACTIVE" ? "Active" : "Inactive"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    </div>
                    <Field
                        label="Store badge"
                        name="badge"
                        error={fieldErrors.badge}
                    >
                        <Input
                            id="badge"
                            name="badge"
                            defaultValue={initialItem?.badge}
                            placeholder="NEW ARRIVAL"
                            aria-invalid={Boolean(fieldErrors.badge)}
                            className={inventoryControlClassName}
                        />
                    </Field>
                    <div className="md:col-span-2">
                        <Field
                            label="Description"
                            name="description"
                            error={fieldErrors.description}
                        >
                            <Textarea
                                id="description"
                                name="description"
                                defaultValue={initialItem?.description}
                                placeholder="Describe this item for your menu and online store"
                                className={inventoryTextareaClassName}
                            />
                        </Field>
                    </div>
                </div>

                <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
            Pricing is set per sales channel in Sale Management, not here.
                </p>
            </section>

            <section className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <SectionHeading
              title={options.length ? `Options · ${options.length}` : "Options"}
                        description="Variations of this item — Small, Medium, Large. Each is scanned and counted on its own, can carry its own picture, and is priced per sales channel in Sale Management."
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        {(optionPresets || []).length ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPresetPickerOpen(true)}
                            >
                                From preset
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            variant="outline"
                onClick={() =>
                  setOptions((current) => [...current, emptyOption()])
                }
                        >
                            <Plus />
                            Add option
                        </Button>
                    </div>
                </div>

                <div className="mt-5 rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                <p className="text-sm font-semibold text-foreground">Colours</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                  Named and photographed once. Every size ticks the ones it
                  comes in, and stock is kept per colour.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                setColors((current) => [
                                    ...current,
                                    {
                                        id: createRowId(),
                                        value: "",
                                        colorHex: "",
                                        imageUrl: "",
                                    },
                                ])
                            }
                        >
                            <Plus />
                            Add colour
                        </Button>
                    </div>

                    {colors.length ? (
                        <ul className="mt-3 flex flex-col gap-2">
                            {colors.map((color) => (
                                <li
                                    key={color.id}
                                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                                >
                                    <Input
                                        value={color.value}
                                        onChange={(event) =>
                                            setColors((current) =>
                                                current.map((row) =>
                                                    row.id === color.id
                                                        ? { ...row, value: event.target.value }
                                                        : row,
                                                ),
                                            )
                                        }
                                        placeholder="e.g. Red"
                                        aria-label="Colour name"
                                        className={`${inventoryControlClassName} h-10 min-w-32 flex-1`}
                                    />

                                    <ColorSwatchButton
                                        value={color.colorHex}
                                        colorName={color.value}
                                        label={`${color.value || "Colour"} swatch`}
                                        onChange={(patch) =>
                                            setColors((current) =>
                                                current.map((row) =>
                                                    row.id === color.id
                                                        ? {
                                                              ...row,
                                                              ...(patch.colorHex === undefined
                                                                  ? {}
                                                                  : { colorHex: patch.colorHex }),
                                                              ...(patch.colorName === undefined
                                                                  ? {}
                                                                  : { value: patch.colorName }),
                                                          }
                                                        : row,
                                                ),
                                            )
                                        }
                                    />

                                    <ChoiceImageField
                                        value={color.imageUrl}
                                        label={`${color.value || "Colour"} photo`}
                                        onChange={(url) =>
                                            setColors((current) =>
                                                current.map((row) =>
                                                    row.id === color.id
                                                        ? { ...row, imageUrl: url }
                                                        : row,
                                                ),
                                            )
                                        }
                                    />

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Remove ${color.value || "colour"}`}
                                        onClick={() => {
                                            const dropped = color.value.trim();
                                            setColors((current) =>
                                                current.filter((row) => row.id !== color.id),
                                            );
                                            setOptions((current) =>
                                                current.map((row) => ({
                                                    ...row,
                                                    colorValues: row.colorValues.filter(
                                                        (held) => held !== dropped,
                                                    ),
                                                })),
                                            );
                                        }}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>

                {options.length ? (
                    <>
                        <ul className="mt-5 flex flex-col gap-3">
                            {options.map((option, index) => (
                                <li
                                    key={option.id}
                                    className="rounded-xl border border-[#e8e8e8] bg-muted/20 p-4 dark:border-[#2a3042]"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                                                {index + 1}
                                            </span>
                                            <span className="text-sm font-semibold text-foreground">
                                                {option.name || "New option"}
                                            </span>
                                            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                {option.price === undefined
                                                    ? "Price not set"
                                                    : formatMoney(option.price)}
                                            </span>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-3">
                                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>On sale</span>
                                                <Switch
                                                    aria-label={`${option.name || `Option ${index + 1}`} on sale`}
                                                    checked={option.available}
                                                    onCheckedChange={(checked) =>
                                                        updateOption(option.id, {
                                                            available: checked,
                                                        })
                                                    }
                                                />
                                            </label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`Remove option ${option.name || index + 1}`}
                          onClick={() => removeOption(option.id)}
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                                        <OptionImageField
                                            option={option}
                                            index={index}
                                            disabled={isSaving}
                        onChange={(patch) => updateOption(option.id, patch)}
                                        />
                                        <div className="grid flex-1 gap-3 sm:grid-cols-3">
                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-xs font-medium text-muted-foreground">
                                                    Option name
                                                </Label>
                                                <Input
                                                    aria-label={`Option ${index + 1} name`}
                                                    value={option.name}
                                                    onChange={(event) =>
                                                        updateOption(option.id, {
                                                            name: event.target.value,
                                                        })
                                                    }
                                                    placeholder="e.g. Large"
                                                    className={`${inventoryControlClassName} h-10`}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-xs font-medium text-muted-foreground">
                                                    SKU
                                                </Label>
                                                <Input
                                                    aria-label={`Option ${index + 1} SKU`}
                                                    value={option.sku}
                                                    onChange={(event) =>
                                                        updateOption(option.id, {
                                                            sku: event.target.value,
                                                        })
                                                    }
                                                    placeholder="e.g. TEA-L"
                                                    className={`${inventoryControlClassName} h-10`}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <Label className="text-xs font-medium text-muted-foreground">
                                                    Barcode
                                                </Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        aria-label={`Option ${index + 1} barcode`}
                                                        value={option.barcode}
                                                        onChange={(event) =>
                                                            updateOption(option.id, {
                                                                barcode: event.target.value,
                                                            })
                                                        }
                                                        placeholder="Scan, type or generate"
                                                        className={`${inventoryControlClassName} h-10 flex-1 font-mono`}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon-sm"
                              disabled={generateBarcodeState.isLoading}
                              onClick={() => generateOptionBarcode(option.id)}
                                                        aria-label={`Generate a unique barcode for option ${index + 1}`}
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
                                        </div>
                                    </div>

                                    {namedColors.length ? (
                                        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                                            <Label className="text-xs font-medium text-muted-foreground">
                                                Comes in
                                            </Label>
                                            <div className="flex flex-wrap gap-2">
                                                {namedColors.map((color) => {
                            const ticked = option.colorValues.includes(
                                                            color.value.trim(),
                                                        );

                                                    return (
                                                        <button
                                                            key={color.id}
                                                            type="button"
                                                            aria-pressed={ticked}
                                                            onClick={() =>
                                                                updateOption(option.id, {
                                                                    colorValues: ticked
                                                                        ? option.colorValues.filter(
                                          (held) => held !== color.value.trim(),
                                                                          )
                                                                        : [
                                                                              ...option.colorValues,
                                                                              color.value.trim(),
                                                                          ],
                                                                })
                                                            }
                                                            className={cn(
                                                                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                                                                ticked
                                                                    ? "border-primary bg-primary/10 font-medium text-primary"
                                                                    : "border-border text-muted-foreground hover:border-primary/50",
                                                            )}
                                                        >
                                                            <span
                                                                className="size-3.5 rounded-full border border-border"
                                                                style={{
                                    background: color.colorHex || "transparent",
                                                                }}
                                                            />
                                                            {color.value}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {option.colorValues.length
                                                    ? `${option.colorValues.length} countable ${option.colorValues.length === 1 ? "row" : "rows"} — stock is kept per colour.`
                                                    : "Not sold by colour; stock is kept for the size as a whole."}
                                            </p>
                                        </div>
                                    ) : null}
                                </li>
                            ))}
                        </ul>

                        <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                Each option is saved with its own SKU, barcode and image. Give
                an option an image and the store swaps to it when a shopper
                picks that option — leave it empty and the item gallery stays
                put. Pictures are uploaded when this item is saved, not before.
                Prices are set per sales channel in Sale Management.
                        </p>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => setOptions([emptyOption()])}
                        className="mt-5 flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-[#e8e8e8] px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/30 dark:border-[#2a3042]"
                    >
                        <Plus className="size-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                            Add an option
                        </span>
                        <span className="text-xs text-muted-foreground">
                Only if this item sells in more than one size or pack.
                        </span>
                    </button>
                )}

                {fieldErrors.variants ? (
                    <p className="mt-3 text-xs text-danger" role="alert">
                        {fieldErrors.variants}
                    </p>
                ) : null}
            </section>

            <ItemUomCard
                apiUnits={units || []}
                options={namedOptions}
                lowStockDefault={initialItem?.lowStockDefault ?? 0}
                lowStockError={fieldErrors.lowStockDefault}
                draft={uomDraft}
                onDraftChange={(patch) =>
                    setUomDraft((current) => ({ ...current, ...patch }))
                }
                trackInventory={trackInventory}
            />

            <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <SectionHeading
                        title="Images"
                        description={`The first image is the thumbnail; the rest fill the store gallery. Up to ${maxItemImages}, 10 MB each.`}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        disabled={galleryCount >= maxItemImages || isSaving}
                        onClick={() => imageInputRef.current?.click()}
                    >
                        <Plus />
                        Add images
                    </Button>
                </div>

                <ImageDropzone
                    className="mt-5"
                    rules={itemImageRules}
                    inputRef={imageInputRef}
                    disabled={isSaving}
                    remaining={maxItemImages - galleryCount}
                    label="Add images of this item"
                    onPick={handleImagesPicked}
                    onError={(message) => {
                        toast({
                            tone: "error",
                            title: "Images not added",
                            description: message,
                        });
                    }}
                >
                    {galleryCount ? (
                        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                            {storedImages.map((image, index) => (
                                <ImageTile
                                    key={image.id || image.url}
                                    url={image.url || ""}
                    label={index === 0 ? "Thumbnail" : `Image ${index + 1}`}
                                    busy={
                      deleteImageState.isLoading || reorderImagesState.isLoading
                                    }
                                    onRemove={() =>
                      image.id ? removeStoredImage(image.id) : undefined
                                    }
                                    onMoveBack={
                      index > 0 ? () => moveStoredImage(index, -1) : undefined
                                    }
                                    onMoveForward={
                                        index < storedImages.length - 1
                                            ? () => moveStoredImage(index, 1)
                                            : undefined
                                    }
                                />
                            ))}
                            {pickedImages.map((image, index) => (
                                <ImageTile
                                    key={image.id}
                                    url={image.previewUrl}
                                    label={
                                        storedImages.length + index === 0
                                            ? "Thumbnail — not saved"
                                            : "Not saved yet"
                                    }
                                    busy={isSaving}
                                    onRemove={() => removePickedImage(image.id)}
                                />
                            ))}
                        </ul>
                    ) : null}
                </ImageDropzone>
            </section>

            <section className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <SectionHeading
                        title="Attributes"
                        description="Notes about the item — a spec, a perk, a fact. What a shopper picks between is an Option."
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => openAttributeDialog(null)}
                        >
                            <Plus />
                            Add attribute
                        </Button>
                    </div>
                </div>
                <div className="mt-5 flex flex-col gap-3">
                    {attributes.length ? (
                        attributes.map((attribute) => (
                            <div
                                key={attribute.id}
                                className="flex items-center gap-3 rounded-xl border border-[#e8e8e8] dark:border-[#2a3042] bg-white dark:bg-[#1e2330] px-4 py-3"
                            >
                                {attribute.icon ? (
                                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                        {(() => {
                        const Glyph = attributeIcon(attribute.icon);

                        return <Glyph className="size-4" />;
                                        })()}
                                    </span>
                                ) : null}
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium text-[#1a222b] dark:text-[#f8fafc]">
                                            {attribute.name}
                                        </p>
                                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {itemAttributeTypeLabels[attribute.type]}
                                        </span>
                                        <span className="rounded-full bg-[#f2f3f1] dark:bg-[#252a38] px-2.5 py-0.5 text-xs font-medium text-[#657064] dark:text-[#cbd5e1]">
                                            {
                          itemAttributePlacementLabels[attribute.placement]
                            .label
                                            }
                                        </span>
                                    </div>
                                    <p className="mt-1 truncate text-sm text-[#657064] dark:text-[#94a3b8]">
                                        {describeAttribute(attribute)}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Edit ${attribute.name}`}
                    onClick={() => openAttributeDialog(attribute.id)}
                                >
                                    <Pencil />
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon-sm"
                                    aria-label={`Remove ${attribute.name}`}
                                    onClick={() =>
                                        setAttributes((current) =>
                        current.filter((row) => row.id !== attribute.id),
                                        )
                                    }
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="rounded-xl border border-dashed border-[#e8e8e8] dark:border-[#2a3042] px-4 py-6 text-center text-sm text-[#657064] dark:text-[#94a3b8]">
                            No attributes yet. Add one to describe this item.
                        </p>
                    )}
                    {fieldErrors.attributes ? (
                        <p className="text-xs text-danger" role="alert">
                            {fieldErrors.attributes}
                        </p>
                    ) : null}
                </div>

                <ItemPickerDialog
                    open={presetPickerOpen}
                    onOpenChange={setPresetPickerOpen}
                    title="Apply an option preset"
                    description="Its choices are copied onto this item, and can be edited afterwards."
                    emptyMessage="No presets saved yet."
                    options={(optionPresets || []).map((preset) => ({
                        id: preset.id,
                        label: preset.name || "Unnamed preset",
                        hint: (preset.values || [])
                            .map((value) => value.value)
                            .filter(Boolean)
                            .join(", "),
                    }))}
                    onPick={(id) => {
                        const preset = (optionPresets || []).find(
                            (candidate) => candidate.id === id,
                        );
                        if (preset) applyPreset(preset);
                    }}
                />

                <ItemAttributeDialog
                    open={attributeDialogOpen}
                    onOpenChange={setAttributeDialogOpen}
                    initialAttribute={editingAttribute}
                    existingNames={attributes
              .filter((attribute) => attribute.id !== editingAttributeId)
                        .map((attribute) => attribute.name.toLowerCase())}
                    onSubmit={saveAttribute}
                />
            </section>

            <section className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <SectionHeading
                        title="Add-ons"
                        description="Extras a customer can choose with this item. Each one is defined once in Inventory config and attached here."
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAddOnPickerOpen(true)}
                        >
                            Attach existing
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={createAddOnState.isLoading}
                            onClick={() => setNewAddOnOpen(true)}
                        >
                            <Plus />
                            Attach add-on
                        </Button>
                    </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                    {attachedAddOns.length ? (
                        attachedAddOns.map((addOn) => (
                            <div
                                key={addOn.id}
                                className="flex items-center gap-3 rounded-xl border border-[#e8e8e8] dark:border-[#2a3042] bg-white dark:bg-[#1e2330] px-4 py-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-foreground">
                                        {addOn.name}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                        {describeAddOnUse(addOn)}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Remove ${addOn.name} from this item`}
                                    onClick={() => detachAddOn(addOn.id)}
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="rounded-xl border border-dashed border-[#e8e8e8] dark:border-[#2a3042] px-4 py-6 text-center text-sm text-[#657064] dark:text-[#94a3b8]">
                No add-ons attached. Attach one to offer it with this item.
                        </p>
                    )}
                </div>

                <ItemPickerDialog
                    open={addOnPickerOpen}
                    onOpenChange={setAddOnPickerOpen}
                    title="Attach an add-on"
                    description="Pick one from the shared library."
                    emptyMessage="Every add-on is already attached."
                    options={(addOnLibrary || [])
              .filter((addOn) => !attachedAddOnIds.includes(addOn.id))
                        .map((addOn) => ({
                            id: addOn.id,
                            label: addOn.name || "Unnamed add-on",
                            hint: describeAddOnUse(addOn),
                        }))}
                    onPick={(id) => attachAddOns([id])}
                />

                <AddOnDialog
                    open={newAddOnOpen}
                    onOpenChange={setNewAddOnOpen}
                    units={configUnits}
                    onSave={createAddOn}
                />
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                <SectionHeading
                    title="Store page"
                    description="Lay out the lower half of the store page: text, bullets, images and the spec grid."
                />
                <div className="mt-5">
            <DescriptionBlockEditor blocks={blocks} onChange={setBlocks} />
                    {fieldErrors.descriptionBlocks ? (
                        <p className="mt-3 text-xs text-danger" role="alert">
                            {fieldErrors.descriptionBlocks}
                        </p>
                    ) : null}
                </div>
            </section>

            {Object.keys(fieldErrors).length ? (
                <div
                    className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm"
                    role="alert"
                >
                    <p className="font-semibold text-danger">
                        This item cannot be saved yet
                    </p>
                    <ul className="mt-2 flex flex-col gap-1 text-xs text-danger">
              {Object.entries(fieldErrors).map(([field, message]) => (
                                <li key={field}>
                                    {fieldLabels[field]
                                        ? `${fieldLabels[field]}: ${message}`
                                        : message}
                                </li>
              ))}
                    </ul>
                </div>
            ) : null}
            </div>

            <div className="-mx-5 flex shrink-0 flex-row items-center justify-end gap-2.5 border-t border-border bg-shell px-5 py-4 lg:-mx-8 lg:px-8 sm:gap-3">
                <Button
                    variant="outline"
                    render={<Link href="/inventory" />}
                    nativeButton={false}
                    className="h-10 flex-1 rounded-xl px-4 text-xs sm:h-11 sm:flex-initial sm:px-6 sm:text-sm"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    data-tour="item-form-save"
                    disabled={isSaving || isUploadingBlockImage}
                    className="h-10 flex-1 rounded-xl px-4 text-xs sm:h-11 sm:flex-initial sm:px-6 sm:text-sm"
                >
                    {isSaving ? (
                        <LoaderCircle className="size-4 shrink-0 animate-spin" />
                    ) : (
                        <Save className="size-4 shrink-0" />
                    )}
                    <span>{isEditing ? "Save changes" : "Create item"}</span>
                </Button>
            </div>

            <ItemAttributeDialog
                key={editingAttributeId ?? `new-${newPlacement}`}
                open={attributeDialogOpen}
                onOpenChange={setAttributeDialogOpen}
                initialAttribute={dialogAttribute}
                existingNames={attributes
                    .filter((attribute) => attribute.id !== editingAttributeId)
                    .map((attribute) => attribute.name.toLowerCase())}
                onSubmit={saveAttribute}
            />

            <ItemPreviewDialog
                open={Boolean(previewItem)}
                onOpenChange={(open) => {
                    if (!open) setPreviewItem(null);
                }}
                item={previewItem}
            />
        </form>
    );
}

export function CreateInventoryProduct() {
    return <ProductEditor />;
}

export function EditInventoryProduct({ itemId }: { itemId: string }) {
  const { data, error, isLoading, refetch } = useGetInventoryItemQuery(itemId);

    if (isLoading) {
        return <InventoryLoading label="Loading item" />;
    }

    if (error || !data) {
        return (
            <InventoryError
                message={getApiErrorMessage(error, "Unable to load the item.")}
                retry={refetch}
            />
        );
    }

    return <ProductEditor initialItem={data} />;
}
