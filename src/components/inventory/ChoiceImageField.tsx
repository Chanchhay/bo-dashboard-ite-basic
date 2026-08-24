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

/**
 * One picture belonging to a choice — an Option, or a preset's value.
 *
 * The caller only ever holds the stored URL. A URL box was never a real ask:
 * a shop owner has a photograph on their phone, not a link to one, and the
 * only way to produce a link was to upload it somewhere else first. So the
 * file goes to the asset store on pick and the URL it answers with is what
 * comes back out of here.
 *
 * The upload happens immediately rather than on save, matching the item
 * gallery and the description blocks: a picture that only uploads at save time
 * cannot be previewed, and a failed save would lose it.
 */
export function ChoiceImageField({
    value,
    onChange,
    label = "Photo",
    /** A small click-to-browse thumbnail instead of the full drop zone, for forms where every row already has one of these. */
    compact = false,
}: {
    value: string;
    onChange: (url: string) => void;
    label?: string;
    compact?: boolean;
}) {
    const [uploadAsset] = useUploadAssetMutation();
    const [deleteAsset] = useDeleteAssetMutation();
    const { create, release } = useObjectUrls();
    const { toast } = useToast();

    const [previewUrl, setPreviewUrl] = useState<string | undefined>();
    const [uploading, setUploading] = useState(false);
    /**
     * Only a picture uploaded in this session can be cleaned up. One loaded
     * with the item is left alone — the form may yet be cancelled, and deleting
     * it would take the picture off an item that still points at it.
     */
    const [assetKey, setAssetKey] = useState<string | undefined>();

    const preview = previewUrl || value;

    async function handlePick(file: File) {
        release(previewUrl);
        const replaced = assetKey;
        const nextPreview = create(file);

        setPreviewUrl(nextPreview);
        setUploading(true);

        try {
            const asset = await uploadAsset(file).unwrap();

            if (!asset.url) {
                throw new Error("The upload returned no URL.");
            }

            onChange(asset.url);
            setAssetKey(asset.key);
            setPreviewUrl(undefined);
            release(nextPreview);

            if (replaced) void deleteAsset(replaced);
        } catch (error) {
            release(nextPreview);
            setPreviewUrl(undefined);
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
        release(previewUrl);
        if (assetKey) void deleteAsset(assetKey);

        onChange("");
        setAssetKey(undefined);
        setPreviewUrl(undefined);
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
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (!file) return;

                            const message = choiceImageRules.validate(file);
                            if (message) {
                                toast({
                                    tone: "error",
                                    title: `${label} not selected`,
                                    description: message,
                                });
                                return;
                            }

                            void handlePick(file);
                        }}
                    />
                    {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="" className="size-full object-cover" />
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
                    {value ? `Replace ${label.toLowerCase()}` : `${label} (optional)`}
                </span>

                {value && !uploading ? (
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
        <div className="flex items-center gap-3">
            <ImagePicker
                rules={choiceImageRules}
                disabled={uploading}
                busy={uploading}
                label={value ? `Replace ${label.toLowerCase()}` : label}
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
                            // An uploaded picture is a URL; a fresh pick shows
                            // as a blob until the upload answers.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={preview}
                                alt=""
                                className="size-full object-cover"
                            />
                        ) : (
                            <ImageOff className="size-5 text-muted-foreground" />
                        )}
                    </span>
                }
            />

            {value && !uploading ? (
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
