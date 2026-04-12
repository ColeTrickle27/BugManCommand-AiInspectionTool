import { useState, useRef } from "react";
import type { SymbolType } from "@/lib/canvas-types";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ------------------------------------------------------------------
// v3 SymbolsPanel
//
// Kept symbols (redesigned with visual icons, no square backgrounds):
//   Bushes/Shrubs, AC Unit, Crawlspace Access, Chimney,
//   Electrical Wire, Gas Line, Brick/Block Steps
//
// Added:
//   Custom Symbol — popup to name it, renders as labelled square
//
// Removed from v2:
//   Window, Crawlspace Vent, Well/Cistern, Door,
//   Dehumidifier, Sump Pump (moved to Devices markers)
// ------------------------------------------------------------------

interface Props {
  selectedSymbolType: SymbolType | null;
  onSelectSymbolType: (type: SymbolType | null) => void;
  onToolChange: (tool: string) => void;
  /** Called when user confirms a custom symbol label */
  onCustomSymbolLabel?: (label: string) => void;
}

// ---- Small SVG icons ----

function BushesIcon() {
  return (
    <svg viewBox="0 0 28 28" width="22" height="22" aria-hidden>
      <circle cx="9"  cy="17" r="7"  fill="#4CAF50" />
      <circle cx="19" cy="17" r="7"  fill="#388E3C" />
      <circle cx="14" cy="12" r="7"  fill="#66BB6A" />
      <rect   x="10" y="22" width="8" height="3" rx="1" fill="#795548" />
    </svg>
  );
}

function AcUnitIcon() {
  return (
    <svg viewBox="0 0 28 28" width="22" height="22" aria-hidden>
      <rect x="3" y="8"  width="22" height="13" rx="2" fill="#607D8B" />
      <rect x="3" y="8"  width="22" height="4"  rx="2" fill="#90A4AE" />
      <text x="14" y="21" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">
        AC
      </text>
    </svg>
  );
}

function CrawlAccessIcon() {
  return (
    <svg viewBox="0 0 28 28" width="22" height="22" aria-hidden>
      {/* Horizontal bars */}
      <rect x="3"     y="12"   width="22" height="2.5" rx="1" fill="#5D4037" />
      <rect x="3"     y="17"   width="22" height="2.5" rx="1" fill="#5D4037" />
      {/* Vertical bar */}
      <rect x="12.75" y="4"    width="2.5" height="20" rx="1" fill="#5D4037" />
    </svg>
  );
}

/** Chimney: red square with grey outline, "CH" label text inside */
function ChimneyIcon() {
  return (
    <svg viewBox="0 0 28 28" width="22" height="22" aria-hidden>
      <rect
        x="4" y="4" width="20" height="20" rx="2"
        fill="#B71C1C"
        stroke="#9E9E9E"
        strokeWidth="2"
      />
      <text
        x="14" y="18"
        textAnchor="middle"
        fill="white"
        fontSize="9"
        fontWeight="bold"
      >
        CH
      </text>
    </svg>
  );
}

function ElectricalWireIcon() {
  return (
    <svg viewBox="0 0 28 28" width="22" height="22" aria-hidden>
      <polyline
        points="16,3 10,14 15,14 12,25"
        fill="none"
        stroke="#FFC107"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Gas Line: grey circle with red outline, "Gas" label text inside */
function GasLineIcon() {
  return (
    <svg viewBox="0 0 28 28" width="22" height="22" aria-hidden>
      <circle
        cx="14" cy="14" r="11"
        fill="#9E9E9E"
        stroke="#CC2200"
        strokeWidth="2"
      />
      <text
        x="14" y="18"
        textAnchor="middle"
        fill="white"
        fontSize="8"
        fontWeight="bold"
      >
        Gas
      </text>
    </svg>
  );
}

function BrickStepsIcon() {
  return (
    <svg viewBox="0 0 28 28" width="22" height="22" aria-hidden>
      <rect x="18" y="18" width="8"  height="6"  rx="0.5" fill="#BF360C" />
      <rect x="10" y="13" width="16" height="5"  rx="0.5" fill="#D84315" />
      <rect x="2"  y="8"  width="24" height="5"  rx="0.5" fill="#E64A19" />
      <line x1="10" y1="18" x2="26" y2="18" stroke="#FFCCBC" strokeWidth="0.8" />
      <line x1="2"  y1="13" x2="26" y2="13" stroke="#FFCCBC" strokeWidth="0.8" />
    </svg>
  );
}

function CustomSymbolIcon({ label }: { label?: string }) {
  return (
    <svg viewBox="0 0 28 28" width="22" height="22" aria-hidden>
      <rect
        x="3" y="3" width="22" height="22" rx="2"
        fill="#6B7280"
        stroke="#9CA3AF"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />
      {label ? (
        <text
          x="14" y="17"
          textAnchor="middle"
          fill="white"
          fontSize={label.length <= 3 ? "8" : "6"}
          fontWeight="bold"
        >
          {label.substring(0, 4)}
        </text>
      ) : (
        <text x="14" y="18" textAnchor="middle" fill="white" fontSize="14">+</text>
      )}
    </svg>
  );
}

// A zero-arg icon component — CustomSymbolIcon uses a curried wrapper
type IconComponent = () => JSX.Element;

type SymbolMeta = {
  label: string;
  Icon: IconComponent;
};

const SYMBOL_META: Record<SymbolType, SymbolMeta> = {
  "bushes":            { label: "Bushes / Shrubs",     Icon: BushesIcon },
  "ac-unit":           { label: "AC Unit",             Icon: AcUnitIcon },
  "crawlspace-access": { label: "Crawlspace Access",   Icon: CrawlAccessIcon },
  "chimney":           { label: "Chimney",             Icon: ChimneyIcon },
  "electrical-wire":   { label: "Electrical Wire",     Icon: ElectricalWireIcon },
  "gas-line":          { label: "Gas Line",            Icon: GasLineIcon },
  "brick-block-steps": { label: "Brick / Block Steps", Icon: BrickStepsIcon },
  // custom-symbol entry is handled separately below, but we need a placeholder
  // so that SymbolMeta covers the full SymbolType union
  "custom-symbol":     { label: "Custom Symbol",       Icon: () => <CustomSymbolIcon /> },
};

// Display order — custom-symbol rendered separately at the bottom
const SYMBOL_ORDER: SymbolType[] = [
  "bushes",
  "ac-unit",
  "crawlspace-access",
  "chimney",
  "electrical-wire",
  "gas-line",
  "brick-block-steps",
];

export default function SymbolsPanel({
  selectedSymbolType,
  onSelectSymbolType,
  onToolChange,
  onCustomSymbolLabel,
}: Props) {
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSymbolClick(type: SymbolType) {
    if (selectedSymbolType === type) {
      onSelectSymbolType(null);
      onToolChange("select");
    } else {
      onSelectSymbolType(type);
      onToolChange("symbol");
    }
  }

  function commitCustomSymbol() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    onCustomSymbolLabel?.(trimmed);
    onSelectSymbolType("custom-symbol");
    onToolChange("symbol");
    setCustomPopoverOpen(false);
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <h3 className="text-sm font-semibold text-foreground tracking-tight">Symbols</h3>
        <p className="text-xs text-muted-foreground">
          Select a symbol, then click the graph to place it.
        </p>

        <div className="space-y-0.5">
          {SYMBOL_ORDER.map((type) => {
            const meta = SYMBOL_META[type];
            const isActive = selectedSymbolType === type;
            const { Icon } = meta;
            return (
              <button
                key={type}
                title={meta.label}
                onClick={() => handleSymbolClick(type)}
                className={`flex items-center gap-2 w-full p-1.5 rounded-md text-left transition-colors ${
                  isActive
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-accent/50 border border-transparent"
                }`}
                data-testid={`symbol-${type}`}
              >
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <Icon />
                </div>
                <span className="text-xs font-medium text-foreground leading-tight">
                  {meta.label}
                </span>
              </button>
            );
          })}

          {/* ---- Custom Symbol ---- */}
          <Popover
            open={customPopoverOpen}
            onOpenChange={(open) => {
              setCustomPopoverOpen(open);
              if (open) {
                setCustomName("");
                setTimeout(() => inputRef.current?.focus(), 50);
              }
            }}
          >
            <PopoverTrigger asChild>
              <button
                title="Custom Symbol — click to name it"
                className={`flex items-center gap-2 w-full p-1.5 rounded-md text-left transition-colors ${
                  selectedSymbolType === "custom-symbol"
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-accent/50 border border-transparent"
                }`}
                data-testid="symbol-custom-symbol"
              >
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <CustomSymbolIcon label={customName || undefined} />
                </div>
                <span className="text-xs font-medium text-foreground leading-tight">
                  Custom Symbol
                </span>
              </button>
            </PopoverTrigger>

            <PopoverContent side="right" align="start" className="w-52 p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">Name this symbol</p>
              <Input
                ref={inputRef}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitCustomSymbol();
                  if (e.key === "Escape") setCustomPopoverOpen(false);
                }}
                placeholder="e.g. Water Heater"
                className="h-8 text-sm"
                data-testid="custom-symbol-name-input"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={commitCustomSymbol}
                  disabled={!customName.trim()}
                >
                  Place
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 h-7 text-xs"
                  onClick={() => setCustomPopoverOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </ScrollArea>
  );
}
