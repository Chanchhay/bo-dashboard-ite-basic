"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import CategoryFilter from "@/components/menu/category-filter";
import MenuCard from "@/components/menu/menu-card";
import { ShoppingBag, MapPin, ExternalLink, ArrowLeft, Tag, Phone } from "lucide-react";
import ThemeToggle from "@/components/dark-mode/theme-toggle";
import { itemThumbnail, itemImageUrls, type InventoryItem } from "@/lib/api/inventory";
import { attributeIcon } from "@/lib/api/attribute-icons";
import { facebookPageUrl, type Business } from "@/lib/api/business";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

function FacebookIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function getFacebookDisplayText(url: string) {
  if (!url) return "Facebook";
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const pathname = parsed.pathname.replace(/^\/+|\/+$/g, "");
    if (pathname && pathname !== "profile.php") {
      return pathname.startsWith("@") ? pathname : `@${pathname}`;
    }
  } catch {
    // fallback
  }
  return "Facebook";
}

/**
 * The anonymous view of a business served by
 * `/api/v1/public/stores/{slug}` — a trimmed payload, not the authenticated
 * `Business`, so it is typed here rather than reused from there. Every field
 * is optional: it is whatever that particular shop has filled in.
 */
export type PublicStoreDetail = Pick<Business, "socialLinks"> & {
  name?: string;
  displayName?: string;
  slug?: string;
  username?: string;
  logo?: string;
  address?: string;
  cityOrProvince?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  baseCurrency?: string;
  displayCurrency?: string;
  /** An object on current payloads; older ones send a bare string. */
  category?: { name?: string } | string;
  categoryName?: string;
  /** Pre-`socialLinks` shapes, still read for shops not yet migrated. */
  facebookPage?: string;
  facebookUrl?: string;
  facebook?: string;
};

export type MenuItemEntry = {
  id: string;
  name: string;
  category: string;
  price: number;
  /** Always a string — `""` when the shop gave the item no picture. */
  image: string;
  rawItem: InventoryItem;
};

function PublicProductDetailView({
  entry,
  storeDetail,
  orderUrl,
  onBack,
}: {
  entry: MenuItemEntry;
  storeDetail: PublicStoreDetail;
  orderUrl: string;
  onBack: () => void;
}) {
  // Plain currency-code formatting from the public store payload — never
  // the authenticated /api/business-currencies endpoint (useMoney), which
  // 401s for an anonymous visitor and bounces them to /login.
  const currencyCode = storeDetail?.displayCurrency || storeDetail?.baseCurrency || "USD";
  const rawItem = entry.rawItem;
  const gallery = itemImageUrls(rawItem);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // No stock-photo stand-in on the public menu: an item the shop never gave
  // a picture shows a neutral placeholder instead of someone else's product.
  const activeImage = gallery[selectedImageIndex] || entry.image || "";
  const [imageBroken, setImageBroken] = useState(false);

  const price = rawItem.price ?? entry.price ?? 0;
  const categoryName = rawItem.itemGroup?.name || entry.category || "General";
  const attributes = rawItem.attributes || [];
  const specs = attributes.filter((attr) => attr.placement === "SPECIFICATION");

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0f1219] text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <div className="shrink-0 bg-white dark:bg-[#12151e] border-b border-gray-200 dark:border-gray-800/80 transition-colors z-40">
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1f2430] px-3 py-1.5 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#282e3d] transition-all cursor-pointer shrink-0"
              >
                <ArrowLeft className="size-4" />
                <span>Back to Menu</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 border-l border-gray-200 dark:border-gray-800 pl-4 min-w-0">
                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {storeDetail.displayName || storeDetail.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href={orderUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <ShoppingBag className="size-4" />
                <span>Order Now</span>
                <ExternalLink className="size-3.5 opacity-80" />
              </a>

              <ThemeToggle
                variant="icon"
                className="size-9 sm:size-10 shrink-0 rounded-xl border border-gray-300 dark:border-gray-700/80 bg-white dark:bg-[#1a1e29] text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#242937] shadow-2xs transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Full Page Item Container */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start bg-white dark:bg-[#1a1e29] p-6 sm:p-10 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-xs">
          {/* Left: Product Gallery */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-gray-50 dark:bg-[#12151e] border border-gray-100 dark:border-gray-800 flex items-center justify-center">
              {activeImage && !imageBroken ? (
                <img
                  src={activeImage}
                  alt={rawItem.name ?? entry.name}
                  className="h-full w-full object-cover transition-all duration-300"
                  onError={() => setImageBroken(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted/60 dark:bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/fluxibiz-mark.png"
                    alt=""
                    aria-hidden="true"
                    className="w-2/5 max-w-24 opacity-35 dark:opacity-45"
                  />
                  <span className="sr-only">No image for {rawItem.name ?? entry.name}</span>
                </div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {gallery.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setImageBroken(false);
                    }}
                    className={cn(
                      "relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl border-2 p-1 transition-all cursor-pointer",
                      idx === selectedImageIndex
                        ? "border-gray-900 dark:border-white bg-gray-100 dark:bg-gray-800 shadow-xs scale-[1.02]"
                        : "border-transparent bg-gray-100 dark:bg-gray-800 opacity-70 hover:opacity-100"
                    )}
                  >
                    <img
                      src={url}
                      alt={`Thumbnail ${idx + 1}`}
                      className="h-full w-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Details & Description */}
          <div className="flex flex-col gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                <Tag className="h-3.5 w-3.5 text-primary" />
                {categoryName}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 mt-3 tracking-tight">
                {entry.name}
              </h1>
              <p className="text-3xl font-black text-[#d14341] dark:text-[#f87171] mt-3">
                {formatMoney(price, currencyCode)}
              </p>
            </div>

            {rawItem.description ? (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-300">
                  {rawItem.description}
                </p>
              </div>
            ) : null}

            {/* Specifications */}
            {specs.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-3">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Specifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {specs.map((spec, idx) => {
                    const Glyph = attributeIcon(spec.icon);
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 rounded-2xl bg-gray-50 dark:bg-[#12151e] p-3 text-xs"
                      >
                        <Glyph className="h-4 w-4 text-primary dark:text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 block">
                            {spec.name}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {spec.values?.[0]?.value || "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 pt-5 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3">
              <a
                href={orderUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer"
              >
                <ShoppingBag className="size-4" />
                <span>Order Now</span>
              </a>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1f2430] py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#282e3d] transition-all cursor-pointer"
              >
                Return to Full Menu Catalog
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

type PublicItemGroup = {
  id: string;
  name: string;
  slug: string;
  note: string | null;
  subGroups: { id: string; name: string; slug: string; note: string | null; parentId: string | null }[];
};

export default function PublicMenuClient({
  storeDetail,
  storeItems,
  storeItemGroups = [],
}: {
  storeDetail: PublicStoreDetail;
  storeItems: InventoryItem[];
  storeItemGroups?: PublicItemGroup[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] = useState("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");

  // Dynamically resolve store website / online ordering URL for ANY store or shop
  const orderUrl = useMemo(() => {
    if (storeDetail?.websiteUrl && storeDetail.websiteUrl.trim().length > 0) {
      return storeDetail.websiteUrl;
    }
    const slug =
      storeDetail?.slug ||
      storeDetail?.username ||
      storeDetail?.displayName?.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") ||
      storeDetail?.name?.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") ||
      "store";

    return `https://fluxibiz.store/store/${slug}`;
  }, [storeDetail]);

  const items = useMemo<MenuItemEntry[]>(() => {
    return storeItems.map((raw) => {
      const thumbnail = itemThumbnail(raw);

      return {
        id: raw.id,
        name: raw.name || "Unnamed Item",
        category: raw.itemGroup?.name || "General",
        price: raw.price ?? 0,
        image: thumbnail || "",
        rawItem: raw,
      };
    });
  }, [storeItems]);

  /*
   * A shared or refreshed ?item=<id> link opens straight into that item's
   * detail view.
   *
   * Seeded as initial state rather than set from an effect: this route always
   * renders dynamically, so `useSearchParams` returns the same value on the
   * server and on hydration. Reading `window.location` in an effect meant the
   * server could only ever emit the grid, so a shared link painted the wrong
   * view and then replaced it — the cascading render the lint rule is about.
   */
  const searchParams = useSearchParams();
  const [expandedAddress, setExpandedAddress] = useState(false);
  const [selectedItemEntry, setSelectedItemEntry] =
    useState<MenuItemEntry | null>(() => {
      const itemIdFromUrl =
        searchParams.get("item") ||
        searchParams.get("product") ||
        searchParams.get("id");

      if (!itemIdFromUrl) return null;

      return (
        items.find(
          (i) =>
            String(i.id) === String(itemIdFromUrl) ||
            String(i.rawItem.code) === String(itemIdFromUrl) ||
            String(i.rawItem.sku) === String(itemIdFromUrl)
        ) ?? null
      );
    });

  const handleOpenDetail = (item: MenuItemEntry) => {
    setSelectedItemEntry(item);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("item", item.id);
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleBackToCatalog = () => {
    setSelectedItemEntry(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("item");
      url.searchParams.delete("product");
      url.searchParams.delete("id");
      const newSearch = url.searchParams.toString();
      window.history.pushState({}, "", url.pathname + (newSearch ? `?${newSearch}` : ""));
    }
  };

 
  const categories = useMemo(() => {
    const set = new Set<string>();
    storeItemGroups.forEach((g) => {
      if (g.name) set.add(g.name);
    });
    items.forEach((item) => {
      if (item.category && item.category !== "General") {
        set.add(item.category);
      }
    });
    return Array.from(set);
  }, [storeItemGroups, items]);

  const subCategories = useMemo(() => {
    const set = new Set<string>();
    if (selectedMainCategory !== "All" && selectedMainCategory !== "All Dishes") {
      const matchedGroup = storeItemGroups.find(
        (g) => g.name?.toLowerCase() === selectedMainCategory.toLowerCase()
      );
      if (matchedGroup && matchedGroup.subGroups) {
        matchedGroup.subGroups.forEach((sub) => {
          if (sub.name) set.add(sub.name);
        });
      }
    } else {
      storeItemGroups.forEach((g) => {
        (g.subGroups || []).forEach((sub) => {
          if (sub.name) set.add(sub.name);
        });
      });
    }
    return Array.from(set);
  }, [storeItemGroups, selectedMainCategory]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const catName = item.category.toLowerCase();
      const itemName = item.name.toLowerCase();

      const mainSel = selectedMainCategory.toLowerCase();
      const matchMainCategory =
        mainSel === "all" ||
        mainSel === "all category" ||
        catName === mainSel ||
        catName.includes(mainSel) ||
        mainSel.includes(catName);

      const subSel = selectedSubCategory.toLowerCase();
      const matchSubCategory =
        subSel === "all" ||
        subSel === "all category" ||
        catName === subSel ||
        catName.includes(subSel) ||
        itemName.includes(subSel);

      const matchSearch =
        !q ||
        itemName.includes(q) ||
        catName.includes(q) ||
        (item.rawItem.code && item.rawItem.code.toLowerCase().includes(q)) ||
        (item.rawItem.barcode && item.rawItem.barcode.toLowerCase().includes(q)) ||
        (item.rawItem.sku && item.rawItem.sku.toLowerCase().includes(q));

      return matchMainCategory && matchSubCategory && matchSearch;
    });
  }, [items, selectedMainCategory, selectedSubCategory, searchQuery]);

  const facebookUrl = useMemo(() => {
    return (
      (storeDetail?.socialLinks && facebookPageUrl(storeDetail)) ||
      storeDetail?.facebookPage ||
      storeDetail?.facebookUrl ||
      storeDetail?.facebook ||
      ""
    );
  }, [storeDetail]);

  const categoryName = useMemo(() => {
    const category = storeDetail?.category;

    return (
      (typeof category === "object" ? category?.name : undefined) ||
      storeDetail?.categoryName ||
      (typeof category === "string" ? category : "")
    );
  }, [storeDetail]);

  // If a product is selected or opened via URL, render the FULL PAGE SCREEN of its detail!
  if (selectedItemEntry) {
    return (
      <PublicProductDetailView
        entry={selectedItemEntry}
        storeDetail={storeDetail}
        orderUrl={orderUrl}
        onBack={handleBackToCatalog}
      />
    );
  }

  return (
    <div className="min-h-screen md:h-screen w-full md:overflow-hidden bg-[#f8f9fa] dark:bg-[#0f1219] text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      <div className="shrink-0 bg-white dark:bg-[#12151e] border-b border-gray-200 dark:border-gray-800/80 transition-colors z-40">
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-5 min-w-0">
              {storeDetail.logo ? (
                <img
                  src={storeDetail.logo}
                  alt={storeDetail.displayName || storeDetail.name}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 sm:border-4 border-white dark:border-gray-800 shadow-md bg-white shrink-0 mt-0.5 sm:mt-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/brand/fluxibiz-mark.png";
                  }}
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 sm:border-4 border-white dark:border-gray-800 shadow-md shrink-0 mt-0.5 sm:mt-0">
                  <span className="text-lg sm:text-2xl font-bold text-gray-400">
                    {(storeDetail.displayName || storeDetail.name)?.charAt(0)}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2 sm:block">
                  <div className="min-w-0">
                    {categoryName ? (
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                        {categoryName}
                      </p>
                    ) : null}
                    <h1 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 truncate">
                      {storeDetail.displayName || storeDetail.name}
                    </h1>
                  </div>

                  {/* Mobile-only theme toggle */}
                  <div className="flex sm:hidden items-center shrink-0">
                    <ThemeToggle
                      variant="icon"
                      className="size-8.5 shrink-0 rounded-xl border border-gray-300 dark:border-gray-700/80 bg-white dark:bg-[#1a1e29] text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#242937] shadow-2xs transition-all"
                    />
                  </div>
                </div>

                <div
                  onClick={() => setExpandedAddress((prev) => !prev)}
                  className="flex items-start text-gray-500 dark:text-gray-400 gap-1 sm:gap-1.5 text-xs sm:text-sm mt-0.5 cursor-pointer select-none group"
                  title={storeDetail.address || storeDetail.cityOrProvince || "No location provided"}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary group-hover:scale-110 transition-transform" />
                  <span
                    className={cn(
                      "break-words leading-snug",
                      expandedAddress ? "block" : "line-clamp-2 sm:line-clamp-1 sm:truncate"
                    )}
                  >
                    {storeDetail.address || storeDetail.cityOrProvince || "No location provided"}
                  </span>
                </div>

                {(storeDetail.phoneNumber || facebookUrl) && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
                    {storeDetail.phoneNumber ? (
                      <a
                        href={`tel:${storeDetail.phoneNumber}`}
                        className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      >
                        <Phone className="w-3 sm:w-3.5 h-3 sm:h-3.5 shrink-0" />
                        <span>{storeDetail.phoneNumber}</span>
                      </a>
                    ) : null}

                    {facebookUrl ? (
                      <a
                        href={facebookUrl.startsWith("http") ? facebookUrl : `https://${facebookUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#1877F2] dark:text-[#4294ff] hover:underline font-medium"
                      >
                        <FacebookIcon className="w-3.5 h-3.5 shrink-0 text-[#1877F2] dark:text-[#4294ff]" />
                        <span>{getFacebookDisplayText(facebookUrl)}</span>
                      </a>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:shrink-0">
              <a
                href={orderUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-3.5 sm:px-4 py-2 sm:py-2 text-xs sm:text-sm font-medium text-white shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
              >
                <ShoppingBag className="size-4 shrink-0" />
                <span>Order Now</span>
                <ExternalLink className="size-3.5 opacity-80 shrink-0" />
              </a>

              {/* Desktop ThemeToggle */}
              <ThemeToggle
                variant="icon"
                className="hidden sm:flex size-9 sm:size-10 shrink-0 rounded-xl border border-gray-300 dark:border-gray-700/80 bg-white dark:bg-[#1a1e29] text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#242937] shadow-2xs transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-4 sm:py-6 md:overflow-hidden flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        <div className="hidden md:block w-56 lg:w-64 shrink-0 h-full overflow-y-auto pr-1 pb-8 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <CategoryFilter
            categories={categories}
            subCategories={subCategories}
            items={items}
            selectedCategory={selectedMainCategory}
            selectedSubCategory={selectedSubCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onItemSelect={(id) => {
              const matched = items.find((i) => String(i.id) === String(id));
              if (matched) handleOpenDetail(matched);
            }}
            onChange={setSelectedMainCategory}
            onSubCategoryChange={setSelectedSubCategory}
            onResetFilters={() => {
              setSearchQuery("");
              setSelectedMainCategory("All");
              setSelectedSubCategory("All");
            }}
          />
        </div>

        <div className="md:hidden shrink-0 w-full">
          <CategoryFilter
            categories={categories}
            subCategories={subCategories}
            items={items}
            selectedCategory={selectedMainCategory}
            selectedSubCategory={selectedSubCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onItemSelect={(id) => {
              const matched = items.find((i) => String(i.id) === String(id));
              if (matched) handleOpenDetail(matched);
            }}
            onChange={setSelectedMainCategory}
            onSubCategoryChange={setSelectedSubCategory}
            onResetFilters={() => {
              setSearchQuery("");
              setSelectedMainCategory("All");
              setSelectedSubCategory("All");
            }}
          />
        </div>

        <div className="flex-1 w-full md:h-full min-w-0 flex flex-col space-y-4">
          <div className="shrink-0 flex items-center justify-between border-b border-gray-200/80 dark:border-gray-800/80 pb-3 sm:pb-4">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              {selectedMainCategory === "All"
                ? "All Products"
                : selectedSubCategory !== "All"
                  ? `${selectedMainCategory} › ${selectedSubCategory}`
                  : selectedMainCategory}
            </h2>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="flex-1 md:overflow-y-auto pr-0 sm:pr-1 pb-16 scroll-smooth rounded-2xl [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 bg-white dark:bg-[#1a1e29] py-16 text-center shadow-2xs">
                <ShoppingBag className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-3" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">No Items Found</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                  No items match your search or category filter.
                </p>
                {(searchQuery || selectedMainCategory !== "All" || selectedSubCategory !== "All") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedMainCategory("All");
                      setSelectedSubCategory("All");
                    }}
                    className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5 pt-1">
                {filteredItems.map((item) => (
                  <MenuCard
                    key={item.id}
                    name={item.name}
                    category={item.category}
                    price={item.price}
                    image={item.image}
                    onClick={() => handleOpenDetail(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
