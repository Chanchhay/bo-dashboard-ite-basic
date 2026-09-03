"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Crop,
    RotateCw,
    RotateCcw,
    Check,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export interface ImageCropperDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageSrc: string | null;
    fileName?: string;
    mimeType?: string;
    onCropComplete: (croppedFile: File, croppedPreviewUrl: string) => void;
}

type HandleType = "move" | "nw" | "ne" | "sw" | "se";

interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function ImageCropperDialog({
    open,
    onOpenChange,
    imageSrc,
    fileName = "cropped-image.jpg",
    mimeType = "image/jpeg",
    onCropComplete,
}: ImageCropperDialogProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
    const [zoom, setZoom] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);

    // Rendered layout of the image inside the viewport
    const [imageLayout, setImageLayout] = useState<{
        width: number;
        height: number;
        naturalWidth: number;
        naturalHeight: number;
    } | null>(null);

    // 1:1 Square crop box coordinates
    const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });

    // Active drag state
    const dragRef = useRef<{
        handle: HandleType;
        startX: number;
        startY: number;
        startCrop: CropRect;
    } | null>(null);

    // Calculate initial 1:1 square crop box centered on displayed image
    const calculateSquareCrop = useCallback((layoutWidth: number, layoutHeight: number) => {
        const side = Math.min(layoutWidth, layoutHeight) * 0.9;
        const x = Math.max(0, (layoutWidth - side) / 2);
        const y = Math.max(0, (layoutHeight - side) / 2);
        return { x, y, width: side, height: side };
    }, []);

    // Reset when dialog opens or image changes
    useEffect(() => {
        if (!open || !imageSrc) {
            setImageLayout(null);
            setRotation(0);
            setZoom(1);
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            setRotation(0);
            setZoom(1);
        };
        img.src = imageSrc;
    }, [open, imageSrc]);

    // Update layout when image element renders
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const rect = img.getBoundingClientRect();
        const layout = {
            width: rect.width,
            height: rect.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
        };
        setImageLayout(layout);
        setCrop(calculateSquareCrop(layout.width, layout.height));
    };

    // Smooth global pointer drag handling
    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (!dragRef.current || !imageLayout) return;

            const { handle, startX, startY, startCrop } = dragRef.current;
            const deltaX = (e.clientX - startX) / zoom;
            const deltaY = (e.clientY - startY) / zoom;

            const minSize = 40;
            const imgW = imageLayout.width;
            const imgH = imageLayout.height;

            let nextX = startCrop.x;
            let nextY = startCrop.y;
            let nextSide = startCrop.width;

            if (handle === "move") {
                nextX = Math.min(Math.max(0, startCrop.x + deltaX), imgW - startCrop.width);
                nextY = Math.min(Math.max(0, startCrop.y + deltaY), imgH - startCrop.height);
                setCrop({
                    x: Math.round(nextX),
                    y: Math.round(nextY),
                    width: startCrop.width,
                    height: startCrop.height,
                });
                return;
            }

            // Always maintain 1:1 square ratio
            if (handle === "se") {
                // Dragging bottom-right corner
                const delta = Math.max(deltaX, deltaY);
                const maxAvailable = Math.min(imgW - startCrop.x, imgH - startCrop.y);
                nextSide = Math.min(Math.max(minSize, startCrop.width + delta), maxAvailable);
            } else if (handle === "sw") {
                // Dragging bottom-left corner
                const delta = Math.max(-deltaX, deltaY);
                const maxAvailable = Math.min(startCrop.x + startCrop.width, imgH - startCrop.y);
                nextSide = Math.min(Math.max(minSize, startCrop.width + delta), maxAvailable);
                nextX = startCrop.x + (startCrop.width - nextSide);
            } else if (handle === "ne") {
                // Dragging top-right corner
                const delta = Math.max(deltaX, -deltaY);
                const maxAvailable = Math.min(imgW - startCrop.x, startCrop.y + startCrop.height);
                nextSide = Math.min(Math.max(minSize, startCrop.width + delta), maxAvailable);
                nextY = startCrop.y + (startCrop.height - nextSide);
            } else if (handle === "nw") {
                // Dragging top-left corner
                const delta = Math.max(-deltaX, -deltaY);
                const maxAvailable = Math.min(
                    startCrop.x + startCrop.width,
                    startCrop.y + startCrop.height,
                );
                nextSide = Math.min(Math.max(minSize, startCrop.width + delta), maxAvailable);
                nextX = startCrop.x + (startCrop.width - nextSide);
                nextY = startCrop.y + (startCrop.height - nextSide);
            }

            setCrop({
                x: Math.round(nextX),
                y: Math.round(nextY),
                width: Math.round(nextSide),
                height: Math.round(nextSide),
            });
        };

        const handlePointerUp = () => {
            dragRef.current = null;
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [imageLayout, zoom]);

    const startDrag = (e: React.PointerEvent, handle: HandleType) => {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = {
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startCrop: { ...crop },
        };
    };

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    const handleReset = () => {
        setZoom(1);
        setRotation(0);
        if (imageLayout) {
            setCrop(calculateSquareCrop(imageLayout.width, imageLayout.height));
        }
    };

    // Export cropped canvas
    const handleApplyCrop = async () => {
        if (!imageLayout || !imgRef.current) return;
        setIsProcessing(true);

        try {
            const img = imgRef.current;
            const scaleX = img.naturalWidth / imageLayout.width;
            const scaleY = img.naturalHeight / imageLayout.height;

            const sourceX = crop.x * scaleX;
            const sourceY = crop.y * scaleY;
            const sourceW = crop.width * scaleX;
            const sourceH = crop.height * scaleY;

            const outputCanvas = document.createElement("canvas");
            const isSwapped = rotation === 90 || rotation === 270;

            const exportSide = Math.min(1000, Math.round(Math.max(sourceW, sourceH)));
            outputCanvas.width = exportSide;
            outputCanvas.height = exportSide;

            const ctx = outputCanvas.getContext("2d");
            if (!ctx) throw new Error("Could not create canvas 2D context");

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, exportSide, exportSide);

            ctx.save();
            ctx.translate(exportSide / 2, exportSide / 2);
            ctx.rotate((rotation * Math.PI) / 180);

            ctx.drawImage(
                img,
                sourceX,
                sourceY,
                sourceW,
                sourceH,
                -exportSide / 2,
                -exportSide / 2,
                exportSide,
                exportSide,
            );
            ctx.restore();

            outputCanvas.toBlob(
                (blob) => {
                    if (!blob) {
                        setIsProcessing(false);
                        return;
                    }
                    const cleanName = fileName.replace(/\.[^/.]+$/, "") + ".jpg";
                    const croppedFile = new File([blob], cleanName, { type: "image/jpeg" });
                    const croppedUrl = URL.createObjectURL(blob);

                    onCropComplete(croppedFile, croppedUrl);
                    setIsProcessing(false);
                    onOpenChange(false);
                },
                "image/jpeg",
                0.92,
            );
        } catch (err) {
            console.error("Failed to crop image:", err);
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl p-6 select-none sm:rounded-2xl">
                <DialogHeader className="text-left">
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                        <Crop className="size-5 text-primary" />
                        <span>Crop Image</span>
                    </DialogTitle>
                </DialogHeader>

                {/* Cropper Viewport Container (Seamless, no outer frame line) */}
                <div
                    ref={containerRef}
                    className="relative flex w-full min-h-[280px] max-h-[420px] items-center justify-center overflow-hidden py-2"
                >
                    {imageSrc && (
                        <div
                            className="relative inline-flex items-center justify-center transition-transform duration-75 ease-out"
                            style={{
                                transform: `rotate(${rotation}deg) scale(${zoom})`,
                                transformOrigin: "center center",
                            }}
                        >
                            {/* Target Image */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={imgRef}
                                src={imageSrc}
                                alt="Crop Target"
                                onLoad={handleImageLoad}
                                draggable={false}
                                className="max-h-[360px] max-w-full select-none rounded-lg object-contain"
                            />

                            {/* 1:1 Resizable Crop Overlay Area */}
                            {imageLayout && crop.width > 0 && (
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                        width: imageLayout.width,
                                        height: imageLayout.height,
                                    }}
                                >
                                    {/* Darkened Mask overlays */}
                                    <div
                                        className="absolute bg-black/60 backdrop-blur-[0.5px]"
                                        style={{
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: crop.y,
                                        }}
                                    />
                                    <div
                                        className="absolute bg-black/60 backdrop-blur-[0.5px]"
                                        style={{
                                            top: crop.y + crop.height,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                        }}
                                    />
                                    <div
                                        className="absolute bg-black/60 backdrop-blur-[0.5px]"
                                        style={{
                                            top: crop.y,
                                            left: 0,
                                            width: crop.x,
                                            height: crop.height,
                                        }}
                                    />
                                    <div
                                        className="absolute bg-black/60 backdrop-blur-[0.5px]"
                                        style={{
                                            top: crop.y,
                                            left: crop.x + crop.width,
                                            right: 0,
                                            height: crop.height,
                                        }}
                                    />

                                    {/* Resizable 1:1 Square Box with small gray dotted/dashed line */}
                                    <div
                                        onPointerDown={(e) => startDrag(e, "move")}
                                        className="pointer-events-auto absolute cursor-move border-2 border-dashed border-neutral-400 dark:border-neutral-500"
                                        style={{
                                            left: crop.x,
                                            top: crop.y,
                                            width: crop.width,
                                            height: crop.height,
                                        }}
                                    >
                                        {/* Rule of Thirds grid */}
                                        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                                            <div className="border-r border-b border-neutral-400/50" />
                                            <div className="border-r border-b border-neutral-400/50" />
                                            <div className="border-b border-neutral-400/50" />
                                            <div className="border-r border-b border-neutral-400/50" />
                                            <div className="border-r border-b border-neutral-400/50" />
                                            <div className="border-b border-neutral-400/50" />
                                            <div className="border-r border-b border-neutral-400/50" />
                                            <div className="border-r border-b border-neutral-400/50" />
                                            <div />
                                        </div>

                                        {/* 4 Corner Handles (Small, elegant dots) */}
                                        <div
                                            onPointerDown={(e) => startDrag(e, "nw")}
                                            className="absolute -top-1.5 -left-1.5 size-3 cursor-nwse-resize rounded-full border border-neutral-800 bg-white transition-transform hover:scale-125 before:absolute before:-inset-2 before:content-['']"
                                        />
                                        <div
                                            onPointerDown={(e) => startDrag(e, "ne")}
                                            className="absolute -top-1.5 -right-1.5 size-3 cursor-nesw-resize rounded-full border border-neutral-800 bg-white transition-transform hover:scale-125 before:absolute before:-inset-2 before:content-['']"
                                        />
                                        <div
                                            onPointerDown={(e) => startDrag(e, "sw")}
                                            className="absolute -bottom-1.5 -left-1.5 size-3 cursor-nesw-resize rounded-full border border-neutral-800 bg-white transition-transform hover:scale-125 before:absolute before:-inset-2 before:content-['']"
                                        />
                                        <div
                                            onPointerDown={(e) => startDrag(e, "se")}
                                            className="absolute -bottom-1.5 -right-1.5 size-3 cursor-nwse-resize rounded-full border border-neutral-800 bg-white transition-transform hover:scale-125 before:absolute before:-inset-2 before:content-['']"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Minimalist Controls */}
                <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-3">
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={2.5}
                            step={0.05}
                            onValueChange={([val]) => setZoom(val)}
                            className="flex-1"
                        />
                        <span className="w-12 text-right font-mono text-xs font-semibold text-muted-foreground">
                            {Math.round(zoom * 100)}%
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRotate}
                                className="h-8 gap-1.5 text-xs font-semibold"
                            >
                                <RotateCw className="size-3.5 text-primary" />
                                <span>Rotate 90°</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <RotateCcw className="size-3" />
                                <span>Reset</span>
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={isProcessing}
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={isProcessing || !imageLayout}
                        onClick={handleApplyCrop}
                        className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Check className="size-4" />
                        <span>{isProcessing ? "Applying..." : "Apply & Crop"}</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
