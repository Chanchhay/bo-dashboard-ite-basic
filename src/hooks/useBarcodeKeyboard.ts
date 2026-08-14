"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Hardware barcode scanners are keyboards: they type the code and — usually —
 * press Enter. This hook listens at the window while a scan is armed, so the
 * user never has to keep a text field focused.
 *
 * Two modes, because the two screens that scan want opposite things:
 *
 * "capture" — the BO scanner overlay. The screen is dimmed and given over to
 * scanning, so every keystroke is taken (capture phase + preventDefault) and
 * Enter always commits, whether a scanner or a person typed it.
 *
 * "passive" — the till, which is always armed and never dimmed. Keystrokes are
 * watched, not taken: the cashier can type into search, the PIN pad, a quantity
 * box, and none of it reaches `onScan`. Only a burst that reads like a scanner
 * — keys arriving faster than fingers move — commits. That is the whole
 * difference between a scan and a person, and it is measured rather than
 * declared.
 *
 * In both modes a scanner that sends no Enter suffix is covered by the idle
 * commit: the burst goes quiet for `idleMs` and submits itself.
 */

export type BarcodeKeyboardMode = "capture" | "passive";

export type ScanSource = {
    /**
     * Whether the burst landed in a text field. The till uses this to wipe the
     * digits back out of the search box after it has acted on them.
     */
    intoField: boolean;
};

type UseBarcodeKeyboardOptions = {
    /** Only listens while this is true. */
    enabled: boolean;
    mode?: BarcodeKeyboardMode;
    onScan: (barcode: string, source: ScanSource) => void;
    /** Escape, in "capture" mode only. */
    onCancel?: () => void;
    /**
     * Checked on each keystroke in "passive" mode. True drops the burst — the
     * till uses it to stand down while a modal is up, which is state the DOM
     * knows about sooner than React does.
     */
    isPaused?: () => boolean;
    /** Quiet time after the last key before an unterminated scan commits. */
    idleMs?: number;
    /** Mean gap between keys at or below which the input reads as a scanner. */
    scannerGapMs?: number;
    /** Shortest buffer worth submitting. */
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

    // Kept in refs so the listener can stay mounted for the whole scan instead
    // of being torn down and rebuilt on every keystroke.
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
                // On the till, Enter is the cashier's key first — it only means
                // "end of scan" when a scanner-speed burst came before it.
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
                    // A correction is a person, and a person is not a scan.
                    reset();
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                bufferRef.current = bufferRef.current.slice(0, -1);
                setBuffer(bufferRef.current);
                return;
            }

            // Printable characters only — modifiers, arrows and F-keys arrive
            // as multi-character key names.
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

        // Passive listening stays on the bubble phase so anything that stops
        // propagation on its own keys is left alone.
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

    // While disarmed the buffer reads empty rather than holding the last
    // scan's characters, so reopening always starts from a blank line.
    return { buffer: enabled ? buffer : "", clear };
}
