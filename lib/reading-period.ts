import { dateKey } from "./reading-data";
import { formatDate } from "./reading-calculations";

export type Period = "week" | "month";

function parseDateKey(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function getPeriodDateRange(period: Period, selectedDateKey: string) {
  const selectedDate = parseDateKey(selectedDateKey);
  const start = new Date(selectedDate);
  const end = new Date(selectedDate);

  if (period === "week") {
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
  }

  if (period === "month") {
    start.setDate(1);
    end.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
  }

  return {
    startKey: dateKey(start),
    endKey: dateKey(end),
  };
}

export function shiftSelectedDateKey(selectedDateKey: string, period: Period, offset: number) {
  const selectedDate = parseDateKey(selectedDateKey);

  if (period === "week") {
    selectedDate.setDate(selectedDate.getDate() + offset * 7);
  }

  if (period === "month") {
    selectedDate.setDate(1);
    selectedDate.setMonth(selectedDate.getMonth() + offset);
  }

  return dateKey(selectedDate);
}

function formatRangeDate(value: string) {
  const date = parseDateKey(value);
  return `${date.getFullYear()}. ${formatDate(value, { includeWeekday: true })}`;
}

export function formatPeriodRangeLabel(period: Period, dateKeys: string[]) {
  const startKey = dateKeys[0] ?? dateKey();
  const endKey = dateKeys[dateKeys.length - 1] ?? startKey;
  const startDate = parseDateKey(startKey);

  if (period === "month") return `${startDate.getFullYear()}. ${startDate.getMonth() + 1}`;
  return `${formatRangeDate(startKey)} - ${formatRangeDate(endKey)}`;
}
