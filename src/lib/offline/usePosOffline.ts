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

/** How often a queued sale tries again while the till thinks it is connected. */
const RESYNC_INTERVAL_MS = 30_000;

/** Longest wait between attempts once the server keeps refusing. */
const MAX_RESYNC_BACKOFF_MS = 15 * 60_000;

/*
 * One till, one sync.
 *
 * This hook is mounted four times over on the terminal — the item grid, the
 * screen, the navbar and the app-wide banner — and every copy has its own
 * timer. Left to themselves they each run the whole thing, so a queue the
 * server keeps refusing becomes a steady drum of requests for as long as the
 * page is open, doubled again by StrictMode in development.
 *
 * Module scope because that is the scope the truth lives at: there is one
 * queue on this device, not one per component.
 */
let syncInFlight: Promise<boolean> | null = null;
let nextSyncAllowedAt = 0;
let syncBackoffMs = RESYNC_INTERVAL_MS;

/** A real reconnection earns a fresh attempt rather than serving out a backoff. */
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
        // A cart built during the outage has been waiting to be told to the
        // server. It is safe on the device, but the sooner it lands the sooner
        // payment can go through the normal path.
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

      // The pictures follow the catalogue, in the background: a cashier picks
      // by sight, and a grid of items that have all fallen back to the brand
      // mark is forty identical tiles. Not awaited — the catalogue is usable
      // the moment it lands, and the pictures arrive behind it.
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

  /**
   * Attempts a sync, unless one is already running or the last one failed
   * recently enough that trying again would only be noise.
   */
  const syncOfflineOrders = useCallback(async () => {
    if (syncInFlight) return syncInFlight;
    if (Date.now() < nextSyncAllowedAt) return false;

    syncInFlight = runSync();

    try {
      const ok = await syncInFlight;

      if (ok) {
        resetSyncBackoff();
      } else {
        // Doubling, because a server that has refused twice will most likely
        // refuse the third time too, and the queue loses nothing by waiting.
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

  /**
   * Keeps trying while anything is still queued.
   *
   * The `online` event is the fast path, not the only one: it does not fire
   * when the connection was never lost as far as the browser is concerned —
   * a backend that was down, a portal that was in the way, a request blocked
   * by the developer tools — and without a retry those sales sit in the queue
   * until someone reloads the till. An attempt that fails changes nothing.
   */
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
