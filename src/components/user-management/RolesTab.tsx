"use client";

import { PaginationBar } from "@/components/ui/PaginationBar";
import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
    EmptyState,
    ErrorState,
    FormField,
    LoadingState,
    Panel,
    PanelHeader,
    fieldClassName,
} from "@/components/user-management/ui";
import { BusinessPermissionPicker } from "@/components/user-management/BusinessPermissionPicker";
import { getApiErrorMessage } from "@/lib/api-error";
import {
    PERMISSION_GROUPS,
    permissionLabel,
} from "@/lib/api/permission-catalog";
import {
    businessRoleSchema,
    staffRoleId,
    type BusinessRole,
} from "@/lib/api/user-management";
import {
    useCreateBusinessRoleMutation,
    useDeleteBusinessRoleMutation,
    useGetBusinessRolesPageQuery,
    useGetStaffQuery,
    useUpdateBusinessRoleMutation,
} from "@/services/userManagementApi";

type Editor = { mode: "create" } | { mode: "edit"; role: BusinessRole } | null;

type RolePermissionCategory = {
    id: string;
    label: string;
    granted: { value: string; label: string }[];
};

function getGroupedPermissions(permissionValues: string[]): RolePermissionCategory[] {
    const grantedSet = new Set(permissionValues);
    const result: RolePermissionCategory[] = [];

    for (const group of PERMISSION_GROUPS) {
        const matching = group.permissions.filter((p) => grantedSet.has(p.value));
        if (matching.length > 0) {
            result.push({
                id: group.id,
                label: group.label,
                granted: matching.map((p) => ({ value: p.value, label: p.label })),
            });
        }
    }

    const knownValues = new Set<string>(PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.value)));
    const uncataloged = permissionValues.filter((v) => !knownValues.has(v));
    if (uncataloged.length > 0) {
        result.push({
            id: "other",
            label: "Other permissions",
            granted: uncataloged.map((v) => ({ value: v, label: v })),
        });
    }

    return result;
}

export default function RolesTab() {
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
    const [rolesPage, setRolesPage] = useState(0);
    const [rolesPageSize, setRolesPageSize] = useState(10);
    const rolesQuery = useGetBusinessRolesPageQuery({
        page: rolesPage,
        size: rolesPageSize,
    });
    const staffQuery = useGetStaffQuery();
    const [createRole, createState] = useCreateBusinessRoleMutation();
    const [updateRole, updateState] = useUpdateBusinessRoleMutation();
    const [deleteRole, deleteState] = useDeleteBusinessRoleMutation();

    const [editor, setEditor] = useState<Editor>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [nameError, setNameError] = useState<string | undefined>();
    const [deleteTarget, setDeleteTarget] = useState<BusinessRole | null>(null);

    const roles = rolesQuery.data?.content || [];
    const rolesCurrentPage = rolesQuery.data?.page?.number ?? rolesPage;
    const rolesTotalPages =
        rolesQuery.data?.page?.totalPages ?? (roles.length ? 1 : 0);
    const rolesTotalElements =
        rolesQuery.data?.page?.totalElements ?? roles.length;

    const filteredRoles = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return roles;
        return roles.filter((role: BusinessRole) => {
            const nameMatch = (role.name || role.id)?.toLowerCase().includes(term);
            // Both the label and the raw code: "payment" should find
            // `order:pay` through "Take payment", and someone who knows the
            // code should still be able to type it.
            const permMatch = role.permissions?.some(
                (p: string) =>
                    p.toLowerCase().includes(term) ||
                    permissionLabel(p).toLowerCase().includes(term),
            );
            return nameMatch || permMatch;
        });
    }, [roles, search]);

    // How many people each role touches — deleting one is not reversible.
    const assignedCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const member of staffQuery.data || []) {
            const roleId = staffRoleId(member);
            if (roleId) {
                counts.set(roleId, (counts.get(roleId) || 0) + 1);
            }
        }
        return counts;
    }, [staffQuery.data]);

    const openEditor = (next: Exclude<Editor, null>) => {
        setEditor(next);
        setSelected(
            new Set(next.mode === "edit" ? next.role.permissions || [] : []),
        );
        setNameError(undefined);
    };

    const closeEditor = () => {
        setEditor(null);
        setSelected(new Set());
        setNameError(undefined);
    };

    const toggle = (value: string) =>
        setSelected((previous) => {
            const next = new Set(previous);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
        });

    const toggleGroup = (values: string[], allOn: boolean) =>
        setSelected((previous) => {
            const next = new Set(previous);
            for (const value of values) {
                if (allOn) next.delete(value);
                else next.add(value);
            }
            return next;
        });

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editor) return;

        setNameError(undefined);

        const form = new FormData(event.currentTarget);
        const parsed = businessRoleSchema.safeParse({
            name: String(form.get("name") || ""),
            permissions: [...selected],
        });

        if (!parsed.success) {
            const nameIssue = parsed.error.issues.find(
                (issue) => issue.path[0] === "name",
            )?.message;

            setNameError(nameIssue);
            toast({
                tone: "error",
                title: "Check the highlighted fields",
                description: nameIssue || parsed.error.issues[0]?.message,
            });
            return;
        }

        try {
            if (editor.mode === "create") {
                await createRole(parsed.data).unwrap();
                toast({
                    title: "Role created",
                    description: `${parsed.data.name} grants ${parsed.data.permissions.length} permission${parsed.data.permissions.length === 1 ? "" : "s"}.`,
                });
            } else {
                await updateRole({
                    roleId: editor.role.id,
                    body: parsed.data,
                }).unwrap();
                toast({
                    title: "Role updated",
                    description: parsed.data.name,
                });
            }

            closeEditor();
        } catch (error) {
            toast({
                tone: "error",
                title: "Save failed",
                description: getApiErrorMessage(error, "Unable to save the role."),
            });
        }
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return;

        try {
            await deleteRole(deleteTarget.id).unwrap();
            toast({
                title: "Role deleted",
                description: deleteTarget.name || undefined,
            });
            setDeleteTarget(null);
        } catch (error) {
            toast({
                tone: "error",
                title: "Delete failed",
                description: getApiErrorMessage(error, "Unable to delete the role."),
            });
            setDeleteTarget(null);
        }
    }

    const saving = createState.isLoading || updateState.isLoading;

    return (
        <div className="flex flex-col gap-5">
            {editor && (
                <Panel>
                    <PanelHeader
                        title={
                            editor.mode === "create"
                                ? "Create a role"
                                : `Edit ${editor.role.name || "role"}`
                        }
                        description="A role is a job in this shop, and the things that job is allowed to do."
                        action={
                            <Button
                                type="button"
                                onClick={closeEditor}
                                aria-label="Close the form"
                                variant="ghost"
                                size="icon"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </Button>
                        }
                    />

                    <form
                        key={editor.mode === "edit" ? editor.role.id : "create"}
                        onSubmit={handleSubmit}
                        noValidate
                        className="mt-6 flex flex-col gap-6"
                    >
                        <div className="max-w-sm">
                            <FormField label="Role name" htmlFor="name" error={nameError}>
                                <input
                                    id="name"
                                    name="name"
                                    maxLength={150}
                                    placeholder="Store Manager, Cashier, etc."
                                    defaultValue={
                                        editor.mode === "edit" ? editor.role.name : undefined
                                    }
                                    className={fieldClassName}
                                    aria-invalid={Boolean(nameError)}
                                />
                            </FormField>
                        </div>

                        <BusinessPermissionPicker
                            selected={selected}
                            onToggle={toggle}
                            onToggleGroup={toggleGroup}
                        />

                        {selected.size === 0 && (
                            <p className="text-sm text-muted-foreground">
                                Nothing ticked. Anyone with this role can sign
                                in, and will find every screen closed to them.
                            </p>
                        )}

                        <div className="sticky -bottom-8 z-30 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 lg:-mx-7 lg:-mb-7 mt-4 rounded-b-[24px] border-t border-border bg-card px-4 py-3.5 sm:px-6 sm:py-4 lg:px-7">
                            <div className="flex w-full flex-row items-center justify-end gap-2.5 sm:w-auto sm:ml-auto sm:gap-3">
                                <Button
                                    type="button"
                                    onClick={closeEditor}
                                    variant="outline"
                                    className="h-10 flex-1 rounded-xl px-4 text-xs sm:h-11 sm:flex-initial sm:px-6 sm:text-sm"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="h-10 flex-1 rounded-xl px-4 text-xs sm:h-11 sm:flex-initial sm:px-6 sm:text-sm"
                                >
                                    {saving
                                        ? "Saving…"
                                        : editor.mode === "create"
                                            ? "Create role"
                                            : "Save changes"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Panel>
            )}

            <Panel data-tour="roles-list">
                <PanelHeader
                    title="Roles & permissions"
                    description="A role is a named set of permissions you assign to users."
                    action={
                        <Button
                            type="button"
                            data-tour="add-role"
                            onClick={() => openEditor({ mode: "create" })}
                            className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm gap-1 sm:gap-2"
                        >
                            <Plus className="size-3.5 sm:size-4" aria-hidden="true" />
                            <span>Create role</span>
                        </Button>
                    }
                />

                <div data-tour="roles-search" className="relative mt-6 sm:w-72">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <label htmlFor="roles-search" className="sr-only">
                        Search roles
                    </label>
                    <input
                        id="roles-search"
                        type="search"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setRolesPage(0);
                        }}
                        placeholder="Search roles or permissions..."
                        className="h-9 sm:h-10 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-gray-400 dark:focus-visible:border-gray-600 focus-visible:ring-1 focus-visible:ring-gray-400/20 shadow-xs"
                    />
                </div>

                {rolesQuery.isLoading && !rolesQuery.data ? (
                    <LoadingState label="Loading roles" />
                ) : rolesQuery.error && !rolesQuery.data ? (
                    <ErrorState
                        message={getApiErrorMessage(
                            rolesQuery.error,
                            "Unable to load roles.",
                        )}
                        retry={rolesQuery.refetch}
                    />
                ) : filteredRoles.length === 0 ? (
                    <EmptyState
                        title={search ? "No matching roles" : "No roles yet"}
                        description={
                            search
                                ? "Try a different search term."
                                : "Create a role to start granting permissions."
                        }
                    />
                ) : (
                    <ul
                        className={cn(
                            "mt-6 flex flex-col gap-3 transition-opacity duration-200 ease-in-out",
                            rolesQuery.isFetching && "opacity-60 pointer-events-none",
                        )}
                    >
                        {filteredRoles.map((role: BusinessRole, index: number) => {
                            const permissions = role.permissions || [];
                            const assigned = assignedCounts.get(role.id) || 0;
                            const isExpanded = expandedRoles.has(role.id);
                            const categories = getGroupedPermissions(permissions);

                            const toggleExpand = () => {
                                setExpandedRoles((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(role.id)) {
                                        next.delete(role.id);
                                    } else {
                                        next.add(role.id);
                                    }
                                    return next;
                                });
                            };

                            return (
                                <li
                                    key={role.id}
                                    data-tour={index === 0 ? "role-card" : undefined}
                                    className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all duration-150"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <p className="text-[17px] font-semibold text-foreground">
                                                    {role.name || role.id}
                                                </p>
                                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                                    {permissions.length} {permissions.length === 1 ? "permission" : "permissions"}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[13px] text-muted-foreground">
                                                {assigned} {assigned === 1 ? "user" : "users"} assigned to this role
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    openEditor({
                                                        mode: "edit",
                                                        role,
                                                    })
                                                }
                                                aria-label={`Edit ${role.name || "role"}`}
                                                variant="ghost"
                                                size="icon-sm"
                                                className="rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
                                            >
                                                <Pencil className="size-4" aria-hidden="true" />
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => setDeleteTarget(role)}
                                                aria-label={`Delete ${role.name || "role"}`}
                                                variant="ghost"
                                                size="sm"
                                                className="grid size-9 place-items-center rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer p-0"
                                                disabled={deleteState.isLoading}
                                            >
                                                <Trash2
                                                    className="size-4 text-brand-red"
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                        </div>
                                    </div>

                                    {permissions.length === 0 ? (
                                        <p className="mt-3 text-xs text-muted-foreground italic">
                                            No permissions assigned to this role.
                                        </p>
                                    ) : (
                                        <div className="mt-4">
                                            {/* Clean module category chips */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                {categories.map((cat) => (
                                                    <span
                                                        key={cat.id}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 dark:bg-slate-800/40 px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs"
                                                    >
                                                        <span className="text-muted-foreground font-normal">{cat.label}:</span>
                                                        <span className="font-semibold text-primary">{cat.granted.length}</span>
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Expand/collapse button */}
                                            <button
                                                type="button"
                                                onClick={toggleExpand}
                                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp className="size-4" />
                                                        <span>Hide details</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="size-4" />
                                                        <span>Show breakdown ({permissions.length} permissions in {categories.length} categories)</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Structured category breakdown */}
                                            {isExpanded && (
                                                <div className="mt-3.5 pt-3.5 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 animate-in fade-in-0 duration-150">
                                                    {categories.map((cat) => (
                                                        <div
                                                            key={cat.id}
                                                            className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs flex flex-col gap-2"
                                                        >
                                                            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                                                                <span className="text-xs font-semibold text-foreground">
                                                                    {cat.label}
                                                                </span>
                                                                <span className="text-[11px] font-medium text-muted-foreground">
                                                                    {cat.granted.length} {cat.granted.length === 1 ? "action" : "actions"}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {cat.granted.map((p) => (
                                                                    <span
                                                                        key={p.value}
                                                                        className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-foreground"
                                                                    >
                                                                        {p.label}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {rolesTotalPages > 0 && (
                    <PaginationBar
                        page={rolesCurrentPage}
                        size={rolesPageSize}
                        totalElements={rolesTotalElements}
                        totalPages={rolesTotalPages}
                        onPageChange={setRolesPage}
                        onSizeChange={(next) => {
                            setRolesPageSize(next);
                            setRolesPage(0);
                        }}
                        sizeOptions={[10, 20, 25, 50, 100]}
                        isLoading={rolesQuery.isFetching}
                        itemLabel="role"
                    />
                )}
            </Panel>

            <DestructiveConfirmDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={
                    deleteTarget
                        ? `Delete ${deleteTarget.name || "role"}?`
                        : "Delete role?"
                }
                description={
                    deleteTarget ? (
                        <>
                            Are you sure you want to delete{" "}
                            <strong className="font-semibold text-[#16181c] dark:text-[#f8fafc]">
                                {deleteTarget.name || "this role"}
                            </strong>
                            ?{" "}
                            {assignedCounts.get(deleteTarget.id)
                                ? `${assignedCounts.get(deleteTarget.id)} user(s) assigned to this role will lose it. `
                                : ""}
                            This action cannot be undone.
                        </>
                    ) : (
                        "Are you sure you want to delete this role? This action cannot be undone."
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
