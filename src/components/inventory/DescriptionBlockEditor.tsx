"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Columns2,
  Heading,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Pencil,
  Pilcrow,
  Plus,
  Trash2,
} from "lucide-react";

import {
  charCountInputClassName,
  charCountTextareaClassName,
  CharCountField,
} from "@/components/inventory/CharLimit";
import {
  inventoryControlClassName,
  inventoryTextareaClassName,
} from "@/components/inventory/InventoryUi";
import { attributeIcon, attributeIconKeys } from "@/lib/api/attribute-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePicker, useObjectUrls } from "@/components/ui/image-picker";

type PreviewUrls = {
  create: (file: File) => string;
  release: (url?: string) => void;
};
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  blockImageRules,
  itemLimits,
  type DescriptionBlockType,
} from "@/lib/api/inventory";
import { cn } from "@/lib/utils";

export type BlockDraft = {
  id: string;
  type: DescriptionBlockType;
  text: string;
  items: string;
  url: string;
  caption: string;
  columns: { id: string; blocks: BlockDraft[] }[];
  /** Held until the item is saved — block images upload with the form. */
  file?: File;
  previewUrl?: string;
};

/**
 * One row of the spec grid. Stored as an attribute with placement
 * SPECIFICATION, but authored here — the caller does that translation.
 */
export type SpecDraft = {
  id: string;
  name: string;
  value: string;
  icon: string;
};

export function emptySpec(id: string): SpecDraft {
  return { id, name: "", value: "", icon: "" };
}

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

/** Bullets live as one textarea, so the per-line caps are applied as it is typed. */
function clampBullets(value: string) {
  return value
    .split("\n")
    .slice(0, itemLimits.bullets)
    .map((line) => line.slice(0, itemLimits.bulletText))
    .join("\n");
}

function countBullets(value: string) {
  return value.split("\n").filter((line) => line.trim()).length;
}

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
/** A block the shopper would see nothing of — dropped if it is abandoned. */
function isBlockEmpty(block: BlockDraft, specCount: number): boolean {
  if (block.type === "SPEC_GRID") return specCount === 0;
  if (block.type === "COLUMNS") {
    return block.columns.every((column) => !column.blocks.length);
  }
  if (block.type === "BULLETS") return !countBullets(block.items);
  if (block.type === "IMAGE") return !block.url && !block.file && !block.previewUrl;

  return !block.text.trim();
}

/**
 * Drops every block a shopper would see nothing of. An empty block can never
 * be saved — the schema rejects it — so leaving one behind only produces a
 * validation error later, pointing at a block the user thought they abandoned.
 */
function countBlocks(blocks: BlockDraft[]): number {
  return blocks.reduce(
    (total, block) =>
      total +
      1 +
      block.columns.reduce(
        (nested, column) => nested + countBlocks(column.blocks),
        0,
      ),
    0,
  );
}

function pruneEmpty(blocks: BlockDraft[], specCount: number): BlockDraft[] {
  return blocks
    .map((block) => ({
      ...block,
      columns: block.columns.map((column) => ({
        ...column,
        blocks: pruneEmpty(column.blocks, specCount),
      })),
    }))
    .filter((block) => !isBlockEmpty(block, specCount));
}

/** The one-line preview shown on a collapsed row. */
function blockSummary(block: BlockDraft, specCount: number): string {
  if (block.type === "SPEC_GRID") {
    return specCount
      ? `${specCount} ${specCount === 1 ? "specification" : "specifications"}`
      : "No specifications yet";
  }

  if (block.type === "COLUMNS") {
    const count = block.columns.reduce(
      (total, column) => total + column.blocks.length,
      0,
    );

    return count
      ? `${count} ${count === 1 ? "block" : "blocks"} across two columns`
      : "Empty — add blocks to each column";
  }

  if (block.type === "BULLETS") {
    const count = countBullets(block.items);

    return count
      ? `${count} ${count === 1 ? "bullet" : "bullets"}`
      : "No bullets yet";
  }

  if (block.type === "IMAGE") {
    if (!block.url && !block.file) return "No image yet";

    const label = block.caption.trim() || "Image added";

    return block.file ? `${label} — not saved yet` : label;
  }

  return block.text.trim() || "Empty";
}

export function DescriptionBlockEditor({
  blocks,
  onChange,
  specs,
  onSpecsChange,
  specsFull,
}: {
  blocks: BlockDraft[];
  onChange: (blocks: BlockDraft[]) => void;
  /** Shared by every spec grid block on the item. */
  specs: SpecDraft[];
  onSpecsChange: (specs: SpecDraft[]) => void;
  /** Specs are attributes too, so the ceiling counts both. */
  specsFull: boolean;
}) {
  const { toast } = useToast();
  const previewUrls = useObjectUrls();
  const [openId, setOpenId] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);

  const open = blocks.find((block) => block.id === openId);
  const namedSpecs = specs.filter((spec) => spec.name.trim()).length;

  function update(id: string, patch: Partial<BlockDraft>) {
    onChange(
      blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    );
  }

  function move(index: number, delta: number) {
    const target = index + delta;

    if (target < 0 || target >= blocks.length) {
      return;
    }

    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];

    for (let i = 0; i < next.length - 1; i++) {
      if (isRestrictedConsecutive(next[i].type, next[i + 1].type)) {
        toast({
          tone: "error",
          title: "Cannot move block",
          description: `${labelFor(next[i].type)} blocks cannot be placed in continuous order.`,
        });
        return;
      }
    }

    onChange(next);
  }

  function remove(id: string) {
    onChange(blocks.filter((block) => block.id !== id));
  }

  function add(type: DescriptionBlockType) {
    const block = emptyBlock(type);
    onChange([...blocks, block]);

    setSeed((current) => current + 1);
    setOpenId(block.id);
  }

  function edit(id: string) {
    setSeed((current) => current + 1);
    setOpenId(id);
  }

  /** An abandoned new block would only fail validation later, so drop it. */
  function close() {
    const pruned = pruneEmpty(blocks, namedSpecs);

    if (countBlocks(pruned) !== countBlocks(blocks)) {
      onChange(pruned);
    }

    setOpenId(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.length ? (
        <ul className="flex flex-col gap-2">
          {blocks.map((block, index) => (
            <li
              key={block.id}
              className="flex items-center gap-1 rounded-xl border border-[#e8e8e8] dark:border-[#2a3042] bg-white dark:bg-[#1a1e29] p-3"
            >
              <button
                type="button"
                onClick={() => edit(block.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <BlockGlyph type={block.type} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#1a222b] dark:text-[#f8fafc]">
                    {labelFor(block.type)}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[#657064] dark:text-[#94a3b8]">
                    {blockSummary(block, namedSpecs)}
                  </span>
                </span>
              </button>

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
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${labelFor(block.type)}`}
                onClick={() => edit(block.id)}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove block"
                onClick={() => remove(block.id)}
              >
                <Trash2 className="size-4 text-brand-red" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-[#e8e8e8] dark:border-[#2a3042] px-4 py-6 text-center text-sm text-[#657064] dark:text-[#94a3b8]">
          No description layout yet. Add a block, or leave this empty to fall
          back to the plain description above.
        </p>
      )}

      <AddBlockRow
        types={allTypes}
        lastType={blocks[blocks.length - 1]?.type}
        full={blocks.length >= itemLimits.blocks}
        fullNote={`${itemLimits.blocks} blocks is the maximum.`}
        onAdd={add}
      />

      <Dialog
        open={Boolean(open)}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogContent className="max-w-lg">
          {open ? (
            <BlockDialogBody
              key={`${open.id}-${seed}`}
              block={open}
              specs={specs}
              onSpecsChange={onSpecsChange}
              specsFull={specsFull}
              previewUrls={previewUrls}
              onChange={(patch) => update(open.id, patch)}
              onClose={close}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BlockDialogBody({
  block,
  specs,
  onSpecsChange,
  specsFull,
  previewUrls,
  onChange,
  onClose,
}: {
  block: BlockDraft;
  specs: SpecDraft[];
  onSpecsChange: (specs: SpecDraft[]) => void;
  specsFull: boolean;
  previewUrls: PreviewUrls;
  onChange: (patch: Partial<BlockDraft>) => void;
  onClose: () => void;
}) {
  /** Which nested block the columns view has drilled into, if any. */
  const [drill, setDrill] = useState<{
    columnIndex: number;
    blockId: string;
  } | null>(null);
  /**
   * Kept apart from `drill` so neither view is unmounted while it is being
   * clicked — a detached node fails the dialog's outside-press check and
   * dismisses the whole thing. Going back only hides the drill view.
   */
  const [showDrill, setShowDrill] = useState(false);
  /**
   * A block dropped for being left empty, held only so the drill view can go
   * on rendering it while it slides out of view.
   */
  const [parked, setParked] = useState<{
    columnIndex: number;
    block: BlockDraft;
  } | null>(null);

  function openDrill(target: { columnIndex: number; blockId: string }) {
    setDrill(target);
    setParked(null);
    setShowDrill(true);
  }

  const namedSpecs = specs.filter((spec) => spec.name.trim()).length;

  function updateColumn(columnIndex: number, blocks: BlockDraft[]) {
    onChange({
      columns: block.columns.map((column, position) =>
        position === columnIndex ? { ...column, blocks } : column,
      ),
    });
  }

  if (block.type !== "COLUMNS") {
    return (
      <div className="flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle>{labelFor(block.type)}</DialogTitle>
          <DialogDescription>{describeType(block.type)}</DialogDescription>
        </DialogHeader>

        <BlockFields
          block={block}
          specs={specs}
          onSpecsChange={onSpecsChange}
          specsFull={specsFull}
          previewUrls={previewUrls}
          onChange={onChange}
        />

        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </div>
    );
  }

  const nested = drill
    ? block.columns[drill.columnIndex]?.blocks.find(
        (item) => item.id === drill.blockId,
      )
    : undefined;

  const shown =
    drill && nested
      ? { columnIndex: drill.columnIndex, block: nested }
      : parked;

  /**
   * Leaves the nested block behind only if there is something in it. The
   * dropped block is parked rather than forgotten, so this view stays mounted
   * — tearing out the Back button mid-click reads to the dialog as an outside
   * press, and would dismiss the whole thing.
   */
  function closeDrill() {
    setShowDrill(false);

    if (!drill || !nested || !isBlockEmpty(nested, namedSpecs)) {
      return;
    }

    setParked({ columnIndex: drill.columnIndex, block: nested });
    updateColumn(
      drill.columnIndex,
      (block.columns[drill.columnIndex]?.blocks || []).filter(
        (item) => item.id !== nested.id,
      ),
    );
  }

  return (
    <>
      <div hidden={showDrill && Boolean(shown)}>
        <div className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Two columns</DialogTitle>
            <DialogDescription>
              Blocks laid side by side. Pick one to edit its content.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            {block.columns.map((column, columnIndex) => (
              <div
                key={column.id}
                className="flex flex-col gap-2 rounded-xl bg-[#f7f8f7] dark:bg-[#151821] p-3"
              >
                <p className="text-xs font-semibold text-[#657064] dark:text-[#94a3b8]">
                  Column {columnIndex + 1}
                </p>

                {column.blocks.map((nestedBlock) => (
                  <div
                    key={nestedBlock.id}
                    className="flex items-center gap-1 rounded-lg border border-[#e8e8e8] dark:border-[#2a3042] bg-white dark:bg-[#1a1e29] p-2"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openDrill({
                          columnIndex,
                          blockId: nestedBlock.id,
                        })
                      }
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <BlockGlyph type={nestedBlock.type} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-[#1a222b] dark:text-[#f8fafc]">
                          {labelFor(nestedBlock.type)}
                        </span>
                        <span className="block truncate text-[11px] text-[#657064] dark:text-[#94a3b8]">
                          {blockSummary(nestedBlock, namedSpecs)}
                        </span>
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove ${labelFor(nestedBlock.type)} from column ${columnIndex + 1}`}
                      onClick={() =>
                        updateColumn(
                          columnIndex,
                          column.blocks.filter(
                            (item) => item.id !== nestedBlock.id,
                          ),
                        )
                      }
                      className="shrink-0 text-[#657064] dark:text-[#94a3b8] hover:text-danger"
                    >
                      <Trash2 className="size-3.5 text-brand-red" />
                    </Button>
                  </div>
                ))}

                <AddBlockRow
                  types={leafTypes}
                  lastType={column.blocks[column.blocks.length - 1]?.type}
                  compact
                  full={column.blocks.length >= itemLimits.columnBlocks}
                  fullNote={`${itemLimits.columnBlocks} blocks is the maximum for a column.`}
                  onAdd={(type) => {
                    const added = emptyBlock(type);
                    updateColumn(columnIndex, [...column.blocks, added]);

                    openDrill({
                      columnIndex,
                      blockId: added.id,
                    });
                  }}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </DialogFooter>
        </div>
      </div>
      {shown ? (
        <div hidden={!showDrill}>
          <div className="flex flex-col gap-5">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Back to both columns"
                  onClick={closeDrill}
                >
                  <ArrowLeft />
                </Button>
                <DialogTitle>{labelFor(shown.block.type)}</DialogTitle>
              </div>
              <DialogDescription>
                In column {shown.columnIndex + 1} of this row.
              </DialogDescription>
            </DialogHeader>

            <BlockFields
              block={shown.block}
              specs={specs}
              onSpecsChange={onSpecsChange}
              specsFull={specsFull}
              previewUrls={previewUrls}
              onChange={(patch) =>
                updateColumn(
                  shown.columnIndex,
                  (block.columns[shown.columnIndex]?.blocks || []).map(
                    (item) =>
                      item.id === shown.block.id ? { ...item, ...patch } : item,
                  ),
                )
              }
            />

            <DialogFooter>
              <Button type="button" onClick={closeDrill}>
                Back
              </Button>
            </DialogFooter>
          </div>
        </div>
      ) : null}
    </>
  );
}

function describeType(type: DescriptionBlockType) {
  if (type === "SPEC_GRID") {
    return "A grid of facts about this item — every spec grid block on the item shows the same list.";
  }
  if (type === "HEADING") return "A short title above the blocks that follow.";
  if (type === "BULLETS") return "One short point per line.";
  if (type === "IMAGE") return "A picture, with an optional caption under it.";

  return "A paragraph of the store page.";
}

function BlockFields({
  block,
  specs,
  onSpecsChange,
  specsFull,
  previewUrls,
  onChange,
}: {
  block: BlockDraft;
  specs: SpecDraft[];
  onSpecsChange: (specs: SpecDraft[]) => void;
  specsFull: boolean;
  previewUrls: PreviewUrls;
  onChange: (patch: Partial<BlockDraft>) => void;
}) {
  if (block.type === "SPEC_GRID") {
    return (
      <SpecGridFields specs={specs} full={specsFull} onChange={onSpecsChange} />
    );
  }

  if (block.type === "IMAGE") {
    return (
      <div className="flex flex-col gap-2">
        <BlockImageField
          block={block}
          previewUrls={previewUrls}
          onChange={onChange}
        />
        <CharCountField length={block.caption.length} max={itemLimits.caption}>
          <Input
            value={block.caption}
            maxLength={itemLimits.caption}
            onChange={(event) => onChange({ caption: event.target.value })}
            placeholder="Caption (optional)"
            aria-label="Image caption"
            className={`${inventoryControlClassName} ${charCountInputClassName}`}
          />
        </CharCountField>
      </div>
    );
  }

  if (block.type === "BULLETS") {
    return (
      <div className="flex flex-col gap-1">
        <Textarea
          value={block.items}
          onChange={(event) =>
            onChange({ items: clampBullets(event.target.value) })
          }
          placeholder={"A17 Pro chip with 6-core GPU\n48MP Pro camera system"}
          aria-label="Bullet list"
          className={inventoryTextareaClassName}
        />
        <p className="text-xs text-[#6b7280] dark:text-[#94a3b8]">
          One bullet per line — {countBullets(block.items)} of{" "}
          {itemLimits.bullets}, up to {itemLimits.bulletText} characters each.
        </p>
      </div>
    );
  }

  if (block.type === "HEADING") {
    return (
      <CharCountField length={block.text.length} max={itemLimits.headingText}>
        <Input
          value={block.text}
          maxLength={itemLimits.headingText}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="Why you'll love it"
          aria-label="Heading text"
          className={`${inventoryControlClassName} ${charCountInputClassName}`}
        />
      </CharCountField>
    );
  }

  return (
    <CharCountField
      length={block.text.length}
      max={itemLimits.blockText}
      variant="textarea"
    >
      <Textarea
        value={block.text}
        maxLength={itemLimits.blockText}
        onChange={(event) => onChange({ text: event.target.value })}
        placeholder="Crafted from high-quality materials…"
        aria-label="Paragraph text"
        className={`${inventoryTextareaClassName} ${charCountTextareaClassName}`}
      />
    </CharCountField>
  );
}

function SpecGridFields({
  specs,
  full,
  onChange,
}: {
  specs: SpecDraft[];
  full: boolean;
  onChange: (specs: SpecDraft[]) => void;
}) {
  const [iconFor, setIconFor] = useState<string | null>(null);

  function update(id: string, patch: Partial<SpecDraft>) {
    onChange(
      specs.map((spec) => (spec.id === id ? { ...spec, ...patch } : spec)),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {specs.length ? (
        <ul className="flex flex-col gap-2">
          {specs.map((spec, index) => {
            const Glyph = attributeIcon(spec.icon);

            return (
              <li
                key={spec.id}
                className="flex flex-col gap-2 rounded-lg border border-[#e8e8e8] dark:border-[#2a3042] p-2"
              >
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Icon for specification ${index + 1}`}
                    title="Pick an icon"
                    onClick={() =>
                      setIconFor(iconFor === spec.id ? null : spec.id)
                    }
                    className={cn("shrink-0", spec.icon && "text-primary")}
                  >
                    <Glyph className="size-4" />
                  </Button>
                  <Input
                    value={spec.name}
                    maxLength={itemLimits.attributeName}
                    onChange={(event) =>
                      update(spec.id, {
                        name: event.target.value,
                      })
                    }
                    placeholder="Display"
                    aria-label={`Specification ${index + 1} name`}
                    className={`${inventoryControlClassName} h-10 min-w-0 flex-1`}
                  />
                  <Input
                    value={spec.value}
                    maxLength={itemLimits.attributeValue}
                    onChange={(event) =>
                      update(spec.id, {
                        value: event.target.value,
                      })
                    }
                    placeholder={'6.7" Super Retina XDR'}
                    aria-label={`Specification ${index + 1} value`}
                    className={`${inventoryControlClassName} h-10 min-w-0 flex-1`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove specification ${index + 1}`}
                    onClick={() =>
                      onChange(specs.filter((row) => row.id !== spec.id))
                    }
                    className="shrink-0"
                  >
                    <Trash2 className="size-4 text-brand-red" />
                  </Button>
                </div>

                {iconFor === spec.id ? (
                  <div className="flex flex-wrap gap-1.5">
                    {attributeIconKeys.map((key) => {
                      const Option = attributeIcon(key);

                      return (
                        <button
                          key={key}
                          type="button"
                          title={key}
                          aria-label={key}
                          aria-pressed={spec.icon === key}
                          onClick={() =>
                            update(spec.id, {
                              icon: spec.icon === key ? "" : key,
                            })
                          }
                          className={cn(
                            "grid size-8 place-items-center rounded-lg border transition-colors",
                            spec.icon === key
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-[#e8e8e8] dark:border-[#2a3042] text-[#657064] dark:text-[#cbd5e1] hover:border-[#cfd6cc] dark:hover:border-[#384252]",
                          )}
                        >
                          <Option className="size-4" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-[#e8e8e8] dark:border-[#2a3042] px-4 py-5 text-center text-xs text-[#657064] dark:text-[#94a3b8]">
          No specifications yet. Add one — a name and its value, such as Display
          and 6.7&Prime; Super Retina XDR.
        </p>
      )}

      <div className="flex flex-col items-start gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={full}
          onClick={() => onChange([...specs, emptySpec(createBlockId())])}
        >
          <Plus />
          Add specification
        </Button>
        {full ? (
          <p className="text-xs text-[#6b7280] dark:text-[#94a3b8]">
            {itemLimits.attributes} specifications is the maximum.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BlockImageField({
  block,
  previewUrls,
  onChange,
}: {
  block: BlockDraft;
  previewUrls: PreviewUrls;
  onChange: (patch: Partial<BlockDraft>) => void;
}) {
  const { create, release } = previewUrls;
  const { toast } = useToast();
  const preview = block.previewUrl || block.url;

  function handlePick(file: File) {
    const message = blockImageRules.validate(file);

    if (message) {
      toast({
        tone: "error",
        title: "Description image not selected",
        description: message,
      });
      return;
    }

    release(block.previewUrl);
    onChange({ file, previewUrl: create(file), url: "" });
  }

  function handleRemove() {
    release(block.previewUrl);
    onChange({ file: undefined, previewUrl: undefined, url: "" });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ImagePicker
        rules={blockImageRules}
        label={block.url || block.file ? "Replace image" : "Block image"}
        onPick={handlePick}
        onError={(message) => {
          toast({
            tone: "error",
            title: "Description image not selected",
            description: message,
          });
        }}
        preview={
          <span className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg bg-[#f0f1f0] dark:bg-[#252a38]">
            {preview ? (
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon
                className="size-6 text-[#a3aca1] dark:text-[#64748b]"
                aria-hidden="true"
              />
            )}
          </span>
        }
        actions={
          block.url || block.file ? (
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={handleRemove}
              className="h-auto px-0 text-xs text-[#6b7280] dark:text-[#94a3b8]"
            >
              Remove image
            </Button>
          ) : null
        }
      />
      {block.file ? (
        <p className="text-xs text-[#6b7280] dark:text-[#94a3b8]">
          Uploaded when this item is saved, not before.
        </p>
      ) : null}
    </div>
  );
}

function isRestrictedConsecutive(t1?: string, t2?: string) {
  if (!t1 || !t2) return false;
  if (t1 === "IMAGE" || t1 === "COLUMNS") return false;
  return t1 === t2;
}

function AddBlockRow({
  types,
  lastType,
  onAdd,
  compact,
  full,
  fullNote,
}: {
  types: readonly { type: string; label: string }[];
  lastType?: DescriptionBlockType;
  onAdd: (type: DescriptionBlockType) => void;
  compact?: boolean;
  full?: boolean;
  fullNote?: string;
}) {
  const isLastTypeRestricted =
    Boolean(lastType) && lastType !== "IMAGE" && lastType !== "COLUMNS";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {compact ? null : (
          <Label className="mr-1 text-xs text-[#6b7280] dark:text-[#94a3b8]">
            Add block
          </Label>
        )}
        {types.map((entry) => {
          const isConsecutiveRestricted = isRestrictedConsecutive(
            entry.type,
            lastType,
          );
          const disabled = full || isConsecutiveRestricted;

          return (
            <Button
              key={entry.type}
              type="button"
              variant="outline"
              size={compact ? "xs" : "sm"}
              disabled={disabled}
              title={
                isConsecutiveRestricted
                  ? `${entry.label} blocks cannot be added in continuous order.`
                  : undefined
              }
              onClick={() => onAdd(entry.type as DescriptionBlockType)}
            >
              <Plus />
              {entry.label}
            </Button>
          );
        })}
      </div>
      {full && fullNote ? (
        <p className="text-xs text-[#6b7280] dark:text-[#94a3b8]">{fullNote}</p>
      ) : isLastTypeRestricted && lastType ? (
        <p className="text-xs font-medium text-warning">
          {labelFor(lastType)} blocks cannot be added in continuous order.
          Choose another block type.
        </p>
      ) : null}
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
