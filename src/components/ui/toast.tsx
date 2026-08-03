"use client";

import {
    createContext,
    type PointerEvent as ReactPointerEvent,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type Toast = {
    id: number;
    tone: ToastTone;
    title: string;
    description?: string;
};

type ToastInput = {
    tone?: ToastTone;
    title: string;
    description?: string;
    /** Milliseconds before auto-dismiss. */
    duration?: number;
};

type ToastContextValue = {
    toast: (input: ToastInput) => void;
    dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const DEFAULT_TOAST_DURATION = 3500;
const SWIPE_DISMISS_DISTANCE = 80;

const TONES: Record<
    ToastTone,
    { icon: typeof CircleCheck; iconClass: string; ring: string }
> = {
    success: {
        icon: CircleCheck,
        iconClass: "text-[#00932a]",
        ring: "ring-[#cfe7d6]",
    },
    error: {
        icon: CircleAlert,
        iconClass: "text-[#b3352f]",
        ring: "ring-[#f2cfcd]",
    },
    info: { icon: Info, iconClass: "text-[#8a5f00]", ring: "ring-[#f0d9a8]" },
};

function ToastItem({
    item,
    onDismiss,
}: {
    item: Toast;
    onDismiss: (id: number) => void;
}) {
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const pointerStart = useRef<number | null>(null);
    const dragOffsetRef = useRef(0);
    const { icon: Icon, iconClass, ring } = TONES[item.tone];

    function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        if (event.button !== 0) {
            return;
        }

        pointerStart.current = event.clientX;
        setIsDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
        if (pointerStart.current === null) {
            return;
        }

        const nextOffset = event.clientX - pointerStart.current;
        dragOffsetRef.current = nextOffset;
        setDragOffset(nextOffset);
    }

    function finishSwipe() {
        if (pointerStart.current === null) {
            return;
        }

        pointerStart.current = null;
        setIsDragging(false);

        if (Math.abs(dragOffsetRef.current) >= SWIPE_DISMISS_DISTANCE) {
            onDismiss(item.id);
            return;
        }

        dragOffsetRef.current = 0;
        setDragOffset(0);
    }

    return (
        <div
            role={item.tone === "error" ? "alert" : "status"}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishSwipe}
            onPointerCancel={finishSwipe}
            style={{
                opacity: Math.max(0.45, 1 - Math.abs(dragOffset) / 240),
                transform: `translateX(${dragOffset}px)`,
                transition:
                    isDragging
                        ? "none"
                        : "transform 160ms ease-out, opacity 160ms ease-out",
            }}
            className={cn(
                "pointer-events-auto flex w-full max-w-sm touch-pan-y cursor-grab select-none items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_16px_40px_-20px_rgba(22,24,28,.45)] ring-1 active:cursor-grabbing",
                "animate-in fade-in slide-in-from-right-4 duration-200 motion-reduce:animate-none",
                ring,
            )}
        >
            <Icon
                className={cn("mt-0.5 size-5 shrink-0", iconClass)}
                aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-[#16181c]">
                    {item.title}
                </p>
                {item.description && (
                    <p className="mt-0.5 text-[13px] text-[#5c6660]">
                        {item.description}
                    </p>
                )}
            </div>
            <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onDismiss(item.id)}
                aria-label="Dismiss notification"
                className="grid size-7 shrink-0 place-items-center rounded-lg text-[#8a8f89] outline-none hover:bg-[#f2f3f1] hover:text-[#16181c] focus-visible:ring-2 focus-visible:ring-[#00932a]"
            >
                <X className="size-4" aria-hidden="true" />
            </button>
        </div>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(0);
    const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

    const dismiss = useCallback((id: number) => {
        const timer = timers.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
        }
        setToasts((current) => current.filter((item) => item.id !== id));
    }, []);

    const toast = useCallback(
        ({ tone = "success", title, description, duration }: ToastInput) => {
            const id = nextId.current++;
            setToasts((current) => [...current, { id, tone, title, description }]);

            const ttl = duration ?? DEFAULT_TOAST_DURATION;
            if (ttl > 0) {
                timers.current.set(
                    id,
                    setTimeout(() => {
                        timers.current.delete(id);
                        setToasts((current) =>
                            current.filter((item) => item.id !== id),
                        );
                    }, ttl),
                );
            }
        },
        [],
    );

    const timersRef = timers;
    useEffect(() => {
        const pending = timersRef.current;
        return () => {
            pending.forEach(clearTimeout);
            pending.clear();
        };
    }, [timersRef]);

    const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

    return (
        <ToastContext.Provider value={value}>
            {children}

            {/*
             * `polite` so a success announcement waits its turn, and the region
             * stays mounted so screen readers pick up later insertions.
             */}
            <div
                aria-live="polite"
                aria-atomic="false"
                aria-label="Notifications"
                className="pointer-events-none fixed top-0 right-0 z-[100] flex w-full flex-col items-end gap-2 p-4 sm:max-w-md"
            >
                {toasts.map((item) => (
                    <ToastItem
                        key={item.id}
                        item={item}
                        onDismiss={dismiss}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error("useToast must be used inside a ToastProvider.");
    }

    return context;
}
