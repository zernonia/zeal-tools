/**
 * Invoice maker — the pure part.
 *
 * Every amount here is an integer number of **minor units** — pence, cents,
 * sen. Not a decision about style: 0.1 + 0.2 is 0.30000000000000004 in
 * floating point, and an invoice whose lines do not add up to its total is a
 * document someone will be asked to explain to an accountant. Integers add up
 * exactly, and there is precisely one place where rounding happens.
 */

export interface LineItem {
  id: number
  description: string
  /** Allowed to be fractional — 2.5 hours is a normal quantity. */
  quantity: number
  /** Minor units, e.g. 12550 for £125.50. */
  unitPrice: number
}

export type DiscountKind = 'none' | 'percent' | 'fixed'

export interface Charges {
  /** Percentage, e.g. 20 for 20% VAT. */
  taxRate: number
  taxLabel: string
  discountKind: DiscountKind
  /** A percentage when `discountKind` is percent, otherwise minor units. */
  discountValue: number
}

export interface Totals {
  subtotal: number
  discount: number
  /** What tax is actually charged on, after any discount. */
  taxable: number
  tax: number
  total: number
}

/**
 * Round half away from zero, to the nearest minor unit.
 *
 * `Math.round` rounds half UP, which is not symmetric about zero: -2.5 becomes
 * -2 rather than -3. Credit notes carry negative amounts, so an invoice tool
 * that used it would round refunds in the customer's disfavour.
 */
export function roundMinor(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value)
}

/** One line's amount, in minor units. */
export function lineTotal(item: Pick<LineItem, 'quantity' | 'unitPrice'>): number {
  if (!Number.isFinite(item.quantity) || !Number.isFinite(item.unitPrice))
    return 0
  return roundMinor(item.quantity * item.unitPrice)
}

/**
 * Add an invoice up.
 *
 * The discount comes off before tax is worked out, which is what every tax
 * authority expects: you owe tax on what was actually charged, not on the list
 * price. Getting this the wrong way round overstates the tax on every
 * discounted invoice.
 */
export function computeTotals(items: LineItem[], charges: Charges): Totals {
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0)

  let discount = 0
  if (charges.discountKind === 'percent')
    discount = roundMinor((subtotal * clampPercent(charges.discountValue)) / 100)
  else if (charges.discountKind === 'fixed')
    discount = Math.max(0, Math.round(charges.discountValue))

  // A discount larger than the invoice would produce a negative total and an
  // invented tax credit; capping is the honest reading of "everything off".
  discount = Math.min(discount, Math.max(0, subtotal))

  const taxable = subtotal - discount
  const tax = roundMinor((taxable * clampPercent(charges.taxRate)) / 100)

  return { subtotal, discount, taxable, tax, total: taxable + tax }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value))
    return 0
  return Math.min(100, Math.max(0, value))
}

// ------------------------------------------------------------------- money

export interface Currency {
  code: string
  label: string
}

/** Common enough to be worth listing; anything else can be typed in. */
export const CURRENCIES: Currency[] = [
  { code: 'USD', label: 'US dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'Pound sterling' },
  { code: 'AUD', label: 'Australian dollar' },
  { code: 'CAD', label: 'Canadian dollar' },
  { code: 'SGD', label: 'Singapore dollar' },
  { code: 'MYR', label: 'Malaysian ringgit' },
  { code: 'INR', label: 'Indian rupee' },
  { code: 'JPY', label: 'Japanese yen' },
]

/**
 * How many minor units make one major unit for a currency.
 *
 * Yen has none — ¥100 is a hundred yen, not one yen — so treating every
 * currency as two decimal places multiplies a yen invoice by a hundred.
 */
export function minorUnits(currency: string): number {
  return ['JPY', 'KRW', 'VND', 'CLP', 'ISK'].includes(currency.toUpperCase()) ? 0 : 2
}

export function formatMoney(minor: number, currency: string, locale = 'en-US'): string {
  const digits = minorUnits(currency)
  const major = minor / 10 ** digits
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major)
  }
  catch {
    // An unknown or mistyped code should still produce a readable line.
    return `${currency.toUpperCase()} ${major.toFixed(digits)}`
  }
}

/**
 * Read a typed amount into minor units.
 *
 * People type "1,234.56", "1.234,56", "£1234.5" and "1 234". The rule that
 * handles all of them: strip everything that is not a digit or a separator,
 * then treat the LAST separator as the decimal point — but only when it has
 * one or two digits after it, since "1,234" is a thousand and not one and a bit.
 */
export function parseMoney(text: string, currency = 'USD'): number | null {
  const digits = minorUnits(currency)
  const cleaned = String(text).replace(/[^\d.,-]/g, '').trim()
  if (!cleaned || !/\d/.test(cleaned))
    return null

  const negative = cleaned.startsWith('-')
  const body = cleaned.replace(/-/g, '')

  const lastSeparator = Math.max(body.lastIndexOf('.'), body.lastIndexOf(','))
  let major = body
  let fraction = ''

  if (lastSeparator >= 0) {
    const tail = body.slice(lastSeparator + 1)
    if (tail.length > 0 && tail.length <= 2 && digits > 0) {
      major = body.slice(0, lastSeparator)
      fraction = tail
    }
  }

  const wholeDigits = major.replace(/\D/g, '')
  const value = Number(`${wholeDigits || '0'}.${fraction || '0'}`)
  if (!Number.isFinite(value))
    return null

  const minor = roundMinor(value * 10 ** digits)
  return negative ? -minor : minor
}

// ---------------------------------------------------------------- numbering

/**
 * The next invoice number in a sequence.
 *
 * Increments the trailing digits and keeps their width, so INV-0007 becomes
 * INV-0008 rather than INV-8 — zero padding is how invoice numbers sort
 * correctly in a folder, and quietly dropping it is the kind of thing nobody
 * notices until a year of invoices is out of order.
 */
export function nextInvoiceNumber(previous: string): string {
  const text = previous.trim()
  if (!text)
    return 'INV-0001'

  // Scanned from the end rather than matched with a regex: the obvious
  // pattern here is /^(.*?)(\d+)(\D*)$/, where the lazy prefix and the digit
  // run can exchange characters and backtrack super-linearly on a hostile
  // string. Walking backwards is unambiguous and linear.
  const isDigit = (char: string | undefined) => char !== undefined && char >= '0' && char <= '9'

  let end = text.length
  while (end > 0 && !isDigit(text[end - 1]))
    end--
  if (end === 0)
    return `${text}-1`

  let start = end
  while (start > 0 && isDigit(text[start - 1]))
    start--

  const digits = text.slice(start, end)
  const next = String(Number(digits) + 1)
  const padded = next.padStart(digits.length, '0')
  return `${text.slice(0, start)}${padded}${text.slice(end)}`
}

// -------------------------------------------------------------------- dates

/** ISO date (YYYY-MM-DD) `days` after the given one. */
export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime()))
    return iso
  date.setUTCDate(date.getUTCDate() + Math.round(days))
  return date.toISOString().slice(0, 10)
}

export const PAYMENT_TERMS = [
  { days: 0, label: 'Due on receipt' },
  { days: 7, label: 'Net 7' },
  { days: 14, label: 'Net 14' },
  { days: 30, label: 'Net 30' },
  { days: 60, label: 'Net 60' },
]

/** A readable date that does not depend on the reader's date-order convention. */
export function formatDate(iso: string, locale = 'en-GB'): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime()))
    return iso
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
  }
  catch {
    return iso
  }
}
