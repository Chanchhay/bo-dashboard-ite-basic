"use client";

import { useState, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Pipette, ChevronDown } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLOR_NAMES: { name: string; hex: string }[] = [
    { name: "Black", hex: "#1c1c1e" },
    { name: "Charcoal", hex: "#3a3a3c" },
    { name: "Dark Grey", hex: "#555555" },
    { name: "Grey", hex: "#8e8e93" },
    { name: "Silver", hex: "#d9d9d9" },
    { name: "White", hex: "#ffffff" },
    { name: "Cream", hex: "#ede8e0" },
    { name: "Beige", hex: "#d8c9b0" },
    { name: "Tan", hex: "#d2b48c" },
    { name: "Brown", hex: "#8b5e3c" },
    { name: "Maroon", hex: "#800000" },
    { name: "Red", hex: "#d14341" },
    { name: "Bright Red", hex: "#ff0000" },
    { name: "Rust", hex: "#b5533f" },
    { name: "Coral", hex: "#ff7f50" },
    { name: "Orange", hex: "#e8833a" },
    { name: "Gold", hex: "#ffd700" },
    { name: "Yellow", hex: "#e8c33a" },
    { name: "Lime", hex: "#00ff00" },
    { name: "Olive", hex: "#7d8b3a" },
    { name: "Green", hex: "#00932a" },
    { name: "Dark Green", hex: "#006400" },
    { name: "Teal", hex: "#2aa9a0" },
    { name: "Cyan", hex: "#00ffff" },
    { name: "Sky Blue", hex: "#4cc9e8" },
    { name: "Blue", hex: "#2f6fdb" },
    { name: "Navy", hex: "#1f3a67" },
    { name: "Indigo", hex: "#4b0082" },
    { name: "Purple", hex: "#7b52c9" },
    { name: "Magenta", hex: "#ff00ff" },
    { name: "Pink", hex: "#e88bb0" },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const clean = hex.replace("#", "");
    if (clean.length !== 6 && clean.length !== 8) return null;
    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16),
    };
}

function parseRgbString(str: string): { r: number; g: number; b: number } | null {
    const matches = str.match(/\d+/g);
    if (!matches || matches.length < 3) return null;

    const r = parseInt(matches[0], 10);
    const g = parseInt(matches[1], 10);
    const b = parseInt(matches[2], 10);

    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
        return { r, g, b };
    }
    return null;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        v: Math.round(v * 100),
    };
}

export function getClosestColorName(hex: string): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return "Custom";

    let minDistance = Infinity;
    let closestName = "Custom";

    for (const c of COLOR_NAMES) {
        const cRgb = hexToRgb(c.hex);
        if (!cRgb) continue;

        const dR = rgb.r - cRgb.r;
        const dG = rgb.g - cRgb.g;
        const dB = rgb.b - cRgb.b;
        const dist = Math.sqrt(2 * dR * dR + 4 * dG * dG + 3 * dB * dB);

        if (dist < minDistance) {
            minDistance = dist;
            closestName = c.name;
        }
    }

    return closestName.slice(0, 10);
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    s = s / 100;
    v = v / 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h <= 360) { r = c; g = 0; b = x; }

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
    };
}

function hsvToHex(h: number, s: number, v: number): string {
    const { r, g, b } = hsvToRgb(h, s, v);
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return { h: 0, s: 100, v: 100 };

    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        v: Math.round(v * 100),
    };
}

export function ColorPicker({
    value,
    onChange,
    onPickName,
    className,
    disabled = false,
}: {
    value: string;
    onChange: (hex: string) => void;
    onPickName?: (name: string) => void;
    className?: string;
    disabled?: boolean;
}) {
    const validHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#d14341";
    const initialHsv = hexToHsv(validHex);

    const [hue, setHue] = useState(initialHsv.h);
    const [sat, setSat] = useState(initialHsv.s);
    const [val, setVal] = useState(initialHsv.v);
    const [alpha, setAlpha] = useState(100);
    const [hexInput, setHexInput] = useState(validHex);
    const [rgbInput, setRgbInput] = useState(() => {
        const rgb = hsvToRgb(initialHsv.h, initialHsv.s, initialHsv.v);
        return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
    });
    const [format, setFormat] = useState<"HEX" | "RGB">("HEX");
    const [open, setOpen] = useState(false);

    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (/^#[0-9a-fA-F]{6}$/.test(value)) {
            const hsv = hexToHsv(value);
            setHue(hsv.h);
            setSat(hsv.s);
            setVal(hsv.v);
            setHexInput(value);
            const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
            setRgbInput(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
    }, [value]);

    const updateColor = (h: number, s: number, v: number) => {
        const hex = hsvToHex(h, s, v);
        setHexInput(hex);
        const rgb = hsvToRgb(h, s, v);
        setRgbInput(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
        onChange(hex);
        onPickName?.(getClosestColorName(hex));
    };

    const handleCanvasPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();

        const updateFromPointer = (clientX: number, clientY: number) => {
            const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
            const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
            const newS = Math.round((x / rect.width) * 100);
            const newV = Math.round((1 - y / rect.height) * 100);
            setSat(newS);
            setVal(newV);
            updateColor(hue, newS, newV);
        };

        updateFromPointer(e.clientX, e.clientY);

        const onPointerMove = (moveEvent: PointerEvent) => {
            updateFromPointer(moveEvent.clientX, moveEvent.clientY);
        };

        const onPointerUp = () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    };

    const handleTextInputChange = (inputVal: string) => {
        if (format === "HEX") {
            setHexInput(inputVal);
            if (/^#[0-9a-fA-F]{6}$/.test(inputVal)) {
                const hsv = hexToHsv(inputVal);
                setHue(hsv.h);
                setSat(hsv.s);
                setVal(hsv.v);
                const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
                setRgbInput(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
                onChange(inputVal);
                onPickName?.(getClosestColorName(inputVal));
            }
        } else if (format === "RGB") {
            setRgbInput(inputVal);
            const parsedRgb = parseRgbString(inputVal);
            if (parsedRgb) {
                const hsv = rgbToHsv(parsedRgb.r, parsedRgb.g, parsedRgb.b);
                setHue(hsv.h);
                setSat(hsv.s);
                setVal(hsv.v);
                const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
                setHexInput(hex);
                onChange(hex);
                onPickName?.(getClosestColorName(hex));
            }
        }
    };

    const handleEyeDropper = async () => {
        if (typeof window !== "undefined" && "EyeDropper" in window) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const eyeDropper = new (window as any).EyeDropper();
                const result = await eyeDropper.open();
                if (result?.sRGBHex) {
                    const hex = result.sRGBHex;
                    const hsv = hexToHsv(hex);
                    setHue(hsv.h);
                    setSat(hsv.s);
                    setVal(hsv.v);
                    setHexInput(hex);
                    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
                    setRgbInput(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
                    onChange(hex);
                    onPickName?.(getClosestColorName(hex));
                }
            } catch {
                // EyeDropper cancelled
            }
        }
    };

    const pureHueHex = hsvToHex(hue, 100, 100);
    const pureColorHex = hsvToHex(hue, sat, val);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <div className={cn("flex items-center gap-2", className)}>
                {/* Single color preview square trigger without text */}
                <PopoverTrigger
                    disabled={disabled}
                    className="group flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card p-1.5 transition-all hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    title="Pick custom color"
                >
                    <span
                        className="size-6 rounded-lg border border-border shadow-inner transition-transform group-hover:scale-105"
                        style={{ background: validHex }}
                    />
                </PopoverTrigger>

                <Input
                    value={format === "HEX" ? hexInput : rgbInput}
                    onChange={(e) => handleTextInputChange(e.target.value)}
                    placeholder={format === "HEX" ? "#000000" : "255, 255, 255"}
                    maxLength={format === "HEX" ? 7 : 18}
                    className="h-9 w-32 font-mono text-xs uppercase"
                />
            </div>

            <PopoverContent align="start" className="w-[280px] p-3 flex flex-col gap-3 rounded-2xl shadow-xl">
                {/* 2D Saturation/Value Canvas */}
                <div
                    ref={canvasRef}
                    className="relative h-40 w-full cursor-crosshair overflow-hidden rounded-xl select-none"
                    style={{ backgroundColor: pureHueHex }}
                    onPointerDown={handleCanvasPointerDown}
                >
                    {/* Horizontal Saturation: White to Transparent */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                    {/* Vertical Brightness: Transparent to Black */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />

                    {/* Circular Selector Ring */}
                    <div
                        className="pointer-events-none absolute size-4.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.6)]"
                        style={{
                            left: `${sat}%`,
                            top: `${100 - val}%`,
                        }}
                    />
                </div>

                {/* Hue Slider */}
                <div className="relative flex items-center">
                    <input
                        type="range"
                        min="0"
                        max="360"
                        value={hue}
                        onChange={(e) => {
                            const newH = Number(e.target.value);
                            setHue(newH);
                            updateColor(newH, sat, val);
                        }}
                        className="h-3.5 w-full cursor-pointer appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:size-4.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                        style={{
                            background:
                                "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                        }}
                    />
                </div>

                {/* Alpha Slider */}
                <div className="relative flex items-center">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={alpha}
                        onChange={(e) => setAlpha(Number(e.target.value))}
                        className="h-3.5 w-full cursor-pointer appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:size-4.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                        style={{
                            background: `linear-gradient(to right, transparent, ${pureColorHex}), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath d='M0 0h4v4H0zM4 4h4v4H4z' fill='%23ccc' fill-opacity='0.4'/%3E%3C/svg%3E")`,
                        }}
                    />
                </div>

                {/* Controls Bar */}
                <div className="flex items-center gap-1.5 pt-1">
                    {/* Eyedropper Button */}
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={handleEyeDropper}
                        title="Pick color from screen"
                        className="h-9 w-9 shrink-0 rounded-xl border-border bg-card hover:bg-accent"
                    >
                        <Pipette className="size-4 text-muted-foreground" />
                    </Button>

                    {/* Format Select */}
                    <div className="relative">
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value as "HEX" | "RGB")}
                            className="h-9 appearance-none rounded-xl border border-border bg-card pl-2.5 pr-6 text-xs font-semibold text-foreground outline-none cursor-pointer"
                        >
                            <option value="HEX">HEX</option>
                            <option value="RGB">RGB</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-2.5 size-3.5 text-muted-foreground" />
                    </div>

                    {/* Value Input */}
                    <Input
                        value={format === "HEX" ? hexInput : rgbInput}
                        onChange={(e) => handleTextInputChange(e.target.value)}
                        maxLength={format === "HEX" ? 7 : 18}
                        className="h-9 flex-1 font-mono text-xs uppercase px-2"
                    />

                    {/* Alpha % Input */}
                    <div className="relative w-12 shrink-0">
                        <Input
                            value={`${alpha}%`}
                            onChange={(e) => {
                                const parsed = parseInt(e.target.value.replace("%", ""), 10);
                                if (!isNaN(parsed)) {
                                    setAlpha(Math.max(0, Math.min(100, parsed)));
                                }
                            }}
                            className="h-9 px-1 text-center font-mono text-xs"
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
