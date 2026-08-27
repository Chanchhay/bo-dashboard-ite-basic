import { db } from './db';

export async function refreshLocalProducts(businessId: string) {
  if (typeof window !== "undefined" && !navigator.onLine) return;
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    const res = await fetch(`/api/v1/businesses/${businessId}/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      const products = await res.json();
      await db.products.bulkPut(products.map((p: any) => ({
        id: p.id,
        name: p.name || p.itemName || "Item",
        price: p.price ?? p.unitPrice ?? 0,
        stock_quantity: p.stockQuantity ?? p.quantityOnHand ?? 0
      })));
    }
  } catch (err) {
    console.error('Could not refresh products', err);
  }
}
