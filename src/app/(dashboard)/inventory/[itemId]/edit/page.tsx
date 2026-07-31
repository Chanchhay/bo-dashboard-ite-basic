import { EditInventoryProduct } from "@/components/inventory/InventoryProductForm";

export default async function EditInventoryProductPage({
    params,
}: {
    params: Promise<{ itemId: string }>;
}) {
    const { itemId } = await params;

    return <EditInventoryProduct itemId={itemId} />;
}
