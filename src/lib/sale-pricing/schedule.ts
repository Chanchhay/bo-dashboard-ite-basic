/**
 * When a channel accepts orders.
 *
 * A schedule is per weekday, because "we close early on Sunday" is the rule
 * rather than the exception, and each day holds *windows* rather than one
 * open/close pair — a kitchen that serves lunch and dinner with a gap between
 * cannot be expressed any other way.
 *
 * A window whose close time is at or before its open time runs **overnight**:
 * `22:00 – 02:00` on Friday means Friday night into Saturday morning. The
 * window belongs to the day it starts on, which is how a person describes it,
 * so Saturday's own hours are untouched by Friday's late night.
 */

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

/** `HH:MM`, 24-hour. */
export type TimeWindow = { open: string; close: string };

export type DaySchedule = {
    closed: boolean;
    windows: TimeWindow[];
};

export type ChannelSchedule = {
    /** Skips the whole weekly grid — a storefront that never sleeps. */
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

/** Monday-first index, unlike `Date.getDay()` which starts on Sunday. */
function dayIndex(date: Date) {
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

            // A normal window closes the same day; an overnight one runs to
            // midnight and is picked up again below as yesterday's spill.
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

/** "Every day 07:00 – 20:00" when nothing differs, otherwise a count. */
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

/**
 * Rejects the two mistakes that make a schedule unreadable: a window with the
 * same open and close time (is that zero hours or twenty-four?), and two
 * windows on one day that overlap.
 */
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
