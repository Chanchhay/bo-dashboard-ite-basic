"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag, ShoppingCart, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SalesOrdersPage() {
    return (
        <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e4eae2] pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#161d16] flex items-center gap-2">
                        <ShoppingCart className="w-6 h-6 text-emerald-600" />
                        Sales & Orders Overview
                    </h1>
                    <p className="mt-1 text-sm text-[#657064]">
                        Monitor store transactions, orders, and manage products posted across sales channels.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/sales/product-selling">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm inline-flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4" />
                            Manage Product Selling Channels
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-[#e4eae2] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
                    <div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-bold text-[#161d16]">Product Selling Channels</h2>
                        <p className="text-sm text-[#657064] mt-1">
                            Control products published to POS, Telegram, Messenger, and Web Store using channel-specific endpoints.
                        </p>
                    </div>
                    <Link href="/sales/product-selling">
                        <Button variant="outline" className="w-full justify-between">
                            Go to Product Selling
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>

                <div className="rounded-2xl border border-[#e4eae2] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
                    <div>
                        <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 mb-4">
                            <Store className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-bold text-[#161d16]">Point of Sale (POS)</h2>
                        <p className="text-sm text-[#657064] mt-1">
                            Launch in-store register interface to process sales and manage live cart transactions.
                        </p>
                    </div>
                    <Link href="/sales/pos">
                        <Button variant="outline" className="w-full justify-between">
                            Open Point of Sale
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </main>
    );
}
