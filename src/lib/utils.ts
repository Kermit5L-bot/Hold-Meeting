import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const numberFormatter = new Intl.NumberFormat("zh-CN");
export const appTimeZone = "Asia/Shanghai";

const datePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: appTimeZone,
  year: "numeric",
  month: "numeric",
  day: "2-digit",
});

export const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

export const percentFormatter = new Intl.NumberFormat("zh-CN", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: appTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function dateParts(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Object.fromEntries(
    datePartsFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function getAppYear(value: string | Date) {
  return dateParts(value)?.year ?? "";
}

export function getAppMonth(value: string | Date) {
  return dateParts(value)?.month ?? "";
}

export function getAppDateStamp(value: string | Date = new Date()) {
  const parts = dateParts(value);
  return parts ? `${parts.year}-${parts.month.padStart(2, "0")}-${parts.day}` : "";
}
