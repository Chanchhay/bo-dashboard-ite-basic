"use client";

import { useMemo, useState } from "react";
import {
    ChevronDown,
    Eye,
    EyeOff,
    FolderTree,
    Layers,
    ListChecks,
    Package,
    Pencil,
    Plus,
    Tag,
    Trash2,
    X,
} from "lucide-react";

import type { AttributeDraft } from "@/components/inventory/ItemAttributeDialog";
import { ItemPickerDialog } from "@/components/inventory/ItemPickerDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AttributeIcon } from "@/lib/api/attribute-icons";
import {
    itemAttributePlacementLabels,
    itemAttributeTypeLabels,
} from "@/lib/api/inventory";
import {
    sampleAddOnSets,
    sampleAddOns,
    sampleOptionPresets,
    sampleUnits,
} from "@/lib/inventory-config/sample-data";
import type { AddOn, OptionPreset } from "@/lib/inventory-config/types";
import { formatAmount } from "@/lib/inventory-config/units";
import { cn } from "@/lib/utils";

function describeValues(attribute: AttributeDraft) {
    if (attribute.type === "TOGGLE") return "On or off";

    return attribute.values.length
        ? attribute.values
              .map((value) => value.label || value.value)
              .join(", ")
        : "No values";
}

function AttributeRow({
    attribute,
    onEdit,
    onRemove,
}: {
    attribute: AttributeDraft;
    onEdit: () => void;
    onRemove: () => void;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            {attribute.icon ? (
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <AttributeIcon
                        icon={attribute.icon}
                        className="size-4"
                    />
                </span>
            ) : null}
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                        {attribute.name || "Untitled"}
                    </p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {itemAttributeTypeLabels[attribute.type]}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {itemAttributePlacementLabels[attribute.placement].label}
                    </span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                    {describeValues(attribute)}
                </p>
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${attribute.name}`}
                onClick={onEdit}
            >
                <Pencil />
            </Button>
            <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                aria-label={`Remove ${attribute.name}`}
                onClick={onRemove}
            >
                <Trash2 />
            </Button>
        </div>
    );
}

function Group({
    icon: Icon,
    title,
    hint,
    actions,
    children,
}: {
    icon: typeof Tag;
    title: string;
    hint: string;
    actions: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">
                            {title}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {hint}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">{actions}</div>
            </div>
            {children}
        </div>
    );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
    return (
        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
            {children}
        </p>
    );
}

/**
 * Choices and extras, in one card.
 *
 * Options and attributes are the same underlying record — an item attribute —
 * split by placement so the form reads the way a merchant thinks: what a
 * customer *picks* above, what is merely *true* below. Add-ons are a separate
 * shared library and only referenced here.
 */
function AddOnCategoryDropdown({
    setTitle,
    items,
    enabledMap,
    onToggle,
    onDetachAddOn,
    unitSymbol,
}: {
    setTitle: string;
    items: AddOn[];
    enabledMap: Record<string, boolean>;
    onToggle: (id: string, enabled: boolean) => void;
    onDetachAddOn: (id: string) => void;
    unitSymbol: (unitId: string) => string;
}) {
    const [open, setOpen] = useState(true);

    const activeCount = items.filter((item) => enabledMap[item.id] !== false).length;

    return (
        <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-sm transition-all">
            {/* Category Dropdown Header matching exact screenshot */}
            <div
                onClick={() => setOpen((prev) => !prev)}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-2 py-1 transition-colors hover:bg-muted/40"
            >
                <div className="flex items-center gap-3.5 min-w-0">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <FolderTree className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h5 className="font-semibold text-foreground text-sm truncate">
                            {setTitle}
                        </h5>
                        <p className="truncate text-xs text-muted-foreground mt-0.5">
                            {activeCount} of {items.length} subcategories visible
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    aria-label={`${open ? "Collapse" : "Expand"} ${setTitle}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-muted/60 text-muted-foreground transition-all hover:bg-muted focus:outline-none"
                >
                    <ChevronDown
                        className={cn(
                            "size-4 transition-transform duration-200",
                            !open ? "-rotate-90" : "rotate-0",
                        )}
                    />
                </button>
            </div>

            {/* Subcategory Tree Branches matching exact screenshot */}
            {open ? (
                <div className="relative ml-9 border-l-2 border-primary/20 dark:border-primary/30 my-2.5 pl-4 space-y-1.5 pr-2">
                    {items.map((addOn) => {
                        const symbol = unitSymbol(addOn.baseUnitId);
                        const isEnabled = enabledMap[addOn.id] !== false;

                        return (
                            <div
                                key={addOn.id}
                                className={cn(
                                    "relative flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 transition-colors hover:bg-muted/40 border border-transparent hover:border-border/40",
                                    isEnabled
                                        ? "opacity-100"
                                        : "opacity-60 bg-muted/30",
                                )}
                            >
                                {/* Horizontal branch line matching screenshot */}
                                <span className="absolute -left-4 top-1/2 h-0.5 w-3.5 bg-primary/30 dark:bg-primary/40 -translate-y-1/2" />

                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-foreground text-sm truncate">
                                        {addOn.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {formatAmount(addOn.onHand)} {symbol} in stock · uses {formatAmount(addOn.usePerOrder)} {symbol} per order
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                                    {/* Toggle for allowing to see on item */}
                                    <Switch
                                        id={`toggle-${addOn.id}`}
                                        checked={isEnabled}
                                        onCheckedChange={(checked) =>
                                            onToggle(addOn.id, checked)
                                        }
                                    />

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Remove ${addOn.name} from this item`}
                                        onClick={() => onDetachAddOn(addOn.id)}
                                        title="Detach add-on"
                                    >
                                        <X className="size-4 text-muted-foreground hover:text-danger" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

export function ItemOptionsCard({
    attributes,
    onAddOption,
    onAddAttribute,
    onEditAttribute,
    onRemoveAttribute,
    onApplyPreset,
    attachedAddOnIds,
    onAttachAddOns,
    onDetachAddOn,
    optionsError,
}: {
    attributes: AttributeDraft[];
    onAddOption: () => void;
    onAddAttribute: () => void;
    onEditAttribute: (id: string) => void;
    onRemoveAttribute: (id: string) => void;
    onApplyPreset: (preset: OptionPreset) => void;
    attachedAddOnIds: string[];
    onAttachAddOns: (ids: string[]) => void;
    onDetachAddOn: (id: string) => void;
    optionsError?: string;
}) {
    const [presetPickerOpen, setPresetPickerOpen] = useState(false);
    const [setPickerOpen, setSetPickerOpen] = useState(false);
    const [addOnPickerOpen, setAddOnPickerOpen] = useState(false);
    const [enabledAddOnMap, setEnabledAddOnMap] = useState<Record<string, boolean>>({});

    const options = attributes.filter(
        (attribute) => attribute.placement === "OPTION",
    );
    const facts = attributes.filter(
        (attribute) => attribute.placement !== "OPTION",
    );

    const attachedAddOns = useMemo(
        () =>
            attachedAddOnIds
                .map((id) => sampleAddOns.find((addOn) => addOn.id === id))
                .filter((addOn): addOn is AddOn => addOn !== undefined),
        [attachedAddOnIds],
    );

    // Group attached add-ons into categories / sets
    const addOnGroups = useMemo(() => {
        const groups: { setName: string; addOns: AddOn[] }[] = [];
        const processedIds = new Set<string>();

        for (const set of sampleAddOnSets) {
            const matching = attachedAddOns.filter(
                (a) => set.addOnIds.includes(a.id) && !processedIds.has(a.id),
            );
            if (matching.length > 0) {
                matching.forEach((a) => processedIds.add(a.id));
                groups.push({ setName: set.name, addOns: matching });
            }
        }

        const remaining = attachedAddOns.filter((a) => !processedIds.has(a.id));
        if (remaining.length > 0) {
            groups.push({ setName: "General Add-ons", addOns: remaining });
        }

        return groups;
    }, [attachedAddOns]);

    const unitSymbol = (unitId: string) =>
        sampleUnits.find((unit) => unit.id === unitId)?.symbol ?? "";

    function handleToggleAddOn(id: string, enabled: boolean) {
        setEnabledAddOnMap((prev) => ({
            ...prev,
            [id]: enabled,
        }));
    }

    return (
        <section className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:p-7">
            <div>
                <h2 className="text-lg font-semibold text-foreground">
                    Options &amp; add-ons
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    What a customer chooses when they order this item.
                </p>
            </div>

            <Group
                icon={ListChecks}
                title="Options"
                hint="Choices that change which version they get — size, milk, sugar level."
                actions={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPresetPickerOpen(true)}
                        >
                            <ListChecks />
                            Use a preset
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onAddOption}
                        >
                            <Plus />
                            Add option
                        </Button>
                    </>
                }
            >
                {options.length ? (
                    <div className="flex flex-col gap-2">
                        {options.map((attribute) => (
                            <AttributeRow
                                key={attribute.id}
                                attribute={attribute}
                                onEdit={() => onEditAttribute(attribute.id)}
                                onRemove={() => onRemoveAttribute(attribute.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyRow>
                        No options. Add one, or start from a saved preset.
                    </EmptyRow>
                )}
            </Group>

            <Group
                icon={Layers}
                title="Add-ons"
                hint="Extras piled on top. Grouped into category & subcategory dropdowns with visibility toggles."
                actions={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSetPickerOpen(true)}
                        >
                            <Layers />
                            Attach a set
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAddOnPickerOpen(true)}
                        >
                            <Plus />
                            Attach one
                        </Button>
                    </>
                }
            >
                {attachedAddOns.length ? (
                    <div className="flex flex-col gap-3">
                        {addOnGroups.map((group) => (
                            <AddOnCategoryDropdown
                                key={group.setName}
                                setTitle={group.setName}
                                items={group.addOns}
                                enabledMap={enabledAddOnMap}
                                onToggle={handleToggleAddOn}
                                onDetachAddOn={onDetachAddOn}
                                unitSymbol={unitSymbol}
                            />
                        ))}
                        <p className="text-xs text-muted-foreground mt-1">
                            Toggle &quot;Show on item&quot; to control which add-ons appear when customers view or customize this product.
                        </p>
                    </div>
                ) : (
                    <EmptyRow>
                        No add-ons. Attach a set, or pick one from the library.
                    </EmptyRow>
                )}
            </Group>

            <Group
                icon={Tag}
                title="Attributes"
                hint="Facts about the item — perks, specifications, internal notes."
                actions={
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onAddAttribute}
                    >
                        <Plus />
                        Add attribute
                    </Button>
                }
            >
                {facts.length ? (
                    <div className="flex flex-col gap-2">
                        {facts.map((attribute) => (
                            <AttributeRow
                                key={attribute.id}
                                attribute={attribute}
                                onEdit={() => onEditAttribute(attribute.id)}
                                onRemove={() => onRemoveAttribute(attribute.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyRow>
                        No attributes yet. Add one to describe this item.
                    </EmptyRow>
                )}
            </Group>

            {optionsError ? (
                <p className="text-xs text-danger" role="alert">
                    {optionsError}
                </p>
            ) : null}

            <ItemPickerDialog
                open={presetPickerOpen}
                onOpenChange={setPresetPickerOpen}
                title="Use an option preset"
                description="Copies the preset's choices onto this item. Editing the preset later will not change them back."
                emptyMessage="No presets saved yet. Create one under Item config."
                options={sampleOptionPresets.map((preset) => ({
                    id: preset.id,
                    label: preset.name,
                    hint: preset.values.map((value) => value.value).join(" · "),
                    disabled: attributes.some(
                        (attribute) =>
                            attribute.name.toLowerCase() ===
                            preset.name.toLowerCase(),
                    ),
                }))}
                onPick={(id) => {
                    const preset = sampleOptionPresets.find(
                        (candidate) => candidate.id === id,
                    );
                    if (preset) onApplyPreset(preset);
                }}
            />

            <ItemPickerDialog
                open={setPickerOpen}
                onOpenChange={setSetPickerOpen}
                title="Attach an add-on set"
                description="Adds every add-on in the set to this item."
                emptyMessage="No sets saved yet. Create one under Item config."
                options={sampleAddOnSets.map((set) => ({
                    id: set.id,
                    label: set.name,
                    hint: set.addOnIds
                        .map(
                            (addOnId) =>
                                sampleAddOns.find(
                                    (addOn) => addOn.id === addOnId,
                                )?.name,
                        )
                        .filter(Boolean)
                        .join(" · "),
                }))}
                onPick={(id) => {
                    const set = sampleAddOnSets.find(
                        (candidate) => candidate.id === id,
                    );
                    if (set) onAttachAddOns(set.addOnIds);
                }}
            />

            <ItemPickerDialog
                open={addOnPickerOpen}
                onOpenChange={setAddOnPickerOpen}
                title="Attach an add-on"
                description="Pick one from the shared library."
                emptyMessage="Every add-on is already attached."
                options={sampleAddOns
                    .filter((addOn) => !attachedAddOnIds.includes(addOn.id))
                    .map((addOn) => ({
                        id: addOn.id,
                        label: addOn.name,
                        hint: `${formatAmount(addOn.onHand)} ${unitSymbol(addOn.baseUnitId)} in stock`,
                    }))}
                onPick={(id) => onAttachAddOns([id])}
            />
        </section>
    );
}
