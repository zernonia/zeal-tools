<script setup lang="ts">
import { Plus, Printer, Trash2, Upload, X } from 'lucide-vue-next'
import { CURRENCIES, PAYMENT_TERMS } from '../../core'
import { useInvoice } from '../composables/useInvoice'

const {
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
  useClient,
  forgetClient,
  startNext,
  print,
} = useInvoice()

const confirmClear = ref(false)
const inputClass = 'flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none dark:bg-input/30'
const areaClass = 'flex min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none dark:bg-input/30'
</script>

<template>
  <div class="tool-frame flex flex-col gap-5">
    <!-- What is kept, said plainly, with the way out beside it. -->
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/40 px-4 py-3 text-sm">
      <p class="text-muted-foreground">
        <template v-if="!available">
          This browser will not let the page store anything, so nothing is remembered between visits.
        </template>
        <template v-else-if="stored">
          <span class="font-medium text-foreground">Saved on this device.</span>
          Your details, clients and this draft stay in this browser and are never sent anywhere.
        </template>
        <template v-else>
          Your details and clients will be saved in this browser so the next invoice is quicker. Nothing
          is ever sent anywhere.
        </template>
      </p>
      <div v-if="stored" class="flex items-center gap-2">
        <template v-if="confirmClear">
          <span class="text-xs text-muted-foreground">Erase everything saved?</span>
          <Button size="sm" variant="outline" @click="confirmClear = false">
            Keep
          </Button>
          <Button size="sm" variant="outline" class="text-destructive" @click="clear(); confirmClear = false">
            Erase
          </Button>
        </template>
        <Button v-else size="sm" variant="outline" @click="confirmClear = true">
          <Trash2 class="size-4" /> Clear saved data
        </Button>
      </div>
    </div>

    <div v-if="ready" class="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
      <!-- ─────────────────────────── the form ─────────────────────────── -->
      <div class="flex min-w-0 flex-col gap-5">
        <section class="rounded-2xl border bg-background p-5 dark:bg-input/30">
          <h2 class="text-sm font-semibold">
            Your business
          </h2>
          <p class="mt-1 text-xs text-muted-foreground">
            Typed once, reused on every invoice.
          </p>
          <div class="mt-3 flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <span class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/50">
                <img v-if="state.business.logo" :src="state.business.logo" alt="Your logo" class="size-full object-contain">
                <Upload v-else class="size-4 text-muted-foreground" />
              </span>
              <div class="min-w-0 grow">
                <input id="logo" type="file" class="sr-only" accept="image/*" @change="setLogo(($event.target as HTMLInputElement).files?.[0])">
                <Label for="logo" class="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border px-3 text-xs">
                  {{ state.business.logo ? 'Replace logo' : 'Add a logo' }}
                </Label>
                <button
                  v-if="state.business.logo"
                  type="button"
                  class="ml-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
                  @click="state.business.logo = ''"
                >
                  Remove
                </button>
              </div>
            </div>
            <div><Label for="biz-name">Name</Label><input id="biz-name" v-model="state.business.name" :class="inputClass" placeholder="Your company"></div>
            <div><Label for="biz-address">Address</Label><textarea id="biz-address" v-model="state.business.address" :class="areaClass" rows="3" placeholder="Street, city, postcode" /></div>
            <div class="grid grid-cols-2 gap-3">
              <div><Label for="biz-email">Email</Label><input id="biz-email" v-model="state.business.email" :class="inputClass" type="email"></div>
              <div><Label for="biz-phone">Phone</Label><input id="biz-phone" v-model="state.business.phone" :class="inputClass"></div>
            </div>
            <div><Label for="biz-tax">Tax number</Label><input id="biz-tax" v-model="state.business.taxNumber" :class="inputClass" placeholder="VAT / GST / ABN"></div>
          </div>
        </section>

        <section class="rounded-2xl border bg-background p-5 dark:bg-input/30">
          <h2 class="text-sm font-semibold">
            Bill to
          </h2>
          <ul v-if="state.clients.length" class="mt-3 flex flex-wrap gap-2">
            <li v-for="client in state.clients" :key="client.id" class="flex items-center rounded-lg border text-xs">
              <button type="button" class="min-h-9 px-2.5 transition-colors hover:text-primary" @click="useClient(client)">
                {{ client.name }}
              </button>
              <button
                type="button"
                class="grid min-h-9 w-7 place-items-center text-muted-foreground transition-colors hover:text-destructive"
                :aria-label="`Forget ${client.name}`"
                @click="forgetClient(client.id)"
              >
                <X class="size-3" />
              </button>
            </li>
          </ul>
          <div class="mt-3 flex flex-col gap-3">
            <div><Label for="client-name">Client</Label><input id="client-name" v-model="draft.clientName" :class="inputClass" placeholder="Their company"></div>
            <div><Label for="client-address">Address</Label><textarea id="client-address" v-model="draft.clientAddress" :class="areaClass" rows="3" /></div>
            <div><Label for="client-email">Email</Label><input id="client-email" v-model="draft.clientEmail" :class="inputClass" type="email"></div>
          </div>
        </section>

        <section class="rounded-2xl border bg-background p-5 dark:bg-input/30">
          <h2 class="text-sm font-semibold">
            Invoice details
          </h2>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <div><Label for="inv-number">Number</Label><input id="inv-number" v-model="draft.number" :class="inputClass"></div>
            <div><Label for="inv-issued">Issued</Label><input id="inv-issued" v-model="draft.issued" :class="inputClass" type="date"></div>
            <div>
              <Label for="inv-terms">Terms</Label>
              <select id="inv-terms" v-model.number="draft.termsDays" :class="inputClass">
                <option v-for="term in PAYMENT_TERMS" :key="term.days" :value="term.days">
                  {{ term.label }}
                </option>
              </select>
            </div>
            <div>
              <Label for="inv-currency">Currency</Label>
              <select id="inv-currency" v-model="state.currency" :class="inputClass">
                <option v-for="currency in CURRENCIES" :key="currency.code" :value="currency.code">
                  {{ currency.code }} — {{ currency.label }}
                </option>
              </select>
            </div>
            <div><Label for="tax-label">Tax name</Label><input id="tax-label" v-model="state.taxLabel" :class="inputClass" placeholder="VAT"></div>
            <div><Label for="tax-rate">Tax rate %</Label><input id="tax-rate" v-model.number="state.taxRate" :class="inputClass" type="number" min="0" max="100" step="0.1"></div>
            <div>
              <Label for="disc-kind">Discount</Label>
              <select id="disc-kind" v-model="draft.discountKind" :class="inputClass">
                <option value="none">
                  None
                </option><option value="percent">
                  Percent
                </option><option value="fixed">
                  Fixed
                </option>
              </select>
            </div>
            <div v-if="draft.discountKind !== 'none'">
              <Label for="disc-value">{{ draft.discountKind === 'percent' ? 'Percent off' : 'Amount off' }}</Label>
              <input
                id="disc-value"
                :value="draft.discountKind === 'percent' ? draft.discountValue : draft.discountValue / 100"
                :class="inputClass"
                type="number"
                min="0"
                step="0.01"
                @input="draft.discountValue = draft.discountKind === 'percent' ? Number(($event.target as HTMLInputElement).value) : Math.round(Number(($event.target as HTMLInputElement).value) * 100)"
              >
            </div>
          </div>
          <div class="mt-3">
            <Label for="inv-notes">Notes</Label>
            <textarea id="inv-notes" v-model="draft.notes" :class="areaClass" rows="3" placeholder="Payment details, thank you, terms…" />
          </div>
        </section>

        <section class="rounded-2xl border bg-background p-5 dark:bg-input/30">
          <h2 class="text-sm font-semibold">
            Lines
          </h2>
          <ul class="mt-3 flex flex-col gap-3">
            <li v-for="item in items" :key="item.id" class="rounded-xl border p-3">
              <div class="flex items-start gap-2">
                <input v-model="item.description" :class="inputClass" placeholder="What you did" aria-label="Description for line">
                <button
                  type="button"
                  class="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  aria-label="Remove this line"
                  @click="removeItem(item.id)"
                >
                  <X class="size-4" />
                </button>
              </div>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <input v-model.number="item.quantity" :class="inputClass" type="number" step="0.01" aria-label="Quantity">
                <input :value="priceText(item)" :class="inputClass" inputmode="decimal" aria-label="Unit price" @input="setPrice(item.id, ($event.target as HTMLInputElement).value)">
              </div>
            </li>
          </ul>
          <Button size="sm" variant="outline" class="mt-3" @click="addItem">
            <Plus class="size-4" /> Add a line
          </Button>
        </section>

        <div class="flex flex-wrap gap-2">
          <Button @click="print">
            <Printer class="size-4" /> Print or save as PDF
          </Button>
          <Button variant="outline" @click="startNext">
            Start the next invoice
          </Button>
        </div>
      </div>

      <!-- ───────────────────────── the document ───────────────────────── -->
      <!--
        Sticky, so the document stays beside the field being edited rather than
        scrolling away and leaving an empty column. It scrolls internally when
        an invoice runs longer than the window; print resets both, because a
        pinned, clipped element does not paginate.
      -->
      <div class="print-document min-w-0 rounded-2xl border bg-card p-8 text-sm sm:p-10 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
        <header class="flex flex-wrap items-start justify-between gap-6">
          <div class="min-w-0">
            <img v-if="state.business.logo" :src="state.business.logo" alt="" class="mb-3 max-h-16 max-w-48 object-contain">
            <p class="text-base font-semibold">
              {{ state.business.name || 'Your company' }}
            </p>
            <p class="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
              {{ state.business.address }}
            </p>
            <p v-if="state.business.email || state.business.phone" class="mt-1 text-xs text-muted-foreground">
              {{ [state.business.email, state.business.phone].filter(Boolean).join(' · ') }}
            </p>
            <p v-if="state.business.taxNumber" class="mt-1 text-xs text-muted-foreground">
              {{ state.business.taxNumber }}
            </p>
          </div>
          <div class="text-right">
            <p class="font-heading text-2xl">
              Invoice
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ draft.number }}
            </p>
          </div>
        </header>

        <div class="mt-8 flex flex-wrap justify-between gap-6">
          <div class="min-w-0">
            <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
              Billed to
            </p>
            <p class="mt-1 font-medium">
              {{ draft.clientName || 'Client name' }}
            </p>
            <p class="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
              {{ draft.clientAddress }}
            </p>
            <p v-if="draft.clientEmail" class="mt-1 text-xs text-muted-foreground">
              {{ draft.clientEmail }}
            </p>
          </div>
          <dl class="text-right text-xs">
            <div class="flex justify-end gap-6">
              <dt class="text-muted-foreground">
                Issued
              </dt><dd class="tabular-nums">
                {{ asDate(draft.issued) }}
              </dd>
            </div>
            <div class="mt-1 flex justify-end gap-6">
              <dt class="text-muted-foreground">
                Due
              </dt><dd class="tabular-nums">
                {{ draft.termsDays === 0 ? 'On receipt' : asDate(dueDate) }}
              </dd>
            </div>
          </dl>
        </div>

        <table class="mt-8 w-full border-collapse text-left">
          <thead>
            <tr class="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" class="py-2 font-medium">
                Description
              </th>
              <th scope="col" class="py-2 text-right font-medium">
                Qty
              </th>
              <th scope="col" class="py-2 text-right font-medium">
                Unit
              </th>
              <th scope="col" class="py-2 text-right font-medium">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="border-b border-border/60">
              <td class="py-2 pr-4 align-top">
                {{ item.description || '—' }}
              </td>
              <td class="py-2 text-right align-top tabular-nums">
                {{ item.quantity }}
              </td>
              <td class="py-2 pl-4 text-right align-top tabular-nums">
                {{ money(item.unitPrice) }}
              </td>
              <td class="py-2 pl-4 text-right align-top tabular-nums">
                {{ money(Math.round(item.quantity * item.unitPrice)) }}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-6 flex justify-end">
          <dl class="w-full max-w-64 text-sm">
            <div class="flex justify-between py-1">
              <dt class="text-muted-foreground">
                Subtotal
              </dt><dd class="tabular-nums">
                {{ money(totals.subtotal) }}
              </dd>
            </div>
            <div v-if="totals.discount" class="flex justify-between py-1">
              <dt class="text-muted-foreground">
                Discount
              </dt><dd class="tabular-nums">
                −{{ money(totals.discount) }}
              </dd>
            </div>
            <div v-if="state.taxRate" class="flex justify-between py-1">
              <dt class="text-muted-foreground">
                {{ state.taxLabel || 'Tax' }} {{ state.taxRate }}%
              </dt><dd class="tabular-nums">
                {{ money(totals.tax) }}
              </dd>
            </div>
            <div class="mt-1 flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt><dd class="tabular-nums">
                {{ money(totals.total) }}
              </dd>
            </div>
          </dl>
        </div>

        <p v-if="draft.notes" class="mt-8 whitespace-pre-line border-t pt-4 text-xs leading-relaxed text-muted-foreground">
          {{ draft.notes }}
        </p>
      </div>
    </div>
  </div>
</template>
