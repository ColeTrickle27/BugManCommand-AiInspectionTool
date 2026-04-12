import { useRef } from "react";
import { STRUCTURE_PRESETS } from "@/lib/canvas-types";
import type { CanvasShape, ShapeKind } from "@/lib/canvas-types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Square,
  RectangleHorizontal,
  Minus,
  Pencil,
  Pentagon,
  MoveRight,
  Grid2x2,
} from "lucide-react";

// ------------------------------------------------------------------
// v3.1 ShapesPanel
//
// Changes from v3:
//  - Added "Trench-Treat (Continuous)" extra tool (draw-trench-continuous)
//    for continuous dashed line drawing mode (like polygon but no fill).
// ------------------------------------------------------------------

export type FillColorOption =
  | "transparent"
  | "light-blue"
  | "light-yellow"
  | "light-grey"
  | "light-green";

export const FILL_COLOR_VALUES: Record<FillColorOption, string> = {
  "transparent":  "transparent",
  "light-blue":   "rgba(147, 197, 253, 0.35)",
  "light-yellow": "rgba(253, 224, 71,  0.35)",
  "light-grey":   "rgba(200, 200, 200, 0.35)",
  "light-green":  "rgba(134, 239, 172, 0.35)",
};

const FILL_DISPLAY: Record<FillColorOption, { label: string; swatch: string }> = {
  "transparent":  { label: "None",         swatch: "transparent" },
  "light-blue":   { label: "Light Blue",   swatch: "#93C5FD" },
  "light-yellow": { label: "Light Yellow", swatch: "#FDE047" },
  "light-grey":   { label: "Light Grey",   swatch: "#C8C8C8" },
  "light-green":  { label: "Light Green",  swatch: "#86EFAC" },
};

interface Props {
  activeTool: string | null;
  onToolChange: (tool: string) => void;
  onAddShape: (shape: CanvasShape) => void;
  drawingLabel: string;
  onDrawingLabelChange: (label: string) => void;
  /** Currently selected fill color for new shapes */
  fillColor?: FillColorOption;
  /** Callback to change fill color selection */
  onFillColorChange?: (color: FillColorOption) => void;
}

// Standard shape-draw tools
type ShapeTool = {
  kind: ShapeKind;
  label: string;
  icon: typeof Square;
  desc: string;
};

const SHAPE_TOOLS: ShapeTool[] = [
  { kind: "rectangle", label: "Rectangle",  icon: RectangleHorizontal, desc: "Click & drag to draw" },
  { kind: "square",    label: "Square",     icon: Square,              desc: "Click & drag to draw" },
  { kind: "line",      label: "Line",       icon: Minus,               desc: "Click start, click end" },
  { kind: "freehand",  label: "Free-Hand",  icon: Pencil,              desc: "Click & drag to sketch" },
  { kind: "polygon",   label: "Polygon",    icon: Pentagon,            desc: "Click points, double-click to close" },
];

// New v3 extra tools using their own tool IDs
type ExtraTool = {
  toolId: string;
  label: string;
  icon: typeof Square;
  desc: string;
};

const EXTRA_TOOLS: ExtraTool[] = [
  {
    toolId: "draw-arrow",
    label:  "Pointer Arrow",
    icon:   MoveRight,
    desc:   "Draw arrow with label",
  },
  {
    toolId: "draw-pier",
    label:  "Pier",
    icon:   Grid2x2,
    desc:   "Click to place pier",
  },
  {
    toolId: "draw-trench-continuous",
    label:  "Trench-Treat Line",
    icon:   Minus,
    desc:   "Click points, dbl-click to finish",
  },
];

// Named presets that are NOT "Custom" (used to detect whether custom is active)
const NAMED_PRESETS = STRUCTURE_PRESETS.filter(
  (p) => p !== "Custom"
) as readonly string[];

export default function ShapesPanel({
  activeTool,
  onToolChange,
  onAddShape,
  drawingLabel,
  onDrawingLabelChange,
  fillColor = "transparent",
  onFillColorChange,
}: Props) {
  const labelInputRef = useRef<HTMLInputElement>(null);

  function handlePresetClick(preset: string) {
    if (preset === "Custom") {
      // Clear to free text and focus the input
      onDrawingLabelChange("");
      setTimeout(() => labelInputRef.current?.focus(), 20);
    } else {
      onDrawingLabelChange(preset);
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <h3 className="text-sm font-semibold text-foreground tracking-tight">Drawing Tools</h3>

        {/* ---- Structure Name ---- */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Structure Name</Label>
          <Input
            ref={labelInputRef}
            value={drawingLabel}
            onChange={(e) => onDrawingLabelChange(e.target.value)}
            placeholder="Type or select below..."
            className="h-8 text-sm"
            data-testid="input-structure-label"
          />
          <div className="flex flex-wrap gap-1 mt-1">
            {(STRUCTURE_PRESETS as readonly string[]).map((preset) => {
              const isCustom = preset === "Custom";
              // "Custom" preset button is active when the label isn't a named preset
              const isActive = isCustom
                ? drawingLabel.length > 0 && !NAMED_PRESETS.includes(drawingLabel)
                : drawingLabel === preset;
              return (
                <button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:bg-accent/50 text-foreground"
                  }`}
                  data-testid={`preset-${preset.toLowerCase().replace(/[\s\/]+/g, "-")}`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- Fill Color ---- */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Fill Color</Label>
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(FILL_DISPLAY) as FillColorOption[]).map((key) => {
              const { label, swatch } = FILL_DISPLAY[key];
              const isActive = fillColor === key;
              return (
                <button
                  key={key}
                  title={label}
                  onClick={() => onFillColorChange?.(key)}
                  className={`w-7 h-7 rounded border-2 transition-all ${
                    isActive
                      ? "border-primary scale-110 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={
                    key === "transparent"
                      ? {
                          background:
                            "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 8px 8px",
                        }
                      : { backgroundColor: swatch }
                  }
                  data-testid={`fill-color-${key}`}
                  aria-label={label}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Applied to next drawn shape.
            {fillColor !== "transparent" && (
              <> <span className="font-medium">{FILL_DISPLAY[fillColor].label} selected.</span></>
            )}
          </p>
        </div>

        {/* ---- Draw Shape ---- */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Draw Shape
          </h4>
          <div className="space-y-1">
            {SHAPE_TOOLS.map((tool) => {
              const isActive = activeTool === `draw-${tool.kind}`;
              const Icon = tool.icon;
              return (
                <button
                  key={tool.kind}
                  onClick={() =>
                    onToolChange(isActive ? "select" : `draw-${tool.kind}`)
                  }
                  className={`flex items-center gap-2.5 w-full p-2 rounded-md text-left transition-colors ${
                    isActive
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-accent/50 border border-transparent"
                  }`}
                  data-testid={`draw-${tool.kind}`}
                >
                  <div
                    className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-foreground block">
                      {tool.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{tool.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- Extra Tools ---- */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Extra Tools
          </h4>
          <div className="space-y-1">
            {EXTRA_TOOLS.map((tool) => {
              const isActive = activeTool === tool.toolId;
              const Icon = tool.icon;
              return (
                <button
                  key={tool.toolId}
                  onClick={() =>
                    onToolChange(isActive ? "select" : tool.toolId)
                  }
                  className={`flex items-center gap-2.5 w-full p-2 rounded-md text-left transition-colors ${
                    isActive
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-accent/50 border border-transparent"
                  }`}
                  data-testid={tool.toolId}
                >
                  <div
                    className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-foreground block">
                      {tool.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{tool.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
