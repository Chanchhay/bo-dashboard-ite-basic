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

export const attributeIconKeys = Object.keys(iconsByKey);

export function attributeIcon(key: string | undefined): LucideIcon {
    return (key && iconsByKey[key]) || Circle;
}

export function AttributeIcon({
    icon,
    className,
}: {
    icon?: string;
    className?: string;
}) {
    return createElement(attributeIcon(icon), { className });
}
