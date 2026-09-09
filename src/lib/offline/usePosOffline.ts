"use client";

import { useEffect, useState, useCallback } from "react";
import { offlineDb } from "./db";
import type { ChannelItem } from "@/lib/api/sales-channels";
import { itemThumbnail } from "@/lib/api/inventory";
import { cacheImages } from "@/lib/offline/image-cache";
import { useDispatch } from "react-redux";
import { db } from "@/lib/db";
import { syncOfflineOrders as syncOfflineDbOrders } from "@/lib/sync";
import { pushCart, resetCartPushBackoff } from "@/lib/pos/cart-sync";

const RESYNC_INTERVAL_MS = 30_000;

const MAX_RESYNC_BACKOFF_MS = 15 * 60_000;

let syncInFlight: Promise<boolean> | null = null;
let nextSyncAllowedAt = 0;
let syncBackoffMs = RESYNC_INTERVAL_MS;

function resetSyncBackoff() {
    nextSyncAllowedAt = 0;
    syncBackoffMs = RESYNC_INTERVAL_MS;
}

export function usePosOffline() {
  const dispatch = useDispatch();
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleOnline = () => {
        resetSyncBackoff();
        resetCartPushBackoff();
        void pushCart({ force: true });
        setIsOnline(true);
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      const orders = await db.offline_orders.toArray();
      setPendingSyncCount(orders.filter((order) => !order.is_synced).length);
    } catch (err) {
      console.error("Failed to count pending offline orders:", err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    refreshPendingCount().then(() => {
      if (!isMounted) return;
    });
    return () => {
      isMounted = false;
    };
  }, [refreshPendingCount]);

  const cacheCatalog = useCallback(async (items: ChannelItem[]) => {
    if (!items || items.length === 0) return;
    try {
      await offlineDb.channelItems.clear();
      await offlineDb.channelItems.bulkPut(items);
      console.log(`[Offline POS] Cached ${items.length} catalog items.`);

      void cacheImages(items.map((entry) => itemThumbnail(entry.item)));
    } catch (err) {
      console.error("[Offline POS] Failed to cache catalog items:", err);
    }
  }, []);

  const getCachedCatalog = useCallback(async (): Promise<ChannelItem[]> => {
    try {
      return await offlineDb.channelItems.toArray();
    } catch (err) {
      console.error("[Offline POS] Failed to retrieve cached catalog items:", err);
      return [];
    }
  }, []);

  const cacheStockList = useCallback(async (stockItems: any[]) => {
    if (!stockItems || stockItems.length === 0) return;
    try {
      await offlineDb.stockList.clear();
      const records = stockItems
        .filter((s) => s && (s.itemId || s.id))
        .map((s) => {
          const id = String(s.itemId || s.id);
          const key = s.variantId ? `${id}:${s.variantId}` : id;
          return {
            key,
            itemId: id,
            variantId: s.variantId ? String(s.variantId) : null,
            quantityOnHand: typeof s.quantityOnHand === "number" ? s.quantityOnHand : 0,
          };
        });

      if (records.length > 0) {
        await offlineDb.stockList.bulkPut(records);
        console.log(`[Offline POS] Cached ${records.length} stock balance records.`);
      }
    } catch (err) {
      console.error("[Offline POS] Failed to cache stock balances:", err);
    }
  }, []);

  const getCachedStockList = useCallback(async () => {
    try {
      return await offlineDb.stockList.toArray();
    } catch (err) {
      return [];
    }
  }, []);

  const runSync = useCallback(async () => {
    try {
      setIsSyncing(true);

      const dbOk = await syncOfflineDbOrders(dispatch);

      await refreshPendingCount();

      return dbOk;
    } catch (err) {
      console.error("[Offline POS] Error during offline orders sync:", err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [dispatch, refreshPendingCount]);

  const syncOfflineOrders = useCallback(async () => {
    if (syncInFlight) return syncInFlight;
    if (Date.now() < nextSyncAllowedAt) return false;

    syncInFlight = runSync();

    try {
      const ok = await syncInFlight;

      if (ok) {
        resetSyncBackoff();
      } else {
        nextSyncAllowedAt = Date.now() + syncBackoffMs;
        syncBackoffMs = Math.min(syncBackoffMs * 2, MAX_RESYNC_BACKOFF_MS);
      }

      return ok;
    } finally {
      syncInFlight = null;
    }
  }, [runSync]);

  useEffect(() => {
    if (isOnline) {
      void syncOfflineOrders();
    }
  }, [isOnline, syncOfflineOrders]);

  useEffect(() => {
    if (pendingSyncCount === 0) return;

    const id = setInterval(() => {
      void syncOfflineOrders();
    }, RESYNC_INTERVAL_MS);

    return () => clearInterval(id);
  }, [pendingSyncCount, syncOfflineOrders]);

  return {
    isOnline,
    isSyncing,
    pendingSyncCount,
    cacheCatalog,
    getCachedCatalog,
    cacheStockList,
    getCachedStockList,
    syncOfflineOrders,
    refreshPendingCount,
  };
}
