"use client"

import { ColumnDef } from "@tanstack/react-table"

export type ProductSellingType = {
  Name: string
  Category: number
  UnitPrice: "pending" | "processing" | "success" | "failed"
  Stock: string
  Unit: string
  TotalPrice: string
  Status: string
}

export const columns: ColumnDef<ProductSellingType>[] = [
  {
    accessorKey: "Name",
    header: "Name",
  },
  {
    accessorKey: "Category",
    header: "Category",
  },
  {
    accessorKey: "UnitPrice",
    header: "Unit Price",
  },
  {
    accessorKey: "Stock",
    header: "Stock",
  },
  {
    accessorKey: "Unit",
    header: "Unit",
  },
  {
    accessorKey: "TotalPrice",
    header: "Total Price",
  },
  {
    accessorKey: "Status",
    header: "Status",
  },
]
