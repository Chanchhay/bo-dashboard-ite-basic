"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type DragEvent,
    type ReactNode,
    type RefObject,
} from "react";
import { ImagePlus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ImageUploadRules } from "@/lib/api/image-upload";

/**
 * Hands out blob URLs and revokes every one of them when the component goes
 * away. Previewing a picked file needs an object URL, and an unrevoked URL
 * pins the file in memory for the life of the tab.
 */
export function useObjectUrls() {
    const urls = useRef<string[]>([]);

    useEffect(() => {
        // The ref object is stable; its contents are read at cleanup time on
        // purpose, so URLs created after mount are revoked too.
        const tracked = urls;

        return () => {
            tracked.current.forEach((url) => URL.revokeObjectURL(url));
            tracked.current = [];
        };
    }, []);

    const create = useCallback((file: File) => {
        const url = URL.createObjectURL(file);
        urls.current.push(url);

        return url;
    }, []);

    const release = useCallback((url: string | null | undefined) => {
        if (!url || !url.startsWith("blob:")) {
            return;
        }

        URL.revokeObjectURL(url);
        urls.current = urls.current.filter((entry) => entry !== url);
    }, []);

    return { create, release };
}

/**
 * A single image edited alongside a form: the pick and the "remove" intent are
 * both held until the form is saved, so cancelling never touches what is
 * stored. The preview is derived rather than copied, so a save that refreshes
 * `storedUrl` shows the new image without any syncing.
 */
export function useStagedImage(rules: ImageUploadRules, storedUrl: string) {
    const { create, release } = useObjectUrls();
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [removed, setRemoved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function pick(picked: File) {
        const message = rules.validate(picked);

        if (message) {
            setError(message);
            return;
        }

        release(blobUrl);
        setBlobUrl(create(picked));
        setFile(picked);
        setRemoved(false);
        setError(null);
    }

    /** Clears a pick, or stages the removal of what is stored. */
    function remove() {
        release(blobUrl);
        setBlobUrl(null);
        setFile(null);
        setRemoved(Boolean(storedUrl));
        setError(null);
    }

    /** Drops every staged change and puts the stored image back on screen. */
    function reset() {
        release(blobUrl);
        setBlobUrl(null);
        setFile(null);
        setRemoved(false);
        setError(null);
    }

    return {
        file,
        removed,
        error,
        setError,
        pick,
        remove,
        reset,
        preview: removed ? "" : blobUrl || storedUrl,
        isDirty: Boolean(file) || removed,
    };
}

type PickerBase = {
    rules: ImageUploadRules;
    disabled?: boolean;
    /** Shown under the control; falls back to the rules' own hint. */
    hint?: ReactNode;
    error?: string | null;
    className?: string;
    /**
     * Hand in a ref to let a button of your own open the file dialog — the
     * "Change photo" links sit outside the drop target.
     */
    inputRef?: RefObject<HTMLInputElement | null>;
};

/**
 * Runs every file past the rules so a drop of five pictures reports the first
 * real problem rather than failing later at the server.
 */
function firstError(files: File[], rules: ImageUploadRules) {
    for (const file of files) {
        const message = rules.validate(file);

        if (message) {
            return message;
        }
    }

    return undefined;
}

function useDropTarget({
    disabled,
    onFiles,
}: {
    disabled?: boolean;
    onFiles: (files: File[]) => void;
}) {
    const [isOver, setIsOver] = useState(false);

    function onDragOver(event: DragEvent) {
        if (disabled) {
            return;
        }

        // Without this the browser navigates to the dropped file.
        event.preventDefault();
        setIsOver(true);
    }

    function onDragLeave() {
        setIsOver(false);
    }

    function onDrop(event: DragEvent) {
        event.preventDefault();
        setIsOver(false);

        if (disabled) {
            return;
        }

        const files = Array.from(event.dataTransfer.files).filter((file) =>
            file.type.startsWith("image/"),
        );

        if (files.length) {
            onFiles(files);
        }
    }

    return { isOver, dropProps: { onDragOver, onDragLeave, onDrop } };
}

/**
 * One image: a click-or-drop target that renders whatever preview the caller
 * gives it — an avatar circle, a logo tile, a wide cover.
 */
export function ImagePicker({
    rules,
    disabled,
    hint,
    error,
    className,
    inputRef,
    label,
    preview,
    actions,
    busy,
    previewShape = "rect",
    onPick,
    onError,
}: PickerBase & {
    /** The heading inside the drop target. */
    label: ReactNode;
    /** The image, initials or placeholder to show. */
    preview: ReactNode;
    /** Buttons rendered under the hint, e.g. Remove or Undo. */
    actions?: ReactNode;
    /** Renders a veil over the preview while a save is in flight. */
    busy?: boolean;
    /** Shapes that veil to the preview it covers. */
    previewShape?: "circle" | "rect";
    onPick: (file: File) => void;
    onError: (message: string) => void;
}) {
    function handleFiles(files: File[]) {
        const [file] = files;

        if (!file) {
            return;
        }

        const message = rules.validate(file);

        if (message) {
            onError(message);
            return;
        }

        onPick(file);
    }

    const { isOver, dropProps } = useDropTarget({
        disabled,
        onFiles: handleFiles,
    });

    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            <label
                {...dropProps}
                className={cn(
                    "group relative flex w-full cursor-pointer flex-col items-center gap-2.5 sm:gap-3 rounded-2xl border-2 border-dashed border-[#e4eae2] dark:border-[#2a3042] bg-white dark:bg-[#1a1e29] px-4 py-4 sm:px-5 sm:py-6 text-center outline-none transition-colors focus-within:border-primary hover:border-primary/50",
                    isOver && "border-primary bg-[#f5f8f4] dark:bg-[#252a38]",
                    disabled && "cursor-not-allowed opacity-60",
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={rules.accept}
                    disabled={disabled}
                    data-slot="image-picker-input"
                    className="sr-only"
                    onChange={(event) => {
                        const files = Array.from(event.target.files || []);
                        // Let the same file be picked again after an undo.
                        event.target.value = "";
                        handleFiles(files);
                    }}
                />

                <span className="relative">
                    {preview}
                    {busy ? (
                        <span
                            className={cn(
                                "absolute inset-0 grid place-items-center bg-white/70 dark:bg-[#1a1e29]/80 text-xs font-semibold text-primary",
                                previewShape === "circle"
                                    ? "rounded-full"
                                    : "rounded-xl",
                            )}
                        >
                            Uploading…
                        </span>
                    ) : null}
                </span>

                <span className="text-base leading-6 font-bold text-[#1a222b] dark:text-[#f8fafc]">
                    {label}
                </span>
                <span className="max-w-[220px] text-[11px] leading-[16.5px] text-[#424841] dark:text-[#94a3b8]">
                    Drag and drop, or click to browse. {hint || rules.hint}
                </span>
            </label>

            {actions ? (
                <div className="flex items-center justify-center gap-3">
                    {actions}
                </div>
            ) : null}

            <div className="min-h-4" aria-live="polite">
                {error ? (
                    <p className="text-xs text-danger" role="alert">
                        {error}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

/**
 * Many images at once: an empty drop target that turns into the caller's own
 * gallery once there is something to show.
 */
export function ImageDropzone({
    rules,
    disabled,
    hint,
    error,
    className,
    inputRef,
    label,
    remaining,
    children,
    onPick,
    onError,
}: PickerBase & {
    label: ReactNode;
    /** How many more files fit; a drop of more than this is refused. */
    remaining: number;
    /** The gallery. When absent the drop target is shown instead. */
    children?: ReactNode;
    onPick: (files: File[]) => void;
    onError: (message: string) => void;
}) {
    const ownInputRef = useRef<HTMLInputElement>(null);
    const fileInput = inputRef || ownInputRef;
    const isFull = remaining <= 0;

    function handleFiles(files: File[]) {
        if (!files.length) {
            return;
        }

        if (files.length > remaining) {
            onError(
                remaining > 0
                    ? `Only ${remaining} more image${remaining === 1 ? "" : "s"} will fit.`
                    : "No more images will fit.",
            );
            return;
        }

        const message = firstError(files, rules);

        if (message) {
            onError(message);
            return;
        }

        onPick(files);
    }

    const { isOver, dropProps } = useDropTarget({
        disabled: disabled || isFull,
        onFiles: handleFiles,
    });

    return (
        <div className={cn("flex flex-col gap-3", className)}>
            <input
                ref={fileInput}
                type="file"
                accept={rules.accept}
                multiple
                disabled={disabled || isFull}
                className="sr-only"
                onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    event.target.value = "";
                    handleFiles(files);
                }}
            />

            {children ? (
                <div {...dropProps}>{children}</div>
            ) : (
                <button
                    type="button"
                    {...dropProps}
                    disabled={disabled || isFull}
                    onClick={() => fileInput.current?.click()}
                    className={cn(
                        "flex min-h-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#e4eae2] dark:border-[#2a3042] bg-[#fafbfa] dark:bg-[#1a1e29] text-sm text-[#6b7569] dark:text-[#cbd5e1] font-medium transition-colors hover:border-primary/40 hover:bg-[#f5f8f4] dark:hover:bg-[#252a38] disabled:cursor-not-allowed disabled:opacity-60",
                        isOver && "border-primary bg-[#f5f8f4] dark:bg-[#252a38]",
                    )}
                >
                    <ImagePlus className="size-5" aria-hidden="true" />
                    {label}
                    <span className="text-[11px] font-normal text-[#7a8478] dark:text-[#94a3b8]">
                        Drag and drop, or click to browse. {hint || rules.hint}
                    </span>
                </button>
            )}

            <div className="min-h-4" aria-live="polite">
                {error ? (
                    <p className="text-xs text-danger" role="alert">
                        {error}
                    </p>
                ) : null}
            </div>
        </div>
    );
}
