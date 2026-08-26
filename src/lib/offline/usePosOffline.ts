"use client";

import { useEffect, useState, useCallback } from "react";
import { offlineDb, type OfflineOrder } from "./db";
import type { ChannelItem } from "@/lib/api/sales-channels";
import { useDispatch } from "react-redux";
import { baseApi } from "@/lib/baseApi";
import { db } from "@/lib/db";
import { syncOfflineOrders as syncOfflineDbOrders } from "@/lib/sync";

export function usePosOffline() {
  const dispatch = useDispatch();
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleOnline = () => setIsOnline(true);
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
      const count1 = await offlineDb.offlineOrders
        .where("sync_status")
        .equals("PENDING")
        .count();
      const dbOrders = await db.offline_orders.toArray();
      const count2 = dbOrders.filter((o) => !o.is_synced).length;
      setPendingSyncCount(count1 + count2);
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

  const saveOfflineOrder = useCallback(
    async (orderData: Omit<OfflineOrder, "sync_status">) => {
      try {
        await offlineDb.offlineOrders.add({
          ...orderData,
          sync_status: "PENDING",
        });
        await refreshPendingCount();
        console.log("[Offline POS] Offline order saved successfully.");
      } catch (err) {
        console.error("[Offline POS] Failed to save offline order:", err);
      }
    },
    [refreshPendingCount]
  );

  const syncOfflineOrders = useCallback(async () => {
    try {
      // 1. Sync orders stored in db.offline_orders (PosDatabase)
      await syncOfflineDbOrders("1", dispatch);

      // 2. Sync orders stored in offlineDb.offlineOrders (PosOfflineDatabase)
      const pendingOrders = await offlineDb.offlineOrders
        .where("sync_status")
        .equals("PENDING")
        .toArray();

      if (pendingOrders.length === 0) {
        await refreshPendingCount();
        return;
      }

      setIsSyncing(true);

      const formattedOrders = pendingOrders.map((order) => ({
        uuid: order.uuid,
        status: order.status || "PAID",
        paymentMethod: order.payment_method,
        payment_method: order.payment_method,
        subtotal: order.subtotal,
        total: order.total,
        discountAmount: order.discount_amount,
        discount_amount: order.discount_amount,
        createdAt: order.created_at,
        created_at: order.created_at,
        items: (order.items || []).map((i: any) => ({
          productId: i.product_id || i.productId,
          product_id: i.product_id || i.productId,
          productName: i.product_name || i.productName || i.itemName || i.item_name || "Item",
          product_name: i.product_name || i.productName || i.itemName || i.item_name || "Item",
          itemName: i.product_name || i.productName || i.itemName || i.item_name || "Item",
          item_name: i.product_name || i.productName || i.itemName || i.item_name || "Item",
          quantity: i.quantity || 1,
          unitPrice: i.unit_price || i.unitPrice || 0,
          unit_price: i.unit_price || i.unitPrice || 0,
          subtotal: i.subtotal || 0,
          discountAmount: i.discount_amount || i.discountAmount || 0,
          discount_amount: i.discount_amount || i.discountAmount || 0,
        })),
      }));

      const response = await fetch("/api/pos/orders/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: formattedOrders }),
      });

      if (response.ok) {
        const data = await response.json();
        const syncedUuids: string[] = Array.isArray(data?.syncedUuids)
          ? data.syncedUuids
          : [];

        // Step 3: Delete synced orders from local storage IndexedDB
        if (syncedUuids.length > 0) {
          await offlineDb.offlineOrders
            .where("uuid")
            .anyOf(syncedUuids)
            .delete();
        } else {
          const syncedLocalIds = pendingOrders
            .map((o) => o.localId)
            .filter((id): id is number => id !== undefined);

          if (syncedLocalIds.length > 0) {
            await offlineDb.offlineOrders
              .where("localId")
              .anyOf(syncedLocalIds)
              .delete();
          }
        }

        await refreshPendingCount();

        // Step 1: Invalidate RTK Query cache to refetch orders list and sales summary statistics
        dispatch(
          baseApi.util.invalidateTags([
            "PosOrderHistory",
            "PosOrder",
            "PosOpenOrders",
            "SalesProfit",
            "SalesDailyRevenue",
            "PayLaterSales",
            "InventoryStock",
          ])
        );
        console.log(`[Offline POS] Synced ${pendingOrders.length} offline orders.`);
      }
    } catch (err) {
      console.error("[Offline POS] Error during offline orders sync:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [dispatch, refreshPendingCount]);

  useEffect(() => {
    if (isOnline) {
      void syncOfflineOrders();
    }
  }, [isOnline, syncOfflineOrders]);

  return {
    isOnline,
    isSyncing,
    pendingSyncCount,
    cacheCatalog,
    getCachedCatalog,
    cacheStockList,
    getCachedStockList,
    saveOfflineOrder,
    syncOfflineOrders,
    refreshPendingCount,
  };
}
