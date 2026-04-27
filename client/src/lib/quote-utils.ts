import type { AppSettings, InternalWorkOrder, Quote, QuoteLineItem, QuoteTotals } from '@/types/quotes';

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const toMoney = (value: number) => Math.round(value * 100) / 100;

const lineTotal = (item: QuoteLineItem) => toMoney(item.quantity * item.unitPrice);

export function calculateQuoteTotals(quote: Quote, settings: AppSettings): QuoteTotals {
  const requiredItems = quote.lineItems.filter((item) => !item.optional || item.optionalSelected);
  const optionalItems = quote.lineItems.filter((item) => item.optional && !item.optionalSelected);

  const requiredSubtotal = toMoney(requiredItems.reduce((sum, item) => sum + lineTotal(item), 0));
  const optionalSubtotal = toMoney(optionalItems.reduce((sum, item) => sum + lineTotal(item), 0));

  const discountAmount =
    quote.discountType === 'flat'
      ? Math.min(requiredSubtotal, quote.discountValue)
      : quote.discountType === 'percentage'
        ? toMoney(requiredSubtotal * (quote.discountValue / 100))
        : 0;

  const discountedSubtotal = Math.max(0, toMoney(requiredSubtotal - discountAmount));

  const taxableBeforeDiscount = requiredItems.filter((i) => i.taxable).reduce((sum, item) => sum + lineTotal(item), 0);
  const taxableAmount = requiredSubtotal > 0 ? toMoney(Math.max(0, taxableBeforeDiscount - (discountAmount * taxableBeforeDiscount) / requiredSubtotal)) : 0;

  const tax = toMoney(taxableAmount * (settings.defaultTaxRate / 100));
  const total = toMoney(discountedSubtotal + tax);

  const depositAmount =
    quote.depositType === 'flat'
      ? Math.min(total, quote.depositValue)
      : quote.depositType === 'percentage'
        ? toMoney(total * (quote.depositValue / 100))
        : 0;

  return {
    requiredSubtotal,
    optionalSubtotal,
    discountAmount,
    taxableAmount,
    tax,
    total,
    depositAmount,
    balanceDue: toMoney(total - depositAmount),
  };
}

export function toInternalWorkOrder(quote: Quote): InternalWorkOrder {
  const approvedLineItems = quote.lineItems.filter((item) => !item.optional || item.optionalSelected);
  const optionalSelected = quote.lineItems.filter((item) => item.optional && item.optionalSelected);

  return {
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    customerName: quote.customer.name,
    serviceAddress: quote.customer.serviceAddress,
    quoteTitle: quote.quoteTitle,
    approvedLineItems,
    optionalSelected,
    materialsList: quote.internalNotes.materialsNeeded,
    equipmentList: quote.internalNotes.equipmentNeeded,
    technicianInstructions: quote.internalNotes.technicianNotes,
    safetyPpeNotes: quote.internalNotes.safetyPpeNotes,
    accessNotes: quote.internalNotes.accessNotes,
    pestPacEntryNotes: quote.internalNotes.pestPacEntryNotes,
    recommendedPestPacServiceCode: 'TBD-SVC-CODE',
    recommendedPestPacPriceCode: 'TBD-PRICE-CODE',
  };
}

export const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const makeQuoteNumber = (n: number) => `HE-${String(n).padStart(4, '0')}`;
