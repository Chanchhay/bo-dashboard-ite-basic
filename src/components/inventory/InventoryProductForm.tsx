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

import { BarcodePreview } from "@/components/inventory/BarcodePreview";
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
import {
    ImageDropzone,
    useObjectUrls,
} from "@/components/ui/image-picker";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useMoney } from "@/hooks/useMoney";
import {
    inventoryItemSchema,
    itemImageRules,
    itemStatuses,
    itemTypes,
    maxItemImages,
    type DescriptionBlock,
    type InventoryItem,
    type ItemAttribute,
    type ItemAttributePlacement,
} from "@/lib/api/inventory";
import {
    sampleAddOns,
    sampleUnits,
} from "@/lib/inventory-config/sample-data";
import type { AddOn, OptionPreset } from "@/lib/inventory-config/types";
import { formatAmount } from "@/lib/inventory-config/units";
import {
    useCreateInventoryItemMutation,
    useDeleteItemImageMutation,
    useGenerateInventoryBarcodeMutation,
    useGetInventoryItemQuery,
    useGetInventoryUnitsQuery,
    useGetItemGroupsQuery,
    useReorderItemImagesMutation,
    useUpdateInventoryItemMutation,
} from "@/services/inventoryApi";

/** A file waiting to be uploaded, with the blob URL previewing it. */
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

/** One picture in the gallery: stored or waiting to be uploaded. */
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
    /** Only stored images can be reordered; picks have no position yet. */
    onMoveBack?: () => void;
    onMoveForward?: () => void;
}) {
    return (
        <li className="group relative overflow-hidden rounded-xl border border-border bg-muted">
            <span className="block aspect-square">
                {/* The API serves these URLs dynamically and picks preview as blobs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
        ? attribute.values
            .map((value) => value.label || value.value)
            .join(", ")
        : "No values";
}

function toBlockDrafts(
    blocks: DescriptionBlock[] | undefined,
): BlockDraft[] {
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

/** True while any block image — at either depth — is still uploading. */
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

/** Drafts hold bullets as one textarea; the API wants an array of lines. */
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

/**
 * Pricing left the item, but the data has not moved yet: until item prices are
 * migrated into Sale Management, the form carries the stored values straight
 * back so that saving an item cannot silently zero them. Same for the old
 * inline variant rows, which become option attributes at migration time. Both
 * disappear from here once the migration has run.
 */
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

/**
 * What each schema field is called on screen.
 *
 * A validation message is useless when it cannot be traced to a control —
 * "check the highlighted information" is a dead end if the field that failed is
 * one the form never renders an error beside.
 */
function emptyOption(): OptionRow {
    return {
        id: createRowId(),
        name: "",
        sku: "",
        barcode: "",
        available: true,
    };
}

type OptionRow = {
    id: string;
    name: string;
    /**
     * Each variation is scanned and counted on its own, so it needs its own
     * SKU and barcode.
     *
     * Neither is saved yet: `ItemVariantRequest` carries only name, price and
     * availability, so these are held on screen until the API grows the
     * fields. Nothing is silently dropped without saying so.
     */
    sku: string;
    barcode: string;
    available: boolean;
    /** Whatever Sale Management has set. Shown here, never edited here. */
    price?: number;
};

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
    const [attributes, setAttributes] = useState(() =>
        toAttributeDrafts(initialItem?.attributes),
    );
    const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
    const [editingAttributeId, setEditingAttributeId] = useState<string | null>(
        null,
    );
    // Which kind of attribute the "add" button is opening: an option a customer
    // picks, or a fact about the item.
    const [newPlacement, setNewPlacement] =
        useState<ItemAttributePlacement>("OPTION");
    const [attachedAddOnIds, setAttachedAddOnIds] = useState<string[]>([]);
    const [addOnPickerOpen, setAddOnPickerOpen] = useState(false);
    const [newAddOnOpen, setNewAddOnOpen] = useState(false);
    /**
     * The item's options: same item, different size or pack, each sold on its
     * own. They are the API's `variants`, which is why a price rides along —
     * but it is never typed here. Pricing is per sales channel in Sale
     * Management, so a new option stays unpriced until that is done.
     */
    const updateOption = (id: string, patch: Partial<OptionRow>) =>
        setOptions((current) =>
            current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
        );

    const [options, setOptions] = useState<OptionRow[]>(() =>
        (initialItem?.variants || []).map((variant) => ({
            id: createRowId(),
            name: variant.name || "",
            sku: "",
            barcode: "",
            available: variant.available !== false,
            price: variant.price ?? undefined,
        })),
    );
    /**
     * The shared add-on library, plus anything created from this form.
     *
     * A new add-on belongs to the library, not to this item — it is attached
     * here as a convenience so the flow does not break off to Inventory config
     * mid-item. Nothing is saved anywhere yet; see the config plan.
     */
    const [addOnLibrary, setAddOnLibrary] = useState<AddOn[]>(sampleAddOns);
    const [uomDraft, setUomDraft] = useState<ItemUomDraft>(() => ({
        ...emptyUomDraft,
        baseUnitId: initialItem?.unit?.id || "",
    }));
    const [barcodePreview, setBarcodePreview] = useState(
        initialItem?.barcode || "",
    );
    // Stored images belong to the server: they arrive with an id and are
    // deleted through their own endpoint. Picked files are held here until the
    // save carries them up.
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
    const [reorderImages, reorderImagesState] = useReorderItemImagesMutation();
    const isEditing = Boolean(initialItem);
    const isSaving = createState.isLoading || updateState.isLoading;
    // A block image is uploaded on pick, so saving mid-upload would store the
    // block without its picture.
    const isUploadingBlockImage = hasUploadingImage(blocks);
    const galleryCount = storedImages.length + pickedImages.length;
    // What the gallery and the preview show: what is stored, then what is
    // about to be uploaded.
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

    /** Same generator the item's own barcode uses, aimed at one option. */
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

    /**
     * Position belongs to the server, so a move sends the whole order. The
     * first image is the thumbnail, which is what makes this worth having.
     */
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

    /** Stored images are deleted on the spot — the endpoint applies at once. */
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

    const categoryOptions = useMemo(
        () =>
            (groups || []).flatMap((group) => [
                { id: group.id, label: group.name || "Unnamed category" },
                ...(group.subGroups || []).map((subGroup) => ({
                    id: subGroup.id,
                    label: `${group.name || "Category"} / ${subGroup.name || "Unnamed"}`,
                })),
            ]),
        [groups],
    );

    const editingAttribute = attributes.find(
        (attribute) => attribute.id === editingAttributeId,
    );
    // A blank draft seeded with the placement the button implies, so "Add
    // option" never opens on "Specification".
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

    /** Copies a preset's choices in. Never a live link — see the config plan. */
    function applyPreset(preset: OptionPreset) {
        setAttributes((current) => [
            ...current,
            {
                id: createRowId(),
                name: preset.name,
                type: preset.type,
                placement: "OPTION" as const,
                icon: "",
                values: preset.values.map((value) => ({
                    value: value.value,
                    label: "",
                    colorHex: value.colorHex || "",
                    available: true,
                })),
            },
        ]);
        toast({
            tone: "success",
            title: `${preset.name} added`,
            description: "Adjust the choices for this item as needed.",
        });
    }

    const attachedAddOns = attachedAddOnIds
        .map((id) => addOnLibrary.find((addOn) => addOn.id === id))
        .filter((addOn) => addOn !== undefined);

    const addOnUnitSymbol = (unitId: string) =>
        sampleUnits.find((unit) => unit.id === unitId)?.symbol ?? "";

    function createAddOn(addOn: AddOn) {
        setAddOnLibrary((current) => [...current, addOn]);
        attachAddOns([addOn.id]);
        toast({
            tone: "success",
            title: `${addOn.name} created`,
            description: "Attached to this item and added to the library.",
        });
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

    /**
     * The fields are uncontrolled, so the preview reads them straight off the
     * form element. That keeps the preview showing unsaved edits without
     * turning every input into controlled state.
     */
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
                categoryOptions.find((option) => option.id === categoryId)
                    ?.label || "",
            unitName:
                (units || []).find((unit) => unit.id === unitId)?.name || "",
            itemType: (read("itemType") ||
                "PHYSICAL") as (typeof itemTypes)[number],
            status: (read("status") ||
                "ACTIVE") as (typeof itemStatuses)[number],
            attributes: attributes.map((attribute) => ({
                name: attribute.name,
                type: attribute.type,
                placement: attribute.placement,
                icon: attribute.icon,
                values: attribute.values,
            })),
            descriptionBlocks: blocks.map(fromBlockDraft),
            variants: preserved.variants,
        });
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const attributeValues = attributes.map((attribute) => ({
            name: attribute.name,
            type: attribute.type,
            placement: attribute.placement,
            icon: attribute.icon,
            values: attribute.values,
        }));
        const result = inventoryItemSchema.safeParse({
            itemGroupId:
                String(formData.get("itemGroupId") || "") === "__none"
                    ? ""
                    : String(formData.get("itemGroupId") || ""),
            unitId:
                String(formData.get("unitId") || "") === "__none"
                    ? ""
                    : String(formData.get("unitId") || ""),
            name: String(formData.get("name") || ""),
            sku: String(formData.get("sku") || ""),
            // No input for this any more — SKU is the code people use. An
            // item that already carries one keeps it.
            code: initialItem?.code || "",
            description: String(formData.get("description") || ""),
            badge: String(formData.get("badge") || ""),
            barcode: String(formData.get("barcode") || ""),
            itemType: String(formData.get("itemType") || ""),
            attributes: attributeValues,
            descriptionBlocks: blocks.map(fromBlockDraft),
            lowStockDefault: Number(formData.get("lowStockDefault") || 0),
            status: String(formData.get("status") || ""),
            ...preservedCommerceFields(initialItem),
            variants: options
                .filter((option) => option.name.trim())
                .map((option) => ({
                    name: option.name.trim(),
                    available: option.available,
                    ...(option.price === undefined
                        ? {}
                        : { price: option.price }),
                })),
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

            // Some of these fields sit far down the page, and one of them has
            // no error slot of its own, so the form goes to the offender.
            document
                .getElementById(field)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        setFieldErrors({});

        try {
            // The newly picked pictures ride along with the save, so an item
            // and its gallery land in one request.
            const files = pickedImages.map((image) => image.file);

            if (initialItem) {
                await updateItem({
                    itemId: initialItem.id,
                    body: result.data,
                    files,
                }).unwrap();
            } else {
                await createItem({ body: result.data, files }).unwrap();
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
            className="flex flex-col gap-6"
        >
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

            <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                <SectionHeading
                    title="Basics"
                    description="What this item is called and how it is identified."
                />
                <div className="mt-6 grid gap-5 md:grid-cols-2">
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
                                onChange={(event) =>
                                    setBarcodePreview(event.target.value)
                                }
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
                        {barcodePreview.trim() ? (
                            <div className="rounded-xl border border-border bg-muted/40 p-3">
                                <BarcodePreview value={barcodePreview} compact />
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs text-muted-foreground">
                                        CODE128 preview
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        render={
                                            <a
                                                href={`/api/inventory/items/barcode/image?code=${encodeURIComponent(barcodePreview.trim())}`}
                                                download
                                            />
                                        }
                                        nativeButton={false}
                                    >
                                        <Download />
                                        Download PNG
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </Field>
                    <Field
                        label="Category"
                        name="itemGroupId"
                        error={fieldErrors.itemGroupId}
                    >
                        <Select
                            name="itemGroupId"
                            defaultValue={initialItem?.itemGroup?.id || "__none"}
                            items={{
                                __none: "No category",
                                ...Object.fromEntries(
                                    categoryOptions.map((option) => [
                                        option.id,
                                        option.label,
                                    ]),
                                ),
                            }}
                        >
                            <SelectTrigger
                                id="itemGroupId"
                                className={`${inventoryControlClassName} w-full`}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none">
                                    No category
                                </SelectItem>
                                {categoryOptions.map((option) => (
                                    <SelectItem
                                        key={option.id}
                                        value={option.id}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field
                        label="Item type *"
                        name="itemType"
                        error={fieldErrors.itemType}
                    >
                        <Select
                            name="itemType"
                            defaultValue={initialItem?.itemType || "PHYSICAL"}
                            items={{
                                PHYSICAL: "Physical",
                                DIGITAL: "Digital",
                                SERVICE: "Service",
                            }}
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
                                        {type
                                            .toLowerCase()
                                            .replace(/^\w/, (letter) =>
                                                letter.toUpperCase(),
                                            )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
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
                    Pricing is set per sales channel in Sale Management, not
                    here.
                </p>
            </section>

            <section className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <SectionHeading
                        title={
                            options.length
                                ? `Options · ${options.length}`
                                : "Options"
                        }
                        description="Variations of this item — Small, Large, 6-pack. Each is scanned and counted on its own, and priced per sales channel in Sale Management."
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOptions((current) => [...current, emptyOption()])}
                    >
                        <Plus />
                        Add option
                    </Button>
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
                                                onClick={() =>
                                                    setOptions((current) =>
                                                        current.filter(
                                                            (row) => row.id !== option.id,
                                                        ),
                                                    )
                                                }
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
                                                    disabled={
                                                        generateBarcodeState.isLoading
                                                    }
                                                    onClick={() =>
                                                        generateOptionBarcode(option.id)
                                                    }
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
                                </li>
                            ))}
                        </ul>

                        <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                            Option names and availability are saved. Per-option
                            SKU and barcode are not — the API has no field for
                            them yet, so they stay on this screen for now.
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
            </section>

            <ItemUomCard
                apiUnits={units || []}
                lowStockDefault={initialItem?.lowStockDefault ?? 0}
                lowStockError={fieldErrors.lowStockDefault}
                draft={uomDraft}
                onDraftChange={(patch) =>
                    setUomDraft((current) => ({ ...current, ...patch }))
                }
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
                                            ? () => moveStoredImage(index, -1)
                                            : undefined
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
                        description="Define typed attributes such as size, colour or status."
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => openAttributeDialog(null)}
                    >
                        <Plus />
                        Add attribute
                    </Button>
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
                                        <p className="font-medium text-[#1a222b] dark:text-[#f8fafc]">
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
                            No attributes yet. Add one to describe this item.
                        </p>
                    )}
                    {fieldErrors.attributes ? (
                        <p className="text-xs text-danger" role="alert">
                            {fieldErrors.attributes}
                        </p>
                    ) : null}
                </div>

                <ItemAttributeDialog
                    open={attributeDialogOpen}
                    onOpenChange={setAttributeDialogOpen}
                    initialAttribute={editingAttribute}
                    existingNames={attributes
                        .filter(
                            (attribute) =>
                                attribute.id !== editingAttributeId,
                        )
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
                            onClick={() => setNewAddOnOpen(true)}
                        >
                            <Plus />
                            New add-on
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
                                        Uses {formatAmount(addOn.usePerOrder)}{" "}
                                        {addOnUnitSymbol(addOn.baseUnitId)} per
                                        order
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
                    options={addOnLibrary
                        .filter(
                            (addOn) => !attachedAddOnIds.includes(addOn.id),
                        )
                        .map((addOn) => ({
                            id: addOn.id,
                            label: addOn.name,
                            hint: `Uses ${formatAmount(addOn.usePerOrder)} ${addOnUnitSymbol(addOn.baseUnitId)} per order`,
                        }))}
                    onPick={(id) => attachAddOns([id])}
                />

                <AddOnDialog
                    open={newAddOnOpen}
                    onOpenChange={setNewAddOnOpen}
                    units={sampleUnits}
                    onSave={createAddOn}
                />
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                <SectionHeading
                    title="Store page"
                    description="Lay out the lower half of the store page: text, bullets, images and the spec grid."
                />
                <div className="mt-5">
                    <DescriptionBlockEditor
                        blocks={blocks}
                        onChange={setBlocks}
                    />
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

            <div className="flex flex-row items-center justify-end gap-2.5 sm:gap-3">
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

            {/*
             * Keyed so a blank draft reseeds when the button implies a different
             * placement — the dialog holds its fields in mount-time state.
             */}
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
