import { redirect } from "next/navigation";

/** Categories are now "Item groups", under Item Config. */
export default function InventoryCategoriesPage() {
    redirect("/inventory/config/groups");
}
