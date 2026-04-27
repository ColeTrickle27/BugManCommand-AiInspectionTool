import type { AppSettings, ItemLibraryItem, Quote, QuoteTemplate, TermsBlock } from '@/types/quotes';
import { makeId } from '@/lib/quote-utils';

const today = new Date();
const plusDays = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const defaultSettings: AppSettings = {
  companyName: 'Holloman Exterminators',
  address: 'Dunn, NC',
  phone: '(910) 555-0143',
  email: 'office@hollomanexterminators.com',
  website: 'https://hollomanexterminators.example',
  licenseInfo: 'License info placeholder',
  defaultQuoteExpirationDays: 30,
  defaultTaxRate: 6.75,
  defaultTerms:
    'Treatment method to be confirmed by licensed applicator. Materials and application methods must follow current product label and NC regulations. Final scope subject to technician/sales review.',
  salespeople: [
    { id: 'sp-1', name: 'Chris Holloman' },
    { id: 'sp-2', name: 'Dana Lee' },
  ],
  serviceTypes: [
    'Residential pest control','Commercial pest control','Termite treatments','ATBS / Termite Bait Station Install','Crawlspace Vapor Barrier','Crawlspace Encapsulation','Bed Bug Treatment','Rodent Control','Mosquito Service','Flea Treatment','Fire Ant Treatment','WDI / Real Estate Report',
  ].map((name, i) => ({ id: `svc-${i + 1}`, name })),
};

export const defaultTermsBlocks: TermsBlock[] = [
  { id: 'terms-general', serviceType: 'General pest control', title: 'General Pest Control Terms', body: defaultSettings.defaultTerms },
  { id: 'terms-termite-liquid', serviceType: 'Termite liquid treatment', title: 'Termite Liquid Treatment Terms', body: defaultSettings.defaultTerms },
  { id: 'terms-termite-bait', serviceType: 'ATBS / Termite Bait Station Install', title: 'Termite Bait Station Terms', body: defaultSettings.defaultTerms },
  { id: 'terms-crawlspace', serviceType: 'Crawlspace / encapsulation', title: 'Crawlspace Terms', body: defaultSettings.defaultTerms },
  { id: 'terms-bedbug', serviceType: 'Bed bug treatment', title: 'Bed Bug Terms', body: defaultSettings.defaultTerms },
  { id: 'terms-moisture', serviceType: 'Moisture / vapor barrier', title: 'Moisture Terms', body: defaultSettings.defaultTerms },
  { id: 'terms-wdi', serviceType: 'WDI / real estate report', title: 'WDI Terms', body: defaultSettings.defaultTerms },
];

export const defaultItemLibrary: ItemLibraryItem[] = [
  ['Initial General Pest Service', 'Treatment', 189],
  ['Quarterly Pest Service', 'Renewal', 99],
  ['ATBS Station Install', 'Material', 69],
  ['ATBS Monitoring Plan', 'Warranty', 24],
  ['Crawlspace Encapsulation Labor', 'Labor', 1800],
  ['Vapor Barrier Material', 'Material', 2.5],
  ['Bed Bug Initial Treatment', 'Treatment', 950],
  ['Rodent Exterior Station Package', 'Treatment', 240],
].map((entry, idx) => ({
  id: `lib-${idx + 1}`,
  itemName: entry[0] as string,
  category: entry[1] as ItemLibraryItem['category'],
  defaultDescription: `${entry[0]} service item`,
  defaultUnit: 'ea',
  defaultUnitPrice: entry[2] as number,
  defaultInternalCost: Math.round((entry[2] as number) * 0.45),
  taxable: true,
  serviceType: 'General pest control',
  active: true,
}));

const template = (name: string, serviceType: string, title: string): QuoteTemplate => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  serviceType,
  quoteTitle: title,
  scopeSummary:
    'Based on the inspection, we recommend this service plan for your property. Treatment method to be confirmed by licensed applicator.',
  lineItems: [
    {
      itemName: `${serviceType} Base Service`,
      description: 'Core service deliverables',
      quantity: 1,
      unit: 'ea',
      unitPrice: 250,
      taxable: true,
      optional: false,
      optionalSelected: false,
      internalCost: 110,
      category: 'Treatment',
    },
    {
      itemName: 'Follow-up Service Add-on',
      description: 'Recommended optional follow-up visit',
      quantity: 1,
      unit: 'ea',
      unitPrice: 125,
      taxable: true,
      optional: true,
      optionalSelected: false,
      internalCost: 50,
      category: 'Renewal',
    },
  ],
  termsBlockId: 'terms-general',
  internalNotesChecklist: '☐ Confirm access points\n☐ Confirm PPE\n☐ Confirm materials',
  pestPacNotesPlaceholder: 'Paste approved scope and line items into PestPac work order notes.',
});

export const defaultTemplates: QuoteTemplate[] = [
  ['General Pest Control Initial + Recurring', 'Residential pest control', 'Initial + Recurring Pest Control Plan'],
  ['Quarterly Pest Control', 'Residential pest control', 'Quarterly Pest Control Program'],
  ['Monthly Pest Control', 'Residential pest control', 'Monthly Pest Control Program'],
  ['Termite Liquid Treatment', 'Termite treatments', 'Termite Liquid Treatment Plan'],
  ['ATBS / Termite Bait Station Install', 'ATBS / Termite Bait Station Install', 'Termite Bait Station Installation'],
  ['Crawlspace Vapor Barrier', 'Crawlspace Vapor Barrier', 'Crawlspace Vapor Barrier Installation'],
  ['Crawlspace Encapsulation', 'Crawlspace Encapsulation', 'Crawlspace Encapsulation Proposal'],
  ['Bed Bug Treatment', 'Bed Bug Treatment', 'Bed Bug Treatment Plan'],
  ['Rodent Control', 'Rodent Control', 'Rodent Control Service'],
  ['Mosquito Service', 'Mosquito Service', 'Mosquito Reduction Service'],
  ['Flea Treatment', 'Flea Treatment', 'Flea Treatment Service'],
  ['Fire Ant Treatment', 'Fire Ant Treatment', 'Fire Ant Treatment Service'],
  ['WDI / Real Estate Report', 'WDI / Real Estate Report', 'WDI / Real Estate Inspection Report'],
].map(([name, serviceType, title]) => template(name, serviceType, title));

const baseQuote = (num: string, title: string, serviceType: string, customerName: string, serviceAddress: string): Quote => ({
  id: makeId('quote'),
  quoteNumber: num,
  customer: {
    name: customerName,
    phone: '(910) 555-0000',
    email: 'customer@example.com',
    billingAddress: serviceAddress,
    serviceAddress,
    propertyType: 'Residential',
    pestPacCustomerNumber: '',
    pestPacLocationNumber: '',
  },
  quoteTitle: title,
  serviceType,
  salespersonId: 'sp-1',
  createdDate: plusDays(-2),
  expirationDate: plusDays(28),
  status: 'Sent',
  internalPriority: 'Normal',
  source: 'Call-in',
  scopeSummary: 'We identified active conditions and recommend a targeted professional service plan.',
  lineItems: [
    { id: makeId('li'), itemName: `${title} Core Service`, description: 'Primary service scope', quantity: 1, unit: 'ea', unitPrice: 450, taxable: true, optional: false, optionalSelected: false, internalCost: 200, category: 'Treatment' },
    { id: makeId('li'), itemName: 'Optional Follow-up', description: 'Optional additional service', quantity: 1, unit: 'ea', unitPrice: 150, taxable: true, optional: true, optionalSelected: false, internalCost: 75, category: 'Renewal' },
  ],
  discountType: 'none',
  discountValue: 0,
  depositType: 'percentage',
  depositValue: 30,
  termsBlockId: 'terms-general',
  customTerms: '',
  internalNotes: {
    internalInstructions: 'Schedule within 7 days of approval.',
    materialsNeeded: 'Confirm required materials after pre-job walk-through.',
    equipmentNeeded: 'Standard treatment equipment and PPE.',
    technicianNotes: 'Final scope subject to technician/sales review.',
    accessNotes: 'Coordinate gate access with customer.',
    safetyPpeNotes: 'Follow current safety guidelines and product labels.',
    pestPacEntryNotes: 'Create Work Order from approved line items. Use price code placeholder.',
  },
  attachments: [{ id: makeId('att'), name: 'Inspection Photos Placeholder', customerVisible: true }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const sampleQuotes: Quote[] = [
  baseQuote('HE-1001', 'ATBS Termite Bait Station Quote', 'ATBS / Termite Bait Station Install', 'M. Townsend', '112 Oak Ridge Rd, Dunn, NC'),
  baseQuote('HE-1002', 'Crawlspace Encapsulation Proposal', 'Crawlspace Encapsulation', 'S. Alvarez', '48 Legacy Ln, Dunn, NC'),
  baseQuote('HE-1003', 'Bed Bug Treatment Plan', 'Bed Bug Treatment', 'J. Monroe', '905 East Cumberland St, Dunn, NC'),
  baseQuote('HE-1004', 'Quarterly Pest Control Program', 'Residential pest control', 'R. McKay', '30 Fairway Drive, Dunn, NC'),
];
