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
    {
        icon: typeof CircleCheck;
        containerClass: string;
        iconBgClass: string;
        iconClass: string;
        titleClass: string;
        descClass: string;
        dismissClass: string;
    }
> = {
    success: {
        icon: CircleCheck,
        containerClass:
            "bg-[#e6f4ea]/95 border border-[#cfe7d6] shadow-[0_12px_32px_-8px_rgba(0,147,42,0.18)] dark:bg-[#1a1e29]/95 dark:border-[#00932a]/50 dark:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.7),0_0_24px_-4px_rgba(0,147,42,0.3)]",
        iconBgClass: "bg-[#c3e6cd] dark:bg-[#00932a]/25 dark:border dark:border-[#00932a]/40",
        iconClass: "text-[#00932a] dark:text-[#34d399]",
        titleClass: "text-[#004d16] dark:text-[#f8fafc] font-semibold",
        descClass: "text-[#00591c]/90 dark:text-[#cbd5e1]",
        dismissClass:
            "text-[#00932a] hover:bg-[#c3e6cd]/60 hover:text-[#004d16] dark:text-slate-400 dark:hover:bg-[#00932a]/30 dark:hover:text-white focus-visible:ring-[#00932a]",
    },
    error: {
        icon: CircleAlert,
        containerClass:
            "bg-[#fdeceb]/95 border border-[#f2cfcd] shadow-[0_12px_32px_-8px_rgba(209,67,65,0.18)] dark:bg-[#1a1e29]/95 dark:border-[#d14341]/50 dark:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.7),0_0_24px_-4px_rgba(209,67,65,0.3)]",
        iconBgClass: "bg-[#fcdbd9] dark:bg-[#d14341]/25 dark:border dark:border-[#d14341]/40",
        iconClass: "text-[#d14341] dark:text-[#ff6b6b]",
        titleClass: "text-[#8a221f] dark:text-[#f8fafc] font-semibold",
        descClass: "text-[#b3352f]/90 dark:text-[#cbd5e1]",
        dismissClass:
            "text-[#d14341] hover:bg-[#fcdbd9]/60 hover:text-[#8a221f] dark:text-slate-400 dark:hover:bg-[#d14341]/30 dark:hover:text-white focus-visible:ring-[#d14341]",
    },
    info: {
        icon: Info,
        containerClass:
            "bg-[#fef9e7]/95 border border-[#f0d9a8] shadow-[0_12px_32px_-8px_rgba(254,185,13,0.18)] dark:bg-[#1a1e29]/95 dark:border-[#feb90d]/50 dark:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.7),0_0_24px_-4px_rgba(254,185,13,0.3)]",
        iconBgClass: "bg-[#fde6b1] dark:bg-[#feb90d]/25 dark:border dark:border-[#feb90d]/40",
        iconClass: "text-[#d99700] dark:text-[#fbbf24]",
        titleClass: "text-[#7a5300] dark:text-[#f8fafc] font-semibold",
        descClass: "text-[#8a5f00]/90 dark:text-[#cbd5e1]",
        dismissClass:
            "text-[#d99700] hover:bg-[#fde6b1]/60 hover:text-[#7a5300] dark:text-slate-400 dark:hover:bg-[#feb90d]/30 dark:hover:text-white focus-visible:ring-[#d99700]",
    },
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
                className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2.5 p-4 sm:items-end sm:p-6"
            >
                {toasts.map((item) => {
                    const {
                        icon: Icon,
                        containerClass,
                        iconBgClass,
                        iconClass,
                        titleClass,
                        descClass,
                        dismissClass,
                    } = TONES[item.tone];

                    return (
                        <div
                            key={item.id}
                            className={cn(
                                "pointer-events-auto flex w-full max-w-sm items-start gap-3.5 rounded-2xl p-4 transition-all duration-300 animate-toast-in backdrop-blur-sm",
                                containerClass,
                            )}
                        >
                            <div
                                className={cn(
                                    "flex size-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105",
                                    iconBgClass,
                                )}
                            >
                                <Icon
                                    className={cn("size-5", iconClass)}
                                    aria-hidden="true"
                                />
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5">
                                <p className={cn("text-[14px] leading-snug", titleClass)}>
                                    {item.title}
                                </p>
                                {item.description && (
                                    <p className={cn("mt-0.5 text-[13px] leading-snug", descClass)}>
                                        {item.description}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => dismiss(item.id)}
                                aria-label="Dismiss notification"
                                className={cn(
                                    "grid size-7 shrink-0 place-items-center rounded-lg outline-none transition-colors focus-visible:ring-2",
                                    dismissClass,
                                )}
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
