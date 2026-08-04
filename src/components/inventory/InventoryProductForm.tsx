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

import { BarcodePreview } from "@/components/inventory/BarcodePreview";
import {
    createBlockId,
    DescriptionBlockEditor,
    type BlockDraft,
} from "@/components/inventory/DescriptionBlockEditor";
import {
    ItemAttributeDialog,
    type AttributeDraft,
} from "@/components/inventory/ItemAttributeDialog";
import {
    ItemPreviewDialog,
    type PreviewItem,
} from "@/components/inventory/ItemPreviewDialog";
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
import { Textarea } from "@/components/ui/textarea";
import { attributeIcon } from "@/lib/api/attribute-icons";
import {
    inventoryItemSchema,
    itemAttributePlacementLabels,
    itemAttributeTypeLabels,
    itemImageRules,
    itemStatuses,
    itemTypes,
    maxItemImages,
    type DescriptionBlock,
    type InventoryItem,
    type ItemAttribute,
    type ItemVariant,
} from "@/lib/api/inventory";
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

type VariantRow = {
    id: string;
    name: string;
    price: string;
    available: boolean;
};

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
                className="text-sm font-semibold text-[#424841] dark:text-[#cbd5e1]"
            >
                {label}
            </Label>
            {children}
            {error ? (
                <p className="text-xs text-accent" role="alert">
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
        <li className="group relative overflow-hidden rounded-xl border border-[#e4eae2] bg-[#f7f8f7]">
            <span className="block aspect-square">
                {/* The API serves these URLs dynamically and picks preview as blobs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={url}
                    alt=""
                    className="size-full object-cover"
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
                        className="size-8 bg-white/90"
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
                        className="size-8 bg-white/90"
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
            <h2 className="text-lg font-semibold text-[#161d16] dark:text-[#f8fafc]">
                {title}
            </h2>
            <p className="mt-1 text-sm text-[#657064] dark:text-[#94a3b8]">
                {description}
            </p>
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

function toVariantRows(variants: ItemVariant[] | undefined): VariantRow[] {
    const rows = (variants || []).map((variant) => ({
        id: variant.id || createRowId(),
        name: variant.name || "",
        price:
            variant.price === undefined ? "" : String(variant.price),
        available: variant.available !== false,
    }));

    return rows.length
        ? rows
        : [{ id: createRowId(), name: "", price: "", available: true }];
}

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

function ProductEditor({
    initialItem,
}: {
    initialItem?: InventoryItem;
}) {
    const router = useRouter();
    const { data: groups, error: groupsError } =
        useGetItemGroupsQuery();
    const { data: units, error: unitsError } =
        useGetInventoryUnitsQuery();
    const [createItem, createState] =
        useCreateInventoryItemMutation();
    const [updateItem, updateState] =
        useUpdateInventoryItemMutation();
    const [generateBarcode, generateBarcodeState] =
        useGenerateInventoryBarcodeMutation();
    const [attributes, setAttributes] = useState(() =>
        toAttributeDrafts(initialItem?.attributes),
    );
    const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
    const [editingAttributeId, setEditingAttributeId] = useState<
        string | null
    >(null);
    const [variants, setVariants] = useState(() =>
        toVariantRows(initialItem?.variants),
    );
    const [barcodePreview, setBarcodePreview] = useState(
        initialItem?.barcode || "",
    );
    const [barcodeGenerationError, setBarcodeGenerationError] = useState<
        string | null
    >(null);
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
    const [imageError, setImageError] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const {
        create: createObjectUrl,
        release: releaseObjectUrl,
    } = useObjectUrls();
    const [blocks, setBlocks] = useState(() =>
        toBlockDrafts(initialItem?.descriptionBlocks),
    );
    const [fieldErrors, setFieldErrors] = useState<
        Record<string, string>
    >({});
    const [status, setStatus] = useState<string | null>(null);
    const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const [deleteImage, deleteImageState] = useDeleteItemImageMutation();
    const [reorderImages, reorderImagesState] =
        useReorderItemImagesMutation();
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
        setImageError(null);
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
        setBarcodeGenerationError(null);

        try {
            const result = await generateBarcode().unwrap();
            setBarcodePreview(result.barcode);
            setFieldErrors((current) => {
                if (!current.barcode) {
                    return current;
                }

                const next = { ...current };
                delete next.barcode;
                return next;
            });
        } catch (error) {
            setBarcodeGenerationError(
                getApiErrorMessage(
                    error,
                    "Unable to generate a unique barcode.",
                ),
            );
        }
    }

    function removePickedImage(id: string) {
        setPickedImages((current) => {
            const removed = current.find((image) => image.id === id);
            releaseObjectUrl(removed?.previewUrl);

            return current.filter((image) => image.id !== id);
        });
        setImageError(null);
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

        setImageError(null);

        try {
            await reorderImages({
                itemId: initialItem.id,
                imageIds: order,
            }).unwrap();
        } catch (error) {
            setImageError(
                getApiErrorMessage(error, "Unable to reorder the images."),
            );
        }
    }

    /** Stored images are deleted on the spot — the endpoint applies at once. */
    async function removeStoredImage(imageId: string) {
        if (!initialItem) {
            return;
        }

        setImageError(null);

        try {
            await deleteImage({ itemId: initialItem.id, imageId }).unwrap();
        } catch (error) {
            setImageError(
                getApiErrorMessage(error, "Unable to remove that image."),
            );
        }
    }

    const categoryOptions = useMemo(
        () =>
            (groups || []).flatMap((group) => [
                {
                    id: group.id,
                    label: group.name || "Unnamed category",
                },
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

    function openAttributeDialog(id: string | null) {
        setEditingAttributeId(id);
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

    /**
     * The fields are uncontrolled, so the preview reads them straight off the
     * form element. That keeps the preview showing unsaved edits without
     * turning every input into controlled state.
     */
    function openPreview() {
        const form = formRef.current;

        if (!form) {
            return;
        }

        const formData = new FormData(form);
        const read = (field: string) => String(formData.get(field) || "");
        const categoryId = read("itemGroupId");
        const unitId = read("unitId");
        const compareAtPrice = read("compareAtPrice");

        setPreviewItem({
            name: read("name"),
            description: read("description"),
            images: galleryUrls,
            badge: read("badge"),
            price: Number(formData.get("price") || 0),
            compareAtPrice:
                compareAtPrice === "" ? undefined : Number(compareAtPrice),
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
            variants: variants
                .filter((row) => row.name.trim())
                .map((row) => ({
                    name: row.name.trim(),
                    available: row.available,
                    ...(row.price === ""
                        ? {}
                        : { price: Number(row.price) }),
                })),
        });
    }

    function updateVariant(id: string, patch: Partial<VariantRow>) {
        setVariants((current) =>
            current.map((row) =>
                row.id === id ? { ...row, ...patch } : row,
            ),
        );
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus(null);

        const formData = new FormData(event.currentTarget);
        const attributeValues = attributes.map((attribute) => ({
            name: attribute.name,
            type: attribute.type,
            placement: attribute.placement,
            icon: attribute.icon,
            values: attribute.values,
        }));
        const variantValues = variants
            .filter((row) => row.name.trim())
            .map((row) => ({
                name: row.name,
                available: row.available,
                ...(row.price === ""
                    ? {}
                    : { price: Number(row.price) }),
            }));
        const compareAtPrice = String(
            formData.get("compareAtPrice") || "",
        );
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
            code: String(formData.get("code") || ""),
            description: String(formData.get("description") || ""),
            badge: String(formData.get("badge") || ""),
            barcode: String(formData.get("barcode") || ""),
            price: Number(formData.get("price") || 0),
            compareAtPrice:
                compareAtPrice === "" ? undefined : Number(compareAtPrice),
            itemType: String(formData.get("itemType") || ""),
            attributes: attributeValues,
            descriptionBlocks: blocks.map(fromBlockDraft),
            variants: variantValues,
            lowStockDefault: Number(
                formData.get("lowStockDefault") || 0,
            ),
            status: String(formData.get("status") || ""),
        });

        if (!result.success) {
            setFieldErrors(fieldErrorsFromIssues(result.error.issues));
            setStatus("Check the highlighted item information.");
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
            router.push("/inventory");
        } catch (error) {
            setStatus(
                getApiErrorMessage(
                    error,
                    `Unable to ${isEditing ? "update" : "create"} the item.`,
                ),
            );
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

            <section className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                <SectionHeading
                    title="Item information"
                    description="Core identifiers, pricing and sale configuration."
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
                            placeholder="Matcha"
                            aria-invalid={Boolean(fieldErrors.name)}
                            className={inventoryControlClassName}
                        />
                    </Field>
                    <Field
                        label="SKU"
                        name="sku"
                        error={fieldErrors.sku}
                    >
                        <Input
                            id="sku"
                            name="sku"
                            defaultValue={initialItem?.sku}
                            placeholder="MATCHA-001"
                            aria-invalid={Boolean(fieldErrors.sku)}
                            className={inventoryControlClassName}
                        />
                    </Field>
                    <Field
                        label="Internal code"
                        name="code"
                        error={fieldErrors.code}
                    >
                        <Input
                            id="code"
                            name="code"
                            defaultValue={initialItem?.code}
                            placeholder="ITEM-001"
                            aria-invalid={Boolean(fieldErrors.code)}
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
                                onChange={(event) => {
                                    setBarcodePreview(event.target.value);
                                    setBarcodeGenerationError(null);
                                }}
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
                        {barcodeGenerationError ? (
                            <p className="text-xs text-accent" role="alert">
                                {barcodeGenerationError}
                            </p>
                        ) : null}
                        {barcodePreview.trim() ? (
                            <div className="rounded-xl border border-[#e4eae2] bg-[#f8faf7] p-3">
                                <BarcodePreview
                                    value={barcodePreview}
                                    compact
                                />
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs text-[#657064]">
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
                            defaultValue={
                                initialItem?.itemGroup?.id || "__none"
                            }
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
                        label="Unit"
                        name="unitId"
                        error={fieldErrors.unitId}
                    >
                        <Select
                            name="unitId"
                            defaultValue={
                                initialItem?.unit?.id || "__none"
                            }
                            items={{
                                __none: "No unit",
                                ...Object.fromEntries(
                                    (units || []).map((unit) => [
                                        unit.id,
                                        unit.name || "Unnamed unit",
                                    ]),
                                ),
                            }}
                        >
                            <SelectTrigger
                                id="unitId"
                                className={`${inventoryControlClassName} w-full`}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none">
                                    No unit
                                </SelectItem>
                                {(units || []).map((unit) => (
                                    <SelectItem
                                        key={unit.id}
                                        value={unit.id}
                                    >
                                        {unit.name || "Unnamed unit"}
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
                            defaultValue={
                                initialItem?.itemType || "PHYSICAL"
                            }
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
                            defaultValue={
                                initialItem?.status || "ACTIVE"
                            }
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
                        label="Price *"
                        name="price"
                        error={fieldErrors.price}
                    >
                        <Input
                            id="price"
                            name="price"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={initialItem?.price ?? 0}
                            aria-invalid={Boolean(fieldErrors.price)}
                            className={inventoryControlClassName}
                        />
                    </Field>
                    <Field
                        label="Low-stock threshold"
                        name="lowStockDefault"
                        error={fieldErrors.lowStockDefault}
                    >
                        <Input
                            id="lowStockDefault"
                            name="lowStockDefault"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={
                                initialItem?.lowStockDefault ?? 0
                            }
                            aria-invalid={Boolean(
                                fieldErrors.lowStockDefault,
                            )}
                            className={inventoryControlClassName}
                        />
                    </Field>
                    <Field
                        label="Compare-at price"
                        name="compareAtPrice"
                        error={fieldErrors.compareAtPrice}
                    >
                        <Input
                            id="compareAtPrice"
                            name="compareAtPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={initialItem?.compareAtPrice ?? ""}
                            placeholder="Original price before discount"
                            aria-invalid={Boolean(
                                fieldErrors.compareAtPrice,
                            )}
                            className={inventoryControlClassName}
                        />
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
            </section>

            <section className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
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
                    error={imageError}
                    remaining={maxItemImages - galleryCount}
                    label="Add images of this item"
                    onPick={handleImagesPicked}
                    onError={setImageError}
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
                                    onRemove={() =>
                                        removePickedImage(image.id)
                                    }
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
                        <p className="text-xs text-accent" role="alert">
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
                        title="Variants"
                        description="Define alternate names and prices for this item."
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            setVariants((current) => [
                                ...current,
                                {
                                    id: createRowId(),
                                    name: "",
                                    price: "",
                                    available: true,
                                },
                            ])
                        }
                    >
                        <Plus />
                        Add variant
                    </Button>
                </div>
                <div className="mt-5 flex flex-col gap-3">
                    {variants.map((variant) => (
                        <div
                            key={variant.id}
                            className="grid gap-3 sm:grid-cols-[1.5fr_1fr_auto_auto] sm:items-center"
                        >
                            <Input
                                value={variant.name}
                                onChange={(event) =>
                                    updateVariant(variant.id, {
                                        name: event.target.value,
                                    })
                                }
                                aria-label="Variant name"
                                placeholder="Variant name"
                                className={inventoryControlClassName}
                            />
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={variant.price}
                                onChange={(event) =>
                                    updateVariant(variant.id, {
                                        price: event.target.value,
                                    })
                                }
                                aria-label="Variant price"
                                placeholder="Price"
                                className={inventoryControlClassName}
                            />
                            <label className="flex items-center gap-2 text-xs whitespace-nowrap text-[#6b7280] dark:text-[#94a3b8]">
                                <input
                                    type="checkbox"
                                    checked={!variant.available}
                                    onChange={(event) =>
                                        updateVariant(variant.id, {
                                            available: !event.target.checked,
                                        })
                                    }
                                    className="size-3.5 accent-[#d14341]"
                                />
                                Sold out
                            </label>
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                aria-label="Remove variant"
                                onClick={() =>
                                    setVariants((current) =>
                                        current.filter(
                                            (row) =>
                                                row.id !== variant.id,
                                        ),
                                    )
                                }
                            >
                                <Trash2 />
                            </Button>
                        </div>
                    ))}
                    {fieldErrors.variants ? (
                        <p className="text-xs text-accent" role="alert">
                            {fieldErrors.variants}
                        </p>
                    ) : null}
                </div>
            </section>

            <section className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
                <SectionHeading
                    title="Store description layout"
                    description="Lay out the lower half of the store page: text, bullets, images and the spec grid."
                />
                <div className="mt-5">
                    <DescriptionBlockEditor
                        blocks={blocks}
                        onChange={setBlocks}
                    />
                    {fieldErrors.descriptionBlocks ? (
                        <p className="mt-3 text-xs text-accent" role="alert">
                            {fieldErrors.descriptionBlocks}
                        </p>
                    ) : null}
                </div>
            </section>

            {status ? (
                <p
                    className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent"
                    role="alert"
                >
                    {status}
                </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                    variant="outline"
                    render={<Link href="/inventory" />}
                    nativeButton={false}
                    className="h-11 px-6"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSaving || isUploadingBlockImage}
                    size="lg"
                >
                    {isSaving ? (
                        <LoaderCircle className="animate-spin" />
                    ) : (
                        <Save />
                    )}
                    {isEditing ? "Save changes" : "Create item"}
                </Button>
            </div>

            <ItemPreviewDialog
                open={Boolean(previewItem)}
                onOpenChange={(open) => {
                    if (!open) {
                        setPreviewItem(null);
                    }
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
                message={getApiErrorMessage(
                    error,
                    "Unable to load the item.",
                )}
                retry={refetch}
            />
        );
    }

    return <ProductEditor initialItem={data} />;
}
