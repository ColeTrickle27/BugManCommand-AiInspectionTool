import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FINDINGS_CHECKLIST } from "@/lib/canvas-types";

export interface InspectionData {
  // Customer Information
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  // Inspection Details
  inspectorName: string;
  inspectionDate: string;
  structureType: string;
  constructionType: string;
  foundationType: string;
  foundationWalls: string;
  foundationWallHeight: string;
  crawlspaceClearance: string;
  squareFootage: string;
  linearFootage: string;
  // Key Features
  crawlspaceEncapsulated: boolean;
  partiallyEncapsulated: boolean;
  encapsulationCondition: '' | 'good' | 'fair' | 'bad';
  moistureBarrier: boolean;
  moistureBarrierCondition: '' | 'good' | 'fair' | 'bad';
  moistureBarrierThickness: '' | '<6mil' | '6mil' | '12mil' | '>15mil';
  dehumidifierInPlace: boolean;
  dehumidifierOperational: boolean;
  dehumidifierNotOperationalReason: string;
  additionalDehumidifierNeeded: boolean;
  frenchDrainInPlace: boolean;
  sumpPumpInPlace: boolean;
  sumpPumpOperational: boolean;
  sumpPumpNotOperationalReason: string;
  // Findings
  findingsChecked: string[];
  findingsOther: string;
  // Notes & Recommendations
  notes: string;
  recommendations: string;
}

export const DEFAULT_INSPECTION: InspectionData = {
  customerName: '',
  customerAddress: '',
  customerPhone: '',
  customerEmail: '',
  inspectorName: '',
  inspectionDate: new Date().toISOString().split('T')[0],
  structureType: '',
  constructionType: '',
  foundationType: '',
  foundationWalls: '',
  foundationWallHeight: '',
  crawlspaceClearance: '',
  squareFootage: '',
  linearFootage: '',
  crawlspaceEncapsulated: false,
  partiallyEncapsulated: false,
  encapsulationCondition: '',
  moistureBarrier: false,
  moistureBarrierCondition: '',
  moistureBarrierThickness: '',
  dehumidifierInPlace: false,
  dehumidifierOperational: false,
  dehumidifierNotOperationalReason: '',
  additionalDehumidifierNeeded: false,
  frenchDrainInPlace: false,
  sumpPumpInPlace: false,
  sumpPumpOperational: false,
  sumpPumpNotOperationalReason: '',
  findingsChecked: [],
  findingsOther: '',
  notes: '',
  recommendations: '',
};

interface Props {
  data: InspectionData;
  onChange: (data: InspectionData) => void;
}

const isCrawlspace = (foundationType: string) =>
  foundationType === 'crawlspace' || foundationType === 'combo';

export default function InspectionForm({ data, onChange }: Props) {
  const update = (field: keyof InspectionData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const toggleFinding = (item: string) => {
    const current = data.findingsChecked;
    if (current.includes(item)) {
      update('findingsChecked', current.filter((f) => f !== item));
    } else {
      update('findingsChecked', [...current, item]);
    }
  };

  const showCrawlspaceFields = isCrawlspace(data.foundationType);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">

        {/* ── Customer Information ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Customer Information</h3>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Customer Name</Label>
              <Input
                value={data.customerName}
                onChange={(e) => update('customerName', e.target.value)}
                placeholder="John Smith"
                className="h-8 text-sm"
                data-testid="input-customer-name"
              />
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input
                value={data.customerAddress}
                onChange={(e) => update('customerAddress', e.target.value)}
                placeholder="123 Main St, Autryville, NC 28318"
                className="h-8 text-sm"
                data-testid="input-customer-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={data.customerPhone}
                  onChange={(e) => update('customerPhone', e.target.value)}
                  placeholder="(910) 555-0123"
                  className="h-8 text-sm"
                  data-testid="input-customer-phone"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  value={data.customerEmail}
                  onChange={(e) => update('customerEmail', e.target.value)}
                  placeholder="john@email.com"
                  className="h-8 text-sm"
                  data-testid="input-customer-email"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Inspection Details ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Inspection Details</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Inspector</Label>
                <Input
                  value={data.inspectorName}
                  onChange={(e) => update('inspectorName', e.target.value)}
                  placeholder="Inspector name"
                  className="h-8 text-sm"
                  data-testid="input-inspector-name"
                />
              </div>
              <div>
                <Label className="text-xs">Inspection Date</Label>
                <Input
                  type="date"
                  value={data.inspectionDate}
                  onChange={(e) => update('inspectionDate', e.target.value)}
                  className="h-8 text-sm"
                  data-testid="input-inspection-date"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Structure Type</Label>
              <Select value={data.structureType} onValueChange={(v) => update('structureType', v)}>
                <SelectTrigger className="h-8 text-sm" data-testid="select-structure-type">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single-family">Single Family Home</SelectItem>
                  <SelectItem value="multi-family">Multi-Family</SelectItem>
                  <SelectItem value="duplex">Duplex</SelectItem>
                  <SelectItem value="manufactured">Manufactured Home</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="commercial">Commercial Building</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Construction</Label>
                <Select value={data.constructionType} onValueChange={(v) => update('constructionType', v)}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-construction-type">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wood-frame">Wood Frame</SelectItem>
                    <SelectItem value="block">Block / CMU</SelectItem>
                    <SelectItem value="brick">Brick</SelectItem>
                    <SelectItem value="steel">Steel Frame</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Foundation</Label>
                <Select value={data.foundationType} onValueChange={(v) => update('foundationType', v)}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-foundation-type">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crawlspace">Crawlspace</SelectItem>
                    <SelectItem value="slab">Slab</SelectItem>
                    <SelectItem value="basement">Basement</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Foundation Walls */}
            <div>
              <Label className="text-xs">Foundation Walls</Label>
              <Select value={data.foundationWalls} onValueChange={(v) => update('foundationWalls', v)}>
                <SelectTrigger className="h-8 text-sm" data-testid="select-foundation-walls">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single-brick">Single Brick</SelectItem>
                  <SelectItem value="double-brick">Double Brick</SelectItem>
                  <SelectItem value="hollow-block">Hollow Block</SelectItem>
                  <SelectItem value="hollow-block-brick-veneer">Hollow Block + Brick Veneer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Foundation Wall Height */}
            <div>
              <Label className="text-xs">Foundation Wall Height (avg, inches)</Label>
              <Input
                value={data.foundationWallHeight}
                onChange={(e) => update('foundationWallHeight', e.target.value)}
                placeholder='e.g. 36"'
                className="h-8 text-sm"
                data-testid="input-foundation-wall-height"
              />
            </div>

            {/* Crawlspace Clearance — only when crawlspace is present */}
            {showCrawlspaceFields && (
              <div>
                <Label className="text-xs">Crawlspace Clearance</Label>
                <Select value={data.crawlspaceClearance} onValueChange={(v) => update('crawlspaceClearance', v)}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-crawlspace-clearance">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low-completely-inaccessible">Low - Completely Inaccessible</SelectItem>
                    <SelectItem value="low-partially-inaccessible">Low - Partially Inaccessible</SelectItem>
                    <SelectItem value="low-accessible-throughout">Low - Accessible Throughout</SelectItem>
                    <SelectItem value="moderate-average">Moderate/Average</SelectItem>
                    <SelectItem value="high-ample-clearance">High - Ample Clearance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Linear Footage</Label>
                <Input
                  value={data.linearFootage}
                  onChange={(e) => update('linearFootage', e.target.value)}
                  placeholder="320 LF"
                  className="h-8 text-sm"
                  data-testid="input-linear-footage"
                />
              </div>
              <div>
                <Label className="text-xs">Square Footage</Label>
                <Input
                  value={data.squareFootage}
                  onChange={(e) => update('squareFootage', e.target.value)}
                  placeholder="1,800 sq ft"
                  className="h-8 text-sm"
                  data-testid="input-square-footage"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Key Features (always visible) ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Key Features</h3>
          <div className="space-y-3">

                {/* Crawlspace encapsulation */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer" data-testid="check-crawlspace-encapsulated">
                    <Checkbox
                      checked={data.crawlspaceEncapsulated}
                      onCheckedChange={(v) => {
                        const checked = !!v;
                        onChange({
                          ...data,
                          crawlspaceEncapsulated: checked,
                          // Reset encapsulationCondition when unchecked (only if partiallyEncapsulated is also unchecked)
                          encapsulationCondition: checked ? data.encapsulationCondition : (data.partiallyEncapsulated ? data.encapsulationCondition : ''),
                        });
                      }}
                    />
                    <span className="text-xs text-foreground">Crawlspace is encapsulated</span>
                  </label>

                  {data.crawlspaceEncapsulated && (
                    <div className="ml-6 space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Condition</Label>
                        <Select
                          value={data.encapsulationCondition}
                          onValueChange={(v) => update('encapsulationCondition', v as InspectionData['encapsulationCondition'])}
                        >
                          <SelectTrigger className="h-7 text-xs mt-1" data-testid="select-encapsulation-condition">
                            <SelectValue placeholder="Select condition..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                            <SelectItem value="bad">Bad</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Partially encapsulated */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer" data-testid="check-partially-encapsulated">
                    <Checkbox
                      checked={data.partiallyEncapsulated}
                      onCheckedChange={(v) => {
                        const checked = !!v;
                        onChange({
                          ...data,
                          partiallyEncapsulated: checked,
                          // Reset encapsulationCondition when unchecked (only if crawlspaceEncapsulated is also unchecked)
                          encapsulationCondition: checked ? data.encapsulationCondition : (data.crawlspaceEncapsulated ? data.encapsulationCondition : ''),
                        });
                      }}
                    />
                    <span className="text-xs text-foreground">Partially encapsulated</span>
                  </label>

                  {data.partiallyEncapsulated && (
                    <div className="ml-6 space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Condition</Label>
                        <Select
                          value={data.encapsulationCondition}
                          onValueChange={(v) => update('encapsulationCondition', v as InspectionData['encapsulationCondition'])}
                        >
                          <SelectTrigger className="h-7 text-xs mt-1" data-testid="select-encapsulation-condition-partial">
                            <SelectValue placeholder="Select condition..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                            <SelectItem value="bad">Bad</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Moisture barrier */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer" data-testid="check-moisture-barrier">
                    <Checkbox
                      checked={data.moistureBarrier}
                      onCheckedChange={(v) => {
                        const checked = !!v;
                        onChange({
                          ...data,
                          moistureBarrier: checked,
                          moistureBarrierCondition: checked ? data.moistureBarrierCondition : '',
                          moistureBarrierThickness: checked ? data.moistureBarrierThickness : '',
                        });
                      }}
                    />
                    <span className="text-xs text-foreground">Moisture barrier in place</span>
                  </label>

                  {data.moistureBarrier && (
                    <div className="ml-6 space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Condition</Label>
                        <Select
                          value={data.moistureBarrierCondition}
                          onValueChange={(v) => update('moistureBarrierCondition', v as InspectionData['moistureBarrierCondition'])}
                        >
                          <SelectTrigger className="h-7 text-xs mt-1" data-testid="select-moisture-barrier-condition">
                            <SelectValue placeholder="Select condition..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                            <SelectItem value="bad">Bad</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Thickness</Label>
                        <Select
                          value={data.moistureBarrierThickness}
                          onValueChange={(v) => update('moistureBarrierThickness', v as InspectionData['moistureBarrierThickness'])}
                        >
                          <SelectTrigger className="h-7 text-xs mt-1" data-testid="select-moisture-barrier-thickness">
                            <SelectValue placeholder="Select thickness..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="<6mil">&lt;6mil</SelectItem>
                            <SelectItem value="6mil">6mil</SelectItem>
                            <SelectItem value="12mil">12mil</SelectItem>
                            <SelectItem value=">15mil">&gt;15mil</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dehumidifier */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer" data-testid="check-dehumidifier-in-place">
                    <Checkbox
                      checked={data.dehumidifierInPlace}
                      onCheckedChange={(v) => {
                        const checked = !!v;
                        onChange({
                          ...data,
                          dehumidifierInPlace: checked,
                          // reset sub-fields when unchecked
                          dehumidifierOperational: checked ? data.dehumidifierOperational : false,
                          dehumidifierNotOperationalReason: checked ? data.dehumidifierNotOperationalReason : '',
                          additionalDehumidifierNeeded: checked ? data.additionalDehumidifierNeeded : false,
                        });
                      }}
                    />
                    <span className="text-xs text-foreground">Dehumidifier in place</span>
                  </label>

                  {data.dehumidifierInPlace && (
                    <div className="ml-6 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer" data-testid="check-dehumidifier-operational">
                        <Checkbox
                          checked={data.dehumidifierOperational}
                          onCheckedChange={(v) => update('dehumidifierOperational', !!v)}
                        />
                        <span className="text-xs text-foreground">Is operational / running</span>
                      </label>

                      {!data.dehumidifierOperational && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Not operational — reason</Label>
                          <Input
                            value={data.dehumidifierNotOperationalReason}
                            onChange={(e) => update('dehumidifierNotOperationalReason', e.target.value)}
                            placeholder="Explain why not operational..."
                            className="h-7 text-xs mt-1"
                            data-testid="input-dehumidifier-not-operational-reason"
                          />
                        </div>
                      )}

                      <label className="flex items-center gap-2 cursor-pointer" data-testid="check-additional-dehumidifier-needed">
                        <Checkbox
                          checked={data.additionalDehumidifierNeeded}
                          onCheckedChange={(v) => update('additionalDehumidifierNeeded', !!v)}
                        />
                        <span className="text-xs text-foreground">Additional dehumidifier needed</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* French drain */}
                <label className="flex items-center gap-2 cursor-pointer" data-testid="check-french-drain">
                  <Checkbox
                    checked={data.frenchDrainInPlace}
                    onCheckedChange={(v) => update('frenchDrainInPlace', !!v)}
                  />
                  <span className="text-xs text-foreground">French drain in place</span>
                </label>

                {/* Sump pump */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer" data-testid="check-sump-pump-in-place">
                    <Checkbox
                      checked={data.sumpPumpInPlace}
                      onCheckedChange={(v) => {
                        const checked = !!v;
                        onChange({
                          ...data,
                          sumpPumpInPlace: checked,
                          sumpPumpOperational: checked ? data.sumpPumpOperational : false,
                          sumpPumpNotOperationalReason: checked ? data.sumpPumpNotOperationalReason : '',
                        });
                      }}
                    />
                    <span className="text-xs text-foreground">Sump pump in place</span>
                  </label>

                  {data.sumpPumpInPlace && (
                    <div className="ml-6 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer" data-testid="check-sump-pump-operational">
                        <Checkbox
                          checked={data.sumpPumpOperational}
                          onCheckedChange={(v) => update('sumpPumpOperational', !!v)}
                        />
                        <span className="text-xs text-foreground">Is operational / running</span>
                      </label>

                      {!data.sumpPumpOperational && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Not operational — reason</Label>
                          <Input
                            value={data.sumpPumpNotOperationalReason}
                            onChange={(e) => update('sumpPumpNotOperationalReason', e.target.value)}
                            placeholder="Explain why not operational..."
                            className="h-7 text-xs mt-1"
                            data-testid="input-sump-pump-not-operational-reason"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

          </div>
        </div>

        <Separator />

        {/* ── Findings Checklist ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Findings</h3>
          <div className="space-y-2">
            {FINDINGS_CHECKLIST.map((item) => (
              <label
                key={item}
                className="flex items-start gap-2 cursor-pointer group"
                data-testid={`finding-${item.toLowerCase().replace(/[\s\/]+/g, '-')}`}
              >
                <Checkbox
                  checked={data.findingsChecked.includes(item)}
                  onCheckedChange={() => toggleFinding(item)}
                  className="mt-0.5"
                />
                <span className="text-xs text-foreground group-hover:text-primary transition-colors leading-tight">
                  {item}
                </span>
              </label>
            ))}

            {/* Other */}
            <label className="flex items-start gap-2 cursor-pointer group">
              <Checkbox
                checked={data.findingsOther.length > 0}
                onCheckedChange={() => {
                  if (data.findingsOther.length > 0) update('findingsOther', '');
                }}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="text-xs text-foreground group-hover:text-primary transition-colors">Other</span>
                <Input
                  value={data.findingsOther}
                  onChange={(e) => update('findingsOther', e.target.value)}
                  placeholder="Describe..."
                  className="h-7 text-xs mt-1"
                  data-testid="input-findings-other"
                />
              </div>
            </label>
          </div>
        </div>

        <Separator />

        {/* ── Inspection Notes ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Inspection Notes</h3>
          <Textarea
            value={data.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="General observations during the inspection..."
            rows={4}
            className="text-sm"
            data-testid="input-notes"
          />
        </div>

        <Separator />

        {/* ── Recommendations ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Recommendations</h3>
          <p className="text-xs text-muted-foreground">Auto-generated based on findings. You can edit below.</p>
          <Textarea
            value={data.recommendations}
            onChange={(e) => update('recommendations', e.target.value)}
            placeholder="Recommendations will generate automatically when findings are selected..."
            rows={5}
            className="text-sm"
            data-testid="input-recommendations"
          />
        </div>

      </div>
    </ScrollArea>
  );
}
