import { createElement } from "react";

import {
    Apple,
    BatteryFull,
    Camera,
    Circle,
    Clock,
    Cpu,
    Gift,
    HardDrive,
    Info,
    Leaf,
    MemoryStick,
    Monitor,
    Ruler,
    ShieldCheck,
    Smartphone,
    Star,
    Tag,
    Thermometer,
    Truck,
    Undo2,
    UserRound,
    Weight,
    type LucideIcon,
} from "lucide-react";

/**
 * The API stores an opaque icon key; this file is the only place that decides
 * what it looks like. Adding a glyph is a frontend change alone, and an
 * unrecognised key degrades to a neutral dot rather than breaking the page —
 * which is why the backend deliberately does not validate against an enum.
 */
const iconsByKey: Record<string, LucideIcon> = {
    TRUCK: Truck,
    SHIELD: ShieldCheck,
    RETURN: Undo2,
    GIFT: Gift,
    LEAF: Leaf,
    CLOCK: Clock,
    STAR: Star,
    TAG: Tag,
    CHECK: ShieldCheck,
    INFO: Info,
    PHONE: Smartphone,
    DISPLAY: Monitor,
    CHIP: Cpu,
    CAMERA: Camera,
    CAMERA_FRONT: UserRound,
    MEMORY: MemoryStick,
    STORAGE: HardDrive,
    BATTERY: BatteryFull,
    OS: Apple,
    WEIGHT: Weight,
    RULER: Ruler,
    THERMOMETER: Thermometer,
};

/** Ordered for the icon picker; the keys the backend spec publishes. */
export const attributeIconKeys = Object.keys(iconsByKey);

export function attributeIcon(key: string | undefined): LucideIcon {
    return (key && iconsByKey[key]) || Circle;
}

/**
 * Renders an attribute's glyph.
 *
 * The icon is looked up from a fixed table, not constructed — but binding the
 * result to a capitalized local inside a component reads as creating a
 * component during render, which is a real footgun elsewhere and so is linted
 * against. `createElement` keeps the distinction unambiguous.
 */
export function AttributeIcon({
    icon,
    className,
}: {
    icon?: string;
    className?: string;
}) {
    return createElement(attributeIcon(icon), { className });
}
