import { useMemo, useState } from 'react';
import { Archive, Copy, FileText, Plus, Printer, Settings as SettingsIcon, Clipboard, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { AppSettings, ItemLibraryItem, Quote, QuoteLineItem, QuoteStatus, QuoteTemplate, TermsBlock } from '@/types/quotes';
import { calculateQuoteTotals, formatCurrency, makeId, makeQuoteNumber, toInternalWorkOrder } from '@/lib/quote-utils';
import { defaultItemLibrary, defaultSettings, defaultTemplates, defaultTermsBlocks, sampleQuotes } from '@/lib/seed-data';

type Screen = 'dashboard' | 'builder' | 'preview' | 'workorder' | 'templates' | 'library' | 'settings';

const storageKeys = {
  quotes: 'he_quotes_v1',
  templates: 'he_templates_v1',
  library: 'he_library_v1',
  terms: 'he_terms_v1',
  settings: 'he_settings_v1',
};

function fromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const today = () => new Date().toISOString().slice(0, 10);

function emptyQuote(settings: AppSettings, nextNumber: number): Quote {
  const expires = new Date();
  expires.setDate(expires.getDate() + settings.defaultQuoteExpirationDays);
  return {
    id: makeId('quote'),
    quoteNumber: makeQuoteNumber(nextNumber),
    customer: {
      name: '', phone: '', email: '', billingAddress: '', serviceAddress: '', propertyType: 'Residential', pestPacCustomerNumber: '', pestPacLocationNumber: '',
    },
    quoteTitle: 'New Quote',
    serviceType: settings.serviceTypes[0]?.name ?? 'Residential pest control',
    salespersonId: settings.salespeople[0]?.id ?? '',
    createdDate: today(),
    expirationDate: expires.toISOString().slice(0, 10),
    status: 'Draft',
    internalPriority: 'Normal',
    source: 'Call-in',
    scopeSummary: 'Treatment method to be confirmed by licensed applicator.',
    lineItems: [],
    discountType: 'none',
    discountValue: 0,
    depositType: 'none',
    depositValue: 0,
    termsBlockId: 'terms-general',
    customTerms: settings.defaultTerms,
    internalNotes: {
      internalInstructions: '', materialsNeeded: '', equipmentNeeded: '', technicianNotes: '', accessNotes: '', safetyPpeNotes: '', pestPacEntryNotes: '',
    },
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function QuoteApp() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [quotes, setQuotes] = useState<Quote[]>(() => fromStorage(storageKeys.quotes, sampleQuotes));
  const [templates] = useState<QuoteTemplate[]>(() => fromStorage(storageKeys.templates, defaultTemplates));
  const [terms] = useState<TermsBlock[]>(() => fromStorage(storageKeys.terms, defaultTermsBlocks));
  const [library, setLibrary] = useState<ItemLibraryItem[]>(() => fromStorage(storageKeys.library, defaultItemLibrary));
  const [settings, setSettings] = useState<AppSettings>(() => fromStorage(storageKeys.settings, defaultSettings));
  const [activeId, setActiveId] = useState<string>(quotes[0]?.id ?? '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const activeQuote = quotes.find((q) => q.id === activeId) ?? quotes[0];

  const persist = (nextQuotes: Quote[], nextLibrary = library, nextSettings = settings) => {
    setQuotes(nextQuotes);
    localStorage.setItem(storageKeys.quotes, JSON.stringify(nextQuotes));
    localStorage.setItem(storageKeys.library, JSON.stringify(nextLibrary));
    localStorage.setItem(storageKeys.settings, JSON.stringify(nextSettings));
  };

  const updateQuote = (updater: (q: Quote) => Quote) => {
    if (!activeQuote) return;
    const next = quotes.map((q) => (q.id === activeQuote.id ? updater(q) : q));
    persist(next);
  };

  const totals = activeQuote ? calculateQuoteTotals(activeQuote, settings) : null;

  const filtered = useMemo(
    () => quotes.filter((q) => (statusFilter === 'all' || q.status === statusFilter) && `${q.customer.name} ${q.customer.serviceAddress}`.toLowerCase().includes(search.toLowerCase())),
    [quotes, search, statusFilter],
  );

  const copyText = async (text: string) => navigator.clipboard.writeText(text);

  const addLine = (fromLibrary?: ItemLibraryItem) => {
    const line: QuoteLineItem = {
      id: makeId('line'),
      itemName: fromLibrary?.itemName ?? 'New line item',
      description: fromLibrary?.defaultDescription ?? '',
      quantity: 1,
      unit: fromLibrary?.defaultUnit ?? 'ea',
      unitPrice: fromLibrary?.defaultUnitPrice ?? 0,
      taxable: fromLibrary?.taxable ?? true,
      optional: false,
      optionalSelected: false,
      internalCost: fromLibrary?.defaultInternalCost ?? 0,
      category: fromLibrary?.category ?? 'Other',
    };
    updateQuote((q) => ({ ...q, updatedAt: new Date().toISOString(), lineItems: [...q.lineItems, line] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 p-3">
          <div className="rounded-lg bg-emerald-700 px-3 py-2 text-white font-semibold">Holloman Exterminators</div>
          <div className="text-sm text-slate-500">Quoting Tool · PestPac-ready workflow</div>
          <div className="ml-auto flex gap-2">
            {(['dashboard','builder','preview','workorder','templates','library','settings'] as Screen[]).map((s) => (
              <Button key={s} variant={screen === s ? 'default' : 'outline'} size="sm" onClick={() => setScreen(s)} className="capitalize">{s}</Button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 p-4">
        {screen === 'dashboard' && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Quote Dashboard</CardTitle>
              <Button onClick={() => { const q = emptyQuote(settings, quotes.length + 1005); const next = [q, ...quotes]; persist(next); setActiveId(q.id); setScreen('builder'); }}><Plus className="mr-2 h-4 w-4" />New Quote</Button>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex gap-2">
                <Input placeholder="Search customer/address" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-56"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{['Draft','Sent','Viewed','Approved','Changes Requested','Declined','Converted to Work Order','Archived'].map((s)=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2">
                {filtered.map((q) => (
                  <div key={q.id} className="grid grid-cols-12 items-center rounded border bg-white p-2 text-sm">
                    <div className="col-span-1 font-medium">{q.quoteNumber}</div><div className="col-span-2">{q.customer.name || '-'}</div><div className="col-span-2">{q.customer.serviceAddress || '-'}</div><div className="col-span-2">{q.quoteTitle}</div><div className="col-span-2">{q.serviceType}</div><div className="col-span-1">{calculateQuoteTotals(q, settings).total.toFixed(2)}</div><div className="col-span-1">{q.status}</div>
                    <div className="col-span-1 flex justify-end gap-1"><Button size="sm" variant="outline" onClick={()=>{setActiveId(q.id);setScreen('preview');}}><Eye className="h-4 w-4"/></Button><Button size="sm" variant="outline" onClick={()=>{setActiveId(q.id);setScreen('builder');}}><FileText className="h-4 w-4"/></Button><Button size="sm" variant="outline" onClick={()=>{const dup={...q,id:makeId('quote'),quoteNumber:makeQuoteNumber(quotes.length+1005),status:'Draft' as QuoteStatus}; const next=[dup,...quotes]; persist(next);}}><Copy className="h-4 w-4"/></Button></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {screen === 'builder' && activeQuote && (
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="space-y-4">
              <Card><CardHeader><CardTitle>Customer Info</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">
                <Input value={activeQuote.customer.name} placeholder="Customer name" onChange={(e)=>updateQuote((q)=>({...q,customer:{...q.customer,name:e.target.value}}))} />
                <Input value={activeQuote.customer.phone} placeholder="Phone" onChange={(e)=>updateQuote((q)=>({...q,customer:{...q.customer,phone:e.target.value}}))} />
                <Input value={activeQuote.customer.email} placeholder="Email" onChange={(e)=>updateQuote((q)=>({...q,customer:{...q.customer,email:e.target.value}}))} />
                <Input value={activeQuote.customer.serviceAddress} placeholder="Service address" onChange={(e)=>updateQuote((q)=>({...q,customer:{...q.customer,serviceAddress:e.target.value}}))} />
                <Input value={activeQuote.customer.billingAddress} placeholder="Billing address" onChange={(e)=>updateQuote((q)=>({...q,customer:{...q.customer,billingAddress:e.target.value}}))} />
                <Input value={activeQuote.customer.pestPacCustomerNumber ?? ''} placeholder="PestPac customer #" onChange={(e)=>updateQuote((q)=>({...q,customer:{...q.customer,pestPacCustomerNumber:e.target.value}}))} />
              </CardContent></Card>

              <Card><CardHeader><CardTitle>Quote Details</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-3">
                <Input value={activeQuote.quoteTitle} onChange={(e)=>updateQuote((q)=>({...q,quoteTitle:e.target.value}))} placeholder="Quote title" />
                <Input type="date" value={activeQuote.createdDate} onChange={(e)=>updateQuote((q)=>({...q,createdDate:e.target.value}))} />
                <Input type="date" value={activeQuote.expirationDate} onChange={(e)=>updateQuote((q)=>({...q,expirationDate:e.target.value}))} />
                <Select value={activeQuote.status} onValueChange={(v)=>updateQuote((q)=>({...q,status:v as QuoteStatus}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['Draft','Sent','Viewed','Approved','Changes Requested','Declined','Converted to Work Order','Archived'].map((s)=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                <Select value={activeQuote.serviceType} onValueChange={(v)=>updateQuote((q)=>({...q,serviceType:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{settings.serviceTypes.map((s)=><SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select>
                <Select value={activeQuote.salespersonId} onValueChange={(v)=>updateQuote((q)=>({...q,salespersonId:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{settings.salespeople.map((s)=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
              </CardContent></Card>

              <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Line Items</CardTitle><div className="flex gap-2"><Select onValueChange={(id)=>addLine(library.find((i)=>i.id===id))}><SelectTrigger className="w-56"><SelectValue placeholder="Add from library" /></SelectTrigger><SelectContent>{library.filter((i)=>i.active).map((i)=><SelectItem key={i.id} value={i.id}>{i.itemName}</SelectItem>)}</SelectContent></Select><Button onClick={()=>addLine()}><Plus className="mr-1 h-4 w-4"/>Add</Button></div></CardHeader>
                <CardContent className="space-y-2">
                  {activeQuote.lineItems.map((line, idx)=><div key={line.id} className="rounded border p-2">
                    <div className="grid gap-2 md:grid-cols-6">
                      <Input value={line.itemName} onChange={(e)=>updateQuote((q)=>({...q,lineItems:q.lineItems.map((li)=>li.id===line.id?{...li,itemName:e.target.value}:li)}))} />
                      <Input value={line.quantity} type="number" onChange={(e)=>updateQuote((q)=>({...q,lineItems:q.lineItems.map((li)=>li.id===line.id?{...li,quantity:Number(e.target.value)}:li)}))} />
                      <Input value={line.unit} onChange={(e)=>updateQuote((q)=>({...q,lineItems:q.lineItems.map((li)=>li.id===line.id?{...li,unit:e.target.value}:li)}))} />
                      <Input value={line.unitPrice} type="number" onChange={(e)=>updateQuote((q)=>({...q,lineItems:q.lineItems.map((li)=>li.id===line.id?{...li,unitPrice:Number(e.target.value)}:li)}))} />
                      <div className="flex items-center gap-2 text-xs"><Checkbox checked={line.taxable} onCheckedChange={(v)=>updateQuote((q)=>({...q,lineItems:q.lineItems.map((li)=>li.id===line.id?{...li,taxable:Boolean(v)}:li)}))} />Taxable</div>
                      <div className="flex items-center gap-2 text-xs"><Checkbox checked={line.optional} onCheckedChange={(v)=>updateQuote((q)=>({...q,lineItems:q.lineItems.map((li)=>li.id===line.id?{...li,optional:Boolean(v)}:li)}))} />Optional add-on</div>
                    </div>
                    <Textarea className="mt-2" value={line.description} onChange={(e)=>updateQuote((q)=>({...q,lineItems:q.lineItems.map((li)=>li.id===line.id?{...li,description:e.target.value}:li)}))} placeholder="Description" />
                    <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={()=>updateQuote((q)=>({...q,lineItems:q.lineItems.map((li)=>li.id===line.id?{...li,optionalSelected:!li.optionalSelected}:li)}))}>Toggle Optional Selected</Button><Button size="sm" variant="outline" onClick={()=>updateQuote((q)=>({...q,lineItems:[...q.lineItems,{...line,id:makeId('line')}]}))}>Duplicate</Button><Button size="sm" variant="outline" disabled={idx===0} onClick={()=>updateQuote((q)=>{const items=[...q.lineItems]; [items[idx-1],items[idx]]=[items[idx],items[idx-1]]; return {...q,lineItems:items};})}>Up</Button><Button size="sm" variant="destructive" onClick={()=>updateQuote((q)=>({...q,lineItems:q.lineItems.filter((li)=>li.id!==line.id)}))}>Delete</Button></div>
                  </div>)}
                </CardContent></Card>

              <Card><CardHeader><CardTitle>Scope, Terms, Internal Notes & Attachments</CardTitle></CardHeader><CardContent className="space-y-2">
                <Textarea value={activeQuote.scopeSummary} onChange={(e)=>updateQuote((q)=>({...q,scopeSummary:e.target.value}))} placeholder="Scope summary" />
                <Select value={activeQuote.termsBlockId} onValueChange={(v)=>updateQuote((q)=>({...q,termsBlockId:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{terms.map((t)=><SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent></Select>
                <Textarea value={activeQuote.customTerms ?? ''} onChange={(e)=>updateQuote((q)=>({...q,customTerms:e.target.value}))} placeholder="Custom terms" />
                <Textarea value={activeQuote.internalNotes.pestPacEntryNotes} onChange={(e)=>updateQuote((q)=>({...q,internalNotes:{...q.internalNotes,pestPacEntryNotes:e.target.value}}))} placeholder="PestPac entry notes" />
                <Button size="sm" variant="outline" onClick={()=>updateQuote((q)=>({...q,attachments:[...q.attachments,{id:makeId('att'),name:'Attachment placeholder',customerVisible:true}]}))}><Plus className="mr-1 h-4 w-4"/>Add attachment placeholder</Button>
              </CardContent></Card>
            </div>

            <Card className="h-fit lg:sticky lg:top-20"><CardHeader><CardTitle>Totals</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><strong>{totals && formatCurrency(totals.requiredSubtotal)}</strong></div>
              <div className="flex justify-between"><span>Optional subtotal</span><span>{totals && formatCurrency(totals.optionalSubtotal)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>{totals && formatCurrency(totals.discountAmount)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{totals && formatCurrency(totals.tax)}</span></div>
              <div className="flex justify-between border-t pt-2"><span>Total due</span><strong>{totals && formatCurrency(totals.total)}</strong></div>
              <div className="grid grid-cols-2 gap-2"><Select value={activeQuote.depositType} onValueChange={(v)=>updateQuote((q)=>({...q,depositType:v as Quote['depositType']}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">No deposit</SelectItem><SelectItem value="flat">Flat</SelectItem><SelectItem value="percentage">Percent</SelectItem></SelectContent></Select><Input type="number" value={activeQuote.depositValue} onChange={(e)=>updateQuote((q)=>({...q,depositValue:Number(e.target.value)}))} /></div>
              <div className="flex justify-between"><span>Deposit</span><span>{totals && formatCurrency(totals.depositAmount)}</span></div>
              <div className="flex justify-between"><span>Balance due</span><strong>{totals && formatCurrency(totals.balanceDue)}</strong></div>
            </CardContent></Card>
          </div>
        )}

        {screen === 'preview' && activeQuote && totals && (
          <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Customer Quote Preview</CardTitle><div className="flex gap-2"><Button variant="outline" onClick={()=>window.print()}><Printer className="mr-1 h-4 w-4"/>Print / Save PDF</Button><Button variant="outline">Approval Placeholder</Button><Button variant="outline">Request Changes Placeholder</Button></div></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <h2 className="text-xl font-semibold">Holloman Exterminators</h2>
              <p>Quote {activeQuote.quoteNumber} · {activeQuote.quoteTitle}</p>
              <p><strong>Customer:</strong> {activeQuote.customer.name} · {activeQuote.customer.serviceAddress}</p>
              <p><strong>Scope Summary:</strong> {activeQuote.scopeSummary}</p>
              <div><h3 className="font-semibold">Itemized Services</h3>{activeQuote.lineItems.filter((l)=>!l.optional || l.optionalSelected).map((l)=><div key={l.id} className="flex justify-between"><span>{l.itemName} ({l.quantity} {l.unit})</span><span>{formatCurrency(l.quantity*l.unitPrice)}</span></div>)}</div>
              <div><h3 className="font-semibold">Optional Add-ons</h3>{activeQuote.lineItems.filter((l)=>l.optional && !l.optionalSelected).map((l)=><div key={l.id} className="flex justify-between"><span>{l.itemName}</span><span>{formatCurrency(l.quantity*l.unitPrice)}</span></div>)}</div>
              <p><strong>Deposit:</strong> {formatCurrency(totals.depositAmount)} | <strong>Total:</strong> {formatCurrency(totals.total)}</p>
              <p><strong>Terms:</strong> {activeQuote.customTerms || terms.find((t)=>t.id===activeQuote.termsBlockId)?.body}</p>
              <div className="rounded border border-dashed p-3">Acceptance: Signature ____________________ Date ___________</div>
            </CardContent>
          </Card>
        )}

        {screen === 'workorder' && activeQuote && (
          <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Internal Work Order View</CardTitle><Button onClick={()=>copyText(JSON.stringify(toInternalWorkOrder(activeQuote), null, 2))}><Clipboard className="mr-2 h-4 w-4"/>Copy PestPac-ready Block</Button></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(() => { const wo = toInternalWorkOrder(activeQuote); return <>
                <p><strong>Customer:</strong> {wo.customerName} | <strong>Address:</strong> {wo.serviceAddress}</p>
                <p><strong>Quote:</strong> {wo.quoteTitle} ({wo.quoteNumber})</p>
                <p><strong>Approved line items:</strong> {wo.approvedLineItems.map((i)=>i.itemName).join(', ')}</p>
                <p><strong>Optional selected:</strong> {wo.optionalSelected.map((i)=>i.itemName).join(', ') || 'None'}</p>
                <p><strong>Materials:</strong> {wo.materialsList || 'Placeholder'}</p><p><strong>Equipment:</strong> {wo.equipmentList || 'Placeholder'}</p><p><strong>Technician notes:</strong> {wo.technicianInstructions || 'Placeholder'}</p><p><strong>Safety/PPE:</strong> {wo.safetyPpeNotes || 'Placeholder'}</p><p><strong>Access notes:</strong> {wo.accessNotes || 'Placeholder'}</p><p><strong>PestPac notes:</strong> {wo.pestPacEntryNotes || 'Placeholder'}</p>
                <p><strong>Recommended service code:</strong> {wo.recommendedPestPacServiceCode}; <strong>price code:</strong> {wo.recommendedPestPacPriceCode}</p>
              </>;})()}
            </CardContent>
          </Card>
        )}

        {screen === 'templates' && (
          <Card><CardHeader><CardTitle>Quote Templates</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">{templates.map((t)=><div key={t.id} className="rounded border p-3"><h3 className="font-medium">{t.name}</h3><p className="text-xs text-slate-500">{t.quoteTitle}</p><Button className="mt-2" size="sm" onClick={()=>{const q=emptyQuote(settings, quotes.length+1005); q.quoteTitle=t.quoteTitle; q.serviceType=t.serviceType; q.scopeSummary=t.scopeSummary; q.lineItems=t.lineItems.map((li)=>({...li,id:makeId('line')})); q.customTerms=terms.find((tb)=>tb.id===t.termsBlockId)?.body ?? settings.defaultTerms; q.internalNotes.internalInstructions=t.internalNotesChecklist; q.internalNotes.pestPacEntryNotes=t.pestPacNotesPlaceholder; const next=[q,...quotes]; persist(next); setActiveId(q.id); setScreen('builder');}}>Use Template</Button></div>)}</CardContent></Card>
        )}

        {screen === 'library' && (
          <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Pricing / Item Library</CardTitle><Button onClick={()=>{const n=[...library,{id:makeId('lib'),itemName:'New Item',category:'Other',defaultDescription:'',defaultUnit:'ea',defaultUnitPrice:0,defaultInternalCost:0,taxable:true,serviceType:'General pest control',active:true}]; setLibrary(n); localStorage.setItem(storageKeys.library, JSON.stringify(n));}}><Plus className="mr-1 h-4 w-4"/>Add Item</Button></CardHeader>
            <CardContent className="space-y-2">{library.map((i)=><div key={i.id} className="grid grid-cols-12 gap-2 rounded border p-2"><Input className="col-span-3" value={i.itemName} onChange={(e)=>{const n=library.map((x)=>x.id===i.id?{...x,itemName:e.target.value}:x); setLibrary(n); localStorage.setItem(storageKeys.library, JSON.stringify(n));}}/><Input className="col-span-2" value={i.defaultUnitPrice} type="number" onChange={(e)=>{const n=library.map((x)=>x.id===i.id?{...x,defaultUnitPrice:Number(e.target.value)}:x); setLibrary(n); localStorage.setItem(storageKeys.library, JSON.stringify(n));}}/><Input className="col-span-2" value={i.serviceType} onChange={(e)=>{const n=library.map((x)=>x.id===i.id?{...x,serviceType:e.target.value}:x); setLibrary(n); localStorage.setItem(storageKeys.library, JSON.stringify(n));}}/><div className="col-span-2 flex items-center gap-2"><Checkbox checked={i.active} onCheckedChange={(v)=>{const n=library.map((x)=>x.id===i.id?{...x,active:Boolean(v)}:x); setLibrary(n); localStorage.setItem(storageKeys.library, JSON.stringify(n));}}/>Active</div><Button className="col-span-2" variant="destructive" size="sm" onClick={()=>{const n=library.filter((x)=>x.id!==i.id); setLibrary(n); localStorage.setItem(storageKeys.library, JSON.stringify(n));}}>Delete</Button></div>)}</CardContent>
          </Card>
        )}

        {screen === 'settings' && (
          <Card><CardHeader><CardTitle><SettingsIcon className="mr-2 inline h-4 w-4"/>Settings</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">
            <Input value={settings.companyName} onChange={(e)=>{const s={...settings,companyName:e.target.value}; setSettings(s); localStorage.setItem(storageKeys.settings, JSON.stringify(s));}} placeholder="Company name"/>
            <Input value={settings.address} onChange={(e)=>{const s={...settings,address:e.target.value}; setSettings(s); localStorage.setItem(storageKeys.settings, JSON.stringify(s));}} placeholder="Address"/>
            <Input value={settings.phone} onChange={(e)=>{const s={...settings,phone:e.target.value}; setSettings(s); localStorage.setItem(storageKeys.settings, JSON.stringify(s));}} placeholder="Phone"/>
            <Input value={settings.email} onChange={(e)=>{const s={...settings,email:e.target.value}; setSettings(s); localStorage.setItem(storageKeys.settings, JSON.stringify(s));}} placeholder="Email"/>
            <Input value={settings.website} onChange={(e)=>{const s={...settings,website:e.target.value}; setSettings(s); localStorage.setItem(storageKeys.settings, JSON.stringify(s));}} placeholder="Website"/>
            <Input value={settings.licenseInfo} onChange={(e)=>{const s={...settings,licenseInfo:e.target.value}; setSettings(s); localStorage.setItem(storageKeys.settings, JSON.stringify(s));}} placeholder="License info"/>
            <Input value={settings.defaultTaxRate} type="number" onChange={(e)=>{const s={...settings,defaultTaxRate:Number(e.target.value)}; setSettings(s); localStorage.setItem(storageKeys.settings, JSON.stringify(s));}} placeholder="Tax rate"/>
            <Input value={settings.defaultQuoteExpirationDays} type="number" onChange={(e)=>{const s={...settings,defaultQuoteExpirationDays:Number(e.target.value)}; setSettings(s); localStorage.setItem(storageKeys.settings, JSON.stringify(s));}} placeholder="Default expiration days"/>
            <Textarea className="md:col-span-2" value={settings.defaultTerms} onChange={(e)=>{const s={...settings,defaultTerms:e.target.value}; setSettings(s); localStorage.setItem(storageKeys.settings, JSON.stringify(s));}} placeholder="Default terms"/>
            <Button variant="outline" className="md:col-span-2" onClick={()=>{localStorage.clear(); window.location.reload();}}><Archive className="mr-2 h-4 w-4"/>Reset local demo data</Button>
          </CardContent></Card>
        )}
      </main>
    </div>
  );
}
