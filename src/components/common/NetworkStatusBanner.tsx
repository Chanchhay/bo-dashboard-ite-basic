"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { WifiOff, Wifi, CloudSync, ShoppingBag, ArrowRight } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePosOffline } from "@/lib/offline/usePosOffline";

export function NetworkStatusBanner() {
  const pathname = usePathname();
  const { status } = useNetworkStatus();
  const { isSyncing, pendingSyncCount } = usePosOffline();
  const [prevStatus, setPrevStatus] = useState(status);
  const [showRestored, setShowRestored] = useState(false);

  const isPosOrCustomerDisplayRoute =
    pathname?.startsWith("/pos") || pathname?.startsWith("/customer-display");

  // On POS and Customer Display routes, status is managed locally inside the view — no floating banners needed
  if (isPosOrCustomerDisplayRoute) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto transition-all duration-300 ease-out">
      {/* Syncing State */}
      {isSyncing && (
        <div className="flex items-center gap-2.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md animate-pulse">
          <CloudSync className="size-4 animate-spin" />
          <span>Syncing {pendingSyncCount} offline orders...</span>
        </div>
      )}



      {/* Offline State on Non-POS Route */}
      {status === "offline" && (
        <div className="flex items-center gap-3 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xl border border-rose-400/40 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
          <WifiOff className="size-4 shrink-0" />
          <span>Offline — Dashboard requires Internet</span>
          <Link
            href="/pos"
            className="flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 px-2.5 py-1 text-[11px] font-bold transition-colors"
          >
            <ShoppingBag className="size-3" />
            Open POS
            <ArrowRight className="size-3" />
          </Link>
        </div>
      )}

      {/* Connection Restored State */}
      {status === "online" && showRestored && (
        <div className="flex items-center gap-2.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg border border-emerald-400/30 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
          <Wifi className="size-4 shrink-0" />
          <span>Connection Restored</span>
        </div>
      )}
    </div>
  );
}
