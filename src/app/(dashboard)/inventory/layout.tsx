export default function InventoryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Navigation and page chrome now come from the app shell in
    // `(dashboard)/layout.tsx`, so this only scopes the inventory routes.
    return <>{children}</>;
}
