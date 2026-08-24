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
