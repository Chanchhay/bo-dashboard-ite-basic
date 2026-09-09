
export const dayKeys = [
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
    "SAT",
    "SUN",
] as const;

export type DayKey = (typeof dayKeys)[number];

export const dayLabels: Record<DayKey, string> = {
    MON: "Monday",
    TUE: "Tuesday",
    WED: "Wednesday",
    THU: "Thursday",
    FRI: "Friday",
    SAT: "Saturday",
    SUN: "Sunday",
};

export const dayShortLabels: Record<DayKey, string> = {
    MON: "Mon",
    TUE: "Tue",
    WED: "Wed",
    THU: "Thu",
    FRI: "Fri",
    SAT: "Sat",
    SUN: "Sun",
};

export type TimeWindow = { open: string; close: string };

export type DaySchedule = {
    closed: boolean;
    windows: TimeWindow[];
};

export type ChannelSchedule = {
    alwaysOpen: boolean;
    days: Record<DayKey, DaySchedule>;
};

export function minutesOf(time: string) {
    const [hours, mins] = time.split(":").map(Number);

    return (hours || 0) * 60 + (mins || 0);
}

export function isOvernight(window: TimeWindow) {
    return minutesOf(window.close) <= minutesOf(window.open);
}

export function dayIndex(date: Date) {
    return (date.getDay() + 6) % 7;
}

export function isOpenAt(schedule: ChannelSchedule, at: Date) {
    if (schedule.alwaysOpen) return true;

    const now = at.getHours() * 60 + at.getMinutes();
    const todayIndex = dayIndex(at);
    const today = schedule.days[dayKeys[todayIndex]];

    if (
        !today.closed &&
        today.windows.some((window) => {
            const open = minutesOf(window.open);
            const close = minutesOf(window.close);

            return isOvernight(window) ? now >= open : now >= open && now < close;
        })
    ) {
        return true;
    }

    const yesterday = schedule.days[dayKeys[(todayIndex + 6) % 7]];

    return (
        !yesterday.closed &&
        yesterday.windows.some(
            (window) => isOvernight(window) && now < minutesOf(window.close),
        )
    );
}

export function describeDay(day: DaySchedule) {
    if (day.closed || day.windows.length === 0) return "Closed";

    return day.windows
        .map((window) => `${window.open} – ${window.close}`)
        .join(", ");
}

export function describeSchedule(schedule: ChannelSchedule) {
    if (schedule.alwaysOpen) return "Open 24/7";

    const descriptions = dayKeys.map((key) => describeDay(schedule.days[key]));
    const first = descriptions[0];

    if (descriptions.every((entry) => entry === first)) {
        return first === "Closed" ? "Closed all week" : `Every day ${first}`;
    }

    const openDays = dayKeys.filter((key) => !schedule.days[key].closed).length;

    return `${openDays} day${openDays === 1 ? "" : "s"} a week`;
}

export function emptySchedule(): ChannelSchedule {
    return {
        alwaysOpen: false,
        days: Object.fromEntries(
            dayKeys.map((key) => [
                key,
                { closed: false, windows: [{ open: "09:00", close: "18:00" }] },
            ]),
        ) as Record<DayKey, DaySchedule>,
    };
}

export function validateDay(day: DaySchedule) {
    if (day.closed || day.windows.length === 0) return "";

    for (const window of day.windows) {
        if (minutesOf(window.open) === minutesOf(window.close)) {
            return "Open and close cannot be the same time.";
        }
    }

    const sameDay = day.windows
        .filter((window) => !isOvernight(window))
        .map((window) => ({
            from: minutesOf(window.open),
            to: minutesOf(window.close),
        }))
        .sort((left, right) => left.from - right.from);

    for (let index = 1; index < sameDay.length; index += 1) {
        if (sameDay[index].from < sameDay[index - 1].to) {
            return "Two windows on this day overlap.";
        }
    }

    return "";
}
