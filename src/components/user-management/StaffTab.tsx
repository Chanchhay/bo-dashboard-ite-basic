"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Eye, EyeOff, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
    EmptyState,
    ErrorState,
    FormField,
    LoadingState,
    Panel,
    PanelHeader,
    StatusPill,
    fieldClassName,
} from "@/components/user-management/ui";
import { getApiErrorMessage } from "@/lib/api-error";
import {
    createStaffSchema,
    genders,
    staffFullName,
    updateStaffSchema,
    type Staff,
} from "@/lib/api/user-management";
import {
    useCreateStaffMutation,
    useDeleteStaffMutation,
    useGetBusinessRolesQuery,
    useGetStaffQuery,
    useUpdateStaffMutation,
    useUpdateStaffStatusMutation,
} from "@/services/userManagementApi";

type Editor = { mode: "create" } | { mode: "edit"; staff: Staff } | null;

/** A select can't carry an empty value, so "no role" needs a sentinel. */
const NO_ROLE = "__none";

function issueMap(issues: { path: PropertyKey[]; message: string }[]) {
    const errors: Record<string, string> = {};
    for (const issue of issues) {
        errors[String(issue.path[0] || "form")] ||= issue.message;
    }
    return errors;
}

function PasswordInput({ invalid }: { invalid: boolean }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <input
                id="password"
                name="password"
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                className={`${fieldClassName} pr-11`}
                aria-invalid={invalid}
                placeholder="Enter password"
            />
            <Button
                type="button"
                onClick={() => setVisible((value) => !value)}
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                className="bg-transparent absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
            >
                {visible ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                    <Eye className="size-4" aria-hidden="true" />
                )}
            </Button>
        </div>
    );
}

export default function StaffTab() {
    const { toast } = useToast();
    const staffQuery = useGetStaffQuery();
    const rolesQuery = useGetBusinessRolesQuery();
    const [createStaff, createState] = useCreateStaffMutation();
    const [updateStaff, updateState] = useUpdateStaffMutation();
    const [updateStatus] = useUpdateStaffStatusMutation();
    const [deleteStaff, deleteState] = useDeleteStaffMutation();

    const [search, setSearch] = useState("");
    const [editor, setEditor] = useState<Editor>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);

    const roles = useMemo(() => rolesQuery.data || [], [rolesQuery.data]);
    const roleNames = useMemo(
        () => new Map(roles.map((role) => [role.id, role.name || role.id])),
        [roles],
    );

    const members = useMemo(() => {
        const term = search.trim().toLowerCase();
        const all = staffQuery.data || [];
        if (!term) return all;

        return all.filter((member) =>
            [
                staffFullName(member),
                member.email,
                member.username,
                member.phoneNumber,
            ]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(term)),
        );
    }, [staffQuery.data, search]);

    const closeEditor = () => {
        setEditor(null);
        setFieldErrors({});
    };

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editor) return;

        setFieldErrors({});

        const form = new FormData(event.currentTarget);
        const shared = {
            firstName: String(form.get("firstName") || ""),
            lastName: String(form.get("lastName") || ""),
            phoneNumber: String(form.get("phoneNumber") || ""),
            gender: String(form.get("gender") || ""),
            roleId: (() => {
                const value = String(form.get("roleId") || "");
                return value === NO_ROLE ? "" : value;
            })(),
        };

        try {
            if (editor.mode === "create") {
                const parsed = createStaffSchema.safeParse({
                    ...shared,
                    username: String(form.get("username") || ""),
                    email: String(form.get("email") || ""),
                    password: String(form.get("password") || ""),
                });

                if (!parsed.success) {
                    setFieldErrors(issueMap(parsed.error.issues));
                    toast({
                        tone: "error",
                        title: "Check the highlighted fields",
                        description: parsed.error.issues[0]?.message,
                    });
                    return;
                }

                await createStaff(parsed.data).unwrap();
                toast({
                    title: "User created",
                    description: `${parsed.data.firstName} ${parsed.data.lastName} can now sign in.`,
                });
            } else {
                const parsed = updateStaffSchema.safeParse(shared);

                if (!parsed.success) {
                    setFieldErrors(issueMap(parsed.error.issues));
                    toast({
                        tone: "error",
                        title: "Check the highlighted fields",
                        description: parsed.error.issues[0]?.message,
                    });
                    return;
                }

                await updateStaff({
                    userId: editor.staff.id,
                    body: parsed.data,
                }).unwrap();
                toast({ title: "Changes saved" });
            }

            closeEditor();
        } catch (error) {
            toast({
                tone: "error",
                title: "Save failed",
                description: getApiErrorMessage(
                    error,
                    "Unable to save the user.",
                ),
            });
        }
    }

    async function toggleStatus(member: Staff) {
        const next = member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

        try {
            await updateStatus({ userId: member.id, status: next }).unwrap();
            toast({
                title:
                    next === "ACTIVE" ? "User activated" : "User deactivated",
                description: staffFullName(member),
            });
        } catch (error) {
            toast({
                tone: "error",
                title: "Status change failed",
                description: getApiErrorMessage(
                    error,
                    "Unable to change the user's status.",
                ),
            });
        }
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return;

        try {
            await deleteStaff(deleteTarget.id).unwrap();
            toast({
                title: "User removed",
                description: staffFullName(deleteTarget),
            });
            setDeleteTarget(null);
        } catch (error) {
            toast({
                tone: "error",
                title: "Remove failed",
                description: getApiErrorMessage(
                    error,
                    "Unable to remove the user.",
                ),
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
                                ? "Add a user"
                                : `Edit ${staffFullName(editor.staff)}`
                        }
                        description={
                            editor.mode === "create"
                                ? "The user signs in with these credentials."
                                : "Sign-in details can only be changed by the user."
                        }
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
                        className="mt-6 flex flex-col gap-5"
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            {editor.mode === "create" && (
                                <>
                                    <FormField
                                        label="Username"
                                        htmlFor="username"
                                        error={fieldErrors.username}
                                    >
                                        <input
                                            id="username"
                                            name="username"
                                            autoComplete="off"
                                            placeholder="john_doe"
                                            className={fieldClassName}
                                            aria-invalid={Boolean(
                                                fieldErrors.username,
                                            )}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Email"
                                        htmlFor="email"
                                        error={fieldErrors.email}
                                    >
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="off"
                                            placeholder="john.doe@example.com"
                                            className={fieldClassName}
                                            aria-invalid={Boolean(
                                                fieldErrors.email,
                                            )}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Password"
                                        htmlFor="password"
                                        error={fieldErrors.password}
                                    >
                                        <PasswordInput
                                            invalid={Boolean(
                                                fieldErrors.password,
                                            )}
                                        />
                                    </FormField>
                                </>
                            )}

                            <FormField
                                label="First name"
                                htmlFor="firstName"
                                error={fieldErrors.firstName}
                            >
                                <input
                                    id="firstName"
                                    name="firstName"
                                    placeholder="John"
                                    defaultValue={
                                        editor.mode === "edit"
                                            ? editor.staff.firstName
                                            : undefined
                                    }
                                    className={fieldClassName}
                                    aria-invalid={Boolean(
                                        fieldErrors.firstName,
                                    )}
                                />
                            </FormField>
                            <FormField
                                label="Last name"
                                htmlFor="lastName"
                                error={fieldErrors.lastName}
                            >
                                <input
                                    id="lastName"
                                    name="lastName"
                                    placeholder="Doe"
                                    defaultValue={
                                        editor.mode === "edit"
                                            ? editor.staff.lastName
                                            : undefined
                                    }
                                    className={fieldClassName}
                                    aria-invalid={Boolean(fieldErrors.lastName)}
                                />
                            </FormField>
                            <FormField
                                label="Phone number"
                                htmlFor="phoneNumber"
                                error={fieldErrors.phoneNumber}
                            >
                                <input
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    inputMode="tel"
                                    placeholder="+855 12 345 678"
                                    defaultValue={
                                        editor.mode === "edit"
                                            ? editor.staff.phoneNumber
                                            : undefined
                                    }
                                    className={fieldClassName}
                                    aria-invalid={Boolean(
                                        fieldErrors.phoneNumber,
                                    )}
                                />
                            </FormField>
                            <FormField
                                label="Gender"
                                htmlFor="gender"
                                error={fieldErrors.gender}
                            >
                                <SelectField
                                    id="gender"
                                    name="gender"
                                    placeholder="Select gender"
                                    invalid={Boolean(fieldErrors.gender)}
                                    defaultValue={
                                        editor.mode === "edit"
                                            ? editor.staff.gender || undefined
                                            : undefined
                                    }
                                    options={genders.map((gender) => ({
                                        value: gender,
                                        label:
                                            gender.charAt(0) +
                                            gender.slice(1).toLowerCase(),
                                    }))}
                                />
                            </FormField>
                            <FormField
                                label="Role"
                                htmlFor="roleId"
                                error={fieldErrors.roleId}
                                hint={
                                    roles.length === 0
                                        ? "Create a role first to assign one."
                                        : undefined
                                }
                            >
                                <SelectField
                                    id="roleId"
                                    name="roleId"
                                    defaultValue={
                                        editor.mode === "edit"
                                            ? editor.staff.roleId || NO_ROLE
                                            : NO_ROLE
                                    }
                                    options={[
                                        { value: NO_ROLE, label: "No role" },
                                        ...roles.map((role) => ({
                                            value: role.id,
                                            label: role.name || role.id,
                                        })),
                                    ]}
                                />
                            </FormField>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                type="submit"
                                disabled={saving}

                            >
                                {saving
                                    ? "Saving…"
                                    : editor.mode === "create"
                                      ? "Create user"
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

            <Panel data-tour="user-list">
                <PanelHeader
                    title="Users"
                    description="People who can sign in to this business."
                    action={
                        <Button
                            type="button"
                            data-tour="add-user"
                            onClick={() => {
                                setEditor({ mode: "create" });
                                setFieldErrors({});
                            }}
                            className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm gap-1 sm:gap-2"
                        >
                            <Plus className="size-3.5 sm:size-4" aria-hidden="true" />
                            <span>Add user</span>
                        </Button>
                    }
                />

                <div data-tour="staff-search" className="relative mt-6 sm:w-72">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <label htmlFor="staff-search" className="sr-only">
                        Search users
                    </label>
                    <input
                        id="staff-search"
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name, email, or phone..."
                        className="h-9 sm:h-10 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-gray-400 dark:focus-visible:border-gray-600 focus-visible:ring-1 focus-visible:ring-gray-400/20 shadow-xs"
                    />
                </div>

                {staffQuery.isLoading ? (
                    <LoadingState label="Loading users" />
                ) : staffQuery.error ? (
                    <ErrorState
                        message={getApiErrorMessage(
                            staffQuery.error,
                            "Unable to load users.",
                        )}
                        retry={staffQuery.refetch}
                    />
                ) : members.length === 0 ? (
                    <EmptyState
                        title={search ? "No matching users" : "No users yet"}
                        description={
                            search
                                ? "Try a different search term."
                                : "Add your first user to give someone access."
                        }
                    />
                ) : (
                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[720px] border-collapse text-left">
                            <caption className="sr-only">
                                Users in this business
                            </caption>
                            <thead>
                                <tr className="border-b border-border text-[12px] text-muted-foreground">
                                    <th
                                        scope="col"
                                        className="py-3 pr-4 font-medium"
                                    >
                                        Name
                                    </th>
                                    <th
                                        scope="col"
                                        className="py-3 pr-4 font-medium"
                                    >
                                        Contact
                                    </th>
                                    <th
                                        scope="col"
                                        className="py-3 pr-4 font-medium"
                                    >
                                        Role
                                    </th>
                                    <th
                                        scope="col"
                                        className="py-3 pr-4 font-medium"
                                    >
                                        Status
                                    </th>
                                    <th
                                        scope="col"
                                        className="py-3 text-right font-medium"
                                    >
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr
                                        key={member.id}
                                        className="border-b border-border last:border-0"
                                    >
                                        <td className="py-4 pr-4">
                                            <p className="text-[15px] font-medium text-foreground">
                                                {staffFullName(member)}
                                            </p>
                                            {member.username && (
                                                <p className="text-[13px] text-muted-foreground">
                                                    @{member.username}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-4 pr-4 text-[14px] text-muted-foreground">
                                            <p>{member.email || "—"}</p>
                                            <p className="text-[13px] text-muted-foreground">
                                                {member.phoneNumber || "—"}
                                            </p>
                                        </td>
                                        <td className="py-4 pr-4 text-[14px] text-muted-foreground">
                                            {member.roleId
                                                ? roleNames.get(
                                                      member.roleId,
                                                  ) || member.roleId
                                                : "No role"}
                                        </td>
                                        <td className="py-4 pr-4">
                                            <StatusPill
                                                active={
                                                    member.status === "ACTIVE"
                                                }
                                            />
                                        </td>
                                        <td className="py-4">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleStatus(member)
                                                    }
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    {member.status === "ACTIVE"
                                                        ? "Deactivate"
                                                        : "Activate"}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditor({
                                                            mode: "edit",
                                                            staff: member,
                                                        });
                                                        setFieldErrors({});
                                                    }}
                                                    aria-label={`Edit ${staffFullName(member)}`}
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
                                                        setDeleteTarget(member)
                                                    }
                                                    aria-label={`Remove ${staffFullName(member)}`}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="grid size-9 place-items-center rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer p-0"
                                                    disabled={
                                                        deleteState.isLoading
                                                    }
                                                >
                                                    <Trash2
                                                        className="size-4 text-brand-red"
                                                        aria-hidden="true"
                                                    />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <DestructiveConfirmDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={deleteTarget ? `Delete ${staffFullName(deleteTarget)}?` : "Delete staff member?"}
                description={
                    deleteTarget ? (
                        <>
                            Are you sure you want to delete{" "}
                            <strong className="font-semibold text-foreground">
                                {staffFullName(deleteTarget)}
                            </strong>
                            ? This action cannot be undone.
                        </>
                    ) : (
                        "Are you sure you want to delete this staff member? This action cannot be undone."
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
