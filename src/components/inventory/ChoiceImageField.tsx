"use client";

import { useState } from "react";
import { ImageOff, X } from "lucide-react";

import { ImagePicker, useObjectUrls } from "@/components/ui/image-picker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
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
}: {
    value: string;
    onChange: (url: string) => void;
    label?: string;
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
