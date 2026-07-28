"use client";

import {
    useState,
    useRef,
    useEffect,
    useCallback,
    type PointerEvent as ReactPointerEvent,
    type MouseEvent as ReactMouseEvent,
    type ComponentType,
} from "react";
import Link from "next/link";
import {
    Building2,
    Users,
    Boxes,
    LayoutDashboard,
    ShoppingCart,
    Settings,
    Bell,
    Move,
    type LucideProps,
} from "lucide-react";

/**
 * Colors read straight from your CSS variables (globals.css):
 *   --primary #00932a  --secondary #feb90d  --accent #d14341
 * Each tile keeps a per-module gradient so the grid stays colorful
 * while staying on-brand.
 */
type ModuleDef = {
    id: string;
    label: string;
    hint: string;
    href: string;
    Icon: ComponentType<LucideProps>;
    from: string;
    to: string;
};

const MODULES: ModuleDef[] = [
    {
        id: "business",
        label: "Business Management",
        hint: "Profile & settings",
        href: "/business/profile",
        Icon: Building2,
        from: "#12b24a",
        to: "#00752c",
    },
    {
        id: "users",
        label: "User Management",
        hint: "Staff & roles",
        href: "/employees",
        Icon: Users,
        from: "#19c37d",
        to: "#0e8f5b",
    },
    {
        id: "inventory",
        label: "Inventory Management",
        hint: "Stock & catalog",
        href: "/inventory",
        Icon: Boxes,
        from: "#ffc93c",
        to: "#f39a00",
    },
    {
        id: "overview",
        label: "Overview Dashboard",
        hint: "Live analytics",
        href: "/analytics",
        Icon: LayoutDashboard,
        from: "#3ddc63",
        to: "#0f9a2c",
    },
    {
        id: "sales",
        label: "Sale Management",
        hint: "Orders & receipts",
        href: "/sales",
        Icon: ShoppingCart,
        from: "#ff6f61",
        to: "#d14341",
    },
    {
        id: "account",
        label: "Account",
        hint: "Your preferences",
        href: "/settings",
        Icon: Settings,
        from: "#8fa3b4",
        to: "#5c6f80",
    },
];

const ORDER_KEY = "ipos.module.order";

export default function DashboardShell({
    managerName,
}: {
    managerName: string;
}) {
    const [entered, setEntered] = useState(false);
    const [overlayMounted, setOverlayMounted] = useState(true);

    // Auto intro: the "Welcome" text plays, then the dashboard un-blurs
    // and the overlay is removed — no interaction required.
    useEffect(() => {
        const reveal = setTimeout(() => setEntered(true), 1500);
        const cleanup = setTimeout(() => setOverlayMounted(false), 2200);
        return () => {
            clearTimeout(reveal);
            clearTimeout(cleanup);
        };
    }, []);

    return (
        <div
            className="relative min-h-screen text-[#0f1a12] font-googlesans"
            style={{
                background:
                    "radial-gradient(1100px 560px at 88% -12%, rgba(254,185,13,.14), transparent 60%)," +
                    "radial-gradient(1000px 680px at -8% 112%, rgba(0,147,42,.14), transparent 55%)," +
                    "linear-gradient(180deg,#f2f7f1,#eaf1e9)",
            }}
        >
            <div
                className="transition-[filter,transform] duration-[600ms] ease-out"
                style={{
                    filter: entered ? "blur(0px)" : "blur(16px)",
                    transform: entered ? "scale(1)" : "scale(1.03)",
                    pointerEvents: entered ? "auto" : "none",
                }}
            >
                <Dashboard managerName={managerName} />
            </div>

            {overlayMounted && <WelcomeIntro entered={entered} />}
        </div>
    );
}

/* --------------------------- Welcome intro --------------------------- */
const WELCOME_KEYFRAMES = `
@keyframes iposWelcomeIn {
  0%   { opacity: 0; transform: scale(.72); filter: blur(6px); }
  22%  { opacity: 1; transform: scale(1);    filter: blur(0px); }
  55%  { opacity: 1; transform: scale(1.06); filter: blur(0px); }
  100% { opacity: 0; transform: scale(2.6);  filter: blur(16px); }
}
.ipos-welcome-text { animation: iposWelcomeIn 2s cubic-bezier(.22,1,.36,1) forwards; }
@media (prefers-reduced-motion: reduce) {
  .ipos-welcome-text { animation: none; opacity: 0; }
}
`;

function WelcomeIntro({ entered }: { entered: boolean }) {
    return (
        <div
            className="fixed inset-0 z-40 grid place-items-center overflow-hidden transition-opacity duration-[600ms]"
            style={{
                opacity: entered ? 0 : 1,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                background: "rgba(255,255,255,.12)",
            }}
        >
            <style>{WELCOME_KEYFRAMES}</style>
            <span
                className="ipos-welcome-text select-none font-extrabold tracking-tight"
                style={{
                    fontSize: "clamp(64px, 13vw, 168px)",
                    lineHeight: 1,
                    color: "#000",
                    willChange: "transform, filter, opacity",
                }}
            >
                Welcome
            </span>
        </div>
    );
}

/* ----------------------------- Dashboard ----------------------------- */
function Dashboard({ managerName }: { managerName: string }) {
    return (
        <main className="mx-auto max-w-[1120px] px-5 pt-7 pb-16">
            <div
                className="rounded-[32px] border border-black/[.06] bg-white/70 p-[clamp(20px,3vw,34px)] backdrop-blur-md"
                style={{ boxShadow: "0 24px 60px -34px rgba(9,40,20,.4)" }}
            >
                <Header managerName={managerName} />

                <div className="mx-0.5 mt-6 mb-5">
                    <h2 className="m-0 text-[24px] font-extrabold tracking-tight">
                        Hello, {managerName.split(" ")[0]}
                    </h2>
                    <p className="mt-1 inline-flex items-center gap-2 text-[14px] text-[#6b7a6e]">
                        <Move size={14} strokeWidth={2.2} /> Pick a module —
                        drag any tile to rearrange your grid.
                    </p>
                </div>

                <SortableGrid />
            </div>
        </main>
    );
}

function Header({ managerName }: { managerName: string }) {
    const initials = managerName
        .split(" ")
        .map((w) => w[0])
        .join("");

    return (
        <header className="flex items-center justify-between gap-4">
            <Wordmark />
            <div className="flex items-center gap-3.5">
                <button
                    aria-label="Notifications"
                    className="relative grid h-10 w-10 place-items-center rounded-xl border border-black/[.08] bg-white"
                >
                    <Bell size={18} strokeWidth={2} />
                    <span className="absolute right-2.5 top-2 h-[7px] w-[7px] rounded-full bg-[#d14341] ring-2 ring-white" />
                </button>

                <div className="flex items-center gap-2.5 rounded-full border border-black/10 bg-white py-[5px] pl-[5px] pr-3.5">
                    <span
                        className="grid h-[34px] w-[34px] place-items-center rounded-full text-[13px] font-bold text-white"
                        style={{
                            background:
                                "linear-gradient(135deg,#00932a,#0b7a24)",
                        }}
                    >
                        {initials}
                    </span>
                    <span className="flex flex-col leading-tight">
                        <span className="text-[13px] font-bold">
                            {managerName}
                        </span>
                        <span className="text-[10.5px] uppercase tracking-wider text-[#6b7a6e]">
                            General Manager
                        </span>
                    </span>
                </div>
            </div>
        </header>
    );
}

function Wordmark({
    size = "md",
    center = false,
}: {
    size?: "md" | "lg";
    center?: boolean;
}) {
    const box = size === "lg" ? 44 : 34;
    const radius = size === "lg" ? 13 : 10;
    const glyph = size === "lg" ? 22 : 18;
    const text = size === "lg" ? "text-[24px]" : "text-[19px]";

    return (
        <div
            className={`inline-flex items-center gap-2.5 ${center ? "justify-center" : ""}`}
        >
            <span
                className="grid place-items-center"
                style={{
                    width: box,
                    height: box,
                    borderRadius: radius,
                    background: "linear-gradient(140deg,#00932a,#0b7a24)",
                    boxShadow: "0 10px 20px -10px rgba(0,147,42,.7)",
                }}
            >
                <ShoppingCart size={glyph} strokeWidth={2.4} color="#fff" />
            </span>
            <span className={`font-extrabold tracking-tight ${text}`}>
                i<span className="text-[#00932a]">POS</span>
            </span>
        </div>
    );
}

/* ------------------------- Draggable tile grid ------------------------ */
function SortableGrid() {
    const [items, setItems] = useState<ModuleDef[]>(MODULES);
    const [dragId, setDragId] = useState<string | null>(null);
    const [pointer, setPointer] = useState({ x: 0, y: 0 });
    const [dragGeometry, setDragGeometry] = useState({
        grabX: 0,
        grabY: 0,
        width: 0,
        height: 0,
    });

    const pendingId = useRef<string | null>(null);
    const start = useRef({ x: 0, y: 0 });
    const refs = useRef<Record<string, HTMLAnchorElement | null>>({});
    const itemsRef = useRef(items);
    const moved = useRef(false);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    // restore saved order
    useEffect(() => {
        try {
            const saved = localStorage.getItem(ORDER_KEY);
            if (!saved) return;
            const order: string[] = JSON.parse(saved);
            const restore = window.setTimeout(() => {
                setItems((prev) => {
                    const byId = new Map(prev.map((m) => [m.id, m]));
                    const next = order
                        .map((id) => byId.get(id))
                        .filter(Boolean) as ModuleDef[];
                    prev.forEach((m) => next.includes(m) || next.push(m));
                    return next.length === prev.length ? next : prev;
                });
            }, 0);
            return () => window.clearTimeout(restore);
        } catch {
            /* ignore */
        }
    }, []);

    const persist = (list: ModuleDef[]) => {
        try {
            localStorage.setItem(
                ORDER_KEY,
                JSON.stringify(list.map((m) => m.id)),
            );
        } catch {
            /* ignore */
        }
    };

    const findOver = (x: number, y: number) => {
        for (const m of itemsRef.current) {
            const el = refs.current[m.id];
            if (!el) continue;
            const r = el.getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
                return m.id;
        }
        return null;
    };

    const reorder = useCallback(
        (overId: string) => {
            setItems((prev) => {
                const from = prev.findIndex((m) => m.id === dragId);
                const to = prev.findIndex((m) => m.id === overId);
                if (from < 0 || to < 0 || from === to) return prev;
                const next = [...prev];
                const [m] = next.splice(from, 1);
                next.splice(to, 0, m);
                return next;
            });
        },
        [dragId],
    );

    useEffect(() => {
        if (!pendingId.current && !dragId) return;

        const move = (e: PointerEvent) => {
            setPointer({ x: e.clientX, y: e.clientY });
            if (!dragId && pendingId.current) {
                const dx = e.clientX - start.current.x;
                const dy = e.clientY - start.current.y;
                if (Math.hypot(dx, dy) > 6) {
                    moved.current = true;
                    setDragId(pendingId.current);
                }
                return;
            }
            if (dragId) {
                const over = findOver(e.clientX, e.clientY);
                if (over && over !== dragId) reorder(over);
            }
        };

        const up = () => {
            pendingId.current = null;
            if (dragId) persist(itemsRef.current);
            setDragId(null);
        };

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
    }, [dragId, reorder]);

    const onDown = (e: ReactPointerEvent<HTMLAnchorElement>, id: string) => {
        const el = refs.current[id];
        if (!el) return;
        const r = el.getBoundingClientRect();
        pendingId.current = id;
        moved.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        setDragGeometry({
            grabX: e.clientX - r.left,
            grabY: e.clientY - r.top,
            width: r.width,
            height: r.height,
        });
        setPointer({ x: e.clientX, y: e.clientY });
    };

    const dragged = items.find((m) => m.id === dragId);

    return (
        <>
            <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3">
                {items.map((m) => (
                    <Tile
                        key={m.id}
                        module={m}
                        innerRef={(el) => (refs.current[m.id] = el)}
                        isPlaceholder={dragId === m.id}
                        onPointerDown={(e) => onDown(e, m.id)}
                        onClick={(e) => {
                            if (moved.current) e.preventDefault();
                        }}
                    />
                ))}
            </div>

            {dragged && (
                <div
                    className="pointer-events-none fixed z-[60]"
                    style={{
                        left: pointer.x - dragGeometry.grabX,
                        top: pointer.y - dragGeometry.grabY,
                        width: dragGeometry.width,
                        height: dragGeometry.height,
                        transform: "scale(1.04) rotate(-1.5deg)",
                    }}
                >
                    <Tile module={dragged} floating />
                </div>
            )}
        </>
    );
}

function Tile({
    module,
    innerRef,
    onPointerDown,
    onClick,
    isPlaceholder,
    floating,
}: {
    module: ModuleDef;
    innerRef?: (el: HTMLAnchorElement | null) => void;
    onPointerDown?: (e: ReactPointerEvent<HTMLAnchorElement>) => void;
    onClick?: (e: ReactMouseEvent<HTMLAnchorElement>) => void;
    isPlaceholder?: boolean;
    floating?: boolean;
}) {
    const { label, hint, href, Icon, from, to } = module;
    const className = `flex touch-none select-none flex-col items-center gap-4 rounded-[24px] border bg-white px-[22px] pb-[26px] pt-[30px] text-center ${
        floating ? "cursor-grabbing" : "cursor-grab"
    } ${floating ? "" : "transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-[3px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00932a]"}`;
    const style = {
        opacity: isPlaceholder ? 0.35 : 1,
        borderStyle: isPlaceholder ? "dashed" : "solid",
        borderColor: "rgba(15,26,18,.07)",
        boxShadow: floating
            ? "0 30px 50px -18px rgba(9,40,20,.5)"
            : "0 8px 20px -18px rgba(9,40,20,.3)",
    };
    const content = (
        <>
            <span
                className="grid h-[68px] w-[68px] place-items-center rounded-[18px]"
                style={{
                    background: `linear-gradient(140deg, ${from}, ${to})`,
                    boxShadow: `0 12px 22px -12px ${to}`,
                }}
            >
                <Icon size={30} strokeWidth={2.1} color="#fff" />
            </span>
            <span className="text-[15.5px] font-bold leading-tight">
                {label}
            </span>
            <span className="-mt-1.5 text-[12.5px] text-[#6b7a6e]">
                {hint}
            </span>
        </>
    );

    if (floating) {
        return (
            <div className={className} style={style}>
                {content}
            </div>
        );
    }

    return (
        <Link
            href={href}
            ref={innerRef}
            draggable={false}
            onPointerDown={onPointerDown}
            onClick={onClick}
            className={className}
            style={style}
        >
            {content}
        </Link>
    );
}
