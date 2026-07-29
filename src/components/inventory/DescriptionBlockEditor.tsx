"use client";

import {
    ChevronDown,
    ChevronUp,
    Columns2,
    Heading,
    Image as ImageIcon,
    LayoutGrid,
    List,
    Pilcrow,
    Plus,
    Trash2,
} from "lucide-react";

import {
    inventoryControlClassName,
    inventoryTextareaClassName,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DescriptionBlockType } from "@/lib/api/inventory";

export type BlockDraft = {
    id: string;
    type: DescriptionBlockType;
    text: string;
    /** One bullet per line while editing; split on save. */
    items: string;
    url: string;
    caption: string;
    columns: { id: string; blocks: BlockDraft[] }[];
};

const leafTypes = [
    { type: "PARAGRAPH", label: "Paragraph", icon: Pilcrow },
    { type: "HEADING", label: "Heading", icon: Heading },
    { type: "BULLETS", label: "Bullets", icon: List },
    { type: "IMAGE", label: "Image", icon: ImageIcon },
    { type: "SPEC_GRID", label: "Spec grid", icon: LayoutGrid },
] as const;

const allTypes = [
    ...leafTypes,
    { type: "COLUMNS", label: "Two columns", icon: Columns2 },
] as const;

export function createBlockId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function emptyBlock(type: DescriptionBlockType): BlockDraft {
    return {
        id: createBlockId(),
        type,
        text: "",
        items: "",
        url: "",
        caption: "",
        columns:
            type === "COLUMNS"
                ? [
                      { id: createBlockId(), blocks: [] },
                      { id: createBlockId(), blocks: [] },
                  ]
                : [],
    };
}

/**
 * Editor for the storefront description layout. Blocks render in order; a
 * `COLUMNS` block holds two side-by-side stacks and is the only nesting the
 * API allows, so column contents offer leaf types only.
 */
export function DescriptionBlockEditor({
    blocks,
    onChange,
}: {
    blocks: BlockDraft[];
    onChange: (blocks: BlockDraft[]) => void;
}) {
    function updateAt(index: number, patch: Partial<BlockDraft>) {
        onChange(
            blocks.map((block, position) =>
                position === index ? { ...block, ...patch } : block,
            ),
        );
    }

    function move(index: number, delta: number) {
        const target = index + delta;

        if (target < 0 || target >= blocks.length) {
            return;
        }

        const next = [...blocks];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    }

    return (
        <div className="flex flex-col gap-3">
            {blocks.map((block, index) => (
                <div
                    key={block.id}
                    className="rounded-xl border border-[#e8e8e8] bg-white p-4"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-[#1a222b]">
                            <BlockGlyph type={block.type} />
                            {labelFor(block.type)}
                        </span>
                        <div className="flex gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Move block up"
                                disabled={index === 0}
                                onClick={() => move(index, -1)}
                            >
                                <ChevronUp />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Move block down"
                                disabled={index === blocks.length - 1}
                                onClick={() => move(index, 1)}
                            >
                                <ChevronDown />
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon-sm"
                                aria-label="Remove block"
                                onClick={() =>
                                    onChange(
                                        blocks.filter(
                                            (_, position) =>
                                                position !== index,
                                        ),
                                    )
                                }
                            >
                                <Trash2 />
                            </Button>
                        </div>
                    </div>

                    <div className="mt-3">
                        {block.type === "COLUMNS" ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {block.columns.map((column, columnIndex) => (
                                    <ColumnEditor
                                        key={column.id}
                                        column={column}
                                        onChange={(nextBlocks) =>
                                            updateAt(index, {
                                                columns: block.columns.map(
                                                    (item, position) =>
                                                        position ===
                                                        columnIndex
                                                            ? {
                                                                  ...item,
                                                                  blocks: nextBlocks,
                                                              }
                                                            : item,
                                                ),
                                            })
                                        }
                                    />
                                ))}
                            </div>
                        ) : (
                            <BlockFields
                                block={block}
                                onChange={(patch) => updateAt(index, patch)}
                            />
                        )}
                    </div>
                </div>
            ))}

            {blocks.length ? null : (
                <p className="rounded-xl border border-dashed border-[#e8e8e8] px-4 py-6 text-center text-sm text-[#657064]">
                    No description layout yet. Add a block, or leave this empty
                    to fall back to the plain description above.
                </p>
            )}

            <AddBlockRow
                types={allTypes}
                onAdd={(type) => onChange([...blocks, emptyBlock(type)])}
            />
        </div>
    );
}

function ColumnEditor({
    column,
    onChange,
}: {
    column: { id: string; blocks: BlockDraft[] };
    onChange: (blocks: BlockDraft[]) => void;
}) {
    return (
        <div className="flex flex-col gap-2 rounded-xl bg-[#f7f8f7] p-3">
            {column.blocks.map((block, index) => (
                <div
                    key={block.id}
                    className="rounded-lg border border-[#e8e8e8] bg-white p-3"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#657064]">
                            <BlockGlyph type={block.type} />
                            {labelFor(block.type)}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Remove block"
                            onClick={() =>
                                onChange(
                                    column.blocks.filter(
                                        (_, position) => position !== index,
                                    ),
                                )
                            }
                            className="text-[#657064] hover:text-accent"
                        >
                            <Trash2 />
                        </Button>
                    </div>
                    <div className="mt-2">
                        <BlockFields
                            block={block}
                            onChange={(patch) =>
                                onChange(
                                    column.blocks.map((item, position) =>
                                        position === index
                                            ? { ...item, ...patch }
                                            : item,
                                    ),
                                )
                            }
                        />
                    </div>
                </div>
            ))}
            <AddBlockRow
                types={leafTypes}
                compact
                onAdd={(type) =>
                    onChange([...column.blocks, emptyBlock(type)])
                }
            />
        </div>
    );
}

function BlockFields({
    block,
    onChange,
}: {
    block: BlockDraft;
    onChange: (patch: Partial<BlockDraft>) => void;
}) {
    if (block.type === "SPEC_GRID") {
        return (
            <p className="text-xs text-[#6b7280]">
                Renders this item&apos;s specification attributes here. Add
                them in the Attributes section with &ldquo;Show
                as: Specification&rdquo;.
            </p>
        );
    }

    if (block.type === "IMAGE") {
        return (
            <div className="flex flex-col gap-2">
                <Input
                    value={block.url}
                    onChange={(event) => onChange({ url: event.target.value })}
                    placeholder="https://example.com/detail.jpg"
                    aria-label="Image URL"
                    className={inventoryControlClassName}
                />
                <Input
                    value={block.caption}
                    onChange={(event) =>
                        onChange({ caption: event.target.value })
                    }
                    placeholder="Caption (optional)"
                    aria-label="Image caption"
                    className={inventoryControlClassName}
                />
            </div>
        );
    }

    if (block.type === "BULLETS") {
        return (
            <div className="flex flex-col gap-1">
                <Textarea
                    value={block.items}
                    onChange={(event) =>
                        onChange({ items: event.target.value })
                    }
                    placeholder={"A17 Pro chip with 6-core GPU\n48MP Pro camera system"}
                    aria-label="Bullet list"
                    className={inventoryTextareaClassName}
                />
                <p className="text-xs text-[#6b7280]">One bullet per line.</p>
            </div>
        );
    }

    if (block.type === "HEADING") {
        return (
            <Input
                value={block.text}
                onChange={(event) => onChange({ text: event.target.value })}
                placeholder="Why you'll love it"
                aria-label="Heading text"
                className={inventoryControlClassName}
            />
        );
    }

    return (
        <Textarea
            value={block.text}
            onChange={(event) => onChange({ text: event.target.value })}
            placeholder="Crafted from high-quality materials…"
            aria-label="Paragraph text"
            className={inventoryTextareaClassName}
        />
    );
}

function AddBlockRow({
    types,
    onAdd,
    compact,
}: {
    types: readonly { type: string; label: string }[];
    onAdd: (type: DescriptionBlockType) => void;
    compact?: boolean;
}) {
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {compact ? null : (
                <Label className="mr-1 text-xs text-[#6b7280]">
                    Add block
                </Label>
            )}
            {types.map((entry) => (
                <Button
                    key={entry.type}
                    type="button"
                    variant="outline"
                    size={compact ? "xs" : "sm"}
                    onClick={() => onAdd(entry.type as DescriptionBlockType)}
                >
                    <Plus />
                    {entry.label}
                </Button>
            ))}
        </div>
    );
}

function BlockGlyph({ type }: { type: DescriptionBlockType }) {
    const entry = allTypes.find((item) => item.type === type);
    const Glyph = entry ? entry.icon : Pilcrow;

    return <Glyph className="size-3.5" />;
}

function labelFor(type: DescriptionBlockType) {
    return allTypes.find((item) => item.type === type)?.label || type;
}
