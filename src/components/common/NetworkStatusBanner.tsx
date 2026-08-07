"use client";

import { useEffect, useState } from "react";
import { WifiOff, ServerOff, Wifi, RefreshCw } from "lucide-react";
import { useNetworkStatus, type NetworkStatus } from "@/hooks/useNetworkStatus";

export function NetworkStatusBanner() {
  const { status, isChecking, checkStatus } = useNetworkStatus();
  const [prevStatus, setPrevStatus] = useState<NetworkStatus>(status);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (status === "online" && (prevStatus === "offline" || prevStatus === "server_down")) {
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3500);
      return () => clearTimeout(timer);
    }
    setPrevStatus(status);
  }, [status, prevStatus]);

  if (status === "online" && !showRestored) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto">
      {/* 🔴 Offline */}
      {status === "offline" && (
        <div className="flex items-center gap-3 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-2xl">
          <WifiOff className="size-4" />
          <span>No Internet Connection</span>
          {/* <button
            onClick={() => checkStatus()}
            disabled={isChecking}
            className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] hover:bg-white/30"
          >
            <RefreshCw className={`size-3 ${isChecking ? "animate-spin" : ""}`} />
            Retry
          </button> */}
        </div>
      )}

      {/* 🟠 Server Down */}
      {status === "server_down" && (
        <div className="flex items-center gap-3 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-2xl">
          <ServerOff className="size-4" />
          <span>Server Unavailable (Internet OK)</span>
          <button
            onClick={() => checkStatus()}
            disabled={isChecking}
            className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] hover:bg-white/30"
          >
            <RefreshCw className={`size-3 ${isChecking ? "animate-spin" : ""}`} />
            Retry
          </button>
        </div>
      )}

      {/* 🟢 Connection Restored */}
      {status === "online" && showRestored && (
        <div className="flex items-center gap-2.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-2xl">
          <Wifi className="size-4" />
          <span>Back Online</span>
        </div>
      )}
    </div>
  );
}
