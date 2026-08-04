"use client";

import {
  Search,
  LayoutGrid,
  Clock,
  Bell,
  Wifi,
  Check,
  Menu,
  X,
  MonitorOff,
  Lock,
  LayoutDashboard,
  Monitor,
  ShoppingBag,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { POS_ROUTES, SALES_HOME } from "@/lib/pos-routes";
import BrandLogo from "@/components/brand/BrandLogo";
import UserMenu from "@/components/layout/UserMenu";
import { NotificationMenu } from "@/components/notification/Notification";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PosCategoryOption = {
  id: string;
  name: string;
};

export interface NavbarProps {
  managerName: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  categories: PosCategoryOption[];
  selectedCategoryId: string;
  onCategoryChange: (value: string) => void;
}

export function Navbar({
  managerName,
  searchQuery,
  onSearchQueryChange,
  categories,
  selectedCategoryId,
  onCategoryChange,
}: NavbarProps) {
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
    <nav className="scrollbar-hide sticky top-0 z-50 flex h-16 items-center border-b border-[#d9d9d9] bg-white/90 px-3 min-[901px]:overflow-x-auto min-[901px]:px-0">
      <div className="flex min-w-0 flex-1 items-center gap-2 min-[901px]:h-full min-[901px]:flex-[0_0_56.6%] min-[901px]:gap-[45px] min-[901px]:px-[30px]">
        {/* 0–900px: hamburger opens the "everything else" dropdown */}
        <MobileMenu
          router={router}
          time={time}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={onCategoryChange}
        />

        {/* The logo is also the unobtrusive way back to Sales in the reference toolbar. */}
        <button
          type="button"
          onClick={() => router.push(SALES_HOME)}
          title="Back to sales dashboard"
          aria-label="Back to sales dashboard"
          className="flex h-9 w-24 shrink-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary min-[901px]:w-[148px]"
        >
          <BrandLogo variant="wordmark" alt="" preload />
        </button>

        <div className="hidden min-w-0 flex-1 items-center gap-2 min-[901px]:flex">
          <div className="flex h-9 w-[323px] min-w-0 shrink-0 items-center gap-2 rounded-full border border-brand-yellow bg-white/90 px-3 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-gray-500" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search for a product..."
              className="w-full min-w-0 bg-transparent text-sm text-gray-600 placeholder:text-gray-500 focus:outline-none"
            />
          </div>

          <CategorySelect
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={onCategoryChange}
          />

          {/* Monitor toggle — kept local, purely UI state, no data behind it */}
          <MonitorToggle />
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3 min-[901px]:ml-0 min-[901px]:h-full min-[901px]:min-w-0 min-[901px]:flex-1 min-[901px]:justify-end min-[901px]:gap-8 min-[901px]:px-3">
        {/* 0–900px: icon-only search trigger, sits next to bell like the reference header */}
        <MobileSearchTrigger
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
        />

        {/* It looks like the register status from the design and remains the
            existing action that takes the cashier to close the drawer. */}
        <button
          type="button"
          onClick={() => router.push(POS_ROUTES.closeRegister)}
          title="Close register"
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-primary px-2.5 text-sm font-semibold text-primary outline-none transition-colors hover:bg-primary hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden min-[901px]:inline">Cash Register Open</span>
          <span className="sr-only min-[901px]:hidden">Close register</span>
        </button>

        {/* Clock */}
        <div className="hidden items-center gap-1.5 text-sm text-[#020409] min-[901px]:flex">
          <Clock className="h-4 w-4" />
          {time}
        </div>

        {/* Same API-backed profile and POST logout control as the dashboard. */}
        <UserMenu name={managerName} compact />

        {/* Notifications — visible at every size, matches reference header */}
        <NotificationMenu />

        {/* Online status */}
        <div className="hidden h-8 w-[97px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white min-[901px]:flex">
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
  categories,
  selectedCategoryId,
  onCategoryChange,
}: {
  router: ReturnType<typeof useRouter>;
  time: string;
  categories: PosCategoryOption[];
  selectedCategoryId: string;
  onCategoryChange: (value: string) => void;
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
              <BrandLogo variant="wordmark" className="w-24" />
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
              <CategorySelect
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onCategoryChange={(value) => {
                  onCategoryChange(value);
                  setIsOpen(false);
                }}
                mobile
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

            <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push(SALES_HOME);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                Back to dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push(POS_ROUTES.closeRegister);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-primary px-3 py-2 text-sm font-bold text-primary"
              >
                <Lock className="h-4 w-4 shrink-0" />
                Close Register
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

function CategorySelect({
  categories,
  selectedCategoryId,
  onCategoryChange,
  mobile = false,
}: {
  categories: PosCategoryOption[];
  selectedCategoryId: string;
  onCategoryChange: (value: string) => void;
  mobile?: boolean;
}) {
  const items = Object.fromEntries([
    ["ALL", "All categories"],
    ...categories.map((category) => [category.id, category.name]),
  ]);

  return (
    <Select
      value={selectedCategoryId}
      items={items}
      onValueChange={(value) => onCategoryChange(String(value ?? "ALL"))}
    >
      <SelectTrigger
        aria-label="Filter by category"
        className={
          mobile
            ? "h-12 w-full rounded-none border-0 bg-transparent px-4 py-0 text-sm font-medium text-gray-700 shadow-none hover:bg-gray-50 focus-visible:ring-0"
            : "h-9 w-[190px] rounded-full border-0 bg-white/90 px-3 py-0 text-sm font-normal text-gray-500 shadow-none focus-visible:ring-2 focus-visible:ring-brand-yellow/30"
        }
      >
        <LayoutGrid
          className={
            mobile
              ? "size-4.5 shrink-0 text-secondary"
              : "size-4 shrink-0 text-brand-yellow"
          }
          aria-hidden="true"
        />
        <SelectValue />
      </SelectTrigger>

      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        sideOffset={4}
        className="max-h-96 min-w-(--anchor-width) rounded-xl border border-[#334155] bg-white/90 p-px text-[#636b74] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-0 backdrop-blur-sm"
      >
        <SelectGroup className="px-0 py-2">
          <CategorySelectItem value="ALL">All categories</CategorySelectItem>
          {categories.map((category) => (
            <CategorySelectItem key={category.id} value={category.id}>
              {category.name}
            </CategorySelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function CategorySelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <SelectItem
      value={value}
      className="group gap-0 rounded-none px-4 py-3 text-[18px] leading-7 font-normal text-[#636b74] focus:bg-[#f5f5f5]/70 focus:text-[#636b74] data-[selected]:text-[#636b74] [&>span:first-child]:gap-0 [&>span:last-child]:hidden"
    >
      <span className="mr-4 grid size-6 shrink-0 place-items-center rounded-[4px] border border-[#f5f5f5] bg-[#f5f5f5] group-data-[selected]:border-primary group-data-[selected]:bg-primary">
        <Check
          className="hidden size-4 text-white group-data-[selected]:block"
          strokeWidth={3}
          aria-hidden="true"
        />
      </span>
      <span>{children}</span>
    </SelectItem>
  );
}

function MobileSearchTrigger({
  searchQuery,
  onSearchQueryChange,
}: {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}) {
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
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Search for an item..."
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
      className="hidden h-9 shrink-0 items-center justify-center rounded-lg bg-white/90 px-3 text-brand-yellow hover:text-brand-yellow min-[901px]:flex"
    >
      {isDisplayOn ? (
        <Monitor className="h-4.5 w-4.5" />
      ) : (
        <MonitorOff className="h-4.5 w-4.5" />
      )}
    </button>
  );
}
