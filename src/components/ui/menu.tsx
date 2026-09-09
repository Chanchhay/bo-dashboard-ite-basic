"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";

import { cn } from "@/lib/utils";

const Menu = MenuPrimitive.Root;
const MenuTrigger = MenuPrimitive.Trigger;

const menuItemClass =
    "flex w-full cursor-default items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] text-[#161d16] dark:text-[#f8fafc] outline-none select-none data-highlighted:bg-[#f2f5f1] dark:data-highlighted:bg-[#252a38] [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-[#657064] dark:[&_svg]:text-[#94a3b8]";

function MenuContent({
    className,
    align = "end",
    sideOffset = 8,
    alignOffset,
    collisionPadding = 8,
    ...props
}: MenuPrimitive.Popup.Props & {
    align?: MenuPrimitive.Positioner.Props["align"];
    sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
    alignOffset?: MenuPrimitive.Positioner.Props["alignOffset"];
    collisionPadding?: MenuPrimitive.Positioner.Props["collisionPadding"];
}) {
    return (
        <MenuPrimitive.Portal>
            <MenuPrimitive.Positioner
                className="z-50 outline-none"
                align={align}
                sideOffset={sideOffset}
                alignOffset={alignOffset}
                collisionPadding={collisionPadding}
            >
                <MenuPrimitive.Popup
                    data-slot="menu-content"
                    className={cn(
                        "min-w-[228px] origin-[var(--transform-origin)] rounded-2xl border border-[#e4eae2] dark:border-[#242937] bg-white dark:bg-[#1e2330] p-1.5 shadow-[0_18px_44px_rgba(15,26,18,0.16)] dark:shadow-[0_18px_44px_rgba(0,0,0,0.5)] outline-none transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
                        className,
                    )}
                    {...props}
                />
            </MenuPrimitive.Positioner>
        </MenuPrimitive.Portal>
    );
}

function MenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
    return (
        <MenuPrimitive.Item
            data-slot="menu-item"
            className={cn(menuItemClass, className)}
            {...props}
        />
    );
}

function MenuLinkItem({ className, ...props }: MenuPrimitive.LinkItem.Props) {
    return (
        <MenuPrimitive.LinkItem
            data-slot="menu-link-item"
            closeOnClick
            className={cn(menuItemClass, className)}
            {...props}
        />
    );
}

function MenuSeparator({
    className,
    ...props
}: MenuPrimitive.Separator.Props) {
    return (
        <MenuPrimitive.Separator
            data-slot="menu-separator"
            className={cn("-mx-1.5 my-1.5 h-px bg-[#edf0ec] dark:bg-[#242937]", className)}
            {...props}
        />
    );
}

export {
    Menu,
    MenuContent,
    MenuItem,
    MenuLinkItem,
    MenuSeparator,
    MenuTrigger,
    menuItemClass,
};
