"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, PanelsTopLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { persistViewMode, type ViewMode } from "@/lib/view-mode";

const OPTIONS: { mode: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
    { mode: "apps", label: "App view", icon: LayoutGrid },
    { mode: "dashboard", label: "Dashboard view", icon: PanelsTopLeft },
];

export default function ViewModeToggle({ current }: { current: ViewMode }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const select = (mode: ViewMode) => {
        if (mode === current) return;

        persistViewMode(mode);
        // Switching apps→dashboard from inside an app keeps you where you are;
        // the shell around you just changes. Going the other way returns to the
        // launcher, which is that mode's home.
        startTransition(() => {
            if (mode === "apps") router.push("/dashboard");
            router.refresh();
        });
    };

    return (
        <div
            role="group"
            aria-label="View mode"
            className="flex items-center gap-1 rounded-xl border border-[#e2e2de] bg-white p-1"
        >
            {OPTIONS.map(({ mode, label, icon: Icon }) => {
                const active = mode === current;

                return (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => select(mode)}
                        aria-pressed={active}
                        disabled={pending}
                        title={label}
                        className={cn(
                            "flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#00932a] disabled:opacity-60",
                            active
                                ? "bg-[#f2f3f1] text-[#16181c]"
                                : "text-[#8a8f89] hover:text-[#16181c]",
                        )}
                    >
                        <Icon className="size-4" aria-hidden="true" />
                        <span className="sr-only lg:not-sr-only">{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
