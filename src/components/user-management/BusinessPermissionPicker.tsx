"use client";

import { Button } from "@/components/ui/button";
import { BUSINESS_PERMISSION_GROUPS } from "@/lib/api/permission-catalog";

/**
 * What a role may do, as tick boxes.
 *
 * Groups follow the job someone is hired to do rather than the resource prefix
 * of the underlying Keycloak role, and every line carries a hint, because the
 * person assembling a role is usually a shop owner deciding what a cashier
 * should touch — not someone who knows what `order:generate-khqr` means.
 *
 * Only permissions the API will actually accept are offered; the catalog
 * filters out the ones `KeycloakRoleAdapter` refuses for business staff, which
 * would otherwise fail the whole save.
 */
export function BusinessPermissionPicker({
    selected,
    onToggle,
    onToggleGroup,
}: {
    selected: ReadonlySet<string>;
    onToggle: (value: string) => void;
    onToggleGroup: (values: string[], allOn: boolean) => void;
}) {
    return (
        <div className="flex flex-col gap-4">
            <p className="text-[13px] font-semibold text-foreground">
                Permissions
                <span className="ml-2 font-normal text-muted-foreground">
                    {selected.size} selected
                </span>
            </p>

            <div className="grid gap-4 lg:grid-cols-2">
                {BUSINESS_PERMISSION_GROUPS.map((group) => {
                    const values = group.permissions.map(
                        (permission) => permission.value,
                    );
                    const allOn = values.every((value) => selected.has(value));
                    const someOn = values.some((value) => selected.has(value));

                    return (
                        <fieldset
                            key={group.id}
                            className="rounded-2xl border border-border bg-muted/40 p-4 shadow-xs"
                        >
                            <legend className="px-2 text-[14px] font-bold text-foreground">
                                {group.label}
                            </legend>

                            <div className="mb-3.5 flex items-center gap-3">
                                <Button
                                    type="button"
                                    size="xs"
                                    variant={allOn ? "outline" : "default"}
                                    onClick={() => onToggleGroup(values, allOn)}
                                    className="rounded-lg text-[12px] font-medium"
                                >
                                    {allOn ? "Clear all" : "Select all"}
                                </Button>

                                {/* Tells you a collapsed-looking group is not empty. */}
                                {someOn && !allOn && (
                                    <span className="text-[12px] text-muted-foreground">
                                        {
                                            values.filter((value) =>
                                                selected.has(value),
                                            ).length
                                        }{" "}
                                        of {values.length}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1">
                                {group.permissions.map((permission) => (
                                    <label
                                        key={permission.value}
                                        className="flex cursor-pointer select-none items-start gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-background/60"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected.has(permission.value)}
                                            onChange={() => onToggle(permission.value)}
                                            className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-border accent-success"
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium text-foreground">
                                                {permission.label}
                                            </span>
                                            <span className="block text-xs text-muted-foreground">
                                                {permission.hint}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    );
                })}
            </div>
        </div>
    );
}
