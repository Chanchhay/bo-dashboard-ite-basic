"use client";

import { useState } from "react";

import { AddOnsTab } from "@/components/inventory/config/AddOnsTab";
import {
    ConfigTabs,
    type ConfigTabId,
} from "@/components/inventory/config/ConfigTabs";
import { OptionPresetsTab } from "@/components/inventory/config/OptionPresetsTab";
import { UnitsTab } from "@/components/inventory/config/UnitsTab";
import { InventoryCategories } from "@/components/inventory/InventoryCategories";
import { InventoryPageHeader } from "@/components/inventory/InventoryUi";

export default function InventoryConfigPage() {
    const [tab, setTab] = useState<ConfigTabId>("units");

    return (
        <div className="flex flex-col gap-6">
            <InventoryPageHeader
                title="Item configuration"
                description="The building blocks your items are assembled from — units, groups, add-ons and option presets."
            />

            <ConfigTabs value={tab} onChange={setTab} />

            <div
                role="tabpanel"
                id={`config-panel-${tab}`}
                aria-labelledby={`config-tab-${tab}`}
            >
                {tab === "units" ? <UnitsTab /> : null}
                {tab === "groups" ? <InventoryCategories embedded /> : null}
                {tab === "add-ons" ? <AddOnsTab /> : null}
                {tab === "presets" ? <OptionPresetsTab /> : null}
            </div>
        </div>
    );
}
