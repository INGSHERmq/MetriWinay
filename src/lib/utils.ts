import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 1,
    notation: value > 9999 ? "compact" : "standard"
  }).format(value);
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("es-PE", {
    currency,
    maximumFractionDigits: 2,
    style: "currency"
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "percent"
  }).format(value / 100);
}
