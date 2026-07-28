import { InventoryNav } from "@/components/inventory/InventoryNav";

export default function InventoryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#f5f7f4]">
            <InventoryNav />
            <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
                {children}
            </main>
        </div>
    );
}
