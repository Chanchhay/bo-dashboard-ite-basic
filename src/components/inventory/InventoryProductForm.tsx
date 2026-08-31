"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    useCallback,
    useEffect,
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

import { cn, scrollFieldIntoView } from "@/lib/utils";
import { BarcodePreview } from "@/components/inventory/BarcodePreview";
import {
    charCountInputClassName,
    charCountTextareaClassName,
    CharCountField,
    useCharCount,
} from "@/components/inventory/CharLimit";
import {
    ItemColorDialog,
    type ItemColorDraft,
} from "@/components/inventory/ItemColorDialog";
import {
    emptyOption,
    ItemOptionDialog,
    type OptionDraft,
} from "@/components/inventory/ItemOptionDialog";
import {
    createBlockId,
    DescriptionBlockEditor,
    type BlockDraft,
    type SpecDraft,
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    itemLimits,
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

/** The line under an "Add" button once the list is full. */
function CapNote({
    count,
    max,
    noun,
}: {
    count: number;
    max: number;
    noun: string;
}) {
    if (count < max) return null;

    return (
        <p className="text-xs text-muted-foreground">
            {max} {noun} is the maximum.
        </p>
    );
}

function Field({ label, name, error, children }: FieldProps) {
    return (
        <div className="flex min-w-0 flex-col gap-2">
            <Label
                htmlFor={name}
                className="text-sm font-semibold text-foreground"
            >
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
                <img
                    src={url}
                    alt=""
                    className="size-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
                    }}
                />
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
    description?: string;
}) {
    return (
        <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                </p>
            ) : null}
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


type BlockPayload = {
    type: BlockDraft["type"];
    text: string;
    items: string[];
    url: string;
    caption: string;
    columns: { blocks: BlockPayload[] }[];
};

function fromBlockDraft(block: BlockDraft, preview = false): BlockPayload {
    return {
        type: block.type,
        text: block.text,
        items: block.items
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        url: preview ? block.previewUrl || block.url : block.url,
        caption: block.caption,
        columns: block.columns.map((column) => ({
            blocks: column.blocks.map((nested) =>
                fromBlockDraft(nested, preview),
            ),
        })),
    };
}

function preservedCommerceFields(initialItem: InventoryItem | undefined) {
    return {
        price: initialItem?.price,
        variants: (initialItem?.variants || [])
            .filter((variant) => variant.name?.trim())
            .map((variant) => ({
                name: variant.name || "",
                available: variant.available !== false,
                ...(variant.price == null ? {} : { price: variant.price }),
            })),
    };
}
function toVariantRows(rows: OptionDraft[]) {
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
    itemType: "Item type",
    attributes: "Attributes",
    descriptionBlocks: "Store page",
    variants: "Options",
    colors: "Colours",
    addOnIds: "Add-ons",
    uomConversions: "Conversions",
    lowStockDefault: "Low-stock threshold",
    status: "Status",
};

/** "Colours" plus a row number, so a nested issue says which row it is. */
const rowNouns: Record<string, string> = {
    colors: "Colour",
    variants: "Option",
    attributes: "Attribute",
    descriptionBlocks: "Block",
    uomConversions: "Conversion",
};

function fieldErrorsFromIssues(
    issues: { path: PropertyKey[]; message: string }[],
) {
    const errors: Record<string, string> = {};

    for (const issue of issues) {
        const field = String(issue.path[0] || "form");
        const noun = rowNouns[field];
        const index = issue.path[1];
        const numbered =
            noun && typeof index === "number"
                ? `${noun} ${index + 1}: ${issue.message}`
                : issue.message;

        errors[field] ||= numbered;
    }

    return errors;
}

const CREATE_DRAFT_KEY = "inventory_create_item_draft";

type StoredImageData = {
    name: string;
    type: string;
    dataUrl: string;
};

async function fileToStoredImageData(file: File): Promise<StoredImageData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
            resolve({
                name: file.name,
                type: file.type,
                dataUrl: reader.result as string,
            });
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

function storedImageDataToFile(stored: StoredImageData): File {
    const parts = stored.dataUrl.split(",");
    const mime = stored.type || parts[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(parts[1] || "");
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], stored.name || "image.png", { type: mime });
}

type ItemCreateDraft = {
    name?: string;
    sku?: string;
    barcode?: string;
    itemGroupId?: string;
    unitId?: string;
    description?: string;
    badge?: string;
    price?: string;
    itemType?: string;
    trackInventory?: boolean;
    lowStockDefault?: string;
    status?: string;
    attachedAddOnIds?: string[];
    attributes?: AttributeDraft[];
    colors?: (ItemColorDraft & { storedFile?: StoredImageData })[];
    options?: (OptionDraft & { storedFile?: StoredImageData })[];
    uomDraft?: ItemUomDraft;
    blocks?: (BlockDraft & { storedFile?: StoredImageData })[];
    pickedImages?: { id: string; storedFile: StoredImageData }[];
};

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

    const [savedDraft] = useState<ItemCreateDraft | null>(() => {
        if (typeof window === "undefined" || initialItem) return null;
        try {
            const raw = localStorage.getItem(CREATE_DRAFT_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    const [backDialogOpen, setBackDialogOpen] = useState(false);

    const [trackInventory, setTrackInventory] = useState<boolean>(
        () =>
            initialItem?.trackInventory ??
            (initialItem?.itemType
                ? initialItem.itemType === "PHYSICAL"
                : true),
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
    const [optionDialogOpen, setOptionDialogOpen] = useState(false);
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
    const [colorDialogOpen, setColorDialogOpen] = useState(false);
    const [editingColorId, setEditingColorId] = useState<string | null>(null);
    const [dialogSeed, setDialogSeed] = useState(0);

    const { create: createObjectUrl, release: releaseObjectUrl } =
        useObjectUrls();

    const [options, setOptions] = useState<OptionDraft[]>(() => {
        const rows: OptionDraft[] = [];
        const bySize = new Map<string, OptionDraft>();

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

            const row: OptionDraft = {
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
    const [uomDraft, setUomDraft] = useState<ItemUomDraft>(() =>
        savedDraft?.uomDraft ?? {
            ...emptyUomDraft,
            baseUnitId: initialItem?.unit?.id || "",
            conversions: (() => {
                const sizeOfVariant = new Map<string, string>();
                for (const variant of initialItem?.variants || []) {
                    if (variant.id) {
                        sizeOfVariant.set(
                            variant.id,
                            (variant.optionName || variant.name || "")
                                .trim()
                                .toLowerCase(),
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
        },
    );
    const namedColors = useMemo(
        () =>
            colors
                .filter((color) => color.value.trim())
                .map((color) => ({
                    id: color.id,
                    value: color.value.trim(),
                    colorHex: color.colorHex,
                })),
        [colors],
    );

    const namedOptions = useMemo(
        () =>
            options
                .filter((option) => option.name.trim())
                .map((option) => ({ id: option.id, name: option.name.trim() })),
        [options],
    );
    function openOptionDialog(id: string | null) {
        setEditingOptionId(id);
        setDialogSeed((current) => current + 1);
        setOptionDialogOpen(true);
    }

    function saveOption(draft: OptionDraft) {
        setOptions((current) =>
            draft.id
                ? current.map((row) => (row.id === draft.id ? draft : row))
                : [...current, { ...draft, id: createRowId() }],
        );
    }

    function openColorDialog(id: string | null) {
        setEditingColorId(id);
        setDialogSeed((current) => current + 1);
        setColorDialogOpen(true);
    }

    function saveColor(draft: ItemColorDraft) {
        if (!draft.id) {
            setColors((current) => [
                ...current,
                { ...draft, id: createRowId() },
            ]);
            return;
        }

        const before = colors.find((row) => row.id === draft.id)?.value.trim();
        const after = draft.value.trim();

        setColors((current) =>
            current.map((row) => (row.id === draft.id ? draft : row)),
        );

        // An option's ticks hold colour names, so a rename has to follow them over.
        if (before && before !== after) {
            setOptions((current) =>
                current.map((row) => ({
                    ...row,
                    colorValues: row.colorValues.map((held) =>
                        held === before ? after : held,
                    ),
                })),
            );
        }
    }

    function removeColor(color: ItemColorDraft) {
        const dropped = color.value.trim();

        setColors((current) => current.filter((row) => row.id !== color.id));
        setOptions((current) =>
            current.map((row) => ({
                ...row,
                colorValues: row.colorValues.filter((held) => held !== dropped),
            })),
        );
    }

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
    const nameCount = useCharCount(initialItem?.name || "");
    const skuCount = useCharCount(initialItem?.sku || "");
    const badgeCount = useCharCount(initialItem?.badge || "");
    const descriptionCount = useCharCount(initialItem?.description || "");
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

    const restoredToastRef = useRef(false);

    useEffect(() => {
        if (isEditing || typeof window === "undefined" || restoredToastRef.current) return;
        restoredToastRef.current = true;

        try {
            const raw = localStorage.getItem(CREATE_DRAFT_KEY);
            if (!raw) return;
            const draft: ItemCreateDraft = JSON.parse(raw);

            if (formRef.current) {
                const elements = formRef.current.elements;
                if (draft.name && elements.namedItem("name")) (elements.namedItem("name") as HTMLInputElement).value = draft.name;
                if (draft.sku && elements.namedItem("sku")) (elements.namedItem("sku") as HTMLInputElement).value = draft.sku;
                if (draft.description && elements.namedItem("description")) (elements.namedItem("description") as HTMLTextAreaElement).value = draft.description;
                if (draft.badge && elements.namedItem("badge")) (elements.namedItem("badge") as HTMLInputElement).value = draft.badge;
                if (draft.price && elements.namedItem("price")) (elements.namedItem("price") as HTMLInputElement).value = draft.price;
                if (draft.itemGroupId && elements.namedItem("itemGroupId")) (elements.namedItem("itemGroupId") as HTMLInputElement).value = draft.itemGroupId;
                if (draft.itemType && elements.namedItem("itemType")) (elements.namedItem("itemType") as HTMLInputElement).value = draft.itemType;
                if (draft.status && elements.namedItem("status")) (elements.namedItem("status") as HTMLInputElement).value = draft.status;
                if (draft.lowStockDefault && elements.namedItem("lowStockDefault")) (elements.namedItem("lowStockDefault") as HTMLInputElement).value = draft.lowStockDefault;
            }

            if (draft.trackInventory !== undefined) setTrackInventory(draft.trackInventory);
            if (draft.barcode) setBarcodePreview(draft.barcode);
            if (draft.attributes) setAttributes(draft.attributes);
            if (draft.attachedAddOnIds) setAttachedAddOnIds(draft.attachedAddOnIds);

            if (draft.options) {
                setOptions(
                    draft.options.map((opt) => {
                        if (opt.storedFile) {
                            const file = storedImageDataToFile(opt.storedFile);
                            const previewUrl = opt.storedFile.dataUrl;
                            return { ...opt, file, previewUrl };
                        }
                        return opt;
                    }),
                );
            }

            if (draft.colors) {
                setColors(
                    draft.colors.map((col) => {
                        if (col.storedFile) {
                            const file = storedImageDataToFile(col.storedFile);
                            const previewUrl = col.storedFile.dataUrl;
                            return { ...col, file, previewUrl };
                        }
                        return col;
                    }),
                );
            }

            if (draft.uomDraft) setUomDraft(draft.uomDraft);

            if (draft.blocks) {
                function restoreBlockFiles(
                    bList: (BlockDraft & { storedFile?: StoredImageData })[],
                ): BlockDraft[] {
                    return bList.map((b) => {
                        let updated = { ...b };
                        if (b.storedFile) {
                            const file = storedImageDataToFile(b.storedFile);
                            const previewUrl = b.storedFile.dataUrl;
                            updated = { ...updated, file, previewUrl };
                        }
                        if (b.columns) {
                            updated.columns = b.columns.map((col) => ({
                                ...col,
                                blocks: restoreBlockFiles(col.blocks),
                            }));
                        }
                        return updated;
                    });
                }
                setBlocks(restoreBlockFiles(draft.blocks));
            }

            if (draft.pickedImages?.length) {
                setPickedImages(
                    draft.pickedImages.map((img) => {
                        const file = storedImageDataToFile(img.storedFile);
                        const previewUrl = img.storedFile.dataUrl;
                        return { id: img.id, file, previewUrl };
                    }),
                );
            }

            if (draft.name) nameCount.onChange({ target: { value: draft.name } } as any);
            if (draft.sku) skuCount.onChange({ target: { value: draft.sku } } as any);
            if (draft.badge) badgeCount.onChange({ target: { value: draft.badge } } as any);
            if (draft.description) descriptionCount.onChange({ target: { value: draft.description } } as any);

            toast({
                tone: "info",
                title: "Restored unsaved draft",
                description: "Loaded your previously saved item draft.",
            });
        } catch {
            // Ignore parse errors
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing]);

    function isFormDirty(): boolean {
        if (!formRef.current) return false;

        const fd = new FormData(formRef.current);
        const name = String(fd.get("name") || "").trim();
        const sku = String(fd.get("sku") || "").trim();
        const description = String(fd.get("description") || "").trim();
        const badge = String(fd.get("badge") || "").trim();
        const price = String(fd.get("price") || "").trim();
        const itemGroupId = String(fd.get("itemGroupId") || "").trim();
        const unitId = (uomDraft.baseUnitId || String(fd.get("unitId") || "")).trim();
        const barcode = barcodePreview.trim();

        if (isEditing && initialItem) {
            if (name !== (initialItem.name || "").trim()) return true;
            if (sku !== (initialItem.sku || "").trim()) return true;
            if (description !== (initialItem.description || "").trim()) return true;
            if (badge !== (initialItem.badge || "").trim()) return true;
            if (itemGroupId !== (initialItem.itemGroup?.id || "").trim()) return true;
            if (unitId !== (initialItem.unit?.id || "").trim()) return true;
            if (barcode !== (initialItem.barcode || "").trim()) return true;
            if (pickedImages.length > 0) return true;
            if (options.length !== (initialItem.variants || []).length) return true;
            if (colors.length !== (initialItem.colors || []).length) return true;
            if (attributes.length !== (initialItem.attributes || []).length) return true;
            if (blocks.length !== (initialItem.descriptionBlocks || []).length) return true;
            if (attachedAddOnIds.length !== (initialItem.addOns || []).length) return true;
            return false;
        }

        return Boolean(
            name ||
            sku ||
            description ||
            badge ||
            price ||
            itemGroupId ||
            unitId ||
            barcode ||
            options.length > 0 ||
            colors.length > 0 ||
            attributes.length > 0 ||
            blocks.length > 0 ||
            attachedAddOnIds.length > 0 ||
            pickedImages.length > 0
        );
    }

    const isDiscardedRef = useRef(false);

    const saveDraftToLocalStorage = useCallback(async () => {
        if (isEditing || typeof window === "undefined" || !formRef.current || isDiscardedRef.current) return;
        if (!isFormDirty()) {
            localStorage.removeItem(CREATE_DRAFT_KEY);
            return;
        }
        try {
            const fd = new FormData(formRef.current);

            const storedPicked = await Promise.all(
                pickedImages.map(async (img) => ({
                    id: img.id,
                    storedFile: await fileToStoredImageData(img.file),
                })),
            );

            const storedOptions = await Promise.all(
                options.map(async (opt) => {
                    if (!opt.file) return opt;
                    return {
                        ...opt,
                        storedFile: await fileToStoredImageData(opt.file),
                    };
                }),
            );

            const storedColors = await Promise.all(
                colors.map(async (col) => {
                    if (!col.file) return col;
                    return {
                        ...col,
                        storedFile: await fileToStoredImageData(col.file),
                    };
                }),
            );

            async function processBlocks(bList: BlockDraft[]): Promise<any[]> {
                return Promise.all(
                    bList.map(async (b) => {
                        const updated: any = { ...b };
                        if (b.file) {
                            updated.storedFile = await fileToStoredImageData(b.file);
                        }
                        if (b.columns) {
                            updated.columns = await Promise.all(
                                b.columns.map(async (col) => ({
                                    ...col,
                                    blocks: await processBlocks(col.blocks),
                                })),
                            );
                        }
                        return updated;
                    }),
                );
            }

            const storedBlocks = await processBlocks(blocks);

            const draft: ItemCreateDraft = {
                name: String(fd.get("name") || ""),
                sku: String(fd.get("sku") || ""),
                barcode: barcodePreview || String(fd.get("barcode") || ""),
                itemGroupId: String(fd.get("itemGroupId") || ""),
                unitId: uomDraft.baseUnitId || String(fd.get("unitId") || ""),
                description: String(fd.get("description") || ""),
                badge: String(fd.get("badge") || ""),
                price: String(fd.get("price") || ""),
                itemType: String(fd.get("itemType") || ""),
                trackInventory,
                lowStockDefault: String(fd.get("lowStockDefault") || ""),
                status: String(fd.get("status") || ""),
                attachedAddOnIds,
                attributes,
                colors: storedColors,
                options: storedOptions,
                uomDraft,
                blocks: storedBlocks,
                pickedImages: storedPicked,
            };
            localStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(draft));
        } catch {
            // Ignore quota errors
        }
    }, [
        isEditing,
        barcodePreview,
        uomDraft,
        trackInventory,
        attachedAddOnIds,
        attributes,
        colors,
        options,
        blocks,
        pickedImages,
    ]);

    const saveDraftSync = useCallback(() => {
        if (isEditing || typeof window === "undefined" || !formRef.current || isDiscardedRef.current) return;
        if (!isFormDirty()) return;

        try {
            const fd = new FormData(formRef.current);
            const draft: ItemCreateDraft = {
                name: String(fd.get("name") || ""),
                sku: String(fd.get("sku") || ""),
                barcode: barcodePreview || String(fd.get("barcode") || ""),
                itemGroupId: String(fd.get("itemGroupId") || ""),
                unitId: uomDraft.baseUnitId || String(fd.get("unitId") || ""),
                description: String(fd.get("description") || ""),
                badge: String(fd.get("badge") || ""),
                price: String(fd.get("price") || ""),
                itemType: String(fd.get("itemType") || ""),
                trackInventory,
                lowStockDefault: String(fd.get("lowStockDefault") || ""),
                status: String(fd.get("status") || ""),
                attachedAddOnIds,
                attributes,
                colors,
                options,
                uomDraft,
                blocks,
                pickedImages: pickedImages.map((img) => ({
                    id: img.id,
                    storedFile: {
                        name: img.file.name,
                        type: img.file.type,
                        dataUrl: img.previewUrl,
                    },
                })),
            };
            localStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(draft));
        } catch {
            // Ignore quota errors
        }
    }, [
        isEditing,
        barcodePreview,
        uomDraft,
        trackInventory,
        attachedAddOnIds,
        attributes,
        colors,
        options,
        blocks,
        pickedImages,
        isFormDirty,
    ]);

    useEffect(() => {
        if (!isEditing) {
            void saveDraftToLocalStorage();
        }
    }, [isEditing, saveDraftToLocalStorage]);

    useEffect(() => {
        const handleNavigation = () => {
            saveDraftSync();
        };

        window.addEventListener("pagehide", handleNavigation);
        window.addEventListener("beforeunload", handleNavigation);

        return () => {
            saveDraftSync();
            window.removeEventListener("pagehide", handleNavigation);
            window.removeEventListener("beforeunload", handleNavigation);
        };
    }, [saveDraftSync]);

    function handleBackToItems() {
        if (isFormDirty()) {
            setBackDialogOpen(true);
            return;
        }
        router.push("/inventory");
    }

    function handleSaveDraftAndLeave() {
        saveDraftToLocalStorage();
        toast({
            tone: "info",
            title: "Draft saved",
            description: "Your item draft has been saved locally.",
        });
        setBackDialogOpen(false);
        router.push("/inventory");
    }

    function handleDiscardDraft() {
        isDiscardedRef.current = true;
        if (typeof window !== "undefined") {
            localStorage.removeItem(CREATE_DRAFT_KEY);
        }
        toast({
            tone: "info",
            title: "Draft discarded",
            description: "Unsaved item draft was discarded.",
        });
        setBackDialogOpen(false);
        router.push("/inventory");
    }
    const optionsFull = options.length >= itemLimits.options;
    const colorsFull = colors.length >= itemLimits.colors;
    const listedAttributes = attributes.filter(
        (attribute) => attribute.placement !== "SPECIFICATION",
    );
    const attributesFull = attributes.length >= itemLimits.attributes;
    const addOnsFull = attachedAddOnIds.length >= itemLimits.addOns;
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
                description: getApiErrorMessage(
                    error,
                    "Unable to reorder the images.",
                ),
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
                description: getApiErrorMessage(
                    error,
                    "Unable to remove that image.",
                ),
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

    /** Flat, for the trigger's own label and for the preview. */
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

    /** Specs live as attributes, but are authored in the spec grid block. */
    const specs = useMemo<SpecDraft[]>(
        () =>
            attributes
                .filter((attribute) => attribute.placement === "SPECIFICATION")
                .map((attribute) => ({
                    id: attribute.id,
                    name: attribute.name,
                    value: attribute.values[0]?.value || "",
                    icon: attribute.icon,
                })),
        [attributes],
    );

    function setSpecs(next: SpecDraft[]) {
        setAttributes((current) => [
            ...current.filter(
                (attribute) => attribute.placement !== "SPECIFICATION",
            ),
            ...next.map((spec) => ({
                id: spec.id,
                name: spec.name,
                type: "TEXT" as const,
                placement: "SPECIFICATION" as const,
                icon: spec.icon,
                values: spec.value.trim()
                    ? [{ value: spec.value, label: "", available: true }]
                    : [],
            })),
        ]);
    }

    const editingOption = options.find((row) => row.id === editingOptionId);
    const editingColor = colors.find((row) => row.id === editingColorId);
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
        const taken = new Set(
            existing.map((row) => row.name.trim().toLowerCase()),
        );

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
                    description:
                        "This item already has every one of those colours.",
                });
                return;
            }

            const room = itemLimits.colors - colors.length;

            if (room <= 0) {
                toast({
                    tone: "error",
                    title: `${preset.name} not added`,
                    description: `An item holds at most ${itemLimits.colors} colours, and this one is full.`,
                });
                return;
            }

            const added = fresh.slice(0, room);

            setColors((current) => [...current, ...added]);
            toast({
                tone: "success",
                title: `${preset.name} added`,
                description:
                    added.length < fresh.length
                        ? `Only ${added.length} of them fit — an item holds at most ${itemLimits.colors} colours.`
                        : "Tick the sizes that come in them.",
            });
            return;
        }

        const candidates: OptionDraft[] = (preset.values || [])
            .filter((value) => {
                const name = (value.value || "").trim();
                return name && !taken.has(name.toLowerCase());
            })
            .map((value) => ({
                ...emptyOption(createRowId()),
                name: (value.value || "").trim(),
            }));

        const room = itemLimits.options - existing.length;

        if (candidates.length && room <= 0) {
            toast({
                tone: "error",
                title: `${preset.name} not added`,
                description: `An item holds at most ${itemLimits.options} options, and this one is full.`,
            });
            return;
        }

        const added = candidates.slice(0, room);

        if (!added.length) {
            toast({
                tone: "error",
                title: `${preset.name} not added`,
                description:
                    "This item already has every one of those options.",
            });
            return;
        }

        setOptions([...existing, ...added]);
        toast({
            tone: "success",
            title: `${preset.name} added`,
            description:
                added.length < candidates.length
                    ? `Only ${added.length} of them fit — an item holds at most ${itemLimits.options} options.`
                    : `${added.length} ${added.length === 1 ? "option" : "options"} added — adjust them for this item as needed.`,
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
                description: getApiErrorMessage(
                    error,
                    "Unable to create that add-on.",
                ),
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
            ...ids
                .filter((id) => !current.includes(id))
                .slice(0, Math.max(0, itemLimits.addOns - current.length)),
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
            sku: read("sku"),
            categoryName:
                categoryOptions.find((option) => option.id === categoryId)
                    ?.label || "",
            unitName:
                (units || []).find((unit) => unit.id === unitId)?.name || "",
            itemType: (read("itemType") || "PHYSICAL") as StoredItemType,
            status: (read("status") ||
                "ACTIVE") as (typeof itemStatuses)[number],
            attributes: attributes.map((attribute) => ({
                name: attribute.name,
                type: attribute.type,
                placement: attribute.placement,
                icon: attribute.icon,
                values: attribute.values,
            })),
            descriptionBlocks: blocks.map((block) =>
                fromBlockDraft(block, true),
            ),
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
                    imageUrl:
                        (color.previewUrl || color.imageUrl).trim() ||
                        undefined,
                })),
            packs: uomDraft.conversions
                .map((conversion) => {
                    const unit = (units || []).find(
                        (row) => row.id === conversion.unitId,
                    );
                    const option = options.find(
                        (row) => row.id === conversion.variantId,
                    );
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
        const attributeValues = attributes
            .filter((attribute) => attribute.name.trim())
            .map((attribute) => ({
                name: attribute.name,
                type: attribute.type,
                placement: attribute.placement,
                icon: attribute.icon,
                values: attribute.values,
            }));
        if (namedOptions.length) {
            const stray = uomDraft.conversions.find(
                (conversion) =>
                    !namedOptions.some(
                        (option) => option.id === conversion.variantId,
                    ),
            );

            if (stray) {
                const unit = (units || []).find(
                    (row) => row.id === stray.unitId,
                );

                toast({
                    tone: "error",
                    title: `Item not ${isEditing ? "updated" : "created"}`,
                    description: `This item is sold in options, so the ${
                        unit?.name || "larger"
                    } conversion has to say which one it is for. Pick an option on the highlighted row under Conversions, or remove it.`,
                });
                scrollFieldIntoView("conversion-option");
                return;
            }
        }

        // Block images are held as files while editing, so they go up before the
    // blocks are validated — an unsaved pick has no URL for the schema to see.
    let readyBlocks = blocks;

    try {
      const uploaded = new Map<File, string>();

      const send = async (list: BlockDraft[]): Promise<BlockDraft[]> =>
        Promise.all(
          list.map(async (block) => {
            const columns = await Promise.all(
              block.columns.map(async (column) => ({
                ...column,
                blocks: await send(column.blocks),
              })),
            );

            if (!block.file) return { ...block, columns };

            const held = uploaded.get(block.file);

            if (held) {
              return {
                ...block,
                columns,
                url: held,
                file: undefined,
                previewUrl: undefined,
              };
            }

            const asset = await uploadAsset(block.file).unwrap();

            if (!asset.url) {
              throw new Error("The upload returned no URL.");
            }

            uploaded.set(block.file, asset.url);

            return {
              ...block,
              columns,
              url: asset.url,
              file: undefined,
              previewUrl: undefined,
            };
          }),
        );

      readyBlocks = await send(blocks);

      // Kept even if the save then fails, so a retry does not upload twice.
      if (uploaded.size) setBlocks(readyBlocks);
    } catch (error) {
      toast({
        tone: "error",
        title: "Store page image not uploaded",
        description: getApiErrorMessage(
          error,
          "Unable to upload a store page image, so nothing was saved. Try again.",
        ),
      });
      return;
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
            descriptionBlocks: readyBlocks.map((block) =>
                fromBlockDraft(block),
            ),
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
                            ...(option?.variantId
                                ? { variantId: option.variantId }
                                : {}),
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
                    : (firstIssue?.message ??
                      "Check the highlighted item information."),
            });

            scrollFieldIntoView(field);
            return;
        }

        setFieldErrors({});

        let variants = result.data.variants;

        try {
            // A row with colours becomes one variant per colour, so the files have
            // to be spread the same way `toVariantRows` spreads the rows themselves.
            const rowFiles = namedRows.flatMap((row) =>
                row.colorValues.length
                    ? row.colorValues.map(() => row.file)
                    : [row.file],
            );
            const uploaded = new Map<File, string>();

            variants = await Promise.all(
                variants.map(async (variant, index) => {
                    const file = rowFiles[index];

                    if (!file) return variant;

                    const held = uploaded.get(file);

                    if (held) return { ...variant, imageUrl: held };

                    const asset = await uploadAsset(file).unwrap();

                    if (!asset.url) {
                        throw new Error("The upload returned no URL.");
                    }

                    uploaded.set(file, asset.url);

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

        let finalColors = result.data.colors;
        const colorRows = colors.filter((c) => c.value.trim());

        if (colorRows.some((c) => c.file)) {
            try {
                const uploadedColorMap = new Map<File, string>();
                finalColors = await Promise.all(
                    colorRows.map(async (c) => {
                        if (!c.file) {
                            return {
                                value: c.value.trim(),
                                colorHex: c.colorHex.trim(),
                                imageUrl: c.imageUrl.trim(),
                            };
                        }

                        const held = uploadedColorMap.get(c.file);
                        if (held) {
                            return {
                                value: c.value.trim(),
                                colorHex: c.colorHex.trim(),
                                imageUrl: held,
                            };
                        }

                        const asset = await uploadAsset(c.file).unwrap();
                        if (!asset.url) {
                            throw new Error(
                                "Colour image upload returned no URL.",
                            );
                        }

                        uploadedColorMap.set(c.file, asset.url);

                        return {
                            value: c.value.trim(),
                            colorHex: c.colorHex.trim(),
                            imageUrl: asset.url,
                        };
                    }),
                );
            } catch (error) {
                toast({
                    tone: "error",
                    title: "Colour image not uploaded",
                    description: getApiErrorMessage(
                        error,
                        "Unable to upload a colour image, so nothing was saved. Try again.",
                    ),
                });
                return;
            }
        }

        const body = { ...result.data, variants, colors: finalColors };

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
                isDiscardedRef.current = true;
                if (typeof window !== "undefined") {
                    localStorage.removeItem(CREATE_DRAFT_KEY);
                }
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
        return (
            <InventoryError message="Unable to load the item form options." />
        );
    }

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            className="-mb-8 flex flex-col"
        >
            <div className="sticky top-0 z-30 -mx-5 px-5 lg:-mx-8 lg:px-8 py-4 bg-shell/95 backdrop-blur-md border-b border-border/40 transition-shadow">
                <InventoryPageHeader
                    title={isEditing ? "Edit Master Item" : "Create Master Item"}
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
                                type="button"
                                variant="outline"
                                onClick={handleBackToItems}
                                className="h-10 gap-2"
                            >
                                <ArrowLeft />
                                Back to items
                            </Button>
                        </div>
                    }
                />
            </div>

            <div className="flex flex-col gap-6 pt-1 pb-6">
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
                                <CharCountField
                                    length={nameCount.length}
                                    max={itemLimits.name}
                                >
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={initialItem?.name}
                                        maxLength={itemLimits.name}
                                        onChange={nameCount.onChange}
                                        placeholder="Ice Latte"
                                        aria-invalid={Boolean(fieldErrors.name)}
                                        className={`${inventoryControlClassName} ${charCountInputClassName}`}
                                    />
                                </CharCountField>
                            </Field>
                        </div>
                        <div data-tour="item-form-sku">
                            <Field
                                label="SKU"
                                name="sku"
                                error={fieldErrors.sku}
                            >
                                <CharCountField
                                    length={skuCount.length}
                                    max={itemLimits.sku}
                                >
                                    <Input
                                        id="sku"
                                        name="sku"
                                        defaultValue={initialItem?.sku}
                                        maxLength={itemLimits.sku}
                                        onChange={skuCount.onChange}
                                        placeholder="LAT-001"
                                        aria-invalid={Boolean(fieldErrors.sku)}
                                        className={`${inventoryControlClassName} ${charCountInputClassName}`}
                                    />
                                </CharCountField>
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
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={barcodePreview}
                                        maxLength={itemLimits.barcode}
                                        onKeyDown={(e) => {
                                            if (
                                                [
                                                    "Backspace",
                                                    "Delete",
                                                    "Tab",
                                                    "Escape",
                                                    "Enter",
                                                    "ArrowLeft",
                                                    "ArrowRight",
                                                    "ArrowUp",
                                                    "ArrowDown",
                                                    "Home",
                                                    "End",
                                                ].includes(e.key) ||
                                                e.ctrlKey ||
                                                e.metaKey
                                            ) {
                                                return;
                                            }
                                            if (!/^[0-9]$/.test(e.key)) {
                                                e.preventDefault();
                                            }
                                        }}
                                        onChange={(event) =>
                                            setBarcodePreview(
                                                event.target.value.replace(
                                                    /[^0-9]/g,
                                                    "",
                                                ),
                                            )
                                        }
                                        placeholder="3547908987678"
                                        aria-invalid={Boolean(
                                            fieldErrors.barcode,
                                        )}
                                        className={`${inventoryControlClassName} flex-1 font-mono`}
                                    />
                                    {!isEditing ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon-sm"
                                            disabled={
                                                generateBarcodeState.isLoading
                                            }
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
                                    defaultValue={
                                        initialItem?.itemGroup?.id || ""
                                    }
                                    items={Object.fromEntries(
                                        categoryOptions.map((option) => [
                                            option.id,
                                            option.label,
                                        ]),
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
                                                    <SelectLabel>
                                                        {group.label}
                                                    </SelectLabel>
                                                    {group.subGroups.map(
                                                        (subGroup) => (
                                                            <SelectItem
                                                                key={
                                                                    subGroup.id
                                                                }
                                                                value={
                                                                    subGroup.id
                                                                }
                                                                className="pl-6"
                                                            >
                                                                {subGroup.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectGroup>
                                            ) : (
                                                <SelectGroup key={group.id}>
                                                    <SelectItem
                                                        value={group.id}
                                                    >
                                                        {group.label}
                                                    </SelectItem>
                                                </SelectGroup>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                                {categoryGroups.length ? null : (
                                    <p className="text-xs text-muted-foreground">
                                        An item is filed under a category. Add
                                        one in{" "}
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
                                defaultValue={
                                    initialItem?.itemType || "PHYSICAL"
                                }
                                items={itemTypeLabels}
                            >
                                <SelectTrigger
                                    id="itemType"
                                    className={`${inventoryControlClassName} w-full`}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {itemTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {itemTypeLabels[type]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field
                            label="Store badge"
                            name="badge"
                            error={fieldErrors.badge}
                        >
                            <CharCountField
                                length={badgeCount.length}
                                max={itemLimits.badge}
                            >
                                <Input
                                    id="badge"
                                    name="badge"
                                    defaultValue={initialItem?.badge}
                                    maxLength={itemLimits.badge}
                                    onChange={badgeCount.onChange}
                                    placeholder="NEW"
                                    aria-invalid={Boolean(fieldErrors.badge)}
                                    className={`${inventoryControlClassName} ${charCountInputClassName}`}
                                />
                            </CharCountField>
                        </Field>
                        <div data-tour="item-form-status">
                            <Field
                                label="Status *"
                                name="status"
                                error={fieldErrors.status}
                            >
                                <Select
                                    name="status"
                                    defaultValue={
                                        initialItem?.status || "ACTIVE"
                                    }
                                    items={{
                                        ACTIVE: "Active",
                                        INACTIVE: "Inactive",
                                    }}
                                >
                                    <SelectTrigger
                                        id="status"
                                        className={`${inventoryControlClassName} w-full`}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {itemStatuses.map((statusValue) => (
                                            <SelectItem
                                                key={statusValue}
                                                value={statusValue}
                                            >
                                                {statusValue === "ACTIVE"
                                                    ? "Active"
                                                    : "Inactive"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3.5">
                            <div className="space-y-0.5">
                                <Label
                                    htmlFor="trackInventorySwitch"
                                    className="text-sm font-semibold text-foreground cursor-pointer"
                                >
                                    Track Inventory / Stock
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Enable stock tracking, low-stock warnings,
                                    and inventory deductions upon checkout.
                                </p>
                            </div>
                            <Switch
                                id="trackInventorySwitch"
                                checked={trackInventory}
                                onCheckedChange={setTrackInventory}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Field
                                label="Description"
                                name="description"
                                error={fieldErrors.description}
                            >
                                <CharCountField
                                    length={descriptionCount.length}
                                    max={itemLimits.description}
                                    variant="textarea"
                                >
                                    <Textarea
                                        id="description"
                                        name="description"
                                        defaultValue={initialItem?.description}
                                        maxLength={itemLimits.description}
                                        onChange={descriptionCount.onChange}
                                        placeholder="Describe this item for your menu and online store"
                                        className={`${inventoryTextareaClassName} ${charCountTextareaClassName}`}
                                    />
                                </CharCountField>
                            </Field>
                        </div>
                    </div>

                    <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                        Pricing is set per sales channel in Sale Management, not
                        here.
                    </p>
                </section>

                <section data-tour="item-form-options" className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <SectionHeading
                            title={
                                options.length
                                    ? `Options · ${options.length}`
                                    : "Options"
                            }
                        />
                        <div className="flex flex-col items-end gap-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                {(optionPresets || []).length ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={optionsFull && colorsFull}
                                        onClick={() =>
                                            setPresetPickerOpen(true)
                                        }
                                    >
                                        From preset
                                    </Button>
                                ) : null}
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={optionsFull}
                                    onClick={() => openOptionDialog(null)}
                                >
                                    <Plus />
                                    Add option
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={colorsFull}
                                    onClick={() => openColorDialog(null)}
                                >
                                    <Plus />
                                    Add colour
                                </Button>
                            </div>
                            <CapNote
                                count={options.length}
                                max={itemLimits.options}
                                noun="options"
                            />
                            <CapNote
                                count={colors.length}
                                max={itemLimits.colors}
                                noun="colours"
                            />
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    {colors.length
                                        ? `Colours · ${colors.length}`
                                        : "Colours"}
                                </p>
                            </div>
                        </div>

                        {fieldErrors.colors ? (
                            <p
                                className="mt-3 text-xs text-danger"
                                role="alert"
                            >
                                {fieldErrors.colors}
                            </p>
                        ) : null}

                        {colors.length ? (
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {colors.map((color) => (
                                    <li
                                        key={color.id}
                                        className="flex max-w-full items-center gap-1 rounded-full border border-border bg-card py-1 pr-1 pl-3"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openColorDialog(color.id)
                                            }
                                            title={`Edit ${color.value || "colour"}`}
                                            className="flex min-w-0 items-center gap-2 text-sm text-foreground"
                                        >
                                            <span
                                                className="size-3.5 shrink-0 rounded-full border border-border"
                                                style={{
                                                    background:
                                                        color.colorHex ||
                                                        "transparent",
                                                }}
                                            />
                                            <span className="max-w-40 truncate">
                                                {color.value ||
                                                    "Unnamed colour"}
                                            </span>
                                            {color.previewUrl ||
                                            color.imageUrl ? (
                                                <img
                                                    src={
                                                        color.previewUrl ||
                                                        color.imageUrl
                                                    }
                                                    alt=""
                                                    className="size-5 shrink-0 rounded-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
                                                    }}
                                                />
                                            ) : null}
                                        </button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            aria-label={`Remove ${color.value || "colour"}`}
                                            onClick={() => removeColor(color)}
                                            className="shrink-0 rounded-full text-muted-foreground hover:text-danger"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>

                    {options.length ? (
                        <>
                            <ul className="mt-5 flex flex-col gap-2">
                                {options.map((option, index) => (
                                    <li
                                        key={option.id}
                                        className="flex items-center gap-3 rounded-xl border border-[#e8e8e8] bg-muted/20 p-3 dark:border-[#2a3042]"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openOptionDialog(option.id)
                                            }
                                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                        >
                                            {option.previewUrl ||
                                            option.imageUrl ? (
                                                <img
                                                    src={
                                                        option.previewUrl ||
                                                        option.imageUrl
                                                    }
                                                    alt=""
                                                    className="size-10 shrink-0 rounded-lg border border-border object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
                                                    }}
                                                />
                                            ) : (
                                                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                                                    {index + 1}
                                                </span>
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-foreground">
                                                    {option.name ||
                                                        "New option"}
                                                </span>
                                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                                    {[
                                                        option.price ===
                                                        undefined
                                                            ? "Price not set"
                                                            : formatMoney(
                                                                  option.price,
                                                              ),
                                                        option.sku || null,
                                                        option.colorValues
                                                            .length
                                                            ? `${option.colorValues.length} ${option.colorValues.length === 1 ? "colour" : "colours"}`
                                                            : null,
                                                        option.available
                                                            ? null
                                                            : "Off sale",
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </span>
                                            </span>
                                        </button>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label={`Edit option ${option.name || index + 1}`}
                                            onClick={() =>
                                                openOptionDialog(option.id)
                                            }
                                        >
                                            <Pencil />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label={`Remove option ${option.name || index + 1}`}
                                            onClick={() =>
                                                removeOption(option.id)
                                            }
                                        >
                                            <Trash2 />
                                        </Button>
                                    </li>
                                ))}
                            </ul>

                            <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                                Each option is saved with its own SKU, barcode
                                and image. Give an option an image and the store
                                swaps to it when a shopper picks that option —
                                leave it empty and the item gallery stays put.
                                Pictures are uploaded when this item is saved,
                                not before. Prices are set per sales channel in
                                Sale Management.
                            </p>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => openOptionDialog(null)}
                            className="mt-5 flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-[#e8e8e8] px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/30 dark:border-[#2a3042] border-2 border-dashed border-[#e4eae2] dark:border-[#2a3042] bg-[#fafbfa] dark:bg-[#1a1e29] text-sm text-[#6b7569] dark:text-[#cbd5e1] font-medium"
                        >
                            <Plus className="size-5 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                                Add an option
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Only if this item sells in more than one size or
                                pack.
                            </span>
                        </button>
                    )}

                    {fieldErrors.variants ? (
                        <p className="mt-3 text-xs text-danger" role="alert">
                            {fieldErrors.variants}
                        </p>
                    ) : null}

                    <ItemOptionDialog
                        open={optionDialogOpen}
                        onOpenChange={setOptionDialogOpen}
                        seed={dialogSeed}
                        previewUrls={{
                            create: createObjectUrl,
                            release: releaseObjectUrl,
                        }}
                        {...(editingOption ? { option: editingOption } : {})}
                        colors={namedColors}
                        existingNames={options
                            .filter((row) => row.id !== editingOptionId)
                            .map((row) => row.name.trim().toLowerCase())
                            .filter(Boolean)}
                        onSubmit={saveOption}
                    />

                    <ItemColorDialog
                        open={colorDialogOpen}
                        onOpenChange={setColorDialogOpen}
                        seed={dialogSeed}
                        {...(editingColor ? { color: editingColor } : {})}
                        existingNames={colors
                            .filter((row) => row.id !== editingColorId)
                            .map((row) => row.value.trim().toLowerCase())
                            .filter(Boolean)}
                        onSubmit={saveColor}
                    />
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

                <section data-tour="item-form-images" className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
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
                                        label={
                                            index === 0
                                                ? "Thumbnail"
                                                : `Image ${index + 1}`
                                        }
                                        busy={
                                            deleteImageState.isLoading ||
                                            reorderImagesState.isLoading
                                        }
                                        onRemove={() =>
                                            image.id
                                                ? removeStoredImage(image.id)
                                                : undefined
                                        }
                                        onMoveBack={
                                            index > 0
                                                ? () =>
                                                      moveStoredImage(index, -1)
                                                : undefined
                                        }
                                        onMoveForward={
                                            index < storedImages.length - 1
                                                ? () =>
                                                      moveStoredImage(index, 1)
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
                                        onRemove={() =>
                                            removePickedImage(image.id)
                                        }
                                    />
                                ))}
                            </ul>
                        ) : null}
                    </ImageDropzone>
                </section>

                <section data-tour="item-form-attributes" className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                        <SectionHeading
                            title="Attributes"
                            description="Notes about the item — a spec, a perk, a fact. What a shopper picks between is an Option."
                        />
                        <div className="flex flex-col items-end gap-1.5">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={attributesFull}
                                onClick={() => openAttributeDialog(null)}
                            >
                                <Plus />
                                Add attribute
                            </Button>
                            <CapNote
                                count={attributes.length}
                                max={itemLimits.attributes}
                                noun="attributes"
                            />
                        </div>
                    </div>
                    <div className="mt-5 flex flex-col gap-3">
                        {listedAttributes.length ? (
                            listedAttributes.map((attribute) => (
                                <div
                                    key={attribute.id}
                                    className="flex items-center gap-3 rounded-xl border border-[#e8e8e8] dark:border-[#2a3042] bg-white dark:bg-[#1e2330] px-4 py-3"
                                >
                                    {attribute.icon ? (
                                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                            {(() => {
                                                const Glyph = attributeIcon(
                                                    attribute.icon,
                                                );

                                                return (
                                                    <Glyph className="size-4" />
                                                );
                                            })()}
                                        </span>
                                    ) : null}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="max-w-full truncate font-medium text-[#1a222b] dark:text-[#f8fafc]">
                                                {attribute.name}
                                            </p>
                                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                                {
                                                    itemAttributeTypeLabels[
                                                        attribute.type
                                                    ]
                                                }
                                            </span>
                                            <span className="rounded-full bg-[#f2f3f1] dark:bg-[#252a38] px-2.5 py-0.5 text-xs font-medium text-[#657064] dark:text-[#cbd5e1]">
                                                {
                                                    itemAttributePlacementLabels[
                                                        attribute.placement
                                                    ].label
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
                                        onClick={() =>
                                            openAttributeDialog(attribute.id)
                                        }
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
                                                current.filter(
                                                    (row) =>
                                                        row.id !== attribute.id,
                                                ),
                                            )
                                        }
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <p className="rounded-xl border border-dashed border-[#e8e8e8] dark:border-[#2a3042] px-4 py-6 text-center text-sm text-[#657064] dark:text-[#94a3b8]">
                                No attributes yet. Add one to describe this
                                item.
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
                </section>

                <section data-tour="item-form-addons" className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                        <SectionHeading
                            title="Add-ons"
                            description="Extras a customer can choose with this item. Each one is defined once in Inventory config and attached here."
                        />
                        <div className="flex flex-col items-end gap-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={addOnsFull}
                                    onClick={() => setAddOnPickerOpen(true)}
                                >
                                    Attach existing
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                        createAddOnState.isLoading || addOnsFull
                                    }
                                    onClick={() => setNewAddOnOpen(true)}
                                >
                                    <Plus />
                                    Attach add-on
                                </Button>
                            </div>
                            <CapNote
                                count={attachedAddOnIds.length}
                                max={itemLimits.addOns}
                                noun="add-ons"
                            />
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
                                No add-ons attached. Attach one to offer it with
                                this item.
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
                            .filter(
                                (addOn) => !attachedAddOnIds.includes(addOn.id),
                            )
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

                <section data-tour="item-form-store-page" className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                    <SectionHeading
                        title="Store page"
                        description="Lay out the lower half of the store page: text, bullets, images and the spec grid."
                    />
                    <div className="mt-5">
                        <DescriptionBlockEditor
                            blocks={blocks}
                            onChange={setBlocks}
                            specs={specs}
                            onSpecsChange={setSpecs}
                            specsFull={attributesFull}
                        />
                        {fieldErrors.descriptionBlocks ? (
                            <p
                                className="mt-3 text-xs text-danger"
                                role="alert"
                            >
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
                            {Object.entries(fieldErrors).map(
                                ([field, message]) => (
                                    <li key={field}>
                                        {fieldLabels[field]
                                            ? `${fieldLabels[field]}: ${message}`
                                            : message}
                                    </li>
                                ),
                            )}
                        </ul>
                    </div>
                ) : null}
            </div>

            <div className="sticky -bottom-8 z-30 -mx-5 flex shrink-0 flex-row items-center justify-end gap-2.5 border-t border-border bg-shell px-5 py-3.5 sm:py-4 lg:-mx-8 lg:px-8 sm:gap-3">
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
                    disabled={isSaving}
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

            <Dialog open={backDialogOpen} onOpenChange={setBackDialogOpen}>
                <DialogContent className="max-w-md p-6">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-lg font-semibold text-foreground">
                            Save draft before leaving?
                        </DialogTitle>
                        <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
                            You have unsaved changes to this item. Would you like to save them as a draft or discard them?
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setBackDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="border-danger/30 text-danger hover:bg-danger/10 dark:hover:bg-danger/20"
                            onClick={handleDiscardDraft}
                        >
                            Discard draft
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveDraftAndLeave}
                        >
                            Save as draft
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </form>
    );
}

export function CreateInventoryProduct() {
    return <ProductEditor />;
}

export function EditInventoryProduct({ itemId }: { itemId: string }) {
    const { data, error, isLoading, refetch } =
        useGetInventoryItemQuery(itemId);

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
