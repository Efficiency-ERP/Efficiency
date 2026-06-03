import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTND(value: number): string {
  try {
    return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(Number(value || 0))
  } catch {
    const num = Number(value || 0).toFixed(2)
    return `${num} TND`
  }
}

export function castJson<T>(value: unknown): T {
  return value as T
}
