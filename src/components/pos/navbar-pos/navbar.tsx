"use client";

import {
  Search,
  LayoutGrid,
  Clock,
  Bell,
  Wifi,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  MonitorOff,
  Unlock,
  UserCircle,
  Monitor,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";


export function Navbar() {
  const router = useRouter();
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      );
    update();
    const id = setInterval(update, 1000 * 30);
    return () => clearInterval(id);
  }, []);

  return (
    <nav className="scrollbar-hide sticky top-0 z-50 flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-2.5 min-[901px]:gap-10 min-[901px]:overflow-x-auto min-[901px]:px-5">
      {/* 0–900px: hamburger opens the "everything else" dropdown */}
      <MobileMenu router={router} time={time} />

      {/* Logo */}
      <h1 className="shrink-0 text-lg font-extrabold tracking-tight min-[901px]:text-xl">
        <span>Fluxi</span>
        <span className="text-primary">Biz</span>
      </h1>

      <div className="hidden w-full min-w-0 items-center gap-6 min-[901px]:flex">
        {/* Search — full inline bar, 901px and up only */}
        <div className="flex min-w-0 flex-1 max-w-85 items-center gap-2 rounded-full border border-secondary px-4 py-2">
          <Search className="h-4 w-4 shrink-0 text-gray-500" />
          <input
            type="text"
            placeholder="Search for a product..."
            className="w-full min-w-0 text-sm text-gray-600 placeholder:text-gray-500 focus:outline-none"
          />
        </div>

        {/* All categories */}
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-gray-500"
        >
          <LayoutGrid className="h-4 w-4 text-secondary" />
          All categories
          <ChevronDown className="h-4 w-4" />
        </button>

        {/* Monitor toggle — kept local, purely UI state, no data behind it */}
        <MonitorToggle />
      </div>

      {/* Spacer pushes the rest to the right */}
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {/* 0–900px: icon-only search trigger, sits next to bell like the reference header */}
        <MobileSearchTrigger />

        <button
          type="button"
          onClick={() => router.push("/sales/close-cash-register")}
          className="hidden shrink-0 items-center gap-1.5 rounded-lg border-2 border-primary px-5 py-1.5 text-sm font-bold text-primary min-[901px]:flex"
        >
          <Unlock className="h-3.5 w-3.5 shrink-0 font-bold" />
          Cash Register Open
        </button>

        {/* Clock */}
        <div className="hidden items-center gap-1.5 text-sm text-gray-500 min-[901px]:flex">
          <Clock className="h-4 w-4" />
          {time}
        </div>

        {/* User */}
        <button
          type="button"
          className="hidden shrink-0 text-secondary min-[901px]:block"
        >
          <UserCircle className="h-6 w-6" />
        </button>

        {/* Notifications — visible at every size, matches reference header */}
        <button type="button" className="shrink-0 text-secondary">
          <Bell className="h-6 w-6" strokeWidth={2} />
        </button>

        {/* Online status */}
        <div className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white min-[901px]:flex">
          <Wifi className="h-3.5 w-3.5" />
          Online
        </div>
      </div>
    </nav>
  );
}

function MobileMenu({
  router,
  time,
}: {
  router: ReturnType<typeof useRouter>;
  time: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDisplayOn, setIsDisplayOn] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <div className="min-[901px]:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        className="shrink-0 text-secondary"
      >
        <Menu className="h-6 w-6" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/20"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-down panel */}
          <div className="animate-in fade-in slide-in-from-top-2 fixed inset-x-0 top-0 z-50 rounded-b-2xl bg-white shadow-lg duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="text-base font-extrabold tracking-tight">
                <span>Fluxi</span>
                <span className="text-primary">Biz</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                className="text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col py-1">
              <MenuRow
                icon={<LayoutGrid className="h-4.5 w-4.5 text-secondary" />}
                label="All categories"
                right={<ChevronRight className="h-4 w-4 text-gray-300" />}
                onClick={() => setIsOpen(false)}
              />

              <MenuRow
                icon={<UserCircle className="h-4.5 w-4.5 text-secondary" />}
                label="Account"
                right={<ChevronRight className="h-4 w-4 text-gray-300" />}
                onClick={() => setIsOpen(false)}
              />

              <MenuRow
                icon={
                  isDisplayOn ? (
                    <Monitor className="h-4.5 w-4.5 text-secondary" />
                  ) : (
                    <MonitorOff className="h-4.5 w-4.5 text-secondary" />
                  )
                }
                label={
                  isDisplayOn ? "Customer display on" : "Customer display off"
                }
                right={
                  <span
                    className={`text-xs font-semibold ${isDisplayOn ? "text-primary" : "text-gray-400"}`}
                  >
                    {isDisplayOn ? "On" : "Off"}
                  </span>
                }
                onClick={() => setIsDisplayOn((prev) => !prev)}
              />

              <MenuRow
                icon={<Clock className="h-4.5 w-4.5 text-secondary" />}
                label="Time"
                right={<span className="text-sm text-gray-500">{time}</span>}
              />

              <MenuRow
                icon={<Wifi className="h-4.5 w-4.5 text-primary" />}
                label="Connection"
                right={
                  <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                    Online
                  </span>
                }
              />
            </div>

            <div className="px-4 pb-4 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/sales/close-cash-register");
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-primary px-3 py-2 text-sm font-bold text-primary"
              >
                <Unlock className="h-4 w-4 shrink-0" />
                Cash Register Open
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuRow({
  icon,
  label,
  right,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-gray-50"
    >
      <span className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </span>
      {right}
    </button>
  );
}

function MobileSearchTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <div className="min-[901px]:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open search"
        className="shrink-0 mt-1.5 text-secondary"
      >
        <Search className="h-6 w-6" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          <div className="animate-in fade-in slide-in-from-top-2 fixed inset-x-0 top-0 z-50 flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-2.5 shadow-sm duration-150">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-gray-50 px-3.5 py-2">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search for a product..."
                className="w-full min-w-0 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="shrink-0 text-sm font-medium text-primary"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MonitorToggle() {
  const [isDisplayOn, setIsDisplayOn] = useState(true);
  return (
    <button
      type="button"
      onClick={() => setIsDisplayOn((prev) => !prev)}
      aria-pressed={isDisplayOn}
      aria-label={isDisplayOn ? "Turn display off" : "Turn display on"}
      className="hidden shrink-0 text-secondary hover:text-secondary min-[901px]:block"
    >
      {isDisplayOn ? (
        <Monitor className="h-4.5 w-4.5" />
      ) : (
        <MonitorOff className="h-4.5 w-4.5" />
      )}
    </button>
  );
}