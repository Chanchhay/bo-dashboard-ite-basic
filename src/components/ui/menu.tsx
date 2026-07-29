"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";

import { cn } from "@/lib/utils";

/*
 * Dropdown built on Base UI's Menu. The popup wears the card treatment from
 * `ui-registry.md` — white surface, green-gray border, 16px radius — one step
 * lighter than a dialog, because a menu sits on the page rather than over it.
 *
 * `MenuContent` portals to the body, so anything stateful inside it is torn
 * down the moment the menu closes. Actions that must outlive that (a form
 * submit, for instance) belong outside the popup.
 */

const Menu = MenuPrimitive.Root;
const MenuTrigger = MenuPrimitive.Trigger;

const menuItemClass =
    "flex w-full cursor-default items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] text-[#161d16] outline-none select-none data-highlighted:bg-[#f2f5f1] [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-[#657064]";

function MenuContent({
    className,
    align = "end",
    sideOffset = 8,
    ...props
}: MenuPrimitive.Popup.Props & {
    align?: MenuPrimitive.Positioner.Props["align"];
    sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
}) {
    return (
        <MenuPrimitive.Portal>
            <MenuPrimitive.Positioner
                className="z-50 outline-none"
                align={align}
                sideOffset={sideOffset}
            >
                <MenuPrimitive.Popup
                    data-slot="menu-content"
                    className={cn(
                        "min-w-[228px] origin-[var(--transform-origin)] rounded-2xl border border-[#e4eae2] bg-white p-1.5 shadow-[0_18px_44px_rgba(15,26,18,0.16)] outline-none transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
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
            className={cn("-mx-1.5 my-1.5 h-px bg-[#edf0ec]", className)}
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
