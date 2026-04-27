export type PropertyType =
  | 'Residential'
  | 'Commercial'
  | 'Multi-family'
  | 'Municipal'
  | 'Property Management';

export type QuoteStatus =
  | 'Draft'
  | 'Sent'
  | 'Viewed'
  | 'Approved'
  | 'Changes Requested'
  | 'Declined'
  | 'Converted to Work Order'
  | 'Archived';

export type QuoteSource =
  | 'Call-in'
  | 'Existing Customer'
  | 'Real Estate Agent'
  | 'Property Manager'
  | 'Referral'
  | 'Website'
  | 'Other';

export type InternalPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type DiscountType = 'none' | 'flat' | 'percentage';
export type DepositType = 'none' | 'flat' | 'percentage';

export type LineItemCategory =
  | 'Labor'
  | 'Material'
  | 'Equipment'
  | 'Treatment'
  | 'Warranty'
  | 'Renewal'
  | 'Discount'
  | 'Other';

export interface Salesperson {
  id: string;
  name: string;
  email?: string;
}

export interface ServiceType {
  id: string;
  name: string;
}

export interface Customer {
  name: string;
  phone: string;
  email: string;
  billingAddress: string;
  serviceAddress: string;
  propertyType: PropertyType;
  pestPacCustomerNumber?: string;
  pestPacLocationNumber?: string;
}

export interface QuoteLineItem {
  id: string;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxable: boolean;
  optional: boolean;
  optionalSelected: boolean;
  internalCost: number;
  category: LineItemCategory;
}

export interface QuoteAttachment {
  id: string;
  name: string;
  customerVisible: boolean;
}

export interface InternalNotes {
  internalInstructions: string;
  materialsNeeded: string;
  equipmentNeeded: string;
  technicianNotes: string;
  accessNotes: string;
  safetyPpeNotes: string;
  pestPacEntryNotes: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customer: Customer;
  quoteTitle: string;
  serviceType: string;
  salespersonId: string;
  createdDate: string;
  expirationDate: string;
  status: QuoteStatus;
  internalPriority: InternalPriority;
  source: QuoteSource;
  scopeSummary: string;
  lineItems: QuoteLineItem[];
  discountType: DiscountType;
  discountValue: number;
  depositType: DepositType;
  depositValue: number;
  termsBlockId: string;
  customTerms?: string;
  internalNotes: InternalNotes;
  attachments: QuoteAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface QuoteTemplate {
  id: string;
  name: string;
  quoteTitle: string;
  serviceType: string;
  scopeSummary: string;
  lineItems: Omit<QuoteLineItem, 'id'>[];
  termsBlockId: string;
  internalNotesChecklist: string;
  pestPacNotesPlaceholder: string;
}

export interface ItemLibraryItem {
  id: string;
  itemName: string;
  category: LineItemCategory;
  defaultDescription: string;
  defaultUnit: string;
  defaultUnitPrice: number;
  defaultInternalCost: number;
  taxable: boolean;
  serviceType: string;
  active: boolean;
}

export interface TermsBlock {
  id: string;
  serviceType: string;
  title: string;
  body: string;
}

export interface InternalWorkOrder {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  serviceAddress: string;
  quoteTitle: string;
  approvedLineItems: QuoteLineItem[];
  optionalSelected: QuoteLineItem[];
  materialsList: string;
  equipmentList: string;
  technicianInstructions: string;
  safetyPpeNotes: string;
  accessNotes: string;
  pestPacEntryNotes: string;
  recommendedPestPacServiceCode: string;
  recommendedPestPacPriceCode: string;
}

export interface AppSettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  licenseInfo: string;
  defaultQuoteExpirationDays: number;
  defaultTaxRate: number;
  defaultTerms: string;
  salespeople: Salesperson[];
  serviceTypes: ServiceType[];
}

export interface QuoteTotals {
  requiredSubtotal: number;
  optionalSubtotal: number;
  discountAmount: number;
  taxableAmount: number;
  tax: number;
  total: number;
  depositAmount: number;
  balanceDue: number;
}
