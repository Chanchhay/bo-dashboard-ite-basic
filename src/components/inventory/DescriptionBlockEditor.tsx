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
    getApiErrorMessage,
    inventoryControlClassName,
    inventoryTextareaClassName,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import {
    ImagePicker,
    useObjectUrls,
} from "@/components/ui/image-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
    blockImageRules,
    type DescriptionBlockType,
} from "@/lib/api/inventory";
import {
    useDeleteAssetMutation,
    useUploadAssetMutation,
} from "@/services/assetApi";

export type BlockDraft = {
    id: string;
    type: DescriptionBlockType;
    text: string;
    /** One bullet per line while editing; split on save. */
    items: string;
    /** The stored image, once its upload has come back. */
    url: string;
    caption: string;
    columns: { id: string; blocks: BlockDraft[] }[];
    // Transient, never sent: the picture is uploaded on pick, and these carry
    // the local preview and outcome until `url` is filled in.
    previewUrl?: string;
    uploading?: boolean;
    uploadError?: string;
    /** The storage key of a picture uploaded here, so it can be cleaned up. */
    assetKey?: string;
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
    // Patched by id, not position: a block image finishes uploading after the
    // pick, and by then the block may have moved or a sibling may be gone.
    function update(id: string, patch: Partial<BlockDraft>) {
        onChange(
            blocks.map((block) =>
                block.id === id ? { ...block, ...patch } : block,
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
                                            update(block.id, {
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
                                onChange={(patch) => update(block.id, patch)}
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
                            className="text-[#657064] hover:text-brand-red"
                        >
                            <Trash2 />
                        </Button>
                    </div>
                    <div className="mt-2">
                        <BlockFields
                            block={block}
                            onChange={(patch) =>
                                onChange(
                                    column.blocks.map((item) =>
                                        item.id === block.id
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
                <BlockImageField block={block} onChange={onChange} />
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

/**
 * The picture inside a description block. It uploads the moment it is picked —
 * the block stores a URL, so there is nothing to send with the item save — and
 * shows the local file until that URL comes back.
 */
function BlockImageField({
    block,
    onChange,
}: {
    block: BlockDraft;
    onChange: (patch: Partial<BlockDraft>) => void;
}) {
    const [uploadAsset] = useUploadAssetMutation();
    const [deleteAsset] = useDeleteAssetMutation();
    const { create, release } = useObjectUrls();
    const { toast } = useToast();
    const preview = block.previewUrl || block.url;

    /**
     * Drops a picture this editor uploaded and the block no longer points at.
     * Only pictures picked in this session have a key to delete; ones loaded
     * with the item are left to the server, since the block may not be saved.
     */
    function discardUploaded(key: string | undefined) {
        if (key) {
            void deleteAsset(key);
        }
    }

    async function handlePick(file: File) {
        release(block.previewUrl);
        const replaced = block.assetKey;
        const previewUrl = create(file);
        onChange({ previewUrl, uploading: true, uploadError: undefined });

        try {
            const asset = await uploadAsset(file).unwrap();

            if (!asset.url) {
                throw new Error("The upload returned no URL.");
            }

            onChange({
                url: asset.url,
                assetKey: asset.key,
                previewUrl: undefined,
                uploading: false,
            });
            release(previewUrl);
            discardUploaded(replaced);
            toast({
                tone: "success",
                title: "Description image uploaded",
            });
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                "Unable to upload that image.",
            );
            release(previewUrl);
            onChange({
                previewUrl: undefined,
                uploading: false,
                uploadError: message,
            });
            toast({
                tone: "error",
                title: "Description image not uploaded",
                description: message,
            });
        }
    }

    function handleRemove() {
        release(block.previewUrl);
        discardUploaded(block.assetKey);
        onChange({
            url: "",
            assetKey: undefined,
            previewUrl: undefined,
            uploading: false,
            uploadError: undefined,
        });
    }

    return (
        <ImagePicker
            rules={blockImageRules}
            disabled={block.uploading}
            busy={block.uploading}
            error={block.uploadError}
            label={block.url ? "Replace image" : "Block image"}
            onPick={handlePick}
            onError={(message) => {
                onChange({ uploadError: message });
                toast({
                    tone: "error",
                    title: "Description image not selected",
                    description: message,
                });
            }}
            preview={
                <span className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg bg-[#f0f1f0]">
                    {preview ? (
                        // Uploaded images come back as URLs; a pick previews as
                        // a blob until then.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={preview}
                            alt=""
                            className="size-full object-cover"
                        />
                    ) : (
                        <ImageIcon
                            className="size-6 text-[#a3aca1]"
                            aria-hidden="true"
                        />
                    )}
                </span>
            }
            actions={
                block.url ? (
                    <Button
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={handleRemove}
                        className="h-auto px-0 text-xs text-[#6b7280]"
                    >
                        Remove image
                    </Button>
                ) : null
            }
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
