"use client"
import { columns, ProductSellingType } from "@/components/ui/column";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useEffect, useState } from "react";

export default function ProductSellingComponent() {
    const [data, setData] = useState<ProductSellingType[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchAllProducts() {
            try {
                const response = await fetch("/api/sale-management");
                if (!response.ok) {
                    throw new Error(`Request failed: ${response.status}`);
                }
                const json = await response.json();
                setData(Array.isArray(json) ? json : []);
            } catch (e) {
                toast({
                    tone: "error",
                    title: "Items not loaded",
                    description:
                        e instanceof Error ? e.message : "Unknown error",
                });
            }
        }
        fetchAllProducts();
    }, [toast]);

    return (
            <DataTable columns={columns} data={data} />

    );
}
