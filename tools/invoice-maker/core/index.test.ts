import type { Charges, LineItem } from './index'
import { describe, expect, it } from 'vitest'
import {
  addDays,
  computeTotals,
  CURRENCIES,
  formatDate,
  formatMoney,
  lineTotal,
  minorUnits,
  nextInvoiceNumber,
  parseMoney,
  roundMinor,
} from './index'

function item(quantity: number, unitPrice: number, id = 1): LineItem {
  return { id, description: 'Work', quantity, unitPrice }
}

function charges(over: Partial<Charges> = {}): Charges {
  return { taxRate: 0, taxLabel: 'Tax', discountKind: 'none', discountValue: 0, ...over }
}

describe('roundMinor', () => {
  it('rounds half away from zero, symmetrically', () => {
    // Math.round would give -2 here, rounding a credit note in the
    // customer's disfavour.
    expect(roundMinor(2.5)).toBe(3)
    expect(roundMinor(-2.5)).toBe(-3)
    expect(roundMinor(2.4)).toBe(2)
    expect(roundMinor(-2.4)).toBe(-2)
  })
})

describe('lineTotal', () => {
  it('multiplies quantity by price', () => {
    expect(lineTotal(item(3, 12550))).toBe(37650)
  })

  it('handles fractional quantities, which are normal for time', () => {
    expect(lineTotal(item(2.5, 8000))).toBe(20000)
    expect(lineTotal(item(0.25, 10000))).toBe(2500)
  })

  it('rounds to a whole minor unit', () => {
    // 1/3 of an hour at £100 is not a payable number of pence on its own.
    expect(lineTotal(item(1 / 3, 10000))).toBe(3333)
  })

  it('is zero for nonsense rather than NaN on the invoice', () => {
    expect(lineTotal(item(Number.NaN, 100))).toBe(0)
    expect(lineTotal(item(1, Infinity))).toBe(0)
  })
})

describe('computeTotals', () => {
  it('adds the lines up exactly', () => {
    // The float trap: 0.1 + 0.2 in major units would not equal 0.3.
    const totals = computeTotals([item(1, 10, 1), item(1, 20, 2)], charges())
    expect(totals.subtotal).toBe(30)
    expect(totals.total).toBe(30)
  })

  it('charges tax on the subtotal', () => {
    const totals = computeTotals([item(1, 10000)], charges({ taxRate: 20 }))
    expect(totals.tax).toBe(2000)
    expect(totals.total).toBe(12000)
  })

  it('takes the discount off before working out the tax', () => {
    // Tax is owed on what was charged, not on the list price. The other order
    // overstates tax on every discounted invoice.
    const totals = computeTotals([item(1, 10000)], charges({ taxRate: 20, discountKind: 'percent', discountValue: 10 }))
    expect(totals.discount).toBe(1000)
    expect(totals.taxable).toBe(9000)
    expect(totals.tax).toBe(1800)
    expect(totals.total).toBe(10800)
  })

  it('takes a fixed discount in minor units', () => {
    const totals = computeTotals([item(1, 10000)], charges({ discountKind: 'fixed', discountValue: 2550 }))
    expect(totals.discount).toBe(2550)
    expect(totals.total).toBe(7450)
  })

  it('never discounts past zero', () => {
    // Otherwise the invoice goes negative and invents a tax credit.
    const totals = computeTotals([item(1, 5000)], charges({ taxRate: 20, discountKind: 'fixed', discountValue: 999999 }))
    expect(totals.discount).toBe(5000)
    expect(totals.taxable).toBe(0)
    expect(totals.tax).toBe(0)
    expect(totals.total).toBe(0)
  })

  it('ignores an impossible rate rather than producing an impossible bill', () => {
    expect(computeTotals([item(1, 10000)], charges({ taxRate: -5 })).tax).toBe(0)
    expect(computeTotals([item(1, 10000)], charges({ taxRate: 500 })).tax).toBe(10000)
    expect(computeTotals([item(1, 10000)], charges({ taxRate: Number.NaN })).tax).toBe(0)
  })

  it('always has subtotal minus discount plus tax equal to the total', () => {
    // The invariant an accountant checks first.
    for (const rate of [0, 5, 7.5, 20, 23]) {
      for (const value of [0, 10, 33]) {
        const t = computeTotals(
          [item(3, 3333, 1), item(1.5, 12999, 2), item(7, 149, 3)],
          charges({ taxRate: rate, discountKind: 'percent', discountValue: value }),
        )
        expect(t.subtotal - t.discount).toBe(t.taxable)
        expect(t.taxable + t.tax).toBe(t.total)
        expect(Number.isInteger(t.total)).toBe(true)
      }
    }
  })

  it('is zero for an empty invoice', () => {
    expect(computeTotals([], charges({ taxRate: 20 }))).toEqual({ subtotal: 0, discount: 0, taxable: 0, tax: 0, total: 0 })
  })
})

describe('currencies', () => {
  it('knows that yen has no minor unit', () => {
    // Treating every currency as two decimals multiplies a yen invoice by 100.
    expect(minorUnits('JPY')).toBe(0)
    expect(minorUnits('jpy')).toBe(0)
    expect(minorUnits('USD')).toBe(2)
    expect(minorUnits('GBP')).toBe(2)
  })

  it('formats to the right number of places', () => {
    expect(formatMoney(125050, 'USD', 'en-US')).toBe('$1,250.50')
    expect(formatMoney(1250, 'JPY', 'en-US')).toBe('¥1,250')
  })

  it('still prints something for a currency it does not know', () => {
    expect(formatMoney(10000, 'ZZZ')).toContain('ZZZ')
  })

  it('offers a short list of real codes', () => {
    expect(new Set(CURRENCIES.map(c => c.code)).size).toBe(CURRENCIES.length)
    for (const c of CURRENCIES)
      expect(c.code).toMatch(/^[A-Z]{3}$/)
  })
})

describe('parseMoney', () => {
  it('reads what people actually type', () => {
    expect(parseMoney('1234.56')).toBe(123456)
    expect(parseMoney('1,234.56')).toBe(123456)
    expect(parseMoney('£1,234.56')).toBe(123456)
    expect(parseMoney('  99 ')).toBe(9900)
  })

  it('treats the last separator as the decimal point', () => {
    // Handles European ordering without asking which convention is in use.
    expect(parseMoney('1.234,56')).toBe(123456)
  })

  it('does not mistake a thousands separator for a decimal point', () => {
    // "1,234" is a thousand-odd, not one and a bit — three digits after the
    // separator gives it away.
    expect(parseMoney('1,234')).toBe(123400)
    expect(parseMoney('1.234')).toBe(123400)
  })

  it('reads negatives, for credit notes', () => {
    expect(parseMoney('-50.00')).toBe(-5000)
  })

  it('respects a currency without minor units', () => {
    expect(parseMoney('1250', 'JPY')).toBe(1250)
    expect(parseMoney('1,250', 'JPY')).toBe(1250)
  })

  it('returns null rather than zero for nothing', () => {
    // Zero and "they left it blank" are different, and an invoice should not
    // silently bill someone nothing.
    for (const text of ['', '   ', 'abc', '£'])
      expect(parseMoney(text)).toBeNull()
  })
})

describe('nextInvoiceNumber', () => {
  it('increments and keeps the zero padding', () => {
    // Padding is what makes invoices sort correctly in a folder.
    expect(nextInvoiceNumber('INV-0007')).toBe('INV-0008')
    expect(nextInvoiceNumber('INV-0099')).toBe('INV-0100')
  })

  it('grows the width only when it has to', () => {
    expect(nextInvoiceNumber('INV-9999')).toBe('INV-10000')
    expect(nextInvoiceNumber('7')).toBe('8')
  })

  it('increments the trailing number, not one in the middle', () => {
    expect(nextInvoiceNumber('2026-INV-0042')).toBe('2026-INV-0043')
  })

  it('keeps a trailing suffix in place', () => {
    expect(nextInvoiceNumber('INV-0007-A')).toBe('INV-0008-A')
  })

  it('starts a sequence when there is nothing to go on', () => {
    expect(nextInvoiceNumber('')).toBe('INV-0001')
    expect(nextInvoiceNumber('   ')).toBe('INV-0001')
    expect(nextInvoiceNumber('DRAFT')).toBe('DRAFT-1')
  })
})

describe('dates', () => {
  it('adds days across a month boundary', () => {
    expect(addDays('2026-08-20', 30)).toBe('2026-09-19')
    expect(addDays('2026-12-20', 14)).toBe('2027-01-03')
  })

  it('gets a leap year right', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
  })

  it('handles due on receipt', () => {
    expect(addDays('2026-08-20', 0)).toBe('2026-08-20')
  })

  it('gives back nonsense unchanged rather than inventing a date', () => {
    expect(addDays('not a date', 30)).toBe('not a date')
  })

  it('formats without depending on the reader guessing the date order', () => {
    // 03/04 is ambiguous worldwide; a month name is not.
    expect(formatDate('2026-08-20', 'en-GB')).toBe('20 Aug 2026')
  })

  it('does not slip a day across time zones', () => {
    // Parsing a bare date as local time moves it west of Greenwich.
    expect(formatDate('2026-01-01', 'en-GB')).toContain('1 Jan 2026')
  })
})
