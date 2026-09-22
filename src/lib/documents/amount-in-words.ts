// Tunisian invoices conventionally spell the total out in words
// ("Arrêtée la présente facture à la somme de ..."), so this renders French
// number words. TND has three decimal places, so the fractional part is
// millimes, not centimes.

const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
]

const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"]

function underHundred(n: number): string {
  if (n < 20) return UNITS[n]
  const tens = Math.floor(n / 10)
  const unit = n % 10

  // 70-79 and 90-99 are built on "soixante"/"quatre-vingt" plus dix..dix-neuf.
  if (tens === 7 || tens === 9) {
    const base = tens === 7 ? "soixante" : "quatre-vingt"
    const rest = UNITS[10 + unit]
    return tens === 7 && unit === 1 ? `${base} et ${rest}` : `${base}-${rest}`
  }
  if (tens === 8) return unit === 0 ? "quatre-vingts" : `quatre-vingt-${UNITS[unit]}`
  if (unit === 0) return TENS[tens]
  if (unit === 1) return `${TENS[tens]} et un`
  return `${TENS[tens]}-${UNITS[unit]}`
}

function underThousand(n: number): string {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  if (hundreds === 0) return underHundred(rest)
  if (rest === 0) return hundreds === 1 ? "cent" : `${UNITS[hundreds]} cents`
  const prefix = hundreds === 1 ? "cent" : `${UNITS[hundreds]} cent`
  return `${prefix} ${underHundred(rest)}`
}

export function numberToFrenchWords(value: number): string {
  const n = Math.floor(Math.abs(value))
  if (n === 0) return "zéro"

  const billions = Math.floor(n / 1_000_000_000)
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000

  const parts: string[] = []
  if (billions) parts.push(billions === 1 ? "un milliard" : `${underThousand(billions)} milliards`)
  if (millions) parts.push(millions === 1 ? "un million" : `${underThousand(millions)} millions`)
  // "mille" is never pluralised and never preceded by "un".
  if (thousands) parts.push(thousands === 1 ? "mille" : `${underThousand(thousands)} mille`)
  if (rest) parts.push(underThousand(rest))

  return parts.join(" ")
}

export function amountInWordsTND(amount: number): string {
  const rounded = Math.round(Math.abs(amount) * 1000) / 1000
  const dinars = Math.floor(rounded)
  const millimes = Math.round((rounded - dinars) * 1000)

  // French keeps the singular after zéro as well as un: "zéro dinar", "un dinar".
  const dinarWords = `${numberToFrenchWords(dinars)} ${dinars < 2 ? "dinar" : "dinars"}`
  if (millimes === 0) return dinarWords

  return `${dinarWords} et ${numberToFrenchWords(millimes)} ${millimes < 2 ? "millime" : "millimes"}`
}
