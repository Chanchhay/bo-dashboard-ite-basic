import PublicMenuClient from "./public-menu-client";

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
    // Read fresh. The shop changes a price or closes a channel in the back
    // office and then looks at its own storefront to check — a cached copy
    // makes that look broken, and there is no way to tell a shopper the page
    // they are reading is a minute behind the till.
    cache: "no-store",
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
    cache: "no-store",
  });

  const storeItems = itemsRes.ok ? await itemsRes.json() : [];

  return <PublicMenuClient storeDetail={storeDetail} storeItems={storeItems} />;
}
