import { useRef, useState, useCallback, useEffect } from "react";
import {
  Stage, Layer, Rect, Text, Group, Circle, Line,
  Image as KImage, RegularPolygon,
} from "react-konva";
import type Konva from "konva";
import type {
  CanvasShape,
  CanvasMarker,
  CanvasSymbol,
  CanvasPhoto,
  CanvasTextAnnotation,
  MarkerType,
  SymbolType,
  ShapeKind,
  LayerName,
} from "@/lib/canvas-types";
import {
  MARKER_CONFIG,
  SYMBOL_CONFIG,
  GRID_SIZE,
  generateId,
  getMoistureDescriptor,
} from "@/lib/canvas-types";

// ---- Props ----
interface Props {
  shapes: CanvasShape[];
  markers: CanvasMarker[];
  symbols: CanvasSymbol[];
  photos: CanvasPhoto[];
  annotations: CanvasTextAnnotation[];
  selectedTool: string | null;
  selectedMarkerType: MarkerType | null;
  selectedSymbolType: SymbolType | null;
  onShapesChange: (s: CanvasShape[]) => void;
  onMarkersChange: (m: CanvasMarker[]) => void;
  onSymbolsChange: (s: CanvasSymbol[]) => void;
  onPhotosChange: (p: CanvasPhoto[]) => void;
  onAnnotationsChange: (a: CanvasTextAnnotation[]) => void;
  onSelectShape: (id: string | null) => void;
  onSelectMarker: (id: string | null) => void;
  onSelectSymbol: (id: string | null) => void;
  selectedShapeId: string | null;
  selectedMarkerId: string | null;
  selectedSymbolId: string | null;
  stageRef: React.RefObject<Konva.Stage | null>;
  ftPerGrid: number;
  drawingLabel: string;
  fillColor: string;
  customSymbolLabel: string;
  showPhotos: boolean;
  onUndo: () => void;
  onMoisturePrompt: (markerId: string) => void;
  textColor: string;
  textSize: number;
  // New props (v3.1)
  onRedo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDeleteSelected?: () => void;
  onToolChange?: (tool: string) => void;
  selectedAnnotationId?: string | null;
  onSelectAnnotation?: (id: string | null) => void;
  /** Replacement for window.prompt() which is blocked in sandboxed iframes */
  onPrompt?: (message: string, defaultValue: string, callback: (value: string | null) => void) => void;
  viewportRequest?: { type: "zoomIn" | "zoomOut" | "reset"; nonce: number } | null;
  /** Visibility toggles for each layer.  If a layer is false, items on that layer are hidden. */
  layerVisibility: Record<LayerName, boolean>;
}

// ---- Helper: load image from dataUrl ----
function useLoadImage(src: string | undefined) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);
  return image;
}

// ---- Helper: px → feet string (whole numbers only) ----
function pxToFt(px: number, ftPerGrid: number): string {
  const ft = (Math.abs(px) / GRID_SIZE) * ftPerGrid;
  return `${Math.round(ft)}'`;
}

// ---- Helper: normalized rect from two points ----
function normRect(sx: number, sy: number, ex: number, ey: number) {
  return {
    x: Math.min(sx, ex),
    y: Math.min(sy, ey),
    width: Math.abs(ex - sx),
    height: Math.abs(ey - sy),
  };
}

// ---- Helper: polygon centroid ----
function polygonCentroid(points: number[]): { x: number; y: number } {
  let cx = 0, cy = 0;
  const n = points.length / 2;
  for (let i = 0; i < points.length; i += 2) {
    cx += points[i];
    cy += points[i + 1];
  }
  return { x: cx / n, y: cy / n };
}

// ============================
// Sub-component: PhotoPin (camera icon with hover preview)
// ============================
function photoIndexToLabel(index: number): string {
  // A, B, C, ... Z, AA, AB, ...
  let label = '';
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

function PhotoPin({
  photo, canDrag, onDragEnd, index,
}: {
  photo: CanvasPhoto;
  canDrag: boolean;
  onDragEnd: (x: number, y: number) => void;
  index: number;
}) {
  const image = useLoadImage(photo.dataUrl);
  const [hovered, setHovered] = useState(false);
  const label = photoIndexToLabel(index);

  const thumbW = 80;
  const thumbH = image ? (image.height / image.width) * thumbW : 60;

  return (
    <Group
      x={photo.x} y={photo.y}
      draggable={canDrag}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Camera icon with letter identifier */}
      <Circle
        radius={14}
        fill="rgba(37,99,235,0.5)"
        stroke="#2563EB"
        strokeWidth={1}
      />
      <Text
        text={label}
        fontSize={11}
        fontStyle="bold"
        fill="#fff"
        x={-14}
        y={-7}
        width={28}
        align="center"
        listening={false}
      />
      {photo.caption && (
        <Text
          text={photo.caption}
          y={18}
          fontSize={8}
          width={60}
          offsetX={30}
          align="center"
          fill="#555"
          listening={false}
        />
      )}
      {/* Hover preview overlay */}
      {hovered && image && (
        <Group>
          <Rect
            width={thumbW + 8}
            height={thumbH + 8}
            offsetX={4}
            offsetY={thumbH + 14}
            fill="#fff"
            stroke="#bbb"
            strokeWidth={1}
            cornerRadius={3}
            shadowColor="rgba(0,0,0,0.25)"
            shadowBlur={6}
            shadowOffset={{ x: 2, y: 2 }}
            listening={false}
          />
          <KImage
            image={image}
            width={thumbW}
            height={thumbH}
            offsetY={thumbH + 10}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
}

// ============================
// Sub-component: SymbolShape
// Renders realistic Konva primitives for each symbol type
// ============================
function SymbolShape({
  type, customLabel, selected, size: symSize,
}: {
  type: SymbolType;
  customLabel?: string;
  selected: boolean;
  size?: number;
}) {
  const selStroke = selected ? "#2E7D32" : undefined;
  const selSW = selected ? 2.5 : 1;
  const scale = symSize || 1.0;

  switch (type) {
    case "bushes":
      return (
        <Group scaleX={scale} scaleY={scale}>
          {/* Three overlapping circles */}
          <Circle x={0} y={4} radius={8} fill="#4CAF50" stroke={selStroke || "#2E7D32"} strokeWidth={selSW} />
          <Circle x={-9} y={8} radius={7} fill="#388E3C" stroke={selStroke || "#2E7D32"} strokeWidth={selSW} />
          <Circle x={9} y={8} radius={7} fill="#388E3C" stroke={selStroke || "#2E7D32"} strokeWidth={selSW} />
          {/* Ground line */}
          <Line points={[-14, 14, 14, 14]} stroke="#5D4037" strokeWidth={2} />
        </Group>
      );

    case "ac-unit":
      return (
        <Group scaleX={scale} scaleY={scale}>
          <Rect
            width={28} height={20} offsetX={14} offsetY={10}
            fill="#B0BEC5" stroke={selStroke || "#607D8B"} strokeWidth={selSW}
            cornerRadius={2}
          />
          <Text
            text="AC" fontSize={9} fill="#1565C0" fontStyle="bold"
            width={28} height={20} offsetX={14} offsetY={10}
            align="center" verticalAlign="middle" listening={false}
          />
          {/* Vent lines */}
          <Line points={[-10, -6, -10, 6]} stroke="#546E7A" strokeWidth={1} />
          <Line points={[-4, -6, -4, 6]} stroke="#546E7A" strokeWidth={1} />
          <Line points={[2, -6, 2, 6]} stroke="#546E7A" strokeWidth={1} />
          <Line points={[8, -6, 8, 6]} stroke="#546E7A" strokeWidth={1} />
        </Group>
      );

    case "crawlspace-access":
      return (
        <Group scaleX={scale} scaleY={scale}>
          {/* Outer rectangle */}
          <Rect
            width={24} height={18} offsetX={12} offsetY={9}
            fill="transparent" stroke={selStroke || "#333"} strokeWidth={selSW + 0.5}
          />
          {/* Two parallel horizontal lines in center — "=" symbol */}
          <Line points={[-8, -3, 8, -3]} stroke="#333" strokeWidth={2} />
          <Line points={[-8, 3, 8, 3]} stroke="#333" strokeWidth={2} />
        </Group>
      );

    case "chimney":
      // Spec change: red filled Rect with grey stroke, "Chimney" text label inside
      return (
        <Group scaleX={scale} scaleY={scale}>
          <Rect
            width={32} height={24} offsetX={16} offsetY={12}
            fill="#CC2200" stroke={selStroke || "#9E9E9E"} strokeWidth={selSW + 0.5}
          />
          <Text
            text="Chimney"
            fontSize={7}
            fill="#fff"
            fontStyle="bold"
            width={32}
            height={24}
            offsetX={16}
            offsetY={12}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        </Group>
      );

    case "electrical-wire":
      // Zigzag lightning-bolt shape, yellow
      return (
        <Group scaleX={scale} scaleY={scale}>
          <Line
            points={[0, -14, -5, -2, 2, -2, -4, 14]}
            stroke={selStroke || "#FFC107"}
            strokeWidth={selSW + 1.5}
            lineJoin="round"
          />
        </Group>
      );

    case "gas-line":
      // Spec change: grey filled Circle with red stroke, "Gas" text label inside
      return (
        <Group scaleX={scale} scaleY={scale}>
          <Circle
            radius={14}
            fill="#9E9E9E"
            stroke={selStroke || "#CC2200"}
            strokeWidth={selSW + 0.5}
          />
          <Text
            text="Gas"
            fontSize={9}
            fill="#fff"
            fontStyle="bold"
            width={28}
            height={28}
            offsetX={14}
            offsetY={14}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        </Group>
      );

    case "brick-block-steps":
      // Three stacked rectangles decreasing in width
      return (
        <Group scaleX={scale} scaleY={scale}>
          <Rect width={24} height={6} offsetX={12} offsetY={9}
            fill="#8B5E3C" stroke={selStroke || "#5D4037"} strokeWidth={selSW} />
          <Rect width={18} height={6} offsetX={9} offsetY={3}
            fill="#A1735C" stroke={selStroke || "#5D4037"} strokeWidth={selSW} />
          <Rect width={12} height={6} offsetX={6} offsetY={-3}
            fill="#B98A72" stroke={selStroke || "#5D4037"} strokeWidth={selSW} />
        </Group>
      );

    case "custom-symbol":
      return (
        <Group scaleX={scale} scaleY={scale}>
          <Rect
            width={32} height={20} offsetX={16} offsetY={10}
            fill="#E5E7EB" stroke={selStroke || "#6B7280"} strokeWidth={selSW}
            cornerRadius={3}
          />
          <Text
            text={customLabel || "?"}
            fontSize={Math.max(6, Math.min(10, 60 / Math.max(1, (customLabel || "?").length)))}
            fill="#374151" fontStyle="bold"
            width={32} height={20} offsetX={16} offsetY={10}
            align="center" verticalAlign="middle" listening={false}
          />
        </Group>
      );

    default:
      return (
        <Group scaleX={scale} scaleY={scale}>
          <Rect
            width={28} height={28} offsetX={14} offsetY={14}
            fill="#9E9E9E" stroke={selStroke || "#757575"} strokeWidth={selSW}
            cornerRadius={3}
          />
        </Group>
      );
  }
}

// ============================
// Sub-component: MarkerRenderer
// Renders a single marker based on MARKER_CONFIG shape
// ============================
function MarkerRenderer({
  marker, selected, onMoisturePrompt,
}: {
  marker: CanvasMarker;
  selected: boolean;
  onMoisturePrompt: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const config = MARKER_CONFIG[marker.type];
  // Default size: 10px (was 14)
  const size = marker.size || 10;
  const selStroke = selected ? "#fff" : config.color;
  const selSW = selected ? 3 : 1;

  // Moisture descriptor
  const moistDesc =
    marker.type === "moisture" && marker.moistureReading !== undefined
      ? getMoistureDescriptor(marker.moistureReading)
      : null;

  // Determine marker category
  const isFinding = config.category === "Finding";
  const isTreatment = config.category === "Treatment";
  const isDevice = config.category === "Device";
  const isMoisture = marker.type === "moisture";

  const renderShape = () => {
    // Moisture markers: teardrop / droplet shape (Circle + triangle on top = teardrop)
    if (isMoisture) {
      const dropR = size;
      const triH = size * 1.0;
      return (
        <>
          {/* Blue circle base */}
          <Circle
            radius={dropR}
            fill="#2563EB"
            stroke={selected ? "#fff" : "#1D4ED8"}
            strokeWidth={selSW}
            shadowColor="rgba(0,0,0,0.3)"
            shadowBlur={3}
            shadowOffset={{ x: 1, y: 1 }}
          />
          {/* Triangle on top to form teardrop */}
          <Line
            points={[-dropR * 0.6, -dropR * 0.4, dropR * 0.6, -dropR * 0.4, 0, -(dropR + triH)]}
            closed
            fill="#2563EB"
            stroke={selected ? "#fff" : "#1D4ED8"}
            strokeWidth={selSW}
            listening={false}
          />
          {/* Moisture reading text below */}
          {moistDesc && marker.moistureReading !== undefined && (
            <Text
              text={`${marker.moistureReading}%`}
              fontSize={9}
              fill={moistDesc.color}
              fontStyle="bold"
              align="center"
              x={-(size + 10)}
              y={size + 3}
              width={(size + 10) * 2}
              listening={false}
            />
          )}
          {moistDesc && marker.moistureReading !== undefined && (
            <Text
              text={moistDesc.text}
              fontSize={8}
              fill={moistDesc.color}
              align="center"
              x={-(size + 10)}
              y={size + 13}
              width={(size + 10) * 2}
              listening={false}
            />
          )}
        </>
      );
    }

    // Findings markers: yellow triangle (RegularPolygon sides=3)
    if (isFinding) {
      const abbr = config.abbr;
      const textSize = Math.max(6, size * 0.7);
      const triRadius = size * 1.2;
      return (
        <>
          <RegularPolygon
            sides={3}
            radius={triRadius}
            fill="#EAAA00"
            stroke="#CC2200"
            strokeWidth={1}
            shadowColor="rgba(0,0,0,0.2)"
            shadowBlur={2}
            shadowOffset={{ x: 1, y: 1 }}
          />
          <Text
            text={abbr}
            fontSize={textSize}
            fill="#1a1a1a"
            fontStyle="bold"
            align="center"
            verticalAlign="middle"
            width={triRadius * 2}
            height={triRadius * 2}
            offsetX={triRadius}
            offsetY={triRadius * 0.9}
            listening={false}
          />
        </>
      );
    }

    // Treatment markers: render with opacity=0.65
    if (isTreatment) {
      switch (config.shape) {
        case "dashed-line": {
          // trench-treat — line drawn between x/y and details (x2,y2)
          let dx = 40, dy = 0;
          if (marker.details) {
            const parts = marker.details.split(",");
            if (parts.length === 2) {
              dx = parseFloat(parts[0]) - marker.x;
              dy = parseFloat(parts[1]) - marker.y;
            }
          }
          const len = Math.sqrt(dx * dx + dy * dy);
          return (
            <Group opacity={0.65}>
              <Line
                points={[0, 0, dx, dy]}
                stroke={config.color}
                strokeWidth={3}
                dash={[8, 4]}
              />
              {/* Label at midpoint */}
              <Text
                text={config.abbr}
                fontSize={9}
                fill={config.color}
                fontStyle="bold"
                x={dx / 2 - 8}
                y={dy / 2 - 14}
                listening={false}
              />
              {len > 0 && selected && (
                <Text
                  text={pxToFt(len, 2)}
                  fontSize={8}
                  fill="#555"
                  x={dx / 2 + 4}
                  y={dy / 2}
                  listening={false}
                />
              )}
            </Group>
          );
        }

        case "arrow-vertical": {
          const dir = marker.flipped ? 1 : -1;
          return (
            <Group opacity={0.65} rotation={marker.rotation || 0}>
              <Line
                points={[0, dir * size, 0, -dir * size]}
                stroke={config.color}
                strokeWidth={3}
                pointerLength={10}
                pointerWidth={8}
              />
              <Text
                text={config.abbr}
                fontSize={Math.max(6, size * 0.6)}
                fill={config.color}
                fontStyle="bold"
                x={4}
                y={-6}
                listening={false}
              />
            </Group>
          );
        }

        case "arrow-horizontal": {
          const dir = marker.flipped ? -1 : 1;
          return (
            <Group opacity={0.65} rotation={marker.rotation || 0}>
              <Line
                points={[-dir * size, 0, dir * size, 0]}
                stroke={config.color}
                strokeWidth={3}
                pointerLength={10}
                pointerWidth={8}
              />
              <Text
                text={config.abbr}
                fontSize={Math.max(6, size * 0.6)}
                fill={config.color}
                fontStyle="bold"
                x={-8}
                y={-16}
                listening={false}
              />
            </Group>
          );
        }

        case "square": {
          const halfSide = size;
          const side = size * 2;
          return (
            <Group opacity={0.65}>
              <Rect
                width={side} height={side}
                offsetX={halfSide} offsetY={halfSide}
                fill={config.color}
                stroke={selStroke} strokeWidth={selSW}
                shadowColor="rgba(0,0,0,0.3)" shadowBlur={3}
                shadowOffset={{ x: 1, y: 1 }}
              />
              <Text
                text={config.abbr}
                fontSize={Math.max(6, size * 0.65)}
                fill="#fff" fontStyle="bold"
                align="center" verticalAlign="middle"
                width={side} height={side}
                offsetX={halfSide} offsetY={halfSide}
                listening={false}
              />
            </Group>
          );
        }

        default:
          return (
            <Group opacity={0.65}>
              <Circle radius={size} fill={config.color} stroke={selStroke} strokeWidth={selSW} />
            </Group>
          );
      }
    }

    // Device markers: ALL render as circles
    if (isDevice) {
      const abbr = config.abbr;
      const textSize = Math.max(6, size * 0.65);
      return (
        <>
          <Circle
            radius={size}
            fill={config.color}
            stroke={selStroke}
            strokeWidth={selSW}
            shadowColor="rgba(0,0,0,0.3)"
            shadowBlur={3}
            shadowOffset={{ x: 1, y: 1 }}
          />
          <Text
            text={abbr}
            fontSize={textSize}
            fill="#fff"
            fontStyle="bold"
            align="center"
            verticalAlign="middle"
            width={size * 2}
            height={size * 2}
            offsetX={size}
            offsetY={size}
            listening={false}
          />
        </>
      );
    }

    // Fallback: circle
    return (
      <Circle radius={size} fill={config.color} stroke={selStroke} strokeWidth={selSW} />
    );
  };

  return (
    <>
      {renderShape()}
      {/* Hover tooltip */}
      {hovered && (
        <Group>
          <Rect
            x={-config.label.length * 3 - 4}
            y={-(size + 24)}
            width={config.label.length * 6 + 8}
            height={16}
            fill="#333"
            cornerRadius={3}
            opacity={0.85}
            listening={false}
          />
          <Text
            text={config.label}
            x={-config.label.length * 3 - 4}
            y={-(size + 24)}
            width={config.label.length * 6 + 8}
            height={16}
            fontSize={9}
            fill="#fff"
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        </Group>
      )}
      {/* Invisible hit target for hover events */}
      <Rect
        width={Math.max(size * 2 + 20, 40)}
        height={Math.max(size * 2 + 20, 40)}
        offsetX={Math.max(size + 10, 20)}
        offsetY={Math.max(size + 10, 20)}
        fill="transparent"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
    </>
  );
}

// ============================
// Sub-component: FloatingEditPopup
// ============================
interface FloatingEditPopupProps {
  position: { x: number; y: number } | null;
  onSizeIncrease: () => void;
  onSizeDecrease: () => void;
  onRotationChange: (deg: number) => void;
  currentRotation: number;
  onColorChange: (color: string) => void;
  currentColor: string;
  onDelete: () => void;
  onCopy?: () => void;
}

function FloatingEditPopup({
  position,
  onSizeIncrease,
  onSizeDecrease,
  onRotationChange,
  currentRotation,
  onColorChange,
  currentColor,
  onDelete,
  onCopy,
}: FloatingEditPopupProps) {
  if (!position) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: 50,
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
        padding: "6px 10px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        userSelect: "none",
        pointerEvents: "all",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Size controls */}
      <button
        title="Decrease size"
        onClick={onSizeDecrease}
        style={{ padding: "2px 7px", borderRadius: 4, border: "1px solid #d1d5db", cursor: "pointer", background: "#f9fafb", fontWeight: 700, fontSize: 14 }}
      >−</button>
      <button
        title="Increase size"
        onClick={onSizeIncrease}
        style={{ padding: "2px 7px", borderRadius: 4, border: "1px solid #d1d5db", cursor: "pointer", background: "#f9fafb", fontWeight: 700, fontSize: 14 }}
      >+</button>

      {/* Rotation slider */}
      <input
        type="range"
        min={-180}
        max={180}
        value={currentRotation}
        onChange={(e) => onRotationChange(parseInt(e.target.value, 10))}
        title="Rotation"
        style={{ width: 60, cursor: "pointer" }}
      />
      <span style={{ fontSize: 10, color: "#6b7280", minWidth: 28 }}>{currentRotation}°</span>

      {/* Color picker */}
      <input
        type="color"
        value={currentColor}
        onChange={(e) => onColorChange(e.target.value)}
        title="Color"
        style={{ width: 24, height: 24, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }}
      />

      {/* Copy button */}
      {onCopy && (
        <button
          title="Copy"
          onClick={onCopy}
          style={{ padding: "2px 7px", borderRadius: 4, border: "1px solid #d1d5db", cursor: "pointer", background: "#f9fafb", fontSize: 11 }}
        >📋</button>
      )}

      {/* Delete button */}
      <button
        title="Delete"
        onClick={onDelete}
        style={{ padding: "2px 7px", borderRadius: 4, border: "1px solid #fca5a5", cursor: "pointer", background: "#fee2e2", color: "#dc2626", fontWeight: 700, fontSize: 13 }}
      >🗑</button>
    </div>
  );
}

// ============================
// Main Component
// ============================
export default function TermiteCanvas({
  shapes, markers, symbols, photos, annotations,
  selectedTool, selectedMarkerType, selectedSymbolType,
  onShapesChange, onMarkersChange, onSymbolsChange, onPhotosChange, onAnnotationsChange,
  onSelectShape, onSelectMarker, onSelectSymbol,
  selectedShapeId, selectedMarkerId, selectedSymbolId,
  stageRef, ftPerGrid, drawingLabel,
  fillColor, customSymbolLabel, showPhotos,
  onUndo, onMoisturePrompt,
  textColor, textSize,
  onRedo,
  onCopy,
  onPaste,
  onDeleteSelected,
  onToolChange,
  selectedAnnotationId,
  onSelectAnnotation,
  onPrompt,
  viewportRequest,
  layerVisibility,
}: Props) {
  // Safe prompt helper — uses onPrompt callback if available, falls back to window.prompt
  const safePrompt = useCallback((message: string, defaultValue: string = ''): Promise<string | null> => {
    if (onPrompt) {
      return new Promise((resolve) => onPrompt(message, defaultValue, resolve));
    }
    // Fallback for non-sandboxed environments
    try {
      return Promise.resolve(window.prompt(message, defaultValue));
    } catch {
      return Promise.resolve(null);
    }
  }, [onPrompt]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // Spacebar pan state
  const [spacebarHeld, setSpacebarHeld] = useState(false);
  const [toolBeforeSpace, setToolBeforeSpace] = useState<string | null>(null);

  // Drawing state
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [drawingShape, setDrawingShape] = useState<CanvasShape | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<number[]>([]);
  const [polygonPoints, setPolygonPoints] = useState<number[]>([]);
  // Trench-treat continuous drawing state
  const [trenchStart, setTrenchStart] = useState<{ x: number; y: number } | null>(null);
  const [trenchSegments, setTrenchSegments] = useState<CanvasMarker[]>([]);
  // Arrow two-click state
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);

  // Pinch zoom refs — track pinch distance and starting scale for multi-touch zoom
  const pinchInitialDistance = useRef<number | null>(null);
  const pinchInitialScale = useRef<number>(1);

  // Line endpoint drag state
  const [draggingEndpoint, setDraggingEndpoint] = useState<{
    shapeId: string;
    endpointIndex: 0 | 1;
  } | null>(null);


  useEffect(() => {
    if (!viewportRequest) return;
    if (viewportRequest.type === "reset") {
      setScale(1);
      setStagePos({ x: 0, y: 0 });
      return;
    }

    const nextScale = viewportRequest.type === "zoomIn"
      ? Math.min(5, scale * 1.15)
      : Math.max(0.2, scale / 1.15);

    const centerX = stageSize.width / 2;
    const centerY = stageSize.height / 2;
    const worldX = (centerX - stagePos.x) / scale;
    const worldY = (centerY - stagePos.y) / scale;
    setScale(nextScale);
    setStagePos({
      x: centerX - worldX * nextScale,
      y: centerY - worldY * nextScale,
    });
  }, [viewportRequest?.nonce]);

  // Internal clipboard
  const [internalClipboard, setInternalClipboard] = useState<any>(null);

  const isDrawing = useRef(false);

  // ---- Responsive sizing ----
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // ---- Derive visible subsets based on layerVisibility ----
  // Each canvas element belongs to a layer; hide elements whose layer is toggled off.
  const visibleShapes = shapes.filter((s) => {
    const layerName = (s.layer || 'structures') as LayerName;
    return layerVisibility[layerName];
  });
  const visibleMarkers = markers.filter((m) => {
    let layerName: LayerName | undefined = (m as any).layer;
    if (!layerName) {
      const cfg = MARKER_CONFIG[m.type];
      if (cfg && cfg.layer) layerName = cfg.layer as LayerName;
      else {
        if (cfg.category === 'Finding') layerName = 'findings';
        else if (cfg.category === 'Treatment') layerName = 'treatments';
        else if (cfg.category === 'Device') layerName = 'devices';
        else layerName = 'notes';
      }
    }
    return layerVisibility[layerName!];
  });
  const visibleSymbols = symbols.filter((sym) => {
    const layerName = ((sym as any).layer || 'structures') as LayerName;
    return layerVisibility[layerName];
  });
  const visibleAnnotations = annotations.filter((ann) => {
    const layerName = (ann.layer || 'notes') as LayerName;
    return layerVisibility[layerName];
  });
  const visiblePhotos = photos.filter((photo) => {
    const layerName = ((photo as any).layer || 'notes') as LayerName;
    return layerVisibility[layerName];
  });

  // ---- Reset internal drawing state when shapes/markers are cleared ----
  // When starting a new report or clearing all items, ensure any in-progress polygon,
  // freehand, arrow, or trench drawing state is discarded. Without this, in-progress
  // state can leak into a new session (bug: polygons persisting across reports).
  useEffect(() => {
    if (shapes.length === 0) {
      setPolygonPoints([]);
      setFreehandPoints([]);
      setDrawingShape(null);
      setDrawStart(null);
      setDrawCurrent(null);
      setArrowStart(null);
      isDrawing.current = false;
    }
  }, [shapes.length]);
  useEffect(() => {
    if (markers.length === 0) {
      setTrenchSegments([]);
      setTrenchStart(null);
      setDrawCurrent(null);
    }
  }, [markers.length]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const isInputFocused = () => {
      return (
        document.activeElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Spacebar held → temporary pan
      if (e.code === "Space" && !spacebarHeld && !isInputFocused()) {
        e.preventDefault();
        setSpacebarHeld(true);
        if (selectedTool !== "pan") {
          setToolBeforeSpace(selectedTool);
          onToolChange?.("pan");
        }
        return;
      }

      // Ctrl+Shift+Z → redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Ctrl+Z / Cmd+Z → undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        onUndo();
        return;
      }

      // Ctrl+C → copy
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (!isInputFocused()) {
          // Copy selected element
          if (selectedShapeId) {
            const shape = shapes.find((s) => s.id === selectedShapeId);
            if (shape) setInternalClipboard({ type: "shape", data: shape });
          } else if (selectedMarkerId) {
            const marker = markers.find((m) => m.id === selectedMarkerId);
            if (marker) setInternalClipboard({ type: "marker", data: marker });
          } else if (selectedSymbolId) {
            const sym = symbols.find((s) => s.id === selectedSymbolId);
            if (sym) setInternalClipboard({ type: "symbol", data: sym });
          }
          onCopy?.();
        }
        return;
      }

      // Ctrl+V → paste
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (!isInputFocused() && internalClipboard) {
          const offset = 20;
          if (internalClipboard.type === "shape") {
            const s = internalClipboard.data as CanvasShape;
            onShapesChange([...shapes, { ...s, id: generateId(), x: s.x + offset, y: s.y + offset }]);
          } else if (internalClipboard.type === "marker") {
            const m = internalClipboard.data as CanvasMarker;
            onMarkersChange([...markers, { ...m, id: generateId(), x: m.x + offset, y: m.y + offset }]);
          } else if (internalClipboard.type === "symbol") {
            const sym = internalClipboard.data as CanvasSymbol;
            onSymbolsChange([...symbols, { ...sym, id: generateId(), x: sym.x + offset, y: sym.y + offset }]);
          }
          onPaste?.();
        }
        return;
      }

      // Single key shortcuts (not when typing)
      if (!isInputFocused() && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "v") {
          e.preventDefault();
          onToolChange?.("select");
          return;
        }
        if (e.key === "m") {
          e.preventDefault();
          onToolChange?.("pan");
          return;
        }
        if (e.key === "t") {
          e.preventDefault();
          onToolChange?.("text");
          return;
        }
      }

      // Delete / Backspace → delete selected element
      if (e.key === "Delete" || e.key === "Backspace") {
        if (isInputFocused()) return;
        if (onDeleteSelected) {
          onDeleteSelected();
        } else {
          if (selectedShapeId) {
            onShapesChange(shapes.filter((s) => s.id !== selectedShapeId));
            onSelectShape(null);
          } else if (selectedMarkerId) {
            onMarkersChange(markers.filter((m) => m.id !== selectedMarkerId));
            onSelectMarker(null);
          } else if (selectedSymbolId) {
            onSymbolsChange(symbols.filter((s) => s.id !== selectedSymbolId));
            onSelectSymbol(null);
          }
        }
      }

      // Escape → cancel active drawing
      if (e.key === "Escape") {
        // Finish trench-treat continuous drawing
        if (trenchStart) {
          if (trenchSegments.length > 0) {
            onMarkersChange([...markers, ...trenchSegments]);
          }
          setTrenchStart(null);
          setTrenchSegments([]);
          setDrawCurrent(null);
        }
        // Cancel polygon
        if (polygonPoints.length > 0) {
          setPolygonPoints([]);
          setDrawStart(null);
          isDrawing.current = false;
        }
        // Cancel arrow
        if (arrowStart) {
          setArrowStart(null);
          setDrawCurrent(null);
        }
        // Cancel line
        if (drawStart) {
          setDrawStart(null);
          setDrawCurrent(null);
          isDrawing.current = false;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release spacebar → restore previous tool
      if (e.code === "Space" && spacebarHeld) {
        setSpacebarHeld(false);
        if (toolBeforeSpace !== null) {
          onToolChange?.(toolBeforeSpace);
          setToolBeforeSpace(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    onUndo, onRedo, onCopy, onPaste, onDeleteSelected, onToolChange,
    selectedTool, spacebarHeld, toolBeforeSpace,
    selectedShapeId, selectedMarkerId, selectedSymbolId,
    shapes, markers, symbols,
    onShapesChange, onMarkersChange, onSymbolsChange,
    onSelectShape, onSelectMarker, onSelectSymbol,
    internalClipboard,
    trenchStart, trenchSegments,
    polygonPoints, arrowStart, drawStart,
  ]);

  // ---- Coordinate helper ----
  const getCanvasPoint = useCallback(
    (stage: Konva.Stage) => {
      const pointer = stage.getPointerPosition();
      if (!pointer) return null;
      return {
        x: (pointer.x - stagePos.x) / scale,
        y: (pointer.y - stagePos.y) / scale,
      };
    },
    [stagePos, scale]
  );

  // ---- Wheel zoom ----
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(0.1, Math.min(5, direction > 0 ? oldScale * scaleBy : oldScale / scaleBy));
    setScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, []);

  // ---- Determine if current tool is a placement tool ----
  const isPlacementTool =
    selectedTool === "marker" ||
    selectedTool === "symbol" ||
    selectedTool === "text" ||
    selectedTool === "draw-pier" ||
    selectedTool === "draw-arrow" ||
    (selectedTool || "").startsWith("draw-");

  // ---- MouseDown ----
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;

      // Prevent drawing if multiple touches (pinch) are active
      // Konva merges mouse and touch events; detect multi-touch by inspecting native event
      const nativeEvt: any = (e as any).evt;
      if (nativeEvt && nativeEvt.touches && nativeEvt.touches.length > 1) {
        return;
      }

      const tool = selectedTool || "";

      // For placement tools, always get the canvas point regardless of click target
      // For non-placement tools (select/pan), only handle stage background clicks
      if (!isPlacementTool && e.target !== stage) return;

      const pt = getCanvasPoint(stage);
      if (!pt) return;

      if (!tool.startsWith("draw-")) return;

      const kind = tool.replace("draw-", "") as ShapeKind;

      // Arrow tool — two-click (fix #3: always place regardless of click target)
      if (kind === "arrow") {
        if (!arrowStart) {
          setArrowStart(pt);
          setDrawCurrent(pt);
          isDrawing.current = true;
        } else {
          // Complete arrow
          const newShape: CanvasShape = {
            id: generateId(),
            kind: "arrow",
            x: arrowStart.x,
            y: arrowStart.y,
            width: 0,
            height: 0,
            rotation: 0,
            label: drawingLabel,
            stroke: "#CC2200",
            fill: "transparent",
            arrowColor: "#CC2200",
            arrowText: drawingLabel || undefined,
            points: [0, 0, pt.x - arrowStart.x, pt.y - arrowStart.y],
            // Pointer arrows live in the notes layer so they can be toggled separately
            layer: 'notes',
          };
          onShapesChange([...shapes, newShape]);
          setArrowStart(null);
          setDrawCurrent(null);
          isDrawing.current = false;
        }
        return;
      }

      // Pier tool — single click (fix #1: always place regardless of click target)
      if (kind === "pier") {
        const newShape: CanvasShape = {
          id: generateId(),
          kind: "pier",
          x: pt.x - 4,
          y: pt.y - 4,
          width: 8,
          height: 8,
          rotation: 0,
          label: "",
          stroke: "#555",
          fill: "#888",
          layer: 'structures',
        };
        onShapesChange([...shapes, newShape]);
        return;
      }

      isDrawing.current = true;

      if (kind === "freehand") {
        setFreehandPoints([pt.x, pt.y]);
        setDrawStart(pt);
      } else if (kind === "polygon") {
        if (polygonPoints.length === 0) {
          setPolygonPoints([pt.x, pt.y]);
          setDrawStart(pt);
        } else {
          setPolygonPoints((prev) => [...prev, pt.x, pt.y]);
        }
      } else if (kind === "line") {
        if (!drawStart) {
          setDrawStart(pt);
          setDrawCurrent(pt);
        } else {
          const newShape: CanvasShape = {
            id: generateId(),
            kind: "line",
            x: 0, y: 0, width: 0, height: 0, rotation: 0,
            label: drawingLabel,
            stroke: "#444",
            fill: "transparent",
            points: [drawStart.x, drawStart.y, pt.x, pt.y],
            layer: 'structures',
          };
          onShapesChange([...shapes, newShape]);
          setDrawStart(null);
          setDrawCurrent(null);
          isDrawing.current = false;
        }
      } else {
        // rectangle / square
        setDrawStart(pt);
        setDrawCurrent(pt);
        const id = generateId();
        setDrawingShape({
          id,
          kind,
          x: pt.x,
          y: pt.y,
          width: 0,
          height: 0,
          rotation: 0,
          label: drawingLabel,
          stroke: "#444",
          fill: fillColor || "rgba(200,200,190,0.25)",
          layer: 'structures',
        });
      }
    },
    [
      selectedTool, isPlacementTool, getCanvasPoint, shapes, onShapesChange,
      drawStart, polygonPoints, arrowStart, drawingLabel, fillColor,
    ]
  );

  // ---- MouseMove ----
  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      const pt = getCanvasPoint(stage);
      if (!pt) return;

      // Track current point for previews (arrow start, line start, trench, etc.)
      if (arrowStart || (drawStart && selectedTool === "draw-line") || trenchStart) {
        setDrawCurrent(pt);
      }

      if (!isDrawing.current) return;
      if (!drawStart && !arrowStart) return;

      const tool = selectedTool || "";
      const kind = tool.replace("draw-", "") as ShapeKind;

      if (kind === "freehand") {
        setFreehandPoints((prev) => [...prev, pt.x, pt.y]);
      } else if (kind === "rectangle" || kind === "square") {
        if (!drawStart) return;
        let w = pt.x - drawStart.x;
        let h = pt.y - drawStart.y;
        if (kind === "square") {
          const side = Math.max(Math.abs(w), Math.abs(h));
          w = Math.sign(w) * side;
          h = Math.sign(h) * side;
        }
        const { x, y, width, height } = normRect(
          drawStart.x, drawStart.y,
          drawStart.x + w, drawStart.y + h
        );
        setDrawingShape((prev) =>
          prev ? { ...prev, x, y, width, height } : null
        );
        setDrawCurrent(pt);
      } else if (kind === "line") {
        setDrawCurrent(pt);
      } else if (kind === "arrow") {
        setDrawCurrent(pt);
      }
    },
    [getCanvasPoint, drawStart, arrowStart, trenchStart, selectedTool]
  );

  /**
   * TouchMove handler to support pinch-to-zoom on touch devices.
   * When two fingers are on the screen, compute pinch distance and adjust stage scale/position.
   * Otherwise, delegate to normal mouse move handler for drawing interactions.
   */
  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const evt = e.evt as any;
    // Multi-touch pinch
    if (evt.touches && evt.touches.length === 2) {
      e.evt.preventDefault();
      const t1 = evt.touches[0];
      const t2 = evt.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (pinchInitialDistance.current === null) {
        pinchInitialDistance.current = dist;
        pinchInitialScale.current = scale;
        return;
      }
      const ratio = dist / pinchInitialDistance.current;
      let newScale = pinchInitialScale.current * ratio;
      newScale = Math.max(0.1, Math.min(5, newScale));
      // Determine midpoint of touches relative to canvas container
      const centerClientX = (t1.clientX + t2.clientX) / 2;
      const centerClientY = (t1.clientY + t2.clientY) / 2;
      let containerRect: DOMRect | undefined;
      if (containerRef.current) {
        containerRect = containerRef.current.getBoundingClientRect();
      }
      const canvasX = centerClientX - (containerRect?.left || 0);
      const canvasY = centerClientY - (containerRect?.top || 0);
      // Convert to world coordinates using current stage scale/pos
      const worldX = (canvasX - stagePos.x) / scale;
      const worldY = (canvasY - stagePos.y) / scale;
      setScale(newScale);
      setStagePos({
        x: canvasX - worldX * newScale,
        y: canvasY - worldY * newScale,
      });
    } else {
      // Reset pinch state when not pinching
      pinchInitialDistance.current = null;
      pinchInitialScale.current = scale;
      // Delegate to regular mouse/touch move handler for drawing
      handleMouseMove(e as unknown as Konva.KonvaEventObject<MouseEvent | TouchEvent>);
    }
  }, [scale, stagePos, handleMouseMove]);

  // ---- MouseUp ----
  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current) return;
    const tool = selectedTool || "";
    const kind = tool.replace("draw-", "") as ShapeKind;

    if (kind === "freehand" && freehandPoints.length > 4) {
      const newShape: CanvasShape = {
        id: generateId(),
        kind: "freehand",
        x: 0, y: 0, width: 0, height: 0, rotation: 0,
        label: drawingLabel,
        stroke: "#444",
        fill: "transparent",
        points: [...freehandPoints],
        layer: 'structures',
      };
      onShapesChange([...shapes, newShape]);
      setFreehandPoints([]);
      setDrawStart(null);
      setDrawCurrent(null);
      isDrawing.current = false;
    } else if ((kind === "rectangle" || kind === "square") && drawingShape && drawingShape.width > 5) {
      onShapesChange([...shapes, drawingShape]);
      setDrawingShape(null);
      setDrawStart(null);
      setDrawCurrent(null);
      isDrawing.current = false;
    } else if (kind !== "polygon" && kind !== "line" && kind !== "arrow" && kind !== "pier") {
      setDrawingShape(null);
      setDrawStart(null);
      setDrawCurrent(null);
      isDrawing.current = false;
    }
  }, [selectedTool, freehandPoints, drawingShape, shapes, onShapesChange, drawingLabel]);

  // ---- Double-click: close polygon / finish trench-treat ----
  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Close polygon
      if (selectedTool === "draw-polygon" && polygonPoints.length >= 6) {
        const newShape: CanvasShape = {
          id: generateId(),
          kind: "polygon",
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          rotation: 0,
          label: drawingLabel,
          stroke: "#444",
          fill: fillColor || "rgba(200,200,190,0.25)",
          points: [...polygonPoints],
          closed: true,
          layer: 'structures',
        };
        onShapesChange([...shapes, newShape]);
        setPolygonPoints([]);
        setDrawStart(null);
        isDrawing.current = false;
      }

      // Finish continuous trench-treat drawing
      if (
        selectedTool === "marker" &&
        selectedMarkerType === "trench-treat" &&
        trenchStart
      ) {
        if (trenchSegments.length > 0) {
          onMarkersChange([...markers, ...trenchSegments]);
        }
        setTrenchStart(null);
        setTrenchSegments([]);
        setDrawCurrent(null);
      }
    },
    [
      selectedTool, selectedMarkerType, polygonPoints, shapes, onShapesChange,
      drawingLabel, fillColor, trenchStart, trenchSegments, markers, onMarkersChange,
    ]
  );

  // ---- Stage click: markers / symbols / text / trench-treat / deselect ----
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      const pt = getCanvasPoint(stage);
      if (!pt) return;

      // Only deselect when clicking stage background (not on top of shapes)
      if (e.target === stage) {
        onSelectShape(null);
        onSelectMarker(null);
        onSelectSymbol(null);
        onSelectAnnotation?.(null);
      }

      // ---- Trench-treat continuous two-click mode (fix #11) ----
      if (selectedTool === "marker" && selectedMarkerType === "trench-treat") {
        if (!trenchStart) {
          // First click: start first segment
          setTrenchStart(pt);
          setDrawCurrent(pt);
        } else {
          // Second click: complete segment, start next from end point
          const cfg = MARKER_CONFIG["trench-treat"];
          const newMarker: CanvasMarker = {
            id: generateId(),
            type: "trench-treat",
            x: trenchStart.x,
            y: trenchStart.y,
            label: cfg.abbr,
            details: `${pt.x},${pt.y}`,
            layer: (cfg.layer as LayerName) || 'treatments',
          };
          // Accumulate segments (commit on double-click or Escape)
          setTrenchSegments((prev) => [...prev, newMarker]);
          // Automatically start next segment from end point
          setTrenchStart(pt);
          setDrawCurrent(pt);
        }
        return;
      }

      // ---- Marker placement (fix #1: always place regardless of click target) ----
      if (selectedTool === "marker" && selectedMarkerType && selectedMarkerType !== "trench-treat") {
        const cfg = MARKER_CONFIG[selectedMarkerType];
        const newId = generateId();
        // Determine target layer: use explicit layer on config if defined,
        // otherwise derive from category (findings → findings, treatments → treatments, devices → devices)
        const derivedLayer: LayerName =
          (cfg.layer as LayerName) ||
          (cfg.category === "Finding"
            ? "findings"
            : cfg.category === "Treatment"
            ? "treatments"
            : cfg.category === "Device"
            ? "devices"
            : "notes");
        const newMarker: CanvasMarker = {
          id: newId,
          type: selectedMarkerType,
          x: pt.x,
          y: pt.y,
          label: cfg.abbr,
          layer: derivedLayer,
        };
        onMarkersChange([...markers, newMarker]);
        // If moisture marker → prompt for reading
        if (selectedMarkerType === "moisture") {
          onMoisturePrompt(newId);
        }
        return;
      }

      // ---- Symbol placement (fix #1: always place regardless of click target) ----
      if (selectedTool === "symbol" && selectedSymbolType) {
        onSymbolsChange([
          ...symbols,
          {
            id: generateId(),
            type: selectedSymbolType,
            x: pt.x,
            y: pt.y,
            rotation: 0,
            customLabel: selectedSymbolType === "custom-symbol" ? customSymbolLabel : undefined,
            layer: 'structures',
          },
        ]);
        return;
      }

      // ---- Text annotation placement (fix #7: prompt first, no default "Note") ----
      if (selectedTool === "text") {
        const placePt = { ...pt };
        safePrompt("Enter text:", "").then((userText) => {
          if (!userText || !userText.trim()) return;
          onAnnotationsChange([
            ...annotations,
            {
              id: generateId(),
              x: placePt.x,
              y: placePt.y,
              text: userText.trim(),
              fontSize: textSize,
              color: textColor,
              layer: 'notes',
            },
          ]);
        });
      }
    },
    [
      selectedTool, selectedMarkerType, selectedSymbolType,
      markers, symbols, annotations,
      onMarkersChange, onSymbolsChange, onAnnotationsChange,
      getCanvasPoint, onSelectShape, onSelectMarker, onSelectSymbol, onSelectAnnotation,
      trenchStart, trenchSegments, onMoisturePrompt, customSymbolLabel,
      textColor, textSize, safePrompt,
    ]
  );

  // ---- Shape drag ----
  const handleShapeDragEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
      onShapesChange(
        shapes.map((s) => s.id === id ? { ...s, x: e.target.x(), y: e.target.y() } : s)
      );
    },
    [shapes, onShapesChange]
  );

  // ---- Floating edit popup: calculate screen position for selected element ----
  const getPopupPosition = useCallback((): { x: number; y: number } | null => {
    if (!stageRef.current) return null;

    let elemX = 0, elemY = 0;

    if (selectedShapeId) {
      const shape = shapes.find((s) => s.id === selectedShapeId);
      if (!shape) return null;
      elemX = shape.x;
      elemY = shape.y;
    } else if (selectedMarkerId) {
      const marker = markers.find((m) => m.id === selectedMarkerId);
      if (!marker) return null;
      elemX = marker.x;
      elemY = marker.y;
    } else if (selectedSymbolId) {
      const sym = symbols.find((s) => s.id === selectedSymbolId);
      if (!sym) return null;
      elemX = sym.x;
      elemY = sym.y;
    } else if (selectedAnnotationId) {
      const ann = annotations.find((a) => a.id === selectedAnnotationId);
      if (!ann) return null;
      elemX = ann.x;
      elemY = ann.y;
    } else {
      return null;
    }

    // Convert canvas coordinates to screen coordinates
    const transform = stageRef.current.getAbsoluteTransform();
    const screen = transform.point({ x: elemX, y: elemY });
    return {
      x: screen.x + 16,
      y: Math.max(4, screen.y - 44),
    };
  }, [
    selectedShapeId, selectedMarkerId, selectedSymbolId, selectedAnnotationId,
    shapes, markers, symbols, annotations, stageRef,
  ]);

  // ---- Floating popup handlers ----
  const handlePopupSizeIncrease = useCallback(() => {
    if (selectedShapeId) {
      onShapesChange(shapes.map((s) => {
        if (s.id !== selectedShapeId) return s;
        const factor = 1.1;
        return { ...s, width: s.width * factor, height: s.height * factor };
      }));
    } else if (selectedMarkerId) {
      onMarkersChange(markers.map((m) => {
        if (m.id !== selectedMarkerId) return m;
        return { ...m, size: (m.size || 10) + 2 };
      }));
    } else if (selectedSymbolId) {
      onSymbolsChange(symbols.map((s) => {
        if (s.id !== selectedSymbolId) return s;
        return { ...s, size: ((s as any).size || 1.0) + 0.1 };
      }));
    }
  }, [selectedShapeId, selectedMarkerId, selectedSymbolId, shapes, markers, symbols, onShapesChange, onMarkersChange, onSymbolsChange]);

  const handlePopupSizeDecrease = useCallback(() => {
    if (selectedShapeId) {
      onShapesChange(shapes.map((s) => {
        if (s.id !== selectedShapeId) return s;
        const factor = 0.9;
        return { ...s, width: Math.max(8, s.width * factor), height: Math.max(8, s.height * factor) };
      }));
    } else if (selectedMarkerId) {
      onMarkersChange(markers.map((m) => {
        if (m.id !== selectedMarkerId) return m;
        return { ...m, size: Math.max(4, (m.size || 10) - 2) };
      }));
    } else if (selectedSymbolId) {
      onSymbolsChange(symbols.map((s) => {
        if (s.id !== selectedSymbolId) return s;
        return { ...s, size: Math.max(0.2, ((s as any).size || 1.0) - 0.1) };
      }));
    }
  }, [selectedShapeId, selectedMarkerId, selectedSymbolId, shapes, markers, symbols, onShapesChange, onMarkersChange, onSymbolsChange]);

  const getPopupRotation = (): number => {
    if (selectedShapeId) {
      const shape = shapes.find((s) => s.id === selectedShapeId);
      return shape?.rotation || 0;
    }
    if (selectedSymbolId) {
      const sym = symbols.find((s) => s.id === selectedSymbolId);
      return sym?.rotation || 0;
    }
    return 0;
  };

  const handlePopupRotationChange = useCallback((deg: number) => {
    if (selectedShapeId) {
      onShapesChange(shapes.map((s) => s.id === selectedShapeId ? { ...s, rotation: deg } : s));
    } else if (selectedSymbolId) {
      onSymbolsChange(symbols.map((s) => s.id === selectedSymbolId ? { ...s, rotation: deg } : s));
    }
  }, [selectedShapeId, selectedSymbolId, shapes, symbols, onShapesChange, onSymbolsChange]);

  const getPopupColor = (): string => {
    if (selectedShapeId) {
      const shape = shapes.find((s) => s.id === selectedShapeId);
      return shape?.fill || "#ffffff";
    }
    if (selectedAnnotationId) {
      const ann = annotations.find((a) => a.id === selectedAnnotationId);
      return ann?.color || "#000000";
    }
    return "#000000";
  };

  const handlePopupColorChange = useCallback((color: string) => {
    if (selectedShapeId) {
      onShapesChange(shapes.map((s) => s.id === selectedShapeId ? { ...s, fill: color } : s));
    } else if (selectedAnnotationId) {
      onAnnotationsChange(annotations.map((a) => a.id === selectedAnnotationId ? { ...a, color } : a));
    }
  }, [selectedShapeId, selectedAnnotationId, shapes, annotations, onShapesChange, onAnnotationsChange]);

  const handlePopupDelete = useCallback(() => {
    if (selectedShapeId) {
      onShapesChange(shapes.filter((s) => s.id !== selectedShapeId));
      onSelectShape(null);
    } else if (selectedMarkerId) {
      onMarkersChange(markers.filter((m) => m.id !== selectedMarkerId));
      onSelectMarker(null);
    } else if (selectedSymbolId) {
      onSymbolsChange(symbols.filter((s) => s.id !== selectedSymbolId));
      onSelectSymbol(null);
    } else if (selectedAnnotationId) {
      onAnnotationsChange(annotations.filter((a) => a.id !== selectedAnnotationId));
      onSelectAnnotation?.(null);
    }
  }, [
    selectedShapeId, selectedMarkerId, selectedSymbolId, selectedAnnotationId,
    shapes, markers, symbols, annotations,
    onShapesChange, onMarkersChange, onSymbolsChange, onAnnotationsChange,
    onSelectShape, onSelectMarker, onSelectSymbol, onSelectAnnotation,
  ]);

  const handlePopupCopy = useCallback(() => {
    const offset = 20;
    if (selectedShapeId) {
      const shape = shapes.find((s) => s.id === selectedShapeId);
      if (shape) {
        onShapesChange([...shapes, { ...shape, id: generateId(), x: shape.x + offset, y: shape.y + offset }]);
      }
    } else if (selectedMarkerId) {
      const marker = markers.find((m) => m.id === selectedMarkerId);
      if (marker) {
        onMarkersChange([...markers, { ...marker, id: generateId(), x: marker.x + offset, y: marker.y + offset }]);
      }
    } else if (selectedSymbolId) {
      const sym = symbols.find((s) => s.id === selectedSymbolId);
      if (sym) {
        onSymbolsChange([...symbols, { ...sym, id: generateId(), x: sym.x + offset, y: sym.y + offset }]);
      }
    }
    onCopy?.();
  }, [
    selectedShapeId, selectedMarkerId, selectedSymbolId,
    shapes, markers, symbols,
    onShapesChange, onMarkersChange, onSymbolsChange, onCopy,
  ]);

  // ---- Dimension labels on rect/square (placed shapes) ----
  const renderDimensions = (shape: CanvasShape) => {
    if (shape.kind !== "rectangle" && shape.kind !== "square") return null;
    if (shape.width < 30) return null;
    const wLabel = pxToFt(shape.width, ftPerGrid);
    const hLabel = pxToFt(shape.height, ftPerGrid);
    return (
      <>
        <Text
          text={wLabel} x={0} y={-14}
          width={shape.width} align="center"
          fontSize={10} fill="#666" fontStyle="bold" listening={false}
        />
        <Text
          text={hLabel} x={shape.width + 4} y={shape.height / 2 - 6}
          fontSize={10} fill="#666" fontStyle="bold" listening={false}
        />
      </>
    );
  };

  // ---- Line length label ----
  const renderLineDimension = (shape: CanvasShape) => {
    if (!shape.points || shape.points.length < 4) return null;
    const [x1, y1, x2, y2] = shape.points;
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const label = pxToFt(len, ftPerGrid);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    return (
      <Text
        text={label} x={mx + 4} y={my - 12}
        fontSize={10} fill="#666" fontStyle="bold" listening={false}
      />
    );
  };

  // ---- Cursor style ----
  const getCursor = () => {
    if (selectedTool === "pan" || spacebarHeld) return "grab";
    if (isPlacementTool) return "crosshair";
    if (selectedTool === "select") return "default";
    return "default";
  };

  // ============================
  // Grid rendering
  // ============================
  const renderGrid = () => {
    const gs = GRID_SIZE;
    const lines: React.ReactElement[] = [];
    const w = stageSize.width / scale + Math.abs(stagePos.x / scale) + 1200;
    const h = stageSize.height / scale + Math.abs(stagePos.y / scale) + 1200;
    const sx = -Math.abs(stagePos.x / scale) - 600;
    const sy = -Math.abs(stagePos.y / scale) - 600;
    for (let i = Math.floor(sx / gs) * gs; i < sx + w; i += gs) {
      lines.push(
        <Line key={`v${i}`} points={[i, sy, i, sy + h]} stroke="#e0e0e0" strokeWidth={0.5} />
      );
    }
    for (let j = Math.floor(sy / gs) * gs; j < sy + h; j += gs) {
      lines.push(
        <Line key={`h${j}`} points={[sx, j, sx + w, j]} stroke="#e0e0e0" strokeWidth={0.5} />
      );
    }
    return lines;
  };

  // ============================
  // Render a single placed shape
  // ============================
  const renderShape = (shape: CanvasShape) => {
    const isSel = selectedShapeId === shape.id;
    const canDrag = selectedTool === "select";
    const selStroke = isSel ? "#2E7D32" : shape.stroke;
    const selSW = isSel ? 3 : 2;

    const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isPlacementTool) return;
      e.cancelBubble = true;
      onSelectShape(shape.id);
      onSelectMarker(null);
      onSelectSymbol(null);
      onSelectAnnotation?.(null);
    };
    const handleTap = (e: Konva.KonvaEventObject<Event>) => {
      if (isPlacementTool) return;
      e.cancelBubble = true;
      onSelectShape(shape.id);
      onSelectMarker(null);
      onSelectSymbol(null);
      onSelectAnnotation?.(null);
    };
    const handleShapeDblClick = () => {
      if (selectedTool !== "select") return;
      if (shape.kind === "rectangle" || shape.kind === "square") {
        safePrompt("Edit label:", shape.label || "").then((newLabel) => {
          if (newLabel !== null) {
            onShapesChange(shapes.map((s) => s.id === shape.id ? { ...s, label: newLabel } : s));
          }
        });
      }
    };

    if (shape.kind === "line" && shape.points) {
      const [x1, y1, x2, y2] = shape.points;
      return (
        <Group key={shape.id}>
          <Line
            points={shape.points}
            stroke={selStroke}
            strokeWidth={selSW}
            hitStrokeWidth={12}
            draggable={canDrag}
            onDragEnd={(e) => {
              const dx = e.target.x();
              const dy = e.target.y();
              e.target.x(0);
              e.target.y(0);
              const shifted = shape.points!.map((v, i) => i % 2 === 0 ? v + dx : v + dy);
              onShapesChange(shapes.map((s) => s.id === shape.id ? { ...s, points: shifted } : s));
            }}
            onClick={handleClick}
            onTap={handleTap}
          />
          {renderLineDimension(shape)}

          {/* Line endpoint handles (fix #10) */}
          {isSel && canDrag && (
            <>
              {/* Start endpoint */}
              <Circle
                x={x1} y={y1}
                radius={6}
                fill="#2E7D32"
                stroke="#fff"
                strokeWidth={2}
                draggable
                onDragMove={(e) => {
                  const nx = e.target.x();
                  const ny = e.target.y();
                  const newPoints = [nx, ny, shape.points![2], shape.points![3]];
                  onShapesChange(shapes.map((s) => s.id === shape.id ? { ...s, points: newPoints } : s));
                  e.target.x(nx);
                  e.target.y(ny);
                }}
                onDragEnd={(e) => {
                  const nx = e.target.x();
                  const ny = e.target.y();
                  const newPoints = [nx, ny, shape.points![2], shape.points![3]];
                  onShapesChange(shapes.map((s) => s.id === shape.id ? { ...s, points: newPoints } : s));
                }}
              />
              {/* End endpoint */}
              <Circle
                x={x2} y={y2}
                radius={6}
                fill="#2E7D32"
                stroke="#fff"
                strokeWidth={2}
                draggable
                onDragMove={(e) => {
                  const nx = e.target.x();
                  const ny = e.target.y();
                  const newPoints = [shape.points![0], shape.points![1], nx, ny];
                  onShapesChange(shapes.map((s) => s.id === shape.id ? { ...s, points: newPoints } : s));
                  e.target.x(nx);
                  e.target.y(ny);
                }}
                onDragEnd={(e) => {
                  const nx = e.target.x();
                  const ny = e.target.y();
                  const newPoints = [shape.points![0], shape.points![1], nx, ny];
                  onShapesChange(shapes.map((s) => s.id === shape.id ? { ...s, points: newPoints } : s));
                }}
              />
            </>
          )}
        </Group>
      );
    }

    if (shape.kind === "freehand" && shape.points) {
      return (
        <Line
          key={shape.id}
          points={shape.points}
          stroke={selStroke}
          strokeWidth={selSW}
          tension={0.3}
          hitStrokeWidth={12}
          draggable={canDrag}
          onDragEnd={(e) => {
            const dx = e.target.x();
            const dy = e.target.y();
            e.target.x(0);
            e.target.y(0);
            const shifted = shape.points!.map((v, i) => i % 2 === 0 ? v + dx : v + dy);
            onShapesChange(shapes.map((s) => s.id === shape.id ? { ...s, points: shifted } : s));
          }}
          onClick={handleClick}
          onTap={handleTap}
        />
      );
    }

    if (shape.kind === "polygon" && shape.points) {
      // Polygon label at centroid (fix #8)
      const centroid = shape.points.length >= 4 ? polygonCentroid(shape.points) : null;
      return (
        <Group key={shape.id}>
          <Line
            points={shape.points}
            stroke={selStroke}
            fill={shape.fill}
            closed={shape.closed}
            strokeWidth={selSW}
            hitStrokeWidth={12}
            draggable={canDrag}
            onDragEnd={(e) => {
              const dx = e.target.x();
              const dy = e.target.y();
              e.target.x(0);
              e.target.y(0);
              const shifted = shape.points!.map((v, i) => i % 2 === 0 ? v + dx : v + dy);
              onShapesChange(shapes.map((s) => s.id === shape.id ? { ...s, points: shifted } : s));
            }}
            onClick={handleClick}
            onTap={handleTap}
          />
          {/* Polygon centroid label */}
          {shape.label && centroid && (
            <Text
              text={shape.label}
              x={centroid.x}
              y={centroid.y}
              offsetX={40}
              offsetY={7}
              width={80}
              align="center"
              fontSize={12}
              fill="#444"
              fontStyle="bold"
              listening={false}
            />
          )}
        </Group>
      );
    }

    if (shape.kind === "arrow" && shape.points) {
      const [x1, y1, x2, y2] = shape.points;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      // Calculate angle for text rotation (fix #3)
      const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      return (
        <Group
          key={shape.id}
          x={shape.x} y={shape.y}
          draggable={canDrag}
          onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
          onClick={handleClick}
          onTap={handleTap}
        >
          <Line
            points={shape.points}
            stroke={isSel ? "#2E7D32" : (shape.arrowColor || "#CC2200")}
            strokeWidth={selSW}
            pointerLength={10}
            pointerWidth={8}
          />
          {shape.arrowText && (
            <Text
              text={shape.arrowText}
              x={mx}
              y={my}
              offsetX={30}
              offsetY={12}
              width={60}
              align="center"
              fontSize={10}
              fill={shape.arrowColor || "#CC2200"}
              fontStyle="bold"
              rotation={angle}
              listening={false}
            />
          )}
        </Group>
      );
    }

    if (shape.kind === "pier") {
      return (
        <Rect
          key={shape.id}
          x={shape.x} y={shape.y}
          width={8} height={8}
          fill="#888"
          stroke={isSel ? "#2E7D32" : "#555"}
          strokeWidth={isSel ? 2 : 1}
          draggable={canDrag}
          onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
          onClick={handleClick}
          onTap={handleTap}
        />
      );
    }

    // Rectangle / Square (default)
    return (
      <Group
        key={shape.id}
        x={shape.x} y={shape.y}
        rotation={shape.rotation}
        draggable={canDrag}
        onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
        onClick={handleClick}
        onTap={handleTap}
        onDblClick={handleShapeDblClick}
      >
        <Rect
          width={shape.width}
          height={shape.height}
          fill={shape.fill}
          stroke={selStroke}
          strokeWidth={selSW}
        />
        {shape.label && (
          <Text
            text={shape.label}
            fontSize={12}
            fill="#444"
            fontStyle="bold"
            width={shape.width}
            height={shape.height}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        )}
        {renderDimensions(shape)}
      </Group>
    );
  };

  // ============================
  // Drawing preview dim labels (real-time during draw)
  // ============================
  const renderDrawingDimLabels = () => {
    if (!drawingShape || !drawCurrent) return null;
    const { x, y, width, height } = drawingShape;
    if (width < 10) return null;
    return (
      <>
        <Text
          text={pxToFt(width, ftPerGrid)}
          x={x} y={y - 14}
          width={width} align="center"
          fontSize={10} fill="#2E7D32" fontStyle="bold" listening={false}
        />
        <Text
          text={pxToFt(height, ftPerGrid)}
          x={x + width + 4} y={y + height / 2 - 6}
          fontSize={10} fill="#2E7D32" fontStyle="bold" listening={false}
        />
      </>
    );
  };

  // ---- Determine if floating popup should show ----
  const hasSelection = !!(selectedShapeId || selectedMarkerId || selectedSymbolId || selectedAnnotationId);
  const popupPosition = hasSelection ? getPopupPosition() : null;

  // ============================
  // JSX
  // ============================
  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white dark:bg-[hsl(150,8%,11%)] relative overflow-hidden"
      data-testid="canvas-container"
      style={{ cursor: getCursor() }}
    >
      {/* Zoom indicator */}
      <div className="absolute top-2 right-2 z-10 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded select-none">
        {Math.round(scale * 100)}%
      </div>

      {/* Trench-treat in-progress indicator */}
      {trenchStart && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-xs bg-yellow-100 text-yellow-800 border border-yellow-300 px-3 py-1 rounded select-none">
          Click next point · Double-click or Esc to finish ({trenchSegments.length} segment{trenchSegments.length !== 1 ? "s" : ""})
        </div>
      )}

      {/* Arrow in-progress indicator */}
      {arrowStart && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded select-none">
          Click end point to complete arrow
        </div>
      )}

      {/* Floating edit popup (fix #6) */}
      <FloatingEditPopup
        position={popupPosition}
        onSizeIncrease={handlePopupSizeIncrease}
        onSizeDecrease={handlePopupSizeDecrease}
        onRotationChange={handlePopupRotationChange}
        currentRotation={getPopupRotation()}
        onColorChange={handlePopupColorChange}
        currentColor={getPopupColor()}
        onDelete={handlePopupDelete}
        onCopy={handlePopupCopy}
      />

      <Stage
        ref={stageRef as any}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={selectedTool === "pan" || spacebarHeld}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick as any}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        onDblClick={handleDblClick}
        onDragEnd={(e) => {
          if (e.target === (e.target.getStage() as any)) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        {/* ---- Grid ---- */}
        <Layer listening={false}>
          {renderGrid()}
        </Layer>

        {/* ---- Shapes ---- */}
        <Layer>
          {visibleShapes.map((shape) => renderShape(shape))}

          {/* Rectangle/square drawing preview */}
          {drawingShape && (
            <>
              <Rect
                x={drawingShape.x}
                y={drawingShape.y}
                width={drawingShape.width}
                height={drawingShape.height}
                fill="rgba(46,125,50,0.08)"
                stroke="#2E7D32"
                strokeWidth={1.5}
                dash={[6, 3]}
                listening={false}
              />
              {renderDrawingDimLabels()}
            </>
          )}

          {/* Freehand preview */}
          {freehandPoints.length > 2 && (
            <Line
              points={freehandPoints}
              stroke="#2E7D32"
              strokeWidth={2}
              tension={0.3}
              listening={false}
            />
          )}

          {/* Polygon preview */}
          {polygonPoints.length >= 2 && (
            <Line
              points={polygonPoints}
              stroke="#2E7D32"
              strokeWidth={2}
              dash={[6, 3]}
              listening={false}
            />
          )}

          {/* Line preview: dot at start + live line */}
          {selectedTool === "draw-line" && drawStart && (
            <>
              <Circle x={drawStart.x} y={drawStart.y} radius={4} fill="#2E7D32" listening={false} />
              {drawCurrent && (
                <Line
                  points={[drawStart.x, drawStart.y, drawCurrent.x, drawCurrent.y]}
                  stroke="#2E7D32"
                  strokeWidth={1.5}
                  dash={[5, 4]}
                  listening={false}
                />
              )}
            </>
          )}

          {/* Arrow preview */}
          {selectedTool === "draw-arrow" && arrowStart && drawCurrent && (
            <Line
              points={[arrowStart.x, arrowStart.y, drawCurrent.x, drawCurrent.y]}
              stroke="#CC2200"
              strokeWidth={2}
              dash={[5, 4]}
              pointerLength={10}
              pointerWidth={8}
              listening={false}
            />
          )}

          {/* Trench-treat preview (live segment from last point to cursor) */}
          {trenchStart && drawCurrent && selectedTool === "marker" && (
            <Line
              points={[trenchStart.x, trenchStart.y, drawCurrent.x, drawCurrent.y]}
              stroke="#D4A017"
              strokeWidth={3}
              dash={[8, 4]}
              listening={false}
            />
          )}

          {/* Trench-treat: render accumulated segments as preview */}
          {trenchSegments.map((seg) => {
            let dx = 40, dy = 0;
            if (seg.details) {
              const parts = seg.details.split(",");
              if (parts.length === 2) {
                dx = parseFloat(parts[0]) - seg.x;
                dy = parseFloat(parts[1]) - seg.y;
              }
            }
            return (
              <Line
                key={seg.id}
                points={[seg.x, seg.y, seg.x + dx, seg.y + dy]}
                stroke="#D4A017"
                strokeWidth={3}
                dash={[8, 4]}
                opacity={0.7}
                listening={false}
              />
            );
          })}
        </Layer>

        {/* ---- Photos ---- */}
        {showPhotos && (
          <Layer>
            {visiblePhotos.map((photo, idx) => (
              <PhotoPin
                key={photo.id}
                photo={photo}
                index={idx}
                canDrag={selectedTool === "select"}
                onDragEnd={(x, y) =>
                  onPhotosChange(photos.map((p) => p.id === photo.id ? { ...p, x, y } : p))
                }
              />
            ))}
          </Layer>
        )}

        {/* ---- Markers ---- */}
        <Layer>
          {visibleMarkers.map((marker) => {
            const isSel = selectedMarkerId === marker.id;
            return (
              <Group
                key={marker.id}
                x={marker.x}
                y={marker.y}
                draggable={selectedTool === "select"}
                onDragEnd={(e) =>
                  onMarkersChange(
                    markers.map((m) =>
                      m.id === marker.id ? { ...m, x: e.target.x(), y: e.target.y() } : m
                    )
                  )
                }
                onClick={(e) => {
                  e.cancelBubble = true;
                  onSelectMarker(marker.id);
                  onSelectShape(null);
                  onSelectSymbol(null);
                  onSelectAnnotation?.(null);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  onSelectMarker(marker.id);
                  onSelectShape(null);
                  onSelectSymbol(null);
                  onSelectAnnotation?.(null);
                }}
              >
                <MarkerRenderer
                  marker={marker}
                  selected={isSel}
                  onMoisturePrompt={onMoisturePrompt}
                />
              </Group>
            );
          })}
        </Layer>

        {/* ---- Symbols ---- */}
        <Layer>
          {visibleSymbols.map((sym) => {
            const isSel = selectedSymbolId === sym.id;
            return (
              <Group
                key={sym.id}
                x={sym.x}
                y={sym.y}
                rotation={sym.rotation}
                draggable={selectedTool === "select"}
                onDragEnd={(e) =>
                  onSymbolsChange(
                    symbols.map((s) =>
                      s.id === sym.id ? { ...s, x: e.target.x(), y: e.target.y() } : s
                    )
                  )
                }
                onClick={(e) => {
                  e.cancelBubble = true;
                  onSelectSymbol(sym.id);
                  onSelectShape(null);
                  onSelectMarker(null);
                  onSelectAnnotation?.(null);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  onSelectSymbol(sym.id);
                  onSelectShape(null);
                  onSelectMarker(null);
                  onSelectAnnotation?.(null);
                }}
              >
                <SymbolShape
                  type={sym.type}
                  customLabel={sym.customLabel}
                  selected={isSel}
                  size={(sym as any).size}
                />
                {/* Symbol label below */}
                {sym.label && (
                  <Text
                    text={sym.label}
                    y={20}
                    fontSize={8}
                    fill="#555"
                    align="center"
                    offsetX={20}
                    width={40}
                    listening={false}
                  />
                )}
              </Group>
            );
          })}
        </Layer>

        {/* ---- Text Annotations ---- */}
        <Layer>
          {visibleAnnotations.map((ann) => {
            const isAnnSel = selectedAnnotationId === ann.id;
            return (
              <Text
                key={ann.id}
                x={ann.x}
                y={ann.y}
                text={ann.text}
                fontSize={ann.fontSize || textSize}
                fill={ann.color || textColor}
                fontStyle="bold"
                rotation={(ann as any).rotation || 0}
                stroke={isAnnSel ? "#2E7D32" : undefined}
                strokeWidth={isAnnSel ? 0.5 : 0}
                draggable={selectedTool === "select"}
                onDragEnd={(e) =>
                  onAnnotationsChange(
                    annotations.map((a) =>
                      a.id === ann.id ? { ...a, x: e.target.x(), y: e.target.y() } : a
                    )
                  )
                }
                onClick={(e) => {
                  if (isPlacementTool) return;
                  e.cancelBubble = true;
                  onSelectShape(null);
                  onSelectMarker(null);
                  onSelectSymbol(null);
                  onSelectAnnotation?.(ann.id);
                }}
                onTap={(e) => {
                  if (isPlacementTool) return;
                  e.cancelBubble = true;
                  onSelectShape(null);
                  onSelectMarker(null);
                  onSelectSymbol(null);
                  onSelectAnnotation?.(ann.id);
                }}
                onDblClick={() => {
                  safePrompt("Edit text:", ann.text).then((newText) => {
                    if (newText !== null && newText.trim()) {
                      onAnnotationsChange(
                        annotations.map((a) =>
                          a.id === ann.id ? { ...a, text: newText.trim() } : a
                        )
                      );
                    }
                  });
                }}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
