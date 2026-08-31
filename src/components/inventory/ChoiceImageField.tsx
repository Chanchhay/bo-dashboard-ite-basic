"use client";

import { useState } from "react";
import { ImageOff, ImagePlus, X } from "lucide-react";

import { ImagePicker, useObjectUrls } from "@/components/ui/image-picker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { choiceImageRules } from "@/lib/api/inventory";
import {
    useDeleteAssetMutation,
    useUploadAssetMutation,
} from "@/services/assetApi";

export function ChoiceImageField({
    value = "",
    file,
    previewUrl,
    onChange,
    onChangeUrl,
    onChangeFile,
    label = "Photo",
    /** A small click-to-browse thumbnail instead of the full drop zone, for forms where every row already has one of these. */
    compact = false,
}: {
    value?: string;
    file?: File;
    previewUrl?: string;
    onChange?: (url: string) => void;
    onChangeUrl?: (url: string) => void;
    onChangeFile?: (file: File | undefined, previewUrl: string | undefined) => void;
    label?: string;
    compact?: boolean;
}) {
    const [uploadAsset] = useUploadAssetMutation();
    const [deleteAsset] = useDeleteAssetMutation();
    const { create, release } = useObjectUrls();
    const { toast } = useToast();

    const [uploading, setUploading] = useState(false);
    const [assetKey, setAssetKey] = useState<string | undefined>();
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | undefined>();

    const updateUrl = onChangeUrl || onChange;
    const preview = previewUrl || localPreviewUrl || value;

    async function handlePick(pickedFile: File) {
        if (onChangeFile) {
            release(localPreviewUrl);
            const objectUrl = create(pickedFile);
            setLocalPreviewUrl(objectUrl);
            onChangeFile(pickedFile, objectUrl);
            return;
        }

        release(localPreviewUrl);
        const replaced = assetKey;
        const nextPreview = create(pickedFile);

        setLocalPreviewUrl(nextPreview);
        setUploading(true);

        try {
            const asset = await uploadAsset(pickedFile).unwrap();

            if (!asset.url) {
                throw new Error("The upload returned no URL.");
            }

            updateUrl?.(asset.url);
            setAssetKey(asset.key);
            setLocalPreviewUrl(undefined);
            release(nextPreview);

            if (replaced) void deleteAsset(replaced);
        } catch (error) {
            release(nextPreview);
            setLocalPreviewUrl(undefined);
            toast({
                tone: "error",
                title: `${label} not uploaded`,
                description: getApiErrorMessage(
                    error,
                    "Unable to upload that image.",
                ),
            });
        } finally {
            setUploading(false);
        }
    }

    function handleRemove() {
        release(localPreviewUrl);
        if (assetKey) void deleteAsset(assetKey);

        if (onChangeFile) {
            onChangeFile(undefined, undefined);
        }
        updateUrl?.("");
        setAssetKey(undefined);
        setLocalPreviewUrl(undefined);
    }

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <label
                    className={cn(
                        "relative flex size-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted text-muted-foreground transition-colors hover:border-primary/50",
                        uploading && "cursor-not-allowed opacity-60",
                    )}
                >
                    <input
                        type="file"
                        accept={choiceImageRules.accept}
                        disabled={uploading}
                        className="sr-only"
                        onChange={(event) => {
                            const selectedFile = event.target.files?.[0];
                            event.target.value = "";
                            if (!selectedFile) return;

                            const message = choiceImageRules.validate(selectedFile);
                            if (message) {
                                toast({
                                    tone: "error",
                                    title: `${label} not selected`,
                                    description: message,
                                });
                                return;
                            }

                            void handlePick(selectedFile);
                        }}
                    />
                    {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={preview}
                            alt=""
                            className="size-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
                            }}
                        />
                    ) : (
                        <ImagePlus className="size-4" />
                    )}
                    {uploading ? (
                        <span className="absolute inset-0 grid place-items-center bg-white/70 dark:bg-[#1a1e29]/80 text-[8px] font-semibold text-primary">
                            …
                        </span>
                    ) : null}
                </label>

                <span className="text-xs font-medium text-muted-foreground">
                    {preview ? `Replace ${label.toLowerCase()}` : `${label} (optional)`}
                </span>

                {preview && !uploading ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${label.toLowerCase()}`}
                        onClick={handleRemove}
                    >
                        <X className="size-3.5" />
                    </Button>
                ) : null}
            </div>
        );
    }

    return (
        <div className="flex w-full items-center gap-3">
            <ImagePicker
                className="w-full flex-1"
                rules={choiceImageRules}
                disabled={uploading}
                busy={uploading}
                label={preview ? `Replace ${label.toLowerCase()}` : label}
                onPick={handlePick}
                onError={(message) => {
                    toast({
                        tone: "error",
                        title: `${label} not selected`,
                        description: message,
                    });
                }}
                preview={
                    <span className="flex size-16 items-center justify-center overflow-hidden rounded-lg bg-muted">
                        {preview ? (
                            <img
                                src={preview}
                                alt=""
                                className="size-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
                                }}
                            />
                        ) : (
                            <img
                                src="/brand/fluxibiz-mark.png"
                                alt=""
                                className="w-1/2 opacity-35"
                            />
                        )}
                    </span>
                }
            />

            {preview && !uploading ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${label.toLowerCase()}`}
                    onClick={handleRemove}
                >
                    <X className="size-4" />
                </Button>
            ) : null}
        </div>
    );
}
