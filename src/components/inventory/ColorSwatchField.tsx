"use client";

import { useState } from "react";
import { Check, Palette, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * A starting palette, so setting up a colour is picking one rather than
 * knowing what `#3a3a3c` looks like.
 *
 * These hex codes are product data, not styling — they are the colours a shop
 * sells things in, and they have to render the same in either theme. That is
 * why they are literal here and not semantic tokens.
 */
export const SWATCH_PALETTE: { name: string; hex: string }[] = [
    { name: "Black", hex: "#1c1c1e" },
    { name: "Charcoal", hex: "#3a3a3c" },
    { name: "Grey", hex: "#8e8e93" },
    { name: "Silver", hex: "#d9d9d9" },
    { name: "White", hex: "#ffffff" },
    { name: "Cream", hex: "#ede8e0" },
    { name: "Beige", hex: "#d8c9b0" },
    { name: "Brown", hex: "#8b5e3c" },
    { name: "Red", hex: "#d14341" },
    { name: "Rust", hex: "#b5533f" },
    { name: "Orange", hex: "#e8833a" },
    { name: "Yellow", hex: "#e8c33a" },
    { name: "Olive", hex: "#7d8b3a" },
    { name: "Green", hex: "#00932a" },
    { name: "Teal", hex: "#2aa9a0" },
    { name: "Sky", hex: "#4cc9e8" },
    { name: "Blue", hex: "#2f6fdb" },
    { name: "Navy", hex: "#1f3a67" },
    { name: "Purple", hex: "#7b52c9" },
    { name: "Pink", hex: "#e88bb0" },
];

/** The palette name for a hex, so a picked swatch can label itself. */
export function paletteNameFor(hex?: string): string | undefined {
    if (!hex) return undefined;
    const match = SWATCH_PALETTE.find(
        (swatch) => swatch.hex.toLowerCase() === hex.trim().toLowerCase(),
    );
    return match?.name;
}

/**
 * The colour on a row, as a single swatch that opens the picker.
 *
 * Twenty circles and a hex readout inline is most of a row's width spent on a
 * field most rows leave empty — a size has no colour. So the row shows the one
 * thing worth seeing at a glance, which is the colour itself, and the choosing
 * happens in a dialog where there is room for it.
 */
export function ColorSwatchButton({
    value,
    colorName,
    onChange,
    label = "Colour",
}: {
    value: string;
    /** What the shop calls it — shown beside the swatch on the storefront. */
    colorName: string;
    onChange: (patch: { colorHex?: string; colorName?: string }) => void;
    label?: string;
}) {
    const [open, setOpen] = useState(false);
    const name = colorName.trim() || paletteNameFor(value);

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={value ? `${label}: ${name || value}` : `Pick a ${label.toLowerCase()}`}
                className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl border transition-colors",
                    value
                        ? "border-border"
                        : "border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary",
                )}
                style={value ? { background: value } : undefined}
            >
                {value ? null : <Palette className="size-4" />}
            </button>

            <div className="min-w-0">
                <p className="truncate text-sm text-foreground">
                    {value ? name || value : "No colour"}
                </p>
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="text-xs text-primary hover:underline"
                >
                    {value ? "Change" : "Pick a colour"}
                </button>
            </div>

            {value ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Clear ${label.toLowerCase()}`}
                    onClick={() => onChange({ colorHex: "", colorName: "" })}
                >
                    <X className="size-4" />
                </Button>
            ) : null}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{label}</DialogTitle>
                        <DialogDescription>
                            Pick one, or mix your own. Leave it unset on an
                            option that is not a colour.
                        </DialogDescription>
                    </DialogHeader>

                    <ColorSwatchField
                        value={value}
                        onChange={(hex) => onChange({ colorHex: hex })}
                        onPickName={(picked) =>
                            // The palette's own name, unless the shop already
                            // typed one of its own — "Gunmetal" beats "Charcoal".
                            colorName.trim()
                                ? undefined
                                : onChange({ colorName: picked })
                        }
                        label={label}
                    />

                    {/*
                     * Named, not just coloured. The storefront prints this
                     * beside the swatches — "Color: Brown" — and no lookup
                     * table knows what a shop calls its own colours.
                     */}
                    <div className="flex flex-col gap-1.5">
                        <Label
                            htmlFor="colour-name"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Name shown to shoppers
                        </Label>
                        <Input
                            id="colour-name"
                            value={colorName}
                            onChange={(event) =>
                                onChange({ colorName: event.target.value })
                            }
                            placeholder={paletteNameFor(value) || "Brown"}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" onClick={() => setOpen(false)}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/**
 * Pick a colour, or mix one.
 *
 * The palette covers what a shop actually sells in and names each colour, so
 * the common case is one click and the value arrives spelled correctly. The
 * native picker stays for everything else — a brand colour is nobody's idea of
 * a common case, and a palette that cannot express it would be a cage.
 */
export function ColorSwatchField({
    value,
    onChange,
    onPickName,
    label = "Colour",
}: {
    value: string;
    onChange: (hex: string) => void;
    /**
     * Called with the palette's name for the picked swatch. Lets a caller fill
     * an empty name field from the choice — typing "Red" after clicking the red
     * circle is work the screen can do itself.
     */
    onPickName?: (name: string) => void;
    label?: string;
}) {
    const current = value.trim().toLowerCase();

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
                {SWATCH_PALETTE.map((swatch) => {
                    const active = swatch.hex.toLowerCase() === current;

                    return (
                        <button
                            key={swatch.hex}
                            type="button"
                            title={swatch.name}
                            aria-label={swatch.name}
                            aria-pressed={active}
                            onClick={() => {
                                onChange(swatch.hex);
                                onPickName?.(swatch.name);
                            }}
                            className={cn(
                                "grid size-7 place-items-center rounded-full border transition-transform",
                                active
                                    ? "border-primary ring-2 ring-primary/40 scale-110"
                                    : "border-border hover:scale-110",
                            )}
                            style={{ background: swatch.hex }}
                        >
                            {active ? (
                                // Against white and cream a white tick vanishes,
                                // so the mark takes the darker ink there.
                                <Check
                                    className={cn(
                                        "size-3.5",
                                        isLight(swatch.hex)
                                            ? "text-foreground"
                                            : "text-white",
                                    )}
                                />
                            ) : null}
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#00932a"}
                    onChange={(event) => onChange(event.target.value)}
                    aria-label={`${label}: pick a custom colour`}
                    className="size-9 shrink-0 cursor-pointer rounded-lg border border-border bg-card p-1"
                />
                <span className="font-mono text-xs text-muted-foreground">
                    {value.trim() || "No colour picked"}
                </span>
            </div>
        </div>
    );
}

/** Rough perceived brightness, only ever used to choose tick ink. */
function isLight(hex: string): boolean {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return false;

    const red = parseInt(clean.slice(0, 2), 16);
    const green = parseInt(clean.slice(2, 4), 16);
    const blue = parseInt(clean.slice(4, 6), 16);

    return (red * 299 + green * 587 + blue * 114) / 1000 > 160;
}
