"use client";

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
    useGetBusinessRolesQuery,
    useGetStaffQuery,
    useUpdateBusinessRoleMutation,
} from "@/services/userManagementApi";

type Editor = { mode: "create" } | { mode: "edit"; role: BusinessRole } | null;

export default function RolesTab() {
    const { toast } = useToast();
    const rolesQuery = useGetBusinessRolesQuery();
    const staffQuery = useGetStaffQuery();
    const [createRole, createState] = useCreateBusinessRoleMutation();
    const [updateRole, updateState] = useUpdateBusinessRoleMutation();
    const [deleteRole, deleteState] = useDeleteBusinessRoleMutation();

    const [editor, setEditor] = useState<Editor>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [nameError, setNameError] = useState<string | undefined>();
    const [formError, setFormError] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<BusinessRole | null>(null);

    const roles = rolesQuery.data || [];

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
        setFormError(null);
    };

    const closeEditor = () => {
        setEditor(null);
        setSelected(new Set());
        setNameError(undefined);
        setFormError(null);
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
        setFormError(null);

        const form = new FormData(event.currentTarget);
        const parsed = businessRoleSchema.safeParse({
            name: String(form.get("name") || ""),
            permissions: [...selected],
        });

        if (!parsed.success) {
            setNameError(
                parsed.error.issues.find((issue) => issue.path[0] === "name")
                    ?.message,
            );
            setFormError("Check the highlighted fields.");
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
            const message = getApiErrorMessage(
                error,
                "Unable to save the role.",
            );
            setFormError(message);
            toast({
                tone: "error",
                title: "Save failed",
                description: message,
            });
        }
    }

    async function remove() {
        if (!pendingDelete) {
            return;
        }

        try {
            await deleteRole(pendingDelete.id).unwrap();
            toast({
                title: "Role deleted",
                description: pendingDelete.name || undefined,
            });
            setPendingDelete(null);
        } catch (error) {
            toast({
                tone: "error",
                title: "Delete failed",
                description: getApiErrorMessage(
                    error,
                    "Unable to delete the role.",
                ),
            });
            setPendingDelete(null);
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
                            <FormField
                                label="Role name"
                                htmlFor="name"
                                error={nameError}
                            >
                                <input
                                    id="name"
                                    name="name"
                                    defaultValue={
                                        editor.mode === "edit"
                                            ? editor.role.name
                                            : undefined
                                    }
                                    className={fieldClassName}
                                    aria-invalid={Boolean(nameError)}
                                />
                            </FormField>
                        </div>

                        <div className="flex flex-col gap-4">
                            <p className="text-[13px] font-medium text-[#16181c]">
                                Permissions
                                <span className="ml-2 font-normal text-[#8a8f89]">
                                    {selected.size} selected
                                </span>
                            </p>

                            <div className="grid gap-4 lg:grid-cols-2">
                                {BUSINESS_PERMISSION_GROUPS.map((group) => {
                                    const values = group.permissions.map(
                                        (permission) => permission.value,
                                    );
                                    const allOn = values.every((value) =>
                                        selected.has(value),
                                    );

                                    return (
                                        <fieldset
                                            key={group.id}
                                            className="rounded-2xl border border-[#e2e2de] p-4"
                                        >
                                            <legend className="flex items-center gap-3 px-1 text-[14px] text-[#16181c]">
                                                {group.label}
                                            </legend>

                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    toggleGroup(values, allOn)
                                                }
                                                className="mb-3 rounded-lg text-[12px] text-white outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#00932a]"
                                            >
                                                {allOn
                                                    ? "Clear all"
                                                    : "Select all"}
                                            </Button>

                                            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                                                {group.permissions.map(
                                                    (permission) => (
                                                        <label
                                                            key={
                                                                permission.value
                                                            }
                                                            className="flex items-center gap-2 text-[14px] text-[#5c6660]"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selected.has(
                                                                    permission.value,
                                                                )}
                                                                onChange={() =>
                                                                    toggle(
                                                                        permission.value,
                                                                    )
                                                                }
                                                                className="size-4 rounded border-[#c9cbc6] accent-[#00932a]"
                                                            />
                                                            {permission.label}
                                                        </label>
                                                    ),
                                                )}
                                            </div>
                                        </fieldset>
                                    );
                                })}
                            </div>
                        </div>

                        {formError && (
                            <p
                                role="alert"
                                className="text-[13px] text-[#b3352f]"
                            >
                                {formError}
                            </p>
                        )}

                        <div className="flex flex-wrap gap-3">
                            <Button
                                type="submit"
                                disabled={saving}

                            >
                                {saving
                                    ? "Saving…"
                                    : editor.mode === "create"
                                      ? "Create role"
                                      : "Save changes"}
                            </Button>
                            <Button
                                type="button"
                                onClick={closeEditor}
                                variant="outline"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Panel>
            )}

            <Panel>
                <PanelHeader
                    title="Roles & permissions"
                    description="A role is a named set of permissions you assign to users."
                    action={
                        <Button
                            type="button"
                            onClick={() => openEditor({ mode: "create" })}

                        >
                            <Plus className="size-4" aria-hidden="true" />
                            Create role
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
                        {roles.map((role) => {
                            const permissions = role.permissions || [];
                            const assigned = assignedCounts.get(role.id) || 0;

                            return (
                                <li
                                    key={role.id}
                                    className="rounded-2xl border border-[#e2e2de] p-5"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[16px] text-[#16181c]">
                                                {role.name || role.id}
                                            </p>
                                            <p className="mt-0.5 text-[13px] text-[#8a8f89]">
                                                {permissions.length} permission
                                                {permissions.length === 1
                                                    ? ""
                                                    : "s"}
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
                                                <Pencil
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    setPendingDelete(role)
                                                }
                                                aria-label={`Delete ${role.name || "role"}`}
                                                variant="destructive"
                                                size="icon-sm"
                                                disabled={deleteState.isLoading}
                                            >
                                                <Trash2
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                        </div>
                                    </div>

                                    {permissions.length > 0 && (
                                        <ul className="mt-4 flex flex-wrap gap-1.5">
                                            {permissions.map((permission) => (
                                                <li
                                                    key={permission}
                                                    className="rounded-lg bg-[#f2f3f1] px-2.5 py-1 text-[12px] text-[#5c6660]"
                                                >
                                                    {describePermission(
                                                        permission,
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {formError && !editor && (
                    <p role="alert" className="mt-4 text-[13px] text-[#b3352f]">
                        {formError}
                    </p>
                )}
            </Panel>
            <DestructiveConfirmDialog
                open={Boolean(pendingDelete)}
                title="Delete role?"
                description={
                    <>
                        <span className="font-semibold text-[#37423b]">
                            {pendingDelete?.name || "This role"}
                        </span>{" "}
                        will be permanently removed.
                        {pendingDelete &&
                        (assignedCounts.get(pendingDelete.id) || 0) > 0
                            ? ` ${assignedCounts.get(pendingDelete.id)} user${assignedCounts.get(pendingDelete.id) === 1 ? "" : "s"} will lose this role.`
                            : ""}{" "}
                        This action cannot be undone.
                    </>
                }
                cancelLabel="Keep role"
                confirmLabel="Delete role"
                isPending={deleteState.isLoading}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingDelete(null);
                    }
                }}
                onConfirm={() => void remove()}
            />
        </div>
    );
}
