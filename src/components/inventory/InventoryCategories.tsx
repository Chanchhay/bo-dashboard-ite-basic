"use client";

import { useState, type FormEvent } from "react";
import {
    ChevronDown,
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
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
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
import { useToast } from "@/components/ui/toast";
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
    const { toast } = useToast();
    const { data, error, isLoading, refetch } =
        useGetItemGroupsQuery();
    const [createGroup, createState] =
        useCreateItemGroupMutation();
    const [updateGroup, updateState] =
        useUpdateItemGroupMutation();
    const [deleteGroup, deleteState] =
        useDeleteItemGroupMutation();
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [mode, setMode] = useState<"CATEGORY" | "SUBCATEGORY">(
        "CATEGORY",
    );
    const [editing, setEditing] = useState<EditingGroup | null>(null);
    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(
        () => new Set(),
    );
    const [formKey, setFormKey] = useState(0);
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<{
        id: string;
        name: string;
        kind: "category" | "subcategory";
    } | null>(null);
    const groups = data || [];
    const rows = categoryRows(groups);
    const isSaving = createState.isLoading || updateState.isLoading;

    function toggleGroup(groupId: string) {
        setCollapsedGroupIds((current) => {
            const next = new Set(current);

            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }

            return next;
        });
    }

    function resetForm() {
        setEditing(null);
        setMode("CATEGORY");
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
        setFieldError(null);
        setFormKey((current) => current + 1);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
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
            const message =
                result.error.issues[0]?.message ||
                "Check the category information.";
            setFieldError(message);
            toast({
                tone: "error",
                title: `${mode === "CATEGORY" ? "Category" : "Subcategory"} not ${editing ? "updated" : "created"}`,
                description: message,
            });
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
            toast({
                tone: "success",
                title: `${mode === "CATEGORY" ? "Category" : "Subcategory"} ${editing ? "updated" : "created"}`,
                description: `${result.data.name} was saved successfully.`,
            });
            resetForm();
        } catch (mutationError) {
            toast({
                tone: "error",
                title: `${mode === "CATEGORY" ? "Category" : "Subcategory"} not ${editing ? "updated" : "created"}`,
                description: getApiErrorMessage(
                    mutationError,
                    `Unable to ${editing ? "update" : "create"} the category.`,
                ),
            });
        }
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return;

        try {
            await deleteGroup(deleteTarget.id).unwrap();
            if (editing?.id === deleteTarget.id) {
                resetForm();
            }
            toast({
                tone: "success",
                title: "Category deleted",
                description: deleteTarget.name || undefined,
            });
            setDeleteTarget(null);
        } catch (mutationError) {
            toast({
                tone: "error",
                title: "Delete failed",
                description: getApiErrorMessage(
                    mutationError,
                    "Unable to delete the category.",
                ),
            });
            setDeleteTarget(null);
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
                <section className="overflow-hidden rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                    <div className="border-b border-[#edf0ec] dark:border-[#242937] px-5 py-4">
                        <h2 className="font-semibold text-[#161d16] dark:text-[#f8fafc]">
                            Category structure
                        </h2>
                        <p className="mt-1 text-sm text-[#657064] dark:text-[#94a3b8]">
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
                        <div className="divide-y divide-[#edf0ec] dark:divide-[#242937]">
                            {groups.map((group) => {
                                const subGroups = group.subGroups || [];
                                const isCollapsed = collapsedGroupIds.has(group.id);
                                const hasSubGroups = subGroups.length > 0;

                                return (
                                    <div key={group.id} className="py-1">
                                        <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#f8faf8] dark:hover:bg-[#202533]/50 transition-colors rounded-xl">
                                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                                <FolderPlus className="size-4" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-[#1a222b] dark:text-[#f8fafc]">
                                                    {group.name ||
                                                        "Unnamed category"}
                                                </p>
                                                <p className="truncate text-xs text-[#7b857a] dark:text-[#94a3b8]">
                                                    {group.note ||
                                                        `${subGroups.length} subcategories`}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                {hasSubGroups ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${group.name || "category"}`}
                                                        aria-expanded={!isCollapsed}
                                                        onClick={() =>
                                                            toggleGroup(group.id)
                                                        }
                                                    >
                                                        <ChevronDown
                                                            className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                                                        />
                                                    </Button>
                                                ) : null}
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
                                                    variant="ghost"
                                                    size="sm"
                                                    className="grid size-9 place-items-center rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer p-0"
                                                    aria-label={`Delete ${group.name || "category"}`}
                                                    disabled={
                                                        deleteState.isLoading
                                                    }
                                                    onClick={() =>
                                                        setDeleteTarget({
                                                            id: group.id,
                                                            name: group.name || "category",
                                                        })
                                                    }
                                                >
                                                    <Trash2 className="size-4 text-brand-red" />
                                                </Button>
                                            </div>
                                        </div>

                                        {hasSubGroups && !isCollapsed ? (
                                            <div className="relative ml-9 border-l-2 border-primary/20 dark:border-primary/30 my-1.5 pl-4 space-y-1">
                                                {subGroups.map((subGroup) => (
                                                    <div
                                                        key={subGroup.id}
                                                        className="relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                                    >
                                                        {/* Horizontal branch indicator line */}
                                                        <span className="absolute -left-4 top-1/2 h-0.5 w-3.5 bg-primary/30 dark:bg-primary/40 -translate-y-1/2" />
                                                        
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-[#424841] dark:text-[#cbd5e1]">
                                                                {subGroup.name ||
                                                                    "Unnamed subcategory"}
                                                            </p>
                                                            <p className="truncate text-xs text-[#7b857a] dark:text-[#94a3b8]">
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
                                                                variant="ghost"
                                                                size="sm"
                                                                className="grid size-9 place-items-center rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer p-0"
                                                                aria-label={`Delete ${subGroup.name || "subcategory"}`}
                                                                disabled={
                                                                    deleteState.isLoading
                                                                }
                                                                onClick={() =>
                                                                    setDeleteTarget({
                                                                        id: subGroup.id,
                                                                        name: subGroup.name || "subcategory",
                                                                    })
                                                                }
                                                            >
                                                                <Trash2 className="size-4 text-brand-red" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <form
                    key={formKey}
                    onSubmit={handleSubmit}
                    noValidate
                    className="rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1a1e29] p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-[#161d16] dark:text-[#f8fafc]">
                                {editing ? "Edit" : "Add"}{" "}
                                {mode === "CATEGORY"
                                    ? "category"
                                    : "subcategory"}
                            </h2>
                            <p className="mt-1 text-sm text-[#657064] dark:text-[#94a3b8]">
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

                    <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-[#f4f7f3] dark:bg-[#252a38] p-1">
                        <button
                            type="button"
                            onClick={() => setMode("CATEGORY")}
                            className={`rounded-full px-3 py-2 text-sm font-semibold ${
                                mode === "CATEGORY"
                                    ? "bg-primary text-white"
                                    : "text-[#657064] dark:text-[#94a3b8]"
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
                                    : "text-[#657064] dark:text-[#94a3b8]"
                            }`}
                        >
                            Subcategory
                        </button>
                    </div>

                    <div className="mt-5 flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-[#424841] dark:text-[#cbd5e1]" htmlFor="category-name">
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
                                <Label className="text-sm font-semibold text-[#424841] dark:text-[#cbd5e1]" htmlFor="parentId">
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
                            <Label className="text-sm font-semibold text-[#424841] dark:text-[#cbd5e1]" htmlFor="category-note">Note</Label>
                            <Textarea
                                id="category-note"
                                name="note"
                                defaultValue={editing?.note}
                                placeholder="Optional category description"
                                className={inventoryTextareaClassName}
                            />
                        </div>
                    </div>

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

            <DestructiveConfirmDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={deleteTarget?.name ? `Delete ${deleteTarget.name}?` : "Delete category?"}
                description={
                    deleteTarget?.name ? (
                        <>
                            Are you sure you want to delete{" "}
                            <strong className="font-semibold text-[#16181c] dark:text-[#f8fafc]">
                                {deleteTarget.name}
                            </strong>
                            ? Items assigned to it may need to be updated. This action cannot be undone.
                        </>
                    ) : (
                        "Are you sure you want to delete this category? This action cannot be undone."
                    )
                }
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isPending={deleteState.isLoading}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
