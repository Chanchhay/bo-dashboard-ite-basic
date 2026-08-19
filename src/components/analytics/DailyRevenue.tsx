"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getApiErrorMessage,
  InventoryError,
  InventoryLoading,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/form-controls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMoney } from "@/hooks/useMoney";
import {
  profitRanges,
  profitRangeStart,
  toLocalDateTime,
  type OrderChannelCode,
  type ProfitRange,
} from "@/lib/api/sales-report";
import { cn } from "@/lib/utils";
import { useGetDailyRevenueQuery } from "@/services/salesReportApi";

/**
 * The channels, in fixed slot order.
 *
 * A channel keeps its colour whatever it earns, so switching the period never
 * repaints the survivors — colour follows the entity, never its rank.
 */
const channels: { code: OrderChannelCode; label: string; color: string }[] = [
  { code: "POS", label: "Point of Sale", color: "var(--chart-1)" },
  { code: "WEB", label: "Online Store", color: "var(--chart-2)" },
  { code: "TELEGRAM", label: "Telegram", color: "var(--chart-3)" },
  { code: "MESSENGER", label: "Messenger", color: "var(--chart-4)" },
];

type DayRow = { date: string } & Partial<Record<OrderChannelCode, number>>;

/** `YYYY-MM-DD` in local time — the same calendar day the backend grouped on. */
function isoDay(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shortDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/**
 * One row per day across the whole range, zero-filled.
 *
 * The backend sends only the days a channel actually sold on, which is the
 * right thing for it to send — it does not invent rows. A line, though, has to
 * be continuous: without the gaps filled, a quiet Tuesday would join Monday
 * straight to Wednesday and read as steady trading rather than none.
 */
function toDailyRows(
  rows: { date: string; channel: OrderChannelCode; revenue: number }[],
  start: Date | null,
): DayRow[] {
  if (rows.length === 0) return [];

  const byDay = new Map<string, DayRow>();
  for (const row of rows) {
    const existing = byDay.get(row.date) ?? { date: row.date };
    existing[row.channel] = (existing[row.channel] ?? 0) + row.revenue;
    byDay.set(row.date, existing);
  }

  // All time has no lower bound to walk from, so the first day with a sale
  // is the start of the axis.
  const sorted = [...byDay.keys()].sort();
  const first = start ? isoDay(start) : sorted[0];
  const last = sorted[sorted.length - 1];

  const filled: DayRow[] = [];
  const cursor = new Date(`${first}T00:00:00`);
  const end = new Date(`${last}T00:00:00`);

  while (cursor <= end) {
    const key = isoDay(cursor);
    const day = byDay.get(key) ?? { date: key };
    filled.push({
      date: key,
      ...Object.fromEntries(channels.map(({ code }) => [code, day[code] ?? 0])),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return filled;
}

export function DailyRevenue() {
  const { format } = useMoney();
  const [range, setRange] = useState<ProfitRange>("MONTH");
  const [asTable, setAsTable] = useState(false);

  const start = profitRangeStart(range);
  const revenueQuery = useGetDailyRevenueQuery({
    ...(start ? { from: toLocalDateTime(start) } : {}),
  });

  // `profitRangeStart` returns a fresh Date every render, so the day it
  // falls on is what the memo can actually key on.
  const startDay = start ? isoDay(start) : null;
  const rows = useMemo(
    () =>
      toDailyRows(
        revenueQuery.data ?? [],
        startDay ? new Date(`${startDay}T00:00:00`) : null,
      ),
    [revenueQuery.data, startDay],
  );

  if (revenueQuery.isLoading) {
    return <InventoryLoading label="Reading your daily takings" />;
  }

  if (revenueQuery.error) {
    return (
      <InventoryError
        message={getApiErrorMessage(
          revenueQuery.error,
          "Unable to read your daily takings.",
        )}
        retry={revenueQuery.refetch}
      />
    );
  }

  const nothingSold = rows.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* One row of controls above the figures, as a filter bar should be. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-44">
          <Select
            value={range}
            items={profitRanges}
            onValueChange={(value) =>
              setRange((value || "MONTH") as ProfitRange)
            }
          >
            <SelectTrigger
              size="sm"
              aria-label="Period"
              className={cn(
                controlClassName,
                "!h-10 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(profitRanges).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Two of the four series sit under 3:1 on the light card, so
                    the figures must be readable without reading the colour.
                    The table is that route, not a convenience. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={asTable}
          onClick={() => setAsTable((shown) => !shown)}
        >
          {asTable ? "Show chart" : "Show table"}
        </Button>
      </div>

      {nothingSold ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="font-semibold text-foreground">
            Nothing sold in this period
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Take a sale on any channel and it will show up here.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-5">
            <h2 className="text-base font-semibold text-foreground">
              Revenue by day
            </h2>

            {/* Always present at four series: identity is never
                            carried by colour alone. */}
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {channels.map((channel) => (
                <li
                  key={channel.code}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                >
                  <span
                    aria-hidden
                    className="h-0.5 w-4 rounded-full"
                    style={{
                      backgroundColor: channel.color,
                    }}
                  />
                  {channel.label}
                </li>
              ))}
            </ul>
          </div>

          {asTable ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-28">Day</TableHead>
                    {channels.map((channel) => (
                      <TableHead key={channel.code} className="text-right">
                        {channel.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell className="font-medium">
                        {shortDay(row.date)}
                      </TableCell>
                      {channels.map((channel) => (
                        <TableCell
                          key={channel.code}
                          className="text-right tabular-nums"
                        >
                          {format(row[channel.code] ?? 0)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={rows}
                  margin={{
                    top: 8,
                    right: 12,
                    bottom: 0,
                    left: 4,
                  }}
                >
                  {/* Horizontal only, hairline, solid: the
                                        grid is a reading aid, not a mark. */}
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDay}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                    tick={{
                      fill: "var(--muted-foreground)",
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    tickFormatter={(value: number) => format(value)}
                    tickLine={false}
                    axisLine={false}
                    width={84}
                    tick={{
                      fill: "var(--muted-foreground)",
                      fontSize: 12,
                    }}
                  />
                  <Tooltip
                    cursor={{
                      stroke: "var(--muted-foreground)",
                      strokeWidth: 1,
                    }}
                    contentStyle={{
                      borderRadius: "0.75rem",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--popover)",
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                    labelFormatter={(label) =>
                      typeof label === "string" ? shortDay(label) : ""
                    }
                    formatter={(value, name) => [
                      format(Number(value) || 0),
                      channels.find((channel) => channel.code === name)
                        ?.label ?? String(name),
                    ]}
                  />

                  {channels.map((channel) => (
                    <Line
                      key={channel.code}
                      type="monotone"
                      dataKey={channel.code}
                      name={channel.code}
                      stroke={channel.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      // 8px across, ringed in the card
                      // colour so it stays legible where
                      // two channels cross.
                      activeDot={{
                        r: 4,
                        strokeWidth: 2,
                        stroke: "var(--card)",
                      }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
