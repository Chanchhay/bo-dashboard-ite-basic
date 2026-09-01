import { notFound } from "next/navigation";

import { AddOnsTab } from "@/components/inventory/config/AddOnsTab";
import { OptionPresetsTab } from "@/components/inventory/config/OptionPresetsTab";
import { UnitsTab } from "@/components/inventory/config/UnitsTab";
import { InventoryCategories } from "@/components/inventory/InventoryCategories";
import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import { TourButton } from "@/components/onboarding/TourButton";

const TAB_MAP = {
    units: {
        title: "Item configuration",
        description: "Configure measurement units and conversions for your inventory items.",
        component: UnitsTab,
    },
    groups: {
        title: "Item configuration — Item groups",
        description: "Organize your items into groups and categories.",
        component: function GroupsComponent() {
            return <InventoryCategories embedded />;
        },
    },
    "add-ons": {
        title: "Item configuration — Add-ons",
        description: "Manage extra toppings, add-ons, and modifications for menu items.",
        component: AddOnsTab,
    },
    presets: {
        title: "Item configuration — Option presets",
        description: "Set up predefined options and choices for customizable items.",
        component: OptionPresetsTab,
    },
} as const;

type TabKey = keyof typeof TAB_MAP;

export default async function InventoryConfigTabPage({
    params,
}: {
    params: Promise<{ tab: string }>;
}) {
    const { tab } = await params;

    if (!(tab in TAB_MAP)) {
        notFound();
    }

    const config = TAB_MAP[tab as TabKey];
    const Component = config.component;

    return (
        <div className="flex flex-col gap-6 w-full max-w-full min-w-0 overflow-x-hidden">
            <div className="static lg:sticky lg:top-0 lg:z-20 pt-2 pb-4 bg-shell/95 lg:backdrop-blur-md transition-all">
                <InventoryPageHeader
                    title={config.title}
                    description={config.description}
                    action={<TourButton />}
                />
            </div>

            <div className="w-full min-w-0">
                <Component />
            </div>
        </div>
    );
}
