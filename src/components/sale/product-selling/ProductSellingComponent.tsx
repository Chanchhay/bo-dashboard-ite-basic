"use client"
import { columns, ProductSellingType } from "@/components/ui/column";
import { DataTable } from "@/components/ui/data-table";
import { useEffect, useState } from "react";

export default function ProductSellingComponent() {
    const [data, setData] = useState<ProductSellingType[]>([]);
    const [error, setError] = useState<string | null>(null);

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
                setError(e instanceof Error ? e.message : "Unknown error");
            }
        }
        fetchAllProducts();
    }, []);

    if (error) return <p className="text-destructive">{error}</p>;

    return (
            <DataTable columns={columns} data={data} />

    );
}