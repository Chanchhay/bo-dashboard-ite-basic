"use client";

import { useEffect, useRef, useState } from "react";

export type BarcodeKeyboardMode = "capture" | "passive";

export type ScanSource = {
    intoField: boolean;
};

type UseBarcodeKeyboardOptions = {
    enabled: boolean;
    mode?: BarcodeKeyboardMode;
    onScan: (barcode: string, source: ScanSource) => void;
    onCancel?: () => void;
    isPaused?: () => boolean;
    idleMs?: number;
    scannerGapMs?: number;
    minLength?: number;
};

function isTextEntry(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
    );
}

export function useBarcodeKeyboard({
    enabled,
    mode = "capture",
    onScan,
    onCancel,
    isPaused,
    idleMs = 220,
    scannerGapMs = 55,
    minLength = 4,
}: UseBarcodeKeyboardOptions) {
    const [buffer, setBuffer] = useState("");

    const bufferRef = useRef("");
    const lastKeyAtRef = useRef(0);
    const gapsRef = useRef<number[]>([]);
    const intoFieldRef = useRef(false);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onScanRef = useRef(onScan);
    const onCancelRef = useRef(onCancel);
    const isPausedRef = useRef(isPaused);

    useEffect(() => {
        onScanRef.current = onScan;
        onCancelRef.current = onCancel;
        isPausedRef.current = isPaused;
    }, [onScan, onCancel, isPaused]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const passive = mode === "passive";

        function clearIdleTimer() {
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
                idleTimerRef.current = null;
            }
        }

        function reset() {
            clearIdleTimer();
            bufferRef.current = "";
            gapsRef.current = [];
            lastKeyAtRef.current = 0;
            intoFieldRef.current = false;
            setBuffer("");
        }

        function looksLikeScanner() {
            const gaps = gapsRef.current;

            if (gaps.length < 2) {
                return false;
            }

            const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
            return mean <= scannerGapMs;
        }

        function commit() {
            const value = bufferRef.current.trim();
            const intoField = intoFieldRef.current;
            reset();

            if (value) {
                onScanRef.current(value, { intoField });
            }
        }

        function armIdleCommit() {
            clearIdleTimer();
            idleTimerRef.current = setTimeout(() => {
                if (
                    bufferRef.current.trim().length >= minLength &&
                    looksLikeScanner()
                ) {
                    commit();
                }
            }, idleMs);
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            if (passive && isPausedRef.current?.()) {
                reset();
                return;
            }

            if (event.key === "Escape") {
                if (passive) {
                    reset();
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                reset();
                onCancelRef.current?.();
                return;
            }

            if (event.key === "Enter" || event.key === "Tab") {
                if (
                    passive &&
                    !(
                        bufferRef.current.trim().length >= minLength &&
                        looksLikeScanner()
                    )
                ) {
                    reset();
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                commit();
                return;
            }

            if (event.key === "Backspace") {
                if (passive) {
                    reset();
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                bufferRef.current = bufferRef.current.slice(0, -1);
                setBuffer(bufferRef.current);
                return;
            }

            if (event.key.length !== 1) {
                return;
            }

            if (!passive) {
                event.preventDefault();
                event.stopPropagation();
            }

            const now = Date.now();

            if (lastKeyAtRef.current) {
                gapsRef.current.push(now - lastKeyAtRef.current);
            }

            if (!bufferRef.current) {
                intoFieldRef.current = isTextEntry(event.target);
            }

            lastKeyAtRef.current = now;
            bufferRef.current += event.key;
            setBuffer(bufferRef.current);
            armIdleCommit();
        }

        window.addEventListener("keydown", handleKeyDown, !passive);

        return () => {
            window.removeEventListener("keydown", handleKeyDown, !passive);
            clearIdleTimer();
            bufferRef.current = "";
            gapsRef.current = [];
            lastKeyAtRef.current = 0;
            intoFieldRef.current = false;
        };
    }, [enabled, idleMs, minLength, mode, scannerGapMs]);

    function clear() {
        bufferRef.current = "";
        gapsRef.current = [];
        lastKeyAtRef.current = 0;
        setBuffer("");
    }

    return { buffer: enabled ? buffer : "", clear };
}
