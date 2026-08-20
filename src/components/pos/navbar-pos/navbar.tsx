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
import { TourButton } from "@/components/onboarding/TourButton";
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
    <nav className="scrollbar-hide sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#d9d9d9] bg-white/90 dark:bg-[#0f1219]/90 px-3 sm:px-4 lg:px-6">
      {/* Left section: Hamburger (mobile) + Brand Logo */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <MobileMenu
          router={router}
          time={time}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={onCategoryChange}
        />

        <button
          type="button"
          onClick={() => router.push(SALES_HOME)}
          title="Back to sales dashboard"
          aria-label="Back to sales dashboard"
          className="flex h-7 sm:h-9 w-auto shrink-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <BrandLogo variant="wordmark" alt="" preload className="h-6 sm:h-7 lg:h-8 w-auto shrink-0" />
        </button>
      </div>

      {/* Center section: Search Bar + Category Selector (1025px+) */}
      <div className="hidden min-w-0 flex-1 items-center justify-center gap-2.5 px-3 min-[1025px]:flex">
        <div className="flex h-9 flex-1 min-w-[160px] max-w-[320px] items-center gap-2 rounded-full border border-brand-yellow bg-white/90 dark:bg-[#1a1e29] px-3 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-brand-yellow" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search for a product..."
            className="w-full min-w-0 bg-transparent text-sm text-gray-600 dark:text-gray-200 placeholder:text-gray-500 focus:outline-none"
          />
        </div>

        <CategorySelect
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={onCategoryChange}
        />

        <MonitorToggle />
      </div>

      {/* Right section: Controls, Avatar, Bell, Online Badge */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 lg:gap-3.5">
        <MobileSearchTrigger
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
        />

        <button
          type="button"
          onClick={() => router.push(POS_ROUTES.closeRegister)}
          title="Close register"
          className="flex h-8 sm:h-9 shrink-0 items-center gap-1.5 rounded-lg border border-primary px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-primary outline-none transition-colors hover:bg-primary hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Cash Register Open</span>
          <span className="sr-only sm:hidden">Close register</span>
        </button>

        <div className="hidden items-center gap-1.5 text-xs lg:text-sm text-gray-700 dark:text-gray-200 font-medium xl:flex">
          <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span>{time}</span>
        </div>

        <UserMenu name={managerName} compact />

        <NotificationMenu />

        <TourButton />

        <div className="hidden h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-semibold text-white xl:flex">
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
    <div className="flex items-center min-[901px]:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        className="flex size-10 shrink-0 items-center justify-center text-gray-700 dark:text-gray-200 hover:text-primary transition-colors"
      >
        <Menu className="size-5.5" />
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
                    <Monitor className="h-4.5 w-4.5 text-primary" />
                  ) : (
                    <MonitorOff className="h-4.5 w-4.5 text-primary" />
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
                icon={<Clock className="h-4.5 w-4.5 text-primary" />}
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
            ? "h-12 w-full justify-between rounded-none border-0 bg-transparent px-4 py-0 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-none hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:ring-0"
            : "h-9 w-[170px] shrink-0 justify-between gap-2 rounded-full border-0 bg-white/90 dark:bg-[#1a1e29] px-3.5 py-0 text-sm font-normal text-gray-600 dark:text-gray-200 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow/30 *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate"
        }
      >
        <LayoutGrid
          className={
            mobile
              ? "size-4.5 shrink-0 text-primary"
              : "size-4 shrink-0 text-brand-yellow"
          }
          aria-hidden="true"
        />
        <SelectValue />
      </SelectTrigger>

      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        sideOffset={6}
        className="max-h-96 min-w-[200px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#1a1e29]/95 p-1.5 shadow-xl shadow-black/10 backdrop-blur-md transition-all"
      >
        <SelectGroup className="space-y-1 p-0">
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
      className="group flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 data-[selected]:bg-emerald-50 dark:data-[selected]:bg-emerald-950/50 data-[selected]:text-emerald-700 dark:data-[selected]:text-emerald-400 data-[selected]:font-semibold [&>span:first-child]:flex [&>span:first-child]:w-full [&>span:first-child]:items-center [&>span:first-child]:justify-between [&>span:last-child]:hidden"
    >
      <span className="truncate">{children}</span>
      <Check
        className="hidden size-4 shrink-0 text-primary dark:text-emerald-400 group-data-[selected]:block"
        strokeWidth={2.5}
        aria-hidden="true"
      />
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
    <div className="flex items-center min-[901px]:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open search"
        className="flex size-10 shrink-0 items-center justify-center text-brand-yellow hover:opacity-80 transition-opacity"
      >
        <Search className="size-5.5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          <div className="animate-in fade-in slide-in-from-top-2 fixed inset-x-0 top-0 z-50 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1e29] px-3 py-2.5 shadow-sm duration-150">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-gray-50 dark:bg-[#12151e] border border-brand-yellow/40 px-3.5 py-2">
              <Search className="h-4 w-4 shrink-0 text-brand-yellow" />
              <input
                ref={inputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Search for an item..."
                className="w-full min-w-0 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none"
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
  const openCustomerDisplay = () => {
    window.open("/customer-display/term_default", "_blank", "width=1280,height=800");
  };

  return (
    <button
      type="button"
      onClick={openCustomerDisplay}
      title="Open Customer Display Window"
      aria-label="Open Customer Display Window"
      className="hidden h-9 shrink-0 items-center gap-1.5 rounded-lg border border-brand-yellow/30 bg-white/90 dark:bg-[#1a1e29] px-3 text-xs font-semibold text-brand-yellow hover:bg-brand-yellow/10 transition-colors min-[901px]:flex"
    >
      <Monitor className="h-4 w-4" />
      <span>Customer Display</span>
    </button>
  );
}
