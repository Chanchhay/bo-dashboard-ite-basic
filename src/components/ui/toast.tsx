"use client";

import {
    createContext,
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
    /** Milliseconds before auto-dismiss. Errors stay until dismissed. */
    duration?: number;
};

type ToastContextValue = {
    toast: (input: ToastInput) => void;
    dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

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

            // Errors usually need reading and acting on, so they persist.
            const ttl = duration ?? (tone === "error" ? 0 : 4500);
            if (ttl > 0) {
                timers.current.set(
                    id,
                    setTimeout(
                        () =>
                            setToasts((current) =>
                                current.filter((item) => item.id !== id),
                            ),
                        ttl,
                    ),
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
                className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
            >
                {toasts.map((item) => {
                    const { icon: Icon, iconClass, ring } = TONES[item.tone];

                    return (
                        <div
                            key={item.id}
                            className={cn(
                                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white p-4 ring-1 shadow-[0_16px_40px_-20px_rgba(22,24,28,.45)]",
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
                                onClick={() => dismiss(item.id)}
                                aria-label="Dismiss notification"
                                className="grid size-7 shrink-0 place-items-center rounded-lg text-[#8a8f89] outline-none hover:bg-[#f2f3f1] hover:text-[#16181c] focus-visible:ring-2 focus-visible:ring-[#00932a]"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                    );
                })}
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
