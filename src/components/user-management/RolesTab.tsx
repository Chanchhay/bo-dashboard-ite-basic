"use client";

import { PaginationBar } from "@/components/ui/PaginationBar";
import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
    EmptyState,
    ErrorState,
    FormField,
    LoadingState,
    Panel,
    PanelHeader,
    fieldClassName,
} from "@/components/user-management/ui";
import { getApiErrorMessage } from "@/lib/api-error";
import {
    BUSINESS_PERMISSION_GROUPS,
    describePermission,
} from "@/lib/api/permission-catalog";
import {
    businessRoleSchema,
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

export default function RolesTab() {
    const { toast } = useToast();
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

    // How many people each role touches — deleting one is not reversible.
    const assignedCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const member of staffQuery.data || []) {
            if (member.roleId) {
                counts.set(member.roleId, (counts.get(member.roleId) || 0) + 1);
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
                        description="Pick the permissions this role grants. Platform admin permissions are managed separately."
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
                        onSubmit={handleSubmit}
                        noValidate
                        className="mt-6 flex flex-col gap-6"
                    >
                        <div className="max-w-sm">
              <FormField label="Role name" htmlFor="name" error={nameError}>
                                <input
                                    id="name"
                                    name="name"
                                    placeholder="Store Manager, Cashier, etc."
                                    defaultValue={
                    editor.mode === "edit" ? editor.role.name : undefined
                                    }
                                    className={fieldClassName}
                                    aria-invalid={Boolean(nameError)}
                                />
                            </FormField>
                        </div>

                        <div className="flex flex-col gap-4">
                            <p className="text-[13px] font-semibold text-[#16181c] dark:text-[#f8fafc]">
                                Permissions
                                <span className="ml-2 font-normal text-[#8a8f89] dark:text-[#94a3b8]">
                                    {selected.size} selected
                                </span>
                            </p>

                            <div className="grid gap-4 lg:grid-cols-2">
                                {BUSINESS_PERMISSION_GROUPS.map((group) => {
                                    const values = group.permissions.map(
                                        (permission) => permission.value,
                                    );
                  const allOn = values.every((value) => selected.has(value));

                                    return (
                                        <fieldset
                                            key={group.id}
                                            className="rounded-2xl border border-[#e2e2de] dark:border-[#2a3042] bg-[#fafbfa] dark:bg-[#151821] p-4 shadow-xs dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                                        >
                                            <legend className="flex items-center gap-3 px-2 text-[14px] font-bold text-[#16181c] dark:text-[#f8fafc]">
                                                {group.label}
                                            </legend>

                                            <Button
                                                type="button"
                                                size="xs"
                                                variant={allOn ? "outline" : "default"}
                        onClick={() => toggleGroup(values, allOn)}
                                                className="mb-3.5 rounded-lg text-[12px] font-medium transition-all"
                                            >
                        {allOn ? "Clear all" : "Select all"}
                                            </Button>

                                            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                        {group.permissions.map((permission) => (
                                                        <label
                            key={permission.value}
                                                            className="flex items-center gap-2 text-[14px] font-medium text-[#424841] dark:text-[#cbd5e1] hover:text-[#16181c] dark:hover:text-[#f8fafc] cursor-pointer select-none transition-colors"
                                                        >
                                                            <input
                                                                type="checkbox"
                              checked={selected.has(permission.value)}
                              onChange={() => toggle(permission.value)}
                                                                className="size-4 rounded border-[#c9cbc6] dark:border-[#3b4358] dark:bg-[#1e2330] accent-success cursor-pointer"
                                                            />
                                                            {permission.label}
                                                        </label>
                        ))}
                                            </div>
                                        </fieldset>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving}>
                                {saving
                                    ? "Saving…"
                                    : editor.mode === "create"
                                      ? "Create role"
                                      : "Save changes"}
                            </Button>
              <Button type="button" onClick={closeEditor} variant="outline">
                                Cancel
                            </Button>
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

                {rolesQuery.isLoading ? (
                    <LoadingState label="Loading roles" />
                ) : rolesQuery.error ? (
                    <ErrorState
                        message={getApiErrorMessage(
                            rolesQuery.error,
                            "Unable to load roles.",
                        )}
                        retry={rolesQuery.refetch}
                    />
                ) : roles.length === 0 ? (
                    <EmptyState
                        title="No roles yet"
                        description="Create a role to start granting permissions."
                    />
                ) : (
                    <ul className="mt-6 flex flex-col gap-3">
                        {roles.map((role: BusinessRole, index: number) => {
                            const permissions = role.permissions || [];
                            const assigned = assignedCounts.get(role.id) || 0;

                            return (
                                <li
                                    key={role.id}
                                    data-tour={index === 0 ? "role-card" : undefined}
                                    className="rounded-2xl border border-[#e2e2de] dark:border-[#242937] bg-white/50 dark:bg-[#151821] p-5 shadow-xs dark:shadow-[0_4px_14px_rgba(0,0,0,0.2)]"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[16px] font-semibold text-[#16181c] dark:text-[#f8fafc]">
                                                {role.name || role.id}
                                            </p>
                                            <p className="mt-0.5 text-[13px] text-[#8a8f89] dark:text-[#94a3b8]">
                                                {permissions.length} permission
                        {permissions.length === 1 ? "" : "s"}
                                                {" · "}
                                                {assigned} user
                                                {assigned === 1 ? "" : "s"}
                                            </p>
                                        </div>

                                        <div className="flex gap-1">
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

                                    {permissions.length > 0 && (
                                        <ul className="mt-4 flex flex-wrap gap-1.5">
                      {permissions.map((permission: string) => (
                                                <li
                                                    key={permission}
                                                    className="rounded-lg bg-[#f2f3f1] dark:bg-[#252a38] border border-transparent dark:border-[#2a3042] px-2.5 py-1 text-[12px] font-medium text-[#5c6660] dark:text-[#cbd5e1]"
                                                >
                          {describePermission(permission)}
                                                </li>
                                            ))}
                                        </ul>
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
            onSizeChange={setRolesPageSize}
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
