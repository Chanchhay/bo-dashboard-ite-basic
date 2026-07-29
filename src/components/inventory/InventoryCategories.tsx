"use client";

import { useState, type FormEvent } from "react";
import {
    FolderPlus,
    LoaderCircle,
    Pencil,
    Trash2,
    X,
} from "lucide-react";

import {
    getApiErrorMessage,
    InventoryEmpty,
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
    itemGroupSchema,
    type ItemGroup,
    type ItemGroupInput,
    type ItemSubGroup,
} from "@/lib/api/inventory";
import {
    useCreateItemGroupMutation,
    useDeleteItemGroupMutation,
    useGetItemGroupsQuery,
    useUpdateItemGroupMutation,
} from "@/services/inventoryApi";

type EditingGroup = {
    id: string;
    name: string;
    note: string;
    parentId: string;
};

function categoryRows(groups: ItemGroup[]) {
    return groups.flatMap((group) => [
        {
            id: group.id,
            name: group.name || "Unnamed category",
            note: group.note || "",
            parentId: "",
            parentName: "",
        },
        ...(group.subGroups || []).map((subGroup) => ({
            id: subGroup.id,
            name: subGroup.name || "Unnamed subcategory",
            note: subGroup.note || "",
            parentId: group.id,
            parentName: group.name || "Unnamed category",
        })),
    ]);
}

export function InventoryCategories() {
    const { data, error, isLoading, refetch } =
        useGetItemGroupsQuery();
    const [createGroup, createState] =
        useCreateItemGroupMutation();
    const [updateGroup, updateState] =
        useUpdateItemGroupMutation();
    const [deleteGroup, deleteState] =
        useDeleteItemGroupMutation();
    const [mode, setMode] = useState<"CATEGORY" | "SUBCATEGORY">(
        "CATEGORY",
    );
    const [editing, setEditing] = useState<EditingGroup | null>(null);
    const [formKey, setFormKey] = useState(0);
    const [status, setStatus] = useState<string | null>(null);
    const [fieldError, setFieldError] = useState<string | null>(null);
    const groups = data || [];
    const rows = categoryRows(groups);
    const isSaving = createState.isLoading || updateState.isLoading;

    function resetForm() {
        setEditing(null);
        setMode("CATEGORY");
        setStatus(null);
        setFieldError(null);
        setFormKey((current) => current + 1);
    }

    function startEditing(
        group:
            | ItemGroup
            | (ItemSubGroup & { parentId?: string }),
        parentId = "",
    ) {
        setEditing({
            id: group.id,
            name: group.name || "",
            note: group.note || "",
            parentId,
        });
        setMode(parentId ? "SUBCATEGORY" : "CATEGORY");
        setStatus(null);
        setFieldError(null);
        setFormKey((current) => current + 1);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus(null);
        setFieldError(null);

        const formData = new FormData(event.currentTarget);
        const input: ItemGroupInput = {
            name: String(formData.get("name") || ""),
            note: String(formData.get("note") || ""),
            parentId:
                mode === "SUBCATEGORY"
                    ? String(formData.get("parentId") || "")
                    : "",
        };
        const result = itemGroupSchema.safeParse(input);

        if (!result.success) {
            setFieldError(
                result.error.issues[0]?.message ||
                    "Check the category information.",
            );
            return;
        }

        try {
            if (editing) {
                await updateGroup({
                    itemGroupId: editing.id,
                    body: result.data,
                }).unwrap();
            } else {
                await createGroup(result.data).unwrap();
            }
            resetForm();
        } catch (mutationError) {
            setStatus(
                getApiErrorMessage(
                    mutationError,
                    `Unable to ${editing ? "update" : "create"} the category.`,
                ),
            );
        }
    }

    async function handleDelete(id: string, name: string) {
        if (
            !window.confirm(
                `Delete ${name}? Items assigned to it may need to be updated.`,
            )
        ) {
            return;
        }

        try {
            await deleteGroup(id).unwrap();
            if (editing?.id === id) {
                resetForm();
            }
        } catch {
            // The mutation error is displayed below the table.
        }
    }

    if (isLoading) {
        return <InventoryLoading label="Loading categories" />;
    }

    if (error) {
        return (
            <InventoryError
                message={getApiErrorMessage(
                    error,
                    "Unable to load categories.",
                )}
                retry={refetch}
            />
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <InventoryPageHeader
                title="Categories"
                description="Organize items with categories and subcategories."
            />

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
                <section className="overflow-hidden rounded-2xl border border-[#e4eae2] bg-white shadow-[0_8px_30px_rgba(26,34,43,0.05)]">
                    <div className="border-b border-[#edf0ec] px-5 py-4">
                        <h2 className="font-semibold text-[#161d16]">
                            Category structure
                        </h2>
                        <p className="mt-1 text-sm text-[#657064]">
                            {rows.length} configured{" "}
                            {rows.length === 1 ? "entry" : "entries"}
                        </p>
                    </div>

                    {rows.length === 0 ? (
                        <InventoryEmpty
                            title="No categories yet"
                            description="Use the form to add the first item category."
                        />
                    ) : (
                        <div className="divide-y divide-[#edf0ec]">
                            {groups.map((group) => (
                                <div key={group.id}>
                                    <div className="flex items-center gap-4 px-5 py-4">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                            <FolderPlus className="size-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-[#1a222b]">
                                                {group.name ||
                                                    "Unnamed category"}
                                            </p>
                                            <p className="truncate text-xs text-[#7b857a]">
                                                {group.note ||
                                                    `${group.subGroups?.length || 0} subcategories`}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon-sm"
                                                aria-label={`Edit ${group.name || "category"}`}
                                                onClick={() =>
                                                    startEditing(group)
                                                }
                                            >
                                                <Pencil />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon-sm"
                                                aria-label={`Delete ${group.name || "category"}`}
                                                disabled={
                                                    deleteState.isLoading
                                                }
                                                onClick={() =>
                                                    handleDelete(
                                                        group.id,
                                                        group.name ||
                                                            "category",
                                                    )
                                                }
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </div>

                                    {(group.subGroups || []).map(
                                        (subGroup) => (
                                            <div
                                                key={subGroup.id}
                                                className="ml-10 flex items-center gap-4 border-t border-[#f2f4f1] px-5 py-3"
                                            >
                                                <span className="h-7 w-1 rounded-full bg-[#c9d7c6]" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-[#424841]">
                                                        {subGroup.name ||
                                                            "Unnamed subcategory"}
                                                    </p>
                                                    <p className="truncate text-xs text-[#7b857a]">
                                                        {subGroup.note ||
                                                            `Under ${group.name || "category"}`}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon-sm"
                                                        aria-label={`Edit ${subGroup.name || "subcategory"}`}
                                                        onClick={() =>
                                                            startEditing(
                                                                subGroup,
                                                                group.id,
                                                            )
                                                        }
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon-sm"
                                                        aria-label={`Delete ${subGroup.name || "subcategory"}`}
                                                        disabled={
                                                            deleteState.isLoading
                                                        }
                                                        onClick={() =>
                                                            handleDelete(
                                                                subGroup.id,
                                                                subGroup.name ||
                                                                    "subcategory",
                                                            )
                                                        }
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {deleteState.error ? (
                        <p
                            className="border-t border-accent/20 bg-accent/5 px-5 py-3 text-sm text-accent"
                            role="alert"
                        >
                            {getApiErrorMessage(
                                deleteState.error,
                                "Unable to delete the category.",
                            )}
                        </p>
                    ) : null}
                </section>

                <form
                    key={formKey}
                    onSubmit={handleSubmit}
                    noValidate
                    className="rounded-2xl border border-[#e4eae2] bg-white p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)]"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-[#161d16]">
                                {editing ? "Edit" : "Add"}{" "}
                                {mode === "CATEGORY"
                                    ? "category"
                                    : "subcategory"}
                            </h2>
                            <p className="mt-1 text-sm text-[#657064]">
                                Define how items are grouped.
                            </p>
                        </div>
                        {editing ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Cancel editing"
                                onClick={resetForm}
                            >
                                <X />
                            </Button>
                        ) : null}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-[#f4f7f3] p-1">
                        <button
                            type="button"
                            onClick={() => setMode("CATEGORY")}
                            className={`rounded-full px-3 py-2 text-sm font-semibold ${
                                mode === "CATEGORY"
                                    ? "bg-primary text-white"
                                    : "text-[#657064]"
                            }`}
                        >
                            Category
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("SUBCATEGORY")}
                            className={`rounded-full px-3 py-2 text-sm font-semibold ${
                                mode === "SUBCATEGORY"
                                    ? "bg-primary text-white"
                                    : "text-[#657064]"
                            }`}
                        >
                            Subcategory
                        </button>
                    </div>

                    <div className="mt-5 flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label className="text-black" htmlFor="category-name">
                                Name *
                            </Label>
                            <Input
                                id="category-name"
                                name="name"
                                defaultValue={editing?.name}
                                placeholder={
                                    mode === "CATEGORY"
                                        ? "Beverages"
                                        : "Matcha"
                                }
                                aria-invalid={Boolean(fieldError)}
                                className={inventoryControlClassName}
                            />
                        </div>

                        {mode === "SUBCATEGORY" ? (
                            <div className="flex flex-col gap-2">
                                <Label className="text-black" htmlFor="parentId">
                                    Parent category *
                                </Label>
                                <Select
                                    name="parentId"
                                    defaultValue={
                                        editing?.parentId ||
                                        groups[0]?.id
                                    }
                                    items={Object.fromEntries(
                                        groups.map((group) => [
                                            group.id,
                                            group.name || "Unnamed group",
                                        ]),
                                    )}
                                >
                                    <SelectTrigger
                                        id="parentId"
                                        className={`${inventoryControlClassName} w-full`}
                                    >
                                        <SelectValue placeholder="Choose a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {groups.map((group) => (
                                            <SelectItem
                                                key={group.id}
                                                value={group.id}
                                            >
                                                {group.name ||
                                                    "Unnamed category"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-2">
                            <Label className="text-black" htmlFor="category-note">Note</Label>
                            <Textarea
                                id="category-note"
                                name="note"
                                defaultValue={editing?.note}
                                placeholder="Optional category description"
                                className={inventoryTextareaClassName}
                            />
                        </div>
                    </div>

                    {fieldError || status ? (
                        <p
                            className="mt-4 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-sm text-accent"
                            role="alert"
                        >
                            {fieldError || status}
                        </p>
                    ) : null}

                    <Button
                        type="submit"
                        disabled={isSaving}
                        size="lg"
                                    className="mt-5 w-full"
                    >
                        {isSaving ? (
                            <LoaderCircle className="animate-spin" />
                        ) : (
                            <FolderPlus />
                        )}
                        {editing ? "Save changes" : "Add category"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
