import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PaymentMethod } from "@/types/database"

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "especes", label: "Espèces" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement" },
  { value: "traite", label: "Traite" },
  { value: "carte", label: "Carte bancaire" },
]

export function paymentMethodLabel(method: PaymentMethod | null | undefined): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? "—"
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label = "Operation"): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
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
