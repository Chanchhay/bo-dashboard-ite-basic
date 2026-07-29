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
    Eye,
    LoaderCircle,
    Pencil,
    Plus,
    Save,
    Trash2,
} from "lucide-react";

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
    itemStatuses,
    itemTypes,
    type DescriptionBlock,
    type InventoryItem,
    type ItemAttribute,
    type ItemVariant,
} from "@/lib/api/inventory";
import {
    useCreateInventoryItemMutation,
    useGetInventoryItemQuery,
    useGetInventoryUnitsQuery,
    useGetItemGroupsQuery,
    useUpdateInventoryItemMutation,
} from "@/services/inventoryApi";

type VariantRow = {
    id: string;
    name: string;
    price: string;
    available: boolean;
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
                className="text-sm font-semibold text-[#424841]"
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

function SectionHeading({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div>
            <h2 className="text-lg font-semibold text-[#161d16]">
                {title}
            </h2>
            <p className="mt-1 text-sm text-[#657064]">
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
    // Older items carry only `imageUrl`; seed the gallery from it so an edit
    // does not silently drop the one image they had.
    const [images, setImages] = useState<string[]>(() => {
        const gallery = initialItem?.images?.length
            ? initialItem.images
            : [initialItem?.imageUrl || ""];

        return gallery.filter(Boolean).length ? gallery : [""];
    });
    const [blocks, setBlocks] = useState(() =>
        toBlockDrafts(initialItem?.descriptionBlocks),
    );
    const [fieldErrors, setFieldErrors] = useState<
        Record<string, string>
    >({});
    const [status, setStatus] = useState<string | null>(null);
    const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const isEditing = Boolean(initialItem);
    const isSaving = createState.isLoading || updateState.isLoading;

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
            images: images.map((image) => image.trim()).filter(Boolean),
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
        const galleryImages = images
            .map((image) => image.trim())
            .filter(Boolean);
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
            // The first gallery image doubles as the thumbnail the items
            // table and POS read.
            imageUrl: galleryImages[0] || "",
            images: galleryImages,
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
            if (initialItem) {
                await updateItem({
                    itemId: initialItem.id,
                    body: result.data,
                }).unwrap();
            } else {
                await createItem(result.data).unwrap();
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

            <section className="rounded-2xl border border-[#e4eae2] bg-white p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] sm:p-7">
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
                        <Input
                            id="barcode"
                            name="barcode"
                            defaultValue={initialItem?.barcode}
                            placeholder="3547908987678"
                            aria-invalid={Boolean(fieldErrors.barcode)}
                            className={inventoryControlClassName}
                        />
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

            <section className="rounded-2xl border border-[#e4eae2] bg-white p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <SectionHeading
                        title="Images"
                        description="The first image is the thumbnail; the rest fill the store gallery."
                    />
                    <Button
                        type="button"
                        variant="outline"
                        disabled={images.length >= 8}
                        onClick={() => setImages((current) => [...current, ""])}
                    >
                        <Plus />
                        Add image
                    </Button>
                </div>
                <div className="mt-5 flex flex-col gap-3">
                    {images.map((image, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#e8e8e8] bg-[#f7f8f7] text-xs text-[#a3aca1]">
                                {image.trim() ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={image}
                                        alt=""
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    index + 1
                                )}
                            </span>
                            <Input
                                value={image}
                                onChange={(event) =>
                                    setImages((current) =>
                                        current.map((item, position) =>
                                            position === index
                                                ? event.target.value
                                                : item,
                                        ),
                                    )
                                }
                                placeholder="https://example.com/item.jpg"
                                aria-label={`Image URL ${index + 1}`}
                                className={inventoryControlClassName}
                            />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon-lg"
                                aria-label={`Remove image ${index + 1}`}
                                onClick={() =>
                                    setImages((current) => {
                                        const next = current.filter(
                                            (_, position) =>
                                                position !== index,
                                        );

                                        return next.length ? next : [""];
                                    })
                                }
                            >
                                <Trash2 />
                            </Button>
                        </div>
                    ))}
                    {fieldErrors.images || fieldErrors.imageUrl ? (
                        <p className="text-xs text-accent" role="alert">
                            {fieldErrors.images || fieldErrors.imageUrl}
                        </p>
                    ) : null}
                </div>
            </section>

            <section className="rounded-2xl border border-[#e4eae2] bg-white p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] sm:p-7">
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
                                className="flex items-center gap-3 rounded-xl border border-[#e8e8e8] px-4 py-3"
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
                                        <p className="font-medium text-[#1a222b]">
                                            {attribute.name}
                                        </p>
                                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                            {
                                                itemAttributeTypeLabels[
                                                    attribute.type
                                                ]
                                            }
                                        </span>
                                        <span className="rounded-full bg-[#f2f3f1] px-2.5 py-0.5 text-xs font-medium text-[#657064]">
                                            {
                                                itemAttributePlacementLabels[
                                                    attribute.placement
                                                ].label
                                            }
                                        </span>
                                    </div>
                                    <p className="mt-1 truncate text-sm text-[#657064]">
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
                        <p className="rounded-xl border border-dashed border-[#e8e8e8] px-4 py-6 text-center text-sm text-[#657064]">
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

            <section className="rounded-2xl border border-[#e4eae2] bg-white p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] sm:p-7">
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
                            <label className="flex items-center gap-2 text-xs whitespace-nowrap text-[#6b7280]">
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

            <section className="rounded-2xl border border-[#e4eae2] bg-white p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] sm:p-7">
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
                    disabled={isSaving}
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
