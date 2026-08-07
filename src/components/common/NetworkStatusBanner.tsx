"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, Loader2, RefreshCw, ServerOff } from "lucide-react";
import { useNetworkStatus, type NetworkStatus } from "@/hooks/useNetworkStatus";

export function NetworkStatusBanner() {
  const { status, isChecking, checkStatus } = useNetworkStatus();
  const [prevStatus, setPrevStatus] = useState<NetworkStatus>(status);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (status === "online" && (prevStatus === "offline" || prevStatus === "server_down")) {
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 4000);
      return () => clearTimeout(timer);
    }
    setPrevStatus(status);
  }, [status, prevStatus]);

  if (status === "online" && !showRestored) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto transition-all duration-300 ease-out">
      {/* Offline State */}
      {status === "offline" && (
        <div className="flex items-center gap-3 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_8px_25px_rgba(225,29,72,0.35)] border border-red-400/30 backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-300">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex size-2.5 rounded-full bg-white"></span>
          </span>
          <WifiOff className="size-4 shrink-0 text-white/90" />
          <span className="tracking-wide">No Internet Connection</span>
        </div>
      )}
    
      {/*  Connection Restored State */}
      {status === "online" && showRestored && (
        <div className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 px-4.5 py-2.5 text-xs font-semibold text-white shadow-[0_8px_25px_rgba(16,185,129,0.35)] border border-emerald-400/30 backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-300">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex size-2.5 rounded-full bg-white"></span>
          </span>
          <Wifi className="size-4 shrink-0 text-emerald-100" />
          <span className="tracking-wide">Connection Restored</span>
        </div>
      )}
    </div>
  );
}
