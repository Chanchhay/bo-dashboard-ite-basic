"use client";

import { useState } from "react";
import { Clock, CopyPlus, Moon, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    dayKeys,
    dayLabels,
    dayShortLabels,
    describeSchedule,
    isOpenAt,
    isOvernight,
    validateDay,
    type ChannelSchedule,
    type DayKey,
    type DaySchedule,
} from "@/lib/sale-pricing/schedule";

function TimeField({
    value,
    label,
    onChange,
}: {
    value: string;
    label: string;
    onChange: (next: string) => void;
}) {
    return (
        <input
            type="time"
            value={value}
            aria-label={label}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:border-primary"
        />
    );
}

function DayRow({
    dayKey,
    day,
    onChange,
    onCopyToAll,
}: {
    dayKey: DayKey;
    day: DaySchedule;
    onChange: (next: DaySchedule) => void;
    onCopyToAll: () => void;
}) {
    const error = validateDay(day);

    function setWindow(index: number, patch: Partial<{ open: string; close: string }>) {
        onChange({
            ...day,
            windows: day.windows.map((window, position) =>
                position === index ? { ...window, ...patch } : window,
            ),
        });
    }

    return (
        <div className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex w-32 shrink-0 items-center gap-2.5">
                    <Switch
                        checked={!day.closed}
                        onCheckedChange={(checked) =>
                            onChange({ ...day, closed: !checked })
                        }
                        aria-label={`${dayLabels[dayKey]} open`}
                    />
                    <span
                        className={`text-sm font-semibold ${
                            day.closed
                                ? "text-muted-foreground"
                                : "text-foreground"
                        }`}
                    >
                        {dayLabels[dayKey]}
                    </span>
                </label>

                {day.closed ? (
                    <span className="text-sm text-muted-foreground">Closed</span>
                ) : (
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        {day.windows.map((window, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-1.5"
                            >
                                <TimeField
                                    value={window.open}
                                    label={`${dayLabels[dayKey]} window ${index + 1} opens`}
                                    onChange={(open) =>
                                        setWindow(index, { open })
                                    }
                                />
                                <span className="text-muted-foreground">–</span>
                                <TimeField
                                    value={window.close}
                                    label={`${dayLabels[dayKey]} window ${index + 1} closes`}
                                    onChange={(close) =>
                                        setWindow(index, { close })
                                    }
                                />
                                {isOvernight(window) ? (
                                    <span
                                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                                        title="This window runs past midnight into the next morning"
                                    >
                                        <Moon className="size-3" />
                                        overnight
                                    </span>
                                ) : null}
                                {day.windows.length > 1 ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`Remove ${dayLabels[dayKey]} window ${index + 1}`}
                                        onClick={() =>
                                            onChange({
                                                ...day,
                                                windows: day.windows.filter(
                                                    (_, position) =>
                                                        position !== index,
                                                ),
                                            })
                                        }
                                    >
                                        <X />
                                    </Button>
                                ) : null}
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                                onChange({
                                    ...day,
                                    windows: [
                                        ...day.windows,
                                        { open: "17:00", close: "22:00" },
                                    ],
                                })
                            }
                        >
                            <Plus />
                            Split
                        </Button>
                    </div>
                )}

                <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="ml-auto shrink-0"
                    onClick={onCopyToAll}
                    title={`Give every day ${dayShortLabels[dayKey]}'s hours`}
                >
                    <CopyPlus />
                    Copy to all
                </Button>
            </div>

            {error ? (
                <p className="pl-32 text-xs text-danger" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

/**
 * Opening hours for one channel.
 *
 * Channel-level rather than per item: the till closes, not the coffee. Hours
 * for an individual item — a breakfast menu that stops at 11 — would be a
 * separate, narrower thing layered on top.
 */
export function ChannelScheduleCard({
    channelName,
    schedule,
    onChange,
}: {
    channelName: string;
    schedule: ChannelSchedule;
    onChange: (next: ChannelSchedule) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    // Evaluated on render rather than on a timer: this is a settings screen, so
    // a badge that is a minute stale is not worth an interval.
    const openNow = isOpenAt(schedule, new Date());

    function setDay(dayKey: DayKey, next: DaySchedule) {
        onChange({
            ...schedule,
            days: { ...schedule.days, [dayKey]: next },
        });
    }

    function copyToAll(dayKey: DayKey) {
        const source = schedule.days[dayKey];

        onChange({
            ...schedule,
            days: Object.fromEntries(
                dayKeys.map((key) => [
                    key,
                    {
                        closed: source.closed,
                        windows: source.windows.map((window) => ({ ...window })),
                    },
                ]),
            ) as ChannelSchedule["days"],
        });
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,34,43,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Clock className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                            Opening hours
                        </h3>
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                openNow
                                    ? "bg-success/10 text-success"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {openNow ? "Open now" : "Closed now"}
                        </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {describeSchedule(schedule)} · {channelName} takes no
                        orders outside these hours.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                    <label className="flex items-center gap-2.5">
                        <Switch
                            checked={schedule.alwaysOpen}
                            onCheckedChange={(checked) =>
                                onChange({
                                    ...schedule,
                                    alwaysOpen: Boolean(checked),
                                })
                            }
                            aria-label="Always open"
                        />
                        <Label className="text-sm text-muted-foreground">
                            Always open
                        </Label>
                    </label>
                    {schedule.alwaysOpen ? null : (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setExpanded((open) => !open)}
                            aria-expanded={expanded}
                        >
                            {expanded ? "Done" : "Edit hours"}
                        </Button>
                    )}
                </div>
            </div>

            {expanded && !schedule.alwaysOpen ? (
                <div className="border-t border-border px-4 pb-4 sm:px-5">
                    {dayKeys.map((dayKey) => (
                        <DayRow
                            key={dayKey}
                            dayKey={dayKey}
                            day={schedule.days[dayKey]}
                            onChange={(next) => setDay(dayKey, next)}
                            onCopyToAll={() => copyToAll(dayKey)}
                        />
                    ))}
                    <p className="pt-3 text-xs text-muted-foreground">
                        A close time earlier than its open time runs overnight —
                        22:00 – 02:00 on Friday means Friday night into Saturday
                        morning. Use <strong>Split</strong> for a lunch and
                        dinner service with a gap between.
                    </p>
                </div>
            ) : null}
        </section>
    );
}
