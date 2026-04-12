import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Minus, Plus, FlipHorizontal2 } from "lucide-react";
import type { CanvasShape, CanvasMarker, CanvasSymbol, CanvasTextAnnotation } from "@/lib/canvas-types";
import { MARKER_CONFIG, STRUCTURE_PRESETS, GRID_SIZE } from "@/lib/canvas-types";
import { ScrollArea } from "@/components/ui/scroll-area";

// ------------------------------------------------------------------
// v3.1 PropertiesPanel
//
// Changes from v3:
//  - Dimension rounding: whole numbers only (pxToFt returns Math.round)
//  - Default marker size: 10px (was 14)
//  - Shape fill color picker (SHAPE_FILL_OPTIONS swatches)
//  - Symbol size control (+/- buttons, size field 0.5–3.0 step 0.1)
//  - Drill arrow rotation slider (0–360°) for vertical/horizontal-drill
//  - Annotation properties section (text, font size, color, rotation, delete)
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Fill color options for selected shapes (same palette as ShapesPanel)
// ------------------------------------------------------------------
const SHAPE_FILL_OPTIONS = [
  { key: 'transparent',               label: 'None',   swatch: 'transparent' },
  { key: 'rgba(147, 197, 253, 0.35)', label: 'Blue',   swatch: '#93C5FD' },
  { key: 'rgba(253, 224, 71, 0.35)',  label: 'Yellow', swatch: '#FDE047' },
  { key: 'rgba(200, 200, 200, 0.35)', label: 'Grey',   swatch: '#C8C8C8' },
  { key: 'rgba(134, 239, 172, 0.35)', label: 'Green',  swatch: '#86EFAC' },
  { key: 'rgba(255, 200, 200, 0.35)', label: 'Red',    swatch: '#FCA5A5' },
  { key: 'rgba(196, 181, 253, 0.35)', label: 'Purple', swatch: '#C4B5FD' },
] as const;

// ------------------------------------------------------------------
// Color options for text annotations
// ------------------------------------------------------------------
const ANNOTATION_COLOR_OPTIONS = [
  { color: '#000000', label: 'Black' },
  { color: '#CC2200', label: 'Red' },
  { color: '#2563EB', label: 'Blue' },
  { color: '#16A34A', label: 'Green' },
  { color: '#D97706', label: 'Amber' },
  { color: '#7C3AED', label: 'Purple' },
  { color: '#6B7280', label: 'Grey' },
  { color: '#FFFFFF', label: 'White' },
];

interface Props {
  selectedShape?: CanvasShape | null;
  selectedMarker?: CanvasMarker | null;
  selectedSymbol?: CanvasSymbol | null;
  selectedAnnotation?: CanvasTextAnnotation | null;
  onUpdateShape: (shape: CanvasShape) => void;
  onUpdateMarker: (marker: CanvasMarker) => void;
  onUpdateSymbol?: (symbol: CanvasSymbol) => void;
  onUpdateAnnotation?: (annotation: CanvasTextAnnotation) => void;
  onDeleteShape: (id: string) => void;
  onDeleteMarker: (id: string) => void;
  onDeleteSymbol?: (id: string) => void;
  onDeleteAnnotation?: (id: string) => void;
  ftPerGrid: number;
}

// Convert pixels → feet, rounded to nearest whole number
function pxToFt(px: number, ftPerGrid: number): number {
  return Math.round((Math.abs(px) / GRID_SIZE) * ftPerGrid);
}

// Convert feet → pixels
function ftToPx(ft: number, ftPerGrid: number): number {
  return Math.round((ft / ftPerGrid) * GRID_SIZE);
}

// Friendly display label for a SymbolType string
function symbolTypeLabel(type: string): string {
  const MAP: Record<string, string> = {
    "bushes":            "Bushes / Shrubs",
    "ac-unit":           "AC Unit",
    "crawlspace-access": "Crawlspace Access",
    "chimney":           "Chimney",
    "electrical-wire":   "Electrical Wire",
    "gas-line":          "Gas Line",
    "brick-block-steps": "Brick / Block Steps",
    "custom-symbol":     "Custom Symbol",
  };
  return MAP[type] ?? type;
}

const DRILLABLE_TYPES = new Set(["vertical-drill", "horizontal-drill"]);

const DEFAULT_MARKER_SIZE = 10;
const MIN_MARKER_SIZE = 8;
const MAX_MARKER_SIZE = 40;

const DEFAULT_SYMBOL_SIZE = 1.0;
const MIN_SYMBOL_SIZE = 0.5;
const MAX_SYMBOL_SIZE = 3.0;
const SYMBOL_SIZE_STEP = 0.1;

// Named presets without "Custom" (for determining active state)
const NAMED_PRESETS = STRUCTURE_PRESETS.filter(
  (p) => p !== "Custom"
) as readonly string[];

export default function PropertiesPanel({
  selectedShape,
  selectedMarker,
  selectedSymbol,
  selectedAnnotation,
  onUpdateShape,
  onUpdateMarker,
  onUpdateSymbol,
  onUpdateAnnotation,
  onDeleteShape,
  onDeleteMarker,
  onDeleteSymbol,
  onDeleteAnnotation,
  ftPerGrid,
}: Props) {
  // ---- Nothing selected ----
  if (!selectedShape && !selectedMarker && !selectedSymbol && !selectedAnnotation) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <p>Select a shape, marker, symbol, or annotation to edit.</p>
      </div>
    );
  }

  // ---- Shape selected ----
  if (selectedShape) {
    const isRect =
      selectedShape.kind === "rectangle" || selectedShape.kind === "square";

    const widthFt  = pxToFt(selectedShape.width,  ftPerGrid);
    const heightFt = pxToFt(selectedShape.height, ftPerGrid);

    // Determine currently active fill key
    const activeFillKey = SHAPE_FILL_OPTIONS.find(
      (o) => o.key === selectedShape.fill
    )?.key ?? 'transparent';

    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Shape Properties</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteShape(selectedShape.id)}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              data-testid="delete-shape"
              title="Delete shape"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Label */}
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={selectedShape.label}
              onChange={(e) =>
                onUpdateShape({ ...selectedShape, label: e.target.value })
              }
              placeholder="e.g. House, Garage..."
              className="h-8 text-sm"
              data-testid="shape-label-input"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {(STRUCTURE_PRESETS as readonly string[]).map((p) => {
                const isCustom = p === "Custom";
                const isActive = isCustom
                  ? selectedShape.label.length > 0 &&
                    !NAMED_PRESETS.includes(selectedShape.label)
                  : selectedShape.label === p;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      if (p !== "Custom") {
                        onUpdateShape({ ...selectedShape, label: p });
                      }
                      // "Custom" intentionally does nothing — user types in the input
                    }}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-accent/50 text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fill Color */}
          <div>
            <Label className="text-xs">Fill Color</Label>
            <div className="flex gap-1.5 flex-wrap mt-1">
              {SHAPE_FILL_OPTIONS.map((opt) => {
                const isActive = activeFillKey === opt.key;
                return (
                  <button
                    key={opt.key}
                    title={opt.label}
                    onClick={() =>
                      onUpdateShape({ ...selectedShape, fill: opt.key })
                    }
                    className={`w-7 h-7 rounded border-2 transition-all ${
                      isActive
                        ? "border-primary scale-110 shadow-sm"
                        : "border-border hover:border-primary/50"
                    }`}
                    style={
                      opt.key === "transparent"
                        ? {
                            background:
                              "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 8px 8px",
                          }
                        : { backgroundColor: opt.swatch }
                    }
                    data-testid={`shape-fill-${opt.label.toLowerCase()}`}
                    aria-label={opt.label}
                  />
                );
              })}
            </div>
          </div>

          {/* Width / Height in feet */}
          {isRect && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Width (ft)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={widthFt}
                    onChange={(e) => {
                      const ft = parseInt(e.target.value, 10);
                      if (!isNaN(ft) && ft > 0) {
                        onUpdateShape({
                          ...selectedShape,
                          width: ftToPx(ft, ftPerGrid),
                        });
                      }
                    }}
                    className="h-8 text-sm"
                    data-testid="shape-width-input"
                  />
                </div>
                <div>
                  <Label className="text-xs">Height (ft)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={heightFt}
                    onChange={(e) => {
                      const ft = parseInt(e.target.value, 10);
                      if (!isNaN(ft) && ft > 0) {
                        onUpdateShape({
                          ...selectedShape,
                          height: ftToPx(ft, ftPerGrid),
                        });
                      }
                    }}
                    className="h-8 text-sm"
                    data-testid="shape-height-input"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground -mt-1">
                {widthFt} ft × {heightFt} ft
                &nbsp;({Math.round(selectedShape.width)} × {Math.round(selectedShape.height)} px)
              </p>

              {/* Rotation */}
              <div>
                <Label className="text-xs">
                  Rotation ({Math.round(selectedShape.rotation)}°)
                </Label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={selectedShape.rotation}
                  onChange={(e) =>
                    onUpdateShape({
                      ...selectedShape,
                      rotation: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
            </>
          )}

          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Type: {selectedShape.kind}
          </div>
        </div>
      </ScrollArea>
    );
  }

  // ---- Marker selected ----
  if (selectedMarker) {
    const config = MARKER_CONFIG[selectedMarker.type];
    const markerSize  = selectedMarker.size ?? DEFAULT_MARKER_SIZE;
    const isFlipped   = selectedMarker.flipped ?? false;
    const canFlip     = DRILLABLE_TYPES.has(selectedMarker.type);
    const canRotate   = DRILLABLE_TYPES.has(selectedMarker.type);
    const badgeColor  = config?.color ?? "#888";
    const rotation    = (selectedMarker as any).rotation ?? 0;

    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Marker Properties</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteMarker(selectedMarker.id)}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              data-testid="delete-marker"
              title="Delete marker"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Badge + name */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-accent/50">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ backgroundColor: badgeColor }}
            >
              {config?.abbr ?? "?"}
            </div>
            <span className="text-sm font-medium leading-tight">
              {config?.label ?? selectedMarker.type}
            </span>
          </div>

          {/* Marker size */}
          <div>
            <Label className="text-xs">Marker Size</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() =>
                  onUpdateMarker({
                    ...selectedMarker,
                    size: Math.max(MIN_MARKER_SIZE, markerSize - 2),
                  })
                }
                data-testid="marker-size-decrease"
                title="Decrease size"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium w-10 text-center">
                {markerSize}px
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() =>
                  onUpdateMarker({
                    ...selectedMarker,
                    size: Math.min(MAX_MARKER_SIZE, markerSize + 2),
                  })
                }
                data-testid="marker-size-increase"
                title="Increase size"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Flip / direction toggle for drill markers */}
          {canFlip && (
            <div>
              <Label className="text-xs">Direction</Label>
              <Button
                variant={isFlipped ? "default" : "outline"}
                size="sm"
                className="mt-1 flex items-center gap-1.5 h-8 text-xs"
                onClick={() =>
                  onUpdateMarker({ ...selectedMarker, flipped: !isFlipped })
                }
                data-testid="marker-flip-toggle"
              >
                <FlipHorizontal2 className="h-3.5 w-3.5" />
                {isFlipped ? "Flipped" : "Normal"}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {selectedMarker.type === "vertical-drill"
                  ? "Flip toggles up ↔ down arrow"
                  : "Flip toggles left ↔ right arrow"}
              </p>
            </div>
          )}

          {/* Rotation slider for drill markers */}
          {canRotate && (
            <div>
              <Label className="text-xs">
                Rotation ({Math.round(rotation)}°)
              </Label>
              <input
                type="range"
                min={0}
                max={360}
                value={rotation}
                onChange={(e) =>
                  onUpdateMarker({
                    ...selectedMarker,
                    rotation: parseInt(e.target.value),
                  } as any)
                }
                className="w-full"
                data-testid="marker-rotation-slider"
              />
            </div>
          )}

          {/* Details / Notes */}
          <div>
            <Label className="text-xs">Details / Notes</Label>
            <Textarea
              value={selectedMarker.details ?? ""}
              onChange={(e) =>
                onUpdateMarker({ ...selectedMarker, details: e.target.value })
              }
              placeholder="e.g., Heavy damage at sill plate..."
              rows={3}
              className="text-sm"
              data-testid="marker-details-input"
            />
          </div>
        </div>
      </ScrollArea>
    );
  }

  // ---- Symbol selected ----
  if (selectedSymbol) {
    const symSize = (selectedSymbol as any).size ?? DEFAULT_SYMBOL_SIZE;

    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Symbol Properties</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteSymbol?.(selectedSymbol.id)}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              data-testid="delete-symbol"
              title="Delete symbol"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Type badge */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-accent/50">
            <span className="text-sm font-medium">
              {symbolTypeLabel(selectedSymbol.type)}
            </span>
          </div>

          {/* Custom / generic label field */}
          {(selectedSymbol.type === "custom-symbol" || selectedSymbol.label) && (
            <div>
              <Label className="text-xs">Symbol Label</Label>
              <Input
                value={
                  selectedSymbol.customLabel ??
                  selectedSymbol.label ??
                  ""
                }
                onChange={(e) =>
                  onUpdateSymbol?.({
                    ...selectedSymbol,
                    customLabel: e.target.value,
                    label: e.target.value,
                  })
                }
                placeholder="Symbol name..."
                className="h-8 text-sm"
                data-testid="symbol-label-input"
              />
            </div>
          )}

          {/* Symbol Size */}
          <div>
            <Label className="text-xs">Symbol Size</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() =>
                  onUpdateSymbol?.({
                    ...selectedSymbol,
                    size: Math.max(
                      MIN_SYMBOL_SIZE,
                      Math.round((symSize - SYMBOL_SIZE_STEP) * 10) / 10
                    ),
                  } as any)
                }
                data-testid="symbol-size-decrease"
                title="Decrease size"
                disabled={symSize <= MIN_SYMBOL_SIZE}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium w-12 text-center">
                {symSize.toFixed(1)}×
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() =>
                  onUpdateSymbol?.({
                    ...selectedSymbol,
                    size: Math.min(
                      MAX_SYMBOL_SIZE,
                      Math.round((symSize + SYMBOL_SIZE_STEP) * 10) / 10
                    ),
                  } as any)
                }
                data-testid="symbol-size-increase"
                title="Increase size"
                disabled={symSize >= MAX_SYMBOL_SIZE}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Range: {MIN_SYMBOL_SIZE}× – {MAX_SYMBOL_SIZE}×
            </p>
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">X (px)</Label>
              <Input
                type="number"
                value={Math.round(selectedSymbol.x)}
                onChange={(e) =>
                  onUpdateSymbol?.({
                    ...selectedSymbol,
                    x: parseInt(e.target.value) || 0,
                  })
                }
                className="h-8 text-sm"
                data-testid="symbol-x-input"
              />
            </div>
            <div>
              <Label className="text-xs">Y (px)</Label>
              <Input
                type="number"
                value={Math.round(selectedSymbol.y)}
                onChange={(e) =>
                  onUpdateSymbol?.({
                    ...selectedSymbol,
                    y: parseInt(e.target.value) || 0,
                  })
                }
                className="h-8 text-sm"
                data-testid="symbol-y-input"
              />
            </div>
          </div>

          {/* Rotation */}
          <div>
            <Label className="text-xs">
              Rotation ({Math.round(selectedSymbol.rotation ?? 0)}°)
            </Label>
            <input
              type="range"
              min={0}
              max={360}
              value={selectedSymbol.rotation ?? 0}
              onChange={(e) =>
                onUpdateSymbol?.({
                  ...selectedSymbol,
                  rotation: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Type: {selectedSymbol.type}
          </div>
        </div>
      </ScrollArea>
    );
  }

  // ---- Annotation selected ----
  if (selectedAnnotation) {
    const annot = selectedAnnotation;
    const fontSize = annot.fontSize ?? 14;
    const color    = annot.color ?? "#000000";
    const rotation = (annot as any).rotation ?? 0;

    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Annotation Properties</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteAnnotation?.(annot.id)}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              data-testid="delete-annotation"
              title="Delete annotation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Text content */}
          <div>
            <Label className="text-xs">Text</Label>
            <Textarea
              value={annot.text}
              onChange={(e) =>
                onUpdateAnnotation?.({ ...annot, text: e.target.value })
              }
              placeholder="Annotation text..."
              rows={3}
              className="text-sm"
              data-testid="annotation-text-input"
            />
          </div>

          {/* Font size */}
          <div>
            <Label className="text-xs">Font Size</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() =>
                  onUpdateAnnotation?.({
                    ...annot,
                    fontSize: Math.max(8, fontSize - 1),
                  })
                }
                data-testid="annotation-fontsize-decrease"
                title="Decrease font size"
                disabled={fontSize <= 8}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium w-12 text-center">
                {fontSize}px
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() =>
                  onUpdateAnnotation?.({
                    ...annot,
                    fontSize: Math.min(72, fontSize + 1),
                  })
                }
                data-testid="annotation-fontsize-increase"
                title="Increase font size"
                disabled={fontSize >= 72}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Color picker */}
          <div>
            <Label className="text-xs">Color</Label>
            <div className="flex gap-1.5 flex-wrap mt-1">
              {ANNOTATION_COLOR_OPTIONS.map((opt) => {
                const isActive = color === opt.color;
                return (
                  <button
                    key={opt.color}
                    title={opt.label}
                    onClick={() =>
                      onUpdateAnnotation?.({ ...annot, color: opt.color })
                    }
                    className={`w-7 h-7 rounded border-2 transition-all ${
                      isActive
                        ? "border-primary scale-110 shadow-sm"
                        : "border-border hover:border-primary/50"
                    }`}
                    style={{
                      backgroundColor: opt.color,
                      ...(opt.color === "#FFFFFF"
                        ? { background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 8px 8px" }
                        : {}),
                    }}
                    data-testid={`annotation-color-${opt.label.toLowerCase()}`}
                    aria-label={opt.label}
                  />
                );
              })}
            </div>
          </div>

          {/* Rotation */}
          <div>
            <Label className="text-xs">
              Rotation ({Math.round(rotation)}°)
            </Label>
            <input
              type="range"
              min={0}
              max={360}
              value={rotation}
              onChange={(e) =>
                onUpdateAnnotation?.({
                  ...annot,
                  rotation: parseInt(e.target.value),
                } as any)
              }
              className="w-full"
              data-testid="annotation-rotation-slider"
            />
          </div>
        </div>
      </ScrollArea>
    );
  }

  return null;
}
