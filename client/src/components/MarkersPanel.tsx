import { MARKER_CONFIG } from "@/lib/canvas-types";
import type { MarkerType } from "@/lib/canvas-types";
import { ScrollArea } from "@/components/ui/scroll-area";

// ------------------------------------------------------------------
// v3 MarkersPanel
//
// Three sections:
//   1. Findings / Conditions  — triangle badges (yellow #EAAA00 fill, thin red outline)
//                               except moisture = droplet badge (blue #2563EB)
//   2. Treatment Methods      — yellow square badges
//      trench-treat subtitle: "(draw dashed line)"
//      vertical-drill subtitle: "(arrow)"
//      horizontal-drill subtitle: "(arrow)"
//   3. Devices                — circle badges (each device's own color)
// ------------------------------------------------------------------

interface Props {
  selectedMarkerType: MarkerType | null;
  onSelectMarkerType: (type: MarkerType | null) => void;
  onToolChange: (tool: string) => void;
}

const FINDING_TYPES: MarkerType[] = [
  "LT", "WDF", "OHB", "PPB", "ETW", "X", "MX", "IN-T", "moisture",
];

const TREATMENT_TYPES: MarkerType[] = [
  "trench-treat",
  "hollow-block",
  "sub-slab",
  "vertical-drill",
  "horizontal-drill",
  "interior-foam",
];

const DEVICE_TYPES: MarkerType[] = [
  "atbs-station",
  "core-station",
  "dehumidifier-device",
  "sump-pump-device",
];

const TREATMENT_SUBTITLES: Partial<Record<MarkerType, string>> = {
  "trench-treat":     "(draw dashed line)",
  "vertical-drill":   "(arrow)",
  "horizontal-drill": "(arrow)",
};

// ---- Badge components ----

/** Triangle badge — used for all findings markers (yellow fill, thin red outline) */
function TriangleBadge({
  abbr,
  active,
}: {
  abbr: string;
  active: boolean;
}) {
  const fontSize =
    abbr.length <= 2 ? "9px" : abbr.length <= 4 ? "7px" : "6px";
  return (
    <div
      className="w-7 h-7 shrink-0 flex items-center justify-center select-none"
      style={{ position: "relative" }}
    >
      <svg
        viewBox="0 0 28 28"
        width="28"
        height="28"
        style={{ position: "absolute", top: 0, left: 0 }}
        aria-hidden
      >
        {/* Triangle pointing up */}
        <polygon
          points="14,3 27,25 1,25"
          fill="#EAAA00"
          stroke="#CC2200"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {active && (
          <polygon
            points="14,3 27,25 1,25"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <span
        style={{
          position: "relative",
          zIndex: 1,
          color: "#111",
          fontWeight: "bold",
          fontSize,
          lineHeight: 1,
          paddingTop: "4px",
          userSelect: "none",
        }}
      >
        {abbr}
      </span>
    </div>
  );
}

/** Droplet/teardrop badge — used for moisture marker (blue) */
function DropletBadge({ active }: { active: boolean }) {
  return (
    <div
      className="w-7 h-7 shrink-0 flex items-center justify-center select-none"
      style={{ position: "relative" }}
    >
      <svg
        viewBox="0 0 28 28"
        width="28"
        height="28"
        style={{ position: "absolute", top: 0, left: 0 }}
        aria-hidden
      >
        {/*
          Droplet shape: circle at bottom + a pointed top
          Achieved via a path: start at top point, curve down to a circle
        */}
        <path
          d="M14,2 C14,2 5,14 5,19 A9,9 0 0,0 23,19 C23,14 14,2 14,2 Z"
          fill="#2563EB"
          stroke={active ? "white" : "none"}
          strokeWidth={active ? "2" : "0"}
        />
        {active && (
          <path
            d="M14,2 C14,2 5,14 5,19 A9,9 0 0,0 23,19 C23,14 14,2 14,2 Z"
            fill="none"
            stroke="#2563EB"
            strokeWidth="3"
          />
        )}
        <text
          x="14"
          y="22"
          textAnchor="middle"
          fill="white"
          fontSize="10"
          fontWeight="bold"
        >
          💧
        </text>
      </svg>
    </div>
  );
}

/** Circle badge — used for device markers */
function CircleBadge({
  abbr,
  color,
  active,
}: {
  abbr: string;
  color: string;
  active: boolean;
}) {
  const fontSize =
    abbr.length <= 2 ? "11px" : abbr.length <= 4 ? "9px" : "8px";
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold shrink-0 leading-none select-none"
      style={{
        backgroundColor: color,
        fontSize,
        boxShadow: active ? `0 0 0 2px white, 0 0 0 3px ${color}` : undefined,
      }}
    >
      {abbr}
    </div>
  );
}

/** Square badge — used for treatment markers */
function SquareBadge({ abbr, active }: { abbr: string; active: boolean }) {
  const fontSize =
    abbr.length <= 2 ? "11px" : abbr.length <= 4 ? "9px" : "8px";
  return (
    <div
      className="w-7 h-7 rounded-sm flex items-center justify-center text-white font-bold shrink-0 leading-none select-none"
      style={{
        backgroundColor: "#D97706",
        fontSize,
        boxShadow: active ? "0 0 0 2px white, 0 0 0 3px #D97706" : undefined,
      }}
    >
      {abbr}
    </div>
  );
}

export default function MarkersPanel({
  selectedMarkerType,
  onSelectMarkerType,
  onToolChange,
}: Props) {
  function handleClick(type: MarkerType) {
    if (selectedMarkerType === type) {
      onSelectMarkerType(null);
      onToolChange("select");
    } else {
      onSelectMarkerType(type);
      onToolChange("marker");
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <h3 className="text-sm font-semibold text-foreground tracking-tight">Markers</h3>
        <p className="text-xs text-muted-foreground">
          Select a marker, then click the graph to place it.
        </p>

        {/* ---- Findings / Conditions ---- */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Findings / Conditions
          </h4>
          <div className="space-y-0.5">
            {FINDING_TYPES.map((type) => {
              const cfg = MARKER_CONFIG[type];
              const isActive = selectedMarkerType === type;
              return (
                <button
                  key={type}
                  title={cfg.label}
                  onClick={() => handleClick(type)}
                  className={`flex items-center gap-2 w-full p-1.5 rounded-md text-left transition-colors ${
                    isActive
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-accent/50 border border-transparent"
                  }`}
                  data-testid={`marker-${type}`}
                >
                  {type === "moisture" ? (
                    <DropletBadge active={isActive} />
                  ) : (
                    <TriangleBadge abbr={cfg.abbr} active={isActive} />
                  )}
                  <span className="text-xs font-medium text-foreground leading-tight">
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---- Treatment Methods ---- */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Treatment Methods
          </h4>
          <div className="space-y-0.5">
            {TREATMENT_TYPES.map((type) => {
              const cfg = MARKER_CONFIG[type];
              const isActive = selectedMarkerType === type;
              const subtitle = TREATMENT_SUBTITLES[type];
              return (
                <button
                  key={type}
                  title={cfg.label}
                  onClick={() => handleClick(type)}
                  className={`flex items-center gap-2 w-full p-1.5 rounded-md text-left transition-colors ${
                    isActive
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-accent/50 border border-transparent"
                  }`}
                  data-testid={`marker-${type}`}
                >
                  <SquareBadge abbr={cfg.abbr} active={isActive} />
                  <div>
                    <span className="text-xs font-medium text-foreground leading-tight block">
                      {cfg.label}
                    </span>
                    {subtitle && (
                      <span className="text-[10px] text-muted-foreground">{subtitle}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---- Devices ---- */}
        <section className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Devices
          </h4>
          <div className="space-y-0.5">
            {DEVICE_TYPES.map((type) => {
              const cfg = MARKER_CONFIG[type];
              const isActive = selectedMarkerType === type;
              return (
                <button
                  key={type}
                  title={cfg.label}
                  onClick={() => handleClick(type)}
                  className={`flex items-center gap-2 w-full p-1.5 rounded-md text-left transition-colors ${
                    isActive
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-accent/50 border border-transparent"
                  }`}
                  data-testid={`marker-${type}`}
                >
                  <CircleBadge abbr={cfg.abbr} color={cfg.color} active={isActive} />
                  <span className="text-xs font-medium text-foreground leading-tight">
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
