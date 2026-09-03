"use client";

import { PaginationBar } from "@/components/ui/PaginationBar";
import { useMemo, useRef, useState, type FormEvent } from "react";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Eye,
    EyeOff,
    Pencil,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    ColumnSelectDropdown,
    type ColumnConfig,
} from "@/components/ui/ColumnSelectDropdown";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
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
    useGetStaffPageQuery,
    useUpdateStaffMutation,
    useUpdateStaffStatusMutation,
} from "@/services/userManagementApi";

type Editor = { mode: "create" } | { mode: "edit"; staff: Staff } | null;

type UserColumnKey = "name" | "contact" | "role" | "status" | "actions";

const DEFAULT_COLUMNS: ColumnConfig[] = [
    { id: "name", label: "Name", visible: true },
    { id: "contact", label: "Contact", visible: true },
    { id: "role", label: "Role", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "actions", label: "Actions", visible: true },
];

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
                maxLength={255}
                autoComplete="new-password"
                className={`${fieldClassName} pr-11`}
                aria-invalid={invalid}
                placeholder="At least 6 characters"
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
    const [staffPage, setStaffPage] = useState(0);
    const [staffPageSize, setStaffPageSize] = useState(10);
    const staffQuery = useGetStaffPageQuery({
        page: staffPage,
        size: staffPageSize,
    });
    const rolesQuery = useGetBusinessRolesQuery();
    const [createStaff, createState] = useCreateStaffMutation();
    const [updateStaff, updateState] = useUpdateStaffMutation();
    const [updateStatus] = useUpdateStaffStatusMutation();
    const [deleteStaff, deleteState] = useDeleteStaffMutation();

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [sortColumn, setSortColumn] = useState<"name" | "contact" | "role" | "status" | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
    const [editor, setEditor] = useState<Editor>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
    const formRef = useRef<HTMLDivElement>(null);

    const openEditor = (nextEditor: Editor) => {
        setEditor(nextEditor);
        setFieldErrors({});
        requestAnimationFrame(() => {
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };

    const roles = useMemo(() => rolesQuery.data || [], [rolesQuery.data]);
    const roleNames = useMemo(
        () => new Map(roles.map((role) => [role.id, role.name || role.id])),
        [roles],
    );

    const roleOptions = useMemo(() => {
        const opts = [
            { value: NO_ROLE, label: "No role" },
            ...roles.map((role) => ({
                value: role.id,
                label: role.name || role.id,
            })),
        ];
        if (
            editor &&
            editor.mode === "edit" &&
            editor.staff.roleId &&
            !roles.some((r) => r.id === editor.staff.roleId)
        ) {
            opts.push({
                value: editor.staff.roleId,
                label: roleNames.get(editor.staff.roleId) || "Selected Role",
            });
        }
        return opts;
    }, [roles, editor, roleNames]);

    const toggleColumn = (id: string) => {
        setColumnConfigs((prev) =>
            prev.map((col) =>
                col.id === id ? { ...col, visible: !col.visible } : col,
            ),
        );
    };

    const resetColumnDefaults = () => {
        setColumnConfigs(DEFAULT_COLUMNS);
    };

    const isColVisible = (id: UserColumnKey) => {
        return columnConfigs.find((col) => col.id === id)?.visible ?? true;
    };

    const resetFilters = () => {
        setSearch("");
        setRoleFilter("ALL");
        setStatusFilter("ALL");
        setStaffPage(0);
    };

    const hasActiveFilters = Boolean(search || roleFilter !== "ALL" || statusFilter !== "ALL");

    const handleSort = (column: "name" | "contact" | "role" | "status") => {
        if (sortColumn === column) {
            if (sortDirection === "asc") {
                setSortDirection("desc");
            } else {
                setSortColumn(null);
                setSortDirection("asc");
            }
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const members = useMemo(() => {
        const term = search.trim().toLowerCase();
        let list = staffQuery.data?.content || [];

        if (term) {
            list = list.filter((member: Staff) =>
                [staffFullName(member), member.email, member.username, member.phoneNumber]
                    .filter(Boolean)
                    .some((value) => value!.toLowerCase().includes(term)),
            );
        }

        if (roleFilter !== "ALL") {
            if (roleFilter === "NO_ROLE") {
                list = list.filter((member: Staff) => !member.roleId);
            } else {
                list = list.filter((member: Staff) => member.roleId === roleFilter);
            }
        }

        if (statusFilter !== "ALL") {
            list = list.filter((member: Staff) => member.status === statusFilter);
        }

        if (sortColumn) {
            list = [...list].sort((a, b) => {
                let valA = "";
                let valB = "";

                if (sortColumn === "name") {
                    valA = staffFullName(a).toLowerCase();
                    valB = staffFullName(b).toLowerCase();
                } else if (sortColumn === "contact") {
                    valA = (a.email || a.phoneNumber || "").toLowerCase();
                    valB = (b.email || b.phoneNumber || "").toLowerCase();
                } else if (sortColumn === "role") {
                    valA = (a.roleId ? roleNames.get(a.roleId) || a.roleId : "").toLowerCase();
                    valB = (b.roleId ? roleNames.get(b.roleId) || b.roleId : "").toLowerCase();
                } else if (sortColumn === "status") {
                    valA = (a.status || "").toLowerCase();
                    valB = (b.status || "").toLowerCase();
                }

                if (valA < valB) return sortDirection === "asc" ? -1 : 1;
                if (valA > valB) return sortDirection === "asc" ? 1 : -1;
                return 0;
            });
        }

        return list;
    }, [staffQuery.data, search, roleFilter, statusFilter, sortColumn, sortDirection, roleNames]);

    const staffCurrentPage = staffQuery.data?.page?.number ?? staffPage;
    const staffTotalPages =
        staffQuery.data?.page?.totalPages ?? (members.length ? 1 : 0);
    const staffTotalElements =
        staffQuery.data?.page?.totalElements ?? members.length;

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
                description: getApiErrorMessage(error, "Unable to save the user."),
            });
        }
    }

    async function toggleStatus(member: Staff) {
        const next = member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

        try {
            await updateStatus({ userId: member.id, status: next }).unwrap();
            toast({
                title: next === "ACTIVE" ? "User activated" : "User deactivated",
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
                description: getApiErrorMessage(error, "Unable to remove the user."),
            });
            setDeleteTarget(null);
        }
    }

    const saving = createState.isLoading || updateState.isLoading;

    return (
        <div className="flex flex-col gap-5">
            {editor && (
                <div ref={formRef}>
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
                            key={editor.mode === "edit" ? editor.staff.id : "create"}
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
                                            maxLength={255}
                                            autoComplete="off"
                                            placeholder="john"
                                            className={fieldClassName}
                                            aria-invalid={Boolean(fieldErrors.username)}
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
                                            maxLength={255}
                                            autoComplete="off"
                                            placeholder="john@company.com"
                                            className={fieldClassName}
                                            aria-invalid={Boolean(fieldErrors.email)}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Password"
                                        htmlFor="password"
                                        error={fieldErrors.password}
                                    >
                                        <PasswordInput invalid={Boolean(fieldErrors.password)} />
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
                                    maxLength={255}
                                    placeholder="Alex"
                                    defaultValue={
                                        editor.mode === "edit" ? editor.staff.firstName : undefined
                                    }
                                    className={fieldClassName}
                                    aria-invalid={Boolean(fieldErrors.firstName)}
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
                                    maxLength={255}
                                    placeholder="john"
                                    defaultValue={
                                        editor.mode === "edit" ? editor.staff.lastName : undefined
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
                                    maxLength={30}
                                    inputMode="tel"
                                    placeholder="012 345 678"
                                    defaultValue={
                                        editor.mode === "edit"
                                            ? editor.staff.phoneNumber
                                            : undefined
                                    }
                                    className={fieldClassName}
                                    aria-invalid={Boolean(fieldErrors.phoneNumber)}
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
                                        label: gender.charAt(0) + gender.slice(1).toLowerCase(),
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
                                    options={roleOptions}
                                />
                            </FormField>
                        </div>

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
                                            ? "Create user"
                                            : "Save changes"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Panel>
            </div>
        )}

        <Panel data-tour="user-list">
            <PanelHeader
                title="Users"
                description="People who can sign in to this business."
                action={
                    !editor ? (
                        <Button
                            type="button"
                            data-tour="add-user"
                            onClick={() => openEditor({ mode: "create" })}
                            className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm gap-1 sm:gap-2"
                        >
                            <Plus className="size-3.5 sm:size-4" aria-hidden="true" />
                            <span>Add user</span>
                        </Button>
                    ) : null
                }
            />

                <div data-tour="staff-filters" className="mt-6 flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 flex-1">
                        <div className="relative w-full sm:flex-1 sm:min-w-[220px] lg:max-w-xs">
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
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setStaffPage(0);
                                }}
                                placeholder="Search by name, email, or phone..."
                                className="h-10 w-full rounded-xl border border-border bg-card pr-8 pl-9 text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-gray-400 dark:focus-visible:border-gray-600 focus-visible:ring-1 focus-visible:ring-gray-400/20 shadow-xs"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch("");
                                        setStaffPage(0);
                                    }}
                                    aria-label="Clear search"
                                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Filter controls + Columns + Reset (unified together) */}
                        <div className="flex items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto">
                            <div className="flex-1 min-w-0 sm:w-40 md:w-44 sm:flex-initial">
                                <SelectField
                                    id="staff-role-filter"
                                    value={roleFilter}
                                    onValueChange={(val) => {
                                        setRoleFilter(val);
                                        setStaffPage(0);
                                    }}
                                    size="sm"
                                    className="h-10 px-2 sm:px-3.5 text-xs sm:text-sm gap-1 sm:gap-1.5 shadow-xs whitespace-nowrap [&>svg]:size-3.5 sm:[&>svg]:size-4"
                                    options={[
                                        { value: "ALL", label: "All roles" },
                                        ...roles.map((role) => ({
                                            value: role.id,
                                            label: role.name || role.id,
                                        })),
                                        { value: "NO_ROLE", label: "No role" },
                                    ]}
                                />
                            </div>

                            <div className="flex-1 min-w-0 sm:w-32 md:w-36 sm:flex-initial">
                                <SelectField
                                    id="staff-status-filter"
                                    value={statusFilter}
                                    onValueChange={(val) => {
                                        setStatusFilter(val);
                                        setStaffPage(0);
                                    }}
                                    size="sm"
                                    className="h-10 px-2 sm:px-3.5 text-xs sm:text-sm gap-1 sm:gap-1.5 shadow-xs whitespace-nowrap [&>svg]:size-3.5 sm:[&>svg]:size-4"
                                    options={[
                                        { value: "ALL", label: "All status" },
                                        { value: "ACTIVE", label: "Active" },
                                        { value: "INACTIVE", label: "Inactive" },
                                    ]}
                                />
                            </div>

                            <div className="shrink-0">
                                <ColumnSelectDropdown
                                    columns={columnConfigs}
                                    onToggleColumn={toggleColumn}
                                    onResetDefaults={resetColumnDefaults}
                                />
                            </div>

                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetFilters}
                                    className="h-10 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                                >
                                    <X className="size-3.5 sm:mr-1" />
                                    <span className="hidden sm:inline">Reset</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {staffQuery.isLoading && !staffQuery.data ? (
                    <LoadingState label="Loading users" />
                ) : staffQuery.error && !staffQuery.data ? (
                    <ErrorState
                        message={getApiErrorMessage(
                            staffQuery.error,
                            "Unable to load users.",
                        )}
                        retry={staffQuery.refetch}
                    />
                ) : members.length === 0 ? (
                    <EmptyState
                        title={hasActiveFilters ? "No matching users" : "No users yet"}
                        description={
                            hasActiveFilters
                                ? "Try adjusting your search or column filters."
                                : "Add your first user to give someone access."
                        }
                        action={
                            hasActiveFilters ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={resetFilters}
                                >
                                    Clear filters
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        {/* Mobile Cards View (< md) */}
                        <div className="flex flex-col gap-3 pt-3 md:hidden">
                            {members.map((member: Staff) => (
                                <div
                                    key={member.id}
                                    onClick={() => {
                                        setEditor({
                                            mode: "edit",
                                            staff: member,
                                        });
                                        setFieldErrors({});
                                    }}
                                    className="rounded-2xl border border-border bg-card dark:bg-[#151c28] shadow-xs overflow-hidden transition-all cursor-pointer hover:border-primary/40 active:scale-[0.99]"
                                >
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between p-3.5 bg-muted/20 dark:bg-[#0e1420] border-b border-border/70 dark:border-slate-800/80">
                                        <div className="flex flex-col min-w-0 pr-2">
                                            <span className="font-bold text-sm text-foreground dark:text-white truncate">
                                                {staffFullName(member)}
                                            </span>
                                            {member.username && (
                                                <span className="text-[11px] text-muted-foreground mt-0.5">
                                                    @{member.username}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <StatusPill active={member.status === "ACTIVE"} />
                                            <Button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditor({
                                                        mode: "edit",
                                                        staff: member,
                                                    });
                                                }}
                                                aria-label={`Edit ${staffFullName(member)}`}
                                                variant="ghost"
                                                size="icon-sm"
                                                className="h-7 w-7"
                                            >
                                                <Pencil className="size-3.5" aria-hidden="true" />
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteTarget(member);
                                                }}
                                                aria-label={`Remove ${staffFullName(member)}`}
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-brand-red hover:bg-red-50 dark:hover:bg-red-950/40"
                                                disabled={deleteState.isLoading}
                                            >
                                                <Trash2 className="size-3.5" aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Card Key-Value Rows */}
                                    <div className="divide-y divide-border/60 dark:divide-slate-800/60 text-xs">
                                        <div className="flex items-center justify-between px-3.5 py-2.5">
                                            <span className="text-muted-foreground dark:text-slate-400">Role</span>
                                            <span className="font-medium text-foreground dark:text-slate-200">
                                                {member.roleId ? roleNames.get(member.roleId) || member.roleId : "No role"}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between px-3.5 py-2.5">
                                            <span className="text-muted-foreground dark:text-slate-400">Contact</span>
                                            <div className="text-right">
                                                <p className="text-foreground dark:text-slate-200">{member.email || "—"}</p>
                                                {member.phoneNumber && (
                                                    <p className="text-[11px] text-muted-foreground">{member.phoneNumber}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/10 dark:bg-slate-900/30">
                                            <span className="text-muted-foreground dark:text-slate-400">Account Access</span>
                                            <Button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleStatus(member);
                                                }}
                                                variant="outline"
                                                size="sm"
                                                className="h-6 px-2 text-[11px] font-semibold"
                                            >
                                                {member.status === "ACTIVE" ? "Deactivate" : "Activate"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table (>= md) */}
                        <div
                            className={cn(
                                "hidden md:block mt-5 overflow-x-auto transition-opacity duration-200 ease-in-out",
                                staffQuery.isFetching && "opacity-60 pointer-events-none",
                            )}
                        >
                            <table className="w-full min-w-[720px] border-collapse text-left">
                                <caption className="sr-only">Users in this business</caption>
                                <thead>
                                    <tr className="border-b border-border text-[12px] text-muted-foreground">
                                        {isColVisible("name") && (
                                            <th scope="col" className="py-3 pr-4 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort("name")}
                                                    className="group inline-flex items-center gap-1.5 hover:text-foreground font-medium transition-colors cursor-pointer"
                                                >
                                                    <span>Name</span>
                                                    {sortColumn === "name" ? (
                                                        sortDirection === "asc" ? (
                                                            <ArrowUp className="size-3.5 text-primary" />
                                                        ) : (
                                                            <ArrowDown className="size-3.5 text-primary" />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown className="size-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                                                    )}
                                                </button>
                                            </th>
                                        )}
                                        {isColVisible("contact") && (
                                            <th scope="col" className="py-3 pr-4 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort("contact")}
                                                    className="group inline-flex items-center gap-1.5 hover:text-foreground font-medium transition-colors cursor-pointer"
                                                >
                                                    <span>Contact</span>
                                                    {sortColumn === "contact" ? (
                                                        sortDirection === "asc" ? (
                                                            <ArrowUp className="size-3.5 text-primary" />
                                                        ) : (
                                                            <ArrowDown className="size-3.5 text-primary" />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown className="size-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                                                    )}
                                                </button>
                                            </th>
                                        )}
                                        {isColVisible("role") && (
                                            <th scope="col" className="py-3 pr-4 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort("role")}
                                                    className="group inline-flex items-center gap-1.5 hover:text-foreground font-medium transition-colors cursor-pointer"
                                                >
                                                    <span>Role</span>
                                                    {sortColumn === "role" ? (
                                                        sortDirection === "asc" ? (
                                                            <ArrowUp className="size-3.5 text-primary" />
                                                        ) : (
                                                            <ArrowDown className="size-3.5 text-primary" />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown className="size-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                                                    )}
                                                </button>
                                            </th>
                                        )}
                                        {isColVisible("status") && (
                                            <th scope="col" className="py-3 pr-4 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort("status")}
                                                    className="group inline-flex items-center gap-1.5 hover:text-foreground font-medium transition-colors cursor-pointer"
                                                >
                                                    <span>Status</span>
                                                    {sortColumn === "status" ? (
                                                        sortDirection === "asc" ? (
                                                            <ArrowUp className="size-3.5 text-primary" />
                                                        ) : (
                                                            <ArrowDown className="size-3.5 text-primary" />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown className="size-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                                                    )}
                                                </button>
                                            </th>
                                        )}
                                        {isColVisible("actions") && (
                                            <th scope="col" className="py-3 text-right font-medium">
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((member: Staff) => (
                                        <tr
                                            key={member.id}
                                            className="border-b border-border last:border-0"
                                        >
                                            {isColVisible("name") && (
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
                                            )}
                                            {isColVisible("contact") && (
                                                <td className="py-4 pr-4 text-[14px] text-muted-foreground">
                                                    <p>{member.email || "—"}</p>
                                                    <p className="text-[13px] text-muted-foreground">
                                                        {member.phoneNumber || "—"}
                                                    </p>
                                                </td>
                                            )}
                                            {isColVisible("role") && (
                                                <td className="py-4 pr-4 text-[14px] text-muted-foreground">
                                                    {member.roleId
                                                        ? roleNames.get(member.roleId) || member.roleId
                                                        : "No role"}
                                                </td>
                                            )}
                                            {isColVisible("status") && (
                                                <td className="py-4 pr-4">
                                                    <StatusPill active={member.status === "ACTIVE"} />
                                                </td>
                                            )}
                                            {isColVisible("actions") && (
                                                <td className="py-4">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            onClick={() => toggleStatus(member)}
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
                                                                openEditor({
                                                                    mode: "edit",
                                                                    staff: member,
                                                                });
                                                            }}
                                                            aria-label={`Edit ${staffFullName(member)}`}
                                                            variant="ghost"
                                                            size="icon-sm"
                                                        >
                                                            <Pencil className="size-4" aria-hidden="true" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            onClick={() => setDeleteTarget(member)}
                                                            aria-label={`Remove ${staffFullName(member)}`}
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
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {staffTotalPages > 0 && (
                    <PaginationBar
                        page={staffCurrentPage}
                        size={staffPageSize}
                        totalElements={staffTotalElements}
                        totalPages={staffTotalPages}
                        onPageChange={setStaffPage}
                        onSizeChange={(next) => {
                            setStaffPageSize(next);
                            setStaffPage(0);
                        }}
                        sizeOptions={[10, 20, 25, 50, 100]}
                        isLoading={staffQuery.isFetching}
                        itemLabel="user"
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
                        ? `Delete ${staffFullName(deleteTarget)}?`
                        : "Delete staff member?"
                }
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
