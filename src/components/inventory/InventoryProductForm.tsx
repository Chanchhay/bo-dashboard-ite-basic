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
import {
    inventoryItemSchema,
    itemAttributeTypeLabels,
    itemStatuses,
    itemTypes,
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
        values: attribute.values || [],
    }));
}

function describeAttribute(attribute: AttributeDraft) {
    if (attribute.type === "TOGGLE") {
        return "On or off";
    }

    return attribute.values.length
        ? attribute.values.join(", ")
        : "No values";
}

function toVariantRows(variants: ItemVariant[] | undefined): VariantRow[] {
    const rows = (variants || []).map((variant) => ({
        id: variant.id || createRowId(),
        name: variant.name || "",
        price:
            variant.price === undefined ? "" : String(variant.price),
    }));

    return rows.length
        ? rows
        : [{ id: createRowId(), name: "", price: "" }];
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

        setPreviewItem({
            name: read("name"),
            description: read("description"),
            imageUrl: read("imageUrl"),
            price: Number(formData.get("price") || 0),
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
                values: attribute.values,
            })),
            variants: variants
                .filter((row) => row.name.trim())
                .map((row) => ({
                    name: row.name.trim(),
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
            values: attribute.values,
        }));
        const variantValues = variants
            .filter((row) => row.name.trim())
            .map((row) => ({
                name: row.name,
                ...(row.price === ""
                    ? {}
                    : { price: Number(row.price) }),
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
            code: String(formData.get("code") || ""),
            description: String(formData.get("description") || ""),
            imageUrl: String(formData.get("imageUrl") || ""),
            barcode: String(formData.get("barcode") || ""),
            price: Number(formData.get("price") || 0),
            itemType: String(formData.get("itemType") || ""),
            attributes: attributeValues,
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
                        label="Image URL"
                        name="imageUrl"
                        error={fieldErrors.imageUrl}
                    >
                        <Input
                            id="imageUrl"
                            name="imageUrl"
                            defaultValue={initialItem?.imageUrl}
                            placeholder="https://example.com/item.jpg"
                            aria-invalid={Boolean(fieldErrors.imageUrl)}
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
                            className="grid gap-3 sm:grid-cols-[1.5fr_1fr_auto]"
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
