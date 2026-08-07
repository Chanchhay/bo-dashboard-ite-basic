"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type NetworkStatus = "online" | "server_down" | "offline";

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>("online");
  const [isChecking, setIsChecking] = useState(false);
  const isCheckingRef = useRef(false);

  const checkStatus = useCallback(async (): Promise<NetworkStatus> => {
    if (isCheckingRef.current) return status;
    isCheckingRef.current = true;
    setIsChecking(true);
    try {
      // 1. Check browser network connection
      if (typeof window !== "undefined" && !navigator.onLine) {
        setStatus("offline");
        isCheckingRef.current = false;
        setIsChecking(false);
        return "offline";
      }

      // 2. Ping backend server
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        setStatus("online");
        isCheckingRef.current = false;
        setIsChecking(false);
        return "online";
      } else {
        setStatus("server_down");
        isCheckingRef.current = false;
        setIsChecking(false);
        return "server_down";
      }
    } catch {
      setStatus("server_down");
      isCheckingRef.current = false;
      setIsChecking(false);
      return "server_down";
    }
  }, [status]);

  useEffect(() => {
    // Schedule initial check asynchronously to avoid setState in effect warning
    const timer = setTimeout(() => {
      checkStatus();
    }, 0);

    // Check every 15 seconds
    const interval = setInterval(checkStatus, 15000);

    const handleOffline = () => setStatus("offline");
    const handleOnline = () => {
      checkStatus();
    };
    const handleFocus = () => {
      checkStatus();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [checkStatus]);

  return { 
    status, 
    isChecking, 
    checkStatus,
    isOnline: status === "online" 
  };
}
