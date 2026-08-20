import type { StoreDefinition } from '../../../../shared/core/storage'
import type { Charges, DiscountKind, LineItem } from '../../core'
import { safeList, safeNumber, safeText } from '../../../../shared/core/storage'
import { addDays, computeTotals, formatDate, formatMoney, nextInvoiceNumber, parseMoney } from '../../core'

export interface Client {
  id: number
  name: string
  address: string
  email: string
}

export interface Business {
  name: string
  address: string
  email: string
  phone: string
  taxNumber: string
  /** A downscaled data URI. Kept small on purpose — see `setLogo`. */
  logo: string
}

export interface Draft {
  number: string
  issued: string
  termsDays: number
  clientName: string
  clientAddress: string
  clientEmail: string
  items: LineItem[]
  discountKind: DiscountKind
  discountValue: number
  notes: string
}

export interface Stored {
  business: Business
  currency: string
  taxRate: number
  taxLabel: string
  clients: Client[]
  draft: Draft
}

const today = () => new Date().toISOString().slice(0, 10)

function emptyDraft(): Draft {
  return {
    number: 'INV-0001',
    issued: today(),
    termsDays: 30,
    clientName: '',
    clientAddress: '',
    clientEmail: '',
    items: [{ id: 1, description: '', quantity: 1, unitPrice: 0 }],
    discountKind: 'none',
    discountValue: 0,
    notes: '',
  }
}

const defaults: Stored = {
  business: { name: '', address: '', email: '', phone: '', taxNumber: '', logo: '' },
  currency: 'USD',
  taxRate: 0,
  taxLabel: 'Tax',
  clients: [],
  draft: emptyDraft(),
}

/**
 * Everything here is written to the device and nothing to a server.
 *
 * There is no `omit`: an invoice has no field that must never be kept, which
 * is precisely why the tool is worth persisting at all. What matters instead
 * is that all of it is revived defensively — storage is writable by the user,
 * by another tab and by an extension, and a corrupt payload must not be able
 * to render a hundred thousand line items or smuggle a newline into a company
 * name that is about to be printed onto a document.
 */
const store: StoreDefinition<Stored> = {
  key: 'zeal:invoice',
  version: 1,
  defaults,
  revive: (raw, base) => {
    const business = (raw.business ?? {}) as Record<string, unknown>
    const draft = (raw.draft ?? {}) as Record<string, unknown>
    return {
      business: {
        name: safeText(business.name, base.business.name, 120),
        address: safeText(business.address, base.business.address, 400),
        email: safeText(business.email, base.business.email, 120),
        phone: safeText(business.phone, base.business.phone, 60),
        taxNumber: safeText(business.taxNumber, base.business.taxNumber, 60),
        // Only a data URI, never a remote one: a stored http(s) logo would
        // make the document fetch from a third party every time it opened.
        logo: typeof business.logo === 'string' && business.logo.startsWith('data:image/')
          ? business.logo.slice(0, 700_000)
          : '',
      },
      currency: safeText(raw.currency, base.currency, 8).toUpperCase(),
      taxRate: safeNumber(raw.taxRate, base.taxRate, 0, 100),
      taxLabel: safeText(raw.taxLabel, base.taxLabel, 24),
      clients: safeList(raw.clients, (entry) => {
        if (!entry || typeof entry !== 'object')
          return null
        const c = entry as Record<string, unknown>
        const name = safeText(c.name, '', 120)
        if (!name)
          return null
        return {
          id: safeNumber(c.id, Date.now(), 0),
          name,
          address: safeText(c.address, '', 400),
          email: safeText(c.email, '', 120),
        }
      }, 60),
      draft: {
        number: safeText(draft.number, base.draft.number, 40),
        issued: /^\d{4}-\d{2}-\d{2}$/.test(String(draft.issued)) ? String(draft.issued) : today(),
        termsDays: safeNumber(draft.termsDays, base.draft.termsDays, 0, 365),
        clientName: safeText(draft.clientName, '', 120),
        clientAddress: safeText(draft.clientAddress, '', 400),
        clientEmail: safeText(draft.clientEmail, '', 120),
        items: safeList(draft.items, (entry) => {
          if (!entry || typeof entry !== 'object')
            return null
          const i = entry as Record<string, unknown>
          return {
            id: safeNumber(i.id, Date.now(), 0),
            description: safeText(i.description, '', 300),
            quantity: safeNumber(i.quantity, 1, -100_000, 100_000),
            unitPrice: safeNumber(i.unitPrice, 0, -1e11, 1e11),
          }
        }, 200),
        discountKind: ['none', 'percent', 'fixed'].includes(String(draft.discountKind))
          ? draft.discountKind as DiscountKind
          : 'none',
        discountValue: safeNumber(draft.discountValue, 0, 0, 1e11),
        notes: safeText(draft.notes, '', 1000),
      },
    }
  },
}

/** A logo is stored, so it is shrunk first — a 4 MB PNG would fill the quota. */
const LOGO_MAX = 400

export function useInvoice() {
  const { state, ready, available, stored, clear } = useToolStorage(store)

  let nextId = Date.now()
  const newId = () => ++nextId

  const draft = computed(() => state.value.draft)
  const items = computed(() => state.value.draft.items)

  const charges = computed<Charges>(() => ({
    taxRate: state.value.taxRate,
    taxLabel: state.value.taxLabel,
    discountKind: state.value.draft.discountKind,
    discountValue: state.value.draft.discountValue,
  }))

  const totals = computed(() => computeTotals(items.value, charges.value))
  const dueDate = computed(() => addDays(draft.value.issued, draft.value.termsDays))
  const money = (minor: number) => formatMoney(minor, state.value.currency)
  const asDate = (iso: string) => formatDate(iso)

  function addItem() {
    state.value.draft.items.push({ id: newId(), description: '', quantity: 1, unitPrice: 0 })
  }

  function removeItem(id: number) {
    const remaining = state.value.draft.items.filter(i => i.id !== id)
    // Never leave the table with no rows: an empty grid reads as broken, and
    // there is nothing to click to get a row back.
    state.value.draft.items = remaining.length ? remaining : [{ id: newId(), description: '', quantity: 1, unitPrice: 0 }]
  }

  /** Amounts are typed as text and stored as minor units. */
  function setPrice(id: number, text: string) {
    const item = state.value.draft.items.find(i => i.id === id)
    if (item)
      item.unitPrice = parseMoney(text, state.value.currency) ?? 0
  }

  function priceText(item: LineItem): string {
    return (item.unitPrice / 10 ** (state.value.currency === 'JPY' ? 0 : 2)).toString()
  }

  async function setLogo(file: File | null | undefined) {
    if (!file)
      return
    const url = URL.createObjectURL(file)
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('unreadable'))
        img.src = url
      })
      const scale = Math.min(1, LOGO_MAX / Math.max(image.naturalWidth || LOGO_MAX, image.naturalHeight || LOGO_MAX))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round((image.naturalWidth || LOGO_MAX) * scale))
      canvas.height = Math.max(1, Math.round((image.naturalHeight || LOGO_MAX) * scale))
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      state.value.business.logo = canvas.toDataURL('image/png')
    }
    catch {
      state.value.business.logo = ''
    }
    finally {
      URL.revokeObjectURL(url)
    }
  }

  /** Remember a client so the next invoice to them is two clicks. */
  function saveClient() {
    const name = draft.value.clientName.trim()
    if (!name)
      return
    const existing = state.value.clients.find(c => c.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      existing.address = draft.value.clientAddress
      existing.email = draft.value.clientEmail
      return
    }
    state.value.clients.unshift({
      id: newId(),
      name,
      address: draft.value.clientAddress,
      email: draft.value.clientEmail,
    })
  }

  function useClient(client: Client) {
    state.value.draft.clientName = client.name
    state.value.draft.clientAddress = client.address
    state.value.draft.clientEmail = client.email
  }

  function forgetClient(id: number) {
    state.value.clients = state.value.clients.filter(c => c.id !== id)
  }

  /**
   * Start the next invoice.
   *
   * Keeps the business details and the client, advances the number, and
   * empties the lines — which is the whole reason this tool remembers
   * anything. The finished invoice is not kept: it has already been printed,
   * and storing a pile of them is a different tool with different obligations.
   */
  function startNext() {
    saveClient()
    const number = nextInvoiceNumber(draft.value.number)
    state.value.draft = {
      ...emptyDraft(),
      number,
      issued: today(),
      termsDays: draft.value.termsDays,
      clientName: draft.value.clientName,
      clientAddress: draft.value.clientAddress,
      clientEmail: draft.value.clientEmail,
      items: [{ id: newId(), description: '', quantity: 1, unitPrice: 0 }],
    }
  }

  function print() {
    saveClient()
    // Let the DOM settle before the browser freezes it for the print preview.
    nextTick(() => window.print())
  }

  return {
    state,
    ready,
    available,
    stored,
    clear,
    draft,
    items,
    totals,
    dueDate,
    money,
    asDate,
    addItem,
    removeItem,
    setPrice,
    priceText,
    setLogo,
    saveClient,
    useClient,
    forgetClient,
    startNext,
    print,
  }
}
