import Image from "next/image";
import { MapPin, ImageOff } from "lucide-react";

export default async function PublicMenu({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return <div>API Base URL is not configured.</div>;
  }

  // Fetch store details
  const storeUrl = `${baseUrl}/api/v1/public/stores/${slug}`;
  const storeRes = await fetch(storeUrl, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!storeRes.ok) {
    const bodyText = await storeRes.text().catch(() => "");
    console.error(
      `[public-menu] storefront lookup failed — slug="${slug}" url="${storeUrl}" status=${storeRes.status} body="${bodyText.slice(0, 300)}"`
    );

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
            Store not found
          </h1>
          {process.env.NODE_ENV !== "production" && (
            <p className="mt-2 text-xs text-gray-400 break-all max-w-md">
              slug="{slug}" · status={storeRes.status} · url={storeUrl}
            </p>
          )}
        </div>
      </div>
    );
  }

  const storeDetail = await storeRes.json();

  // Fetch store items — the backend now returns whatever is published to
  // the "POS" channel, the same set the till sells.
  const itemsRes = await fetch(`${baseUrl}/api/v1/public/stores/${slug}/items`, {
    next: { revalidate: 60 },
  });

  const storeItems = itemsRes.ok ? await itemsRes.json() : [];

  // Group items by category
  const categoriesMap = new Map<string, any[]>();
  storeItems.forEach((item: any) => {
    const catName = item.itemGroup?.name || "Uncategorized";
    if (!categoriesMap.has(catName)) {
      categoriesMap.set(catName, []);
    }
    categoriesMap.get(catName)!.push(item);
  });

  const getPrimaryImage = (item: any) => {
    if (!item.images || item.images.length === 0) return null;
    const sorted = [...item.images].sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
    return sorted[0]?.url || null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header / Banner */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            {storeDetail.logo ? (
              <img
                src={storeDetail.logo}
                alt={storeDetail.displayName || storeDetail.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-white"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-md">
                <span className="text-3xl font-bold text-gray-400">
                  {(storeDetail.displayName || storeDetail.name)?.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {storeDetail.displayName || storeDetail.name}
              </h1>
              <div className="flex items-center text-gray-500 dark:text-gray-400 gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">
                  {storeDetail.address || storeDetail.cityOrProvince || "No location provided"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Categories */}
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        {Array.from(categoriesMap.entries()).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item: any) => {
                const imgUrl = getPrimaryImage(item);
                return (
                  <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full border border-gray-100 dark:border-gray-700">
                    <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                          <ImageOff className="w-8 h-8 mb-2 opacity-50" />
                          <span className="text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow flex flex-col justify-between p-4">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
                            {item.name}
                          </h3>
                          <span className="font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            $ {item.price ? Number(item.price).toFixed(2) : "0.00"}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                          {item.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}