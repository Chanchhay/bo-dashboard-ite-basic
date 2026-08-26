import { ImportReportView } from "@/components/inventory/import/ImportReportView";

export default async function InventoryImportReportPage({
    params,
}: {
    params: Promise<{ importId: string }>;
}) {
    const { importId } = await params;

    return <ImportReportView importId={importId} />;
}
