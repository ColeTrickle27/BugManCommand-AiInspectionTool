// ============================
// Types for Termite Graph v3
// ============================

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// ------ SCALE ------
// 1 canvas pixel = SCALE_FACTOR inches.  Default: 1 px ≈ 1 inch → 100 LF ≈ 1200 px
// Users set scale via "ft per grid square" in the UI.
export const GRID_SIZE = 20; // px per grid square
export const DEFAULT_FT_PER_GRID = 2; // each grid square = 2 ft by default

// ------ SHAPES (drawing primitives) ------
export type ShapeKind = 'rectangle' | 'square' | 'line' | 'freehand' | 'polygon' | 'arrow' | 'pier';

// Each drawable element belongs to a specific layer.  These layers can be toggled
// independently to control visibility in the editor and exported report.  The
// layer system supports separating structural drawings from findings, treatments,
// devices, materials and notes.
export type LayerName =
  | 'structures'
  | 'findings'
  | 'treatments'
  | 'devices'
  | 'materials'
  | 'notes';

export interface CanvasShape {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;   // rectangle / square
  height: number;
  rotation: number;
  label: string;    // structure name the tech types in
  stroke: string;
  fill: string;
  /** Layer assignment. Defaults to 'structures' for most shape kinds. */
  layer: LayerName;
  // line-specific
  points?: number[];  // [x1,y1,x2,y2,...] relative to (x,y)
  // polygon-specific – same points format, closed
  closed?: boolean;
  // arrow-specific
  arrowColor?: string;
  arrowText?: string;
  // fill option
  isTransparentFill?: boolean;
}

export const STRUCTURE_PRESETS = [
  'House',
  'Detached Structure',
  'Barn',
  'Wood Porch',
  'Concrete Slab',
  'Dirt Filled Porch',
  'Carport',
  'Garage',
  'Sidewalk',
  'Custom',
] as const;

// ------ MARKERS (pest findings, treatment methods & devices) ------
export type MarkerType =
  // Findings
  | 'LT' | 'WDF' | 'OHB' | 'PPB' | 'ETW' | 'X' | 'MX' | 'IN-T' | 'moisture'
  // Treatments
  | 'trench-treat' | 'hollow-block' | 'sub-slab' | 'vertical-drill'
  | 'horizontal-drill' | 'interior-foam'
  // Devices
  | 'atbs-station' | 'core-station' | 'dehumidifier-device' | 'sump-pump-device';

export interface CanvasMarker {
  id: string;
  type: MarkerType;
  x: number;
  y: number;
  label: string;
  details?: string;
  /** Marker render size in px. Default: 10 */
  size?: number;
  /** Moisture meter reading as a percentage (for 'moisture' type) */
  moistureReading?: number;
  /** Derived descriptor: 'Low' | 'Optimal' | 'High' | '*HIGH*' */
  moistureDescriptor?: string;
  /** Flip directional markers (vertical-drill / horizontal-drill / arrow) */
  flipped?: boolean;
  /** Rotation in degrees (for drill arrow orientation) */
  rotation?: number;
  /** Layer assignment: findings, treatments or devices */
  layer: LayerName;
}

export type MarkerShape = 'circle' | 'square' | 'dashed-line' | 'arrow-vertical' | 'arrow-horizontal' | 'silhouette' | 'triangle' | 'droplet';

export interface MarkerDef {
  abbr: string;
  label: string;
  color: string;
  category: 'Finding' | 'Treatment' | 'Device';
  shape: MarkerShape;
  /** Derived layer name, computed from category */
  layer?: LayerName;
}

export const MARKER_CONFIG: Record<MarkerType, MarkerDef> = {
  // Findings — all red (#CC2200) except MX which is blue (#2563EB), shape: triangle
  'LT':        { abbr: 'LT',   label: 'Live Termite Infestation',          color: '#CC2200', category: 'Finding',   shape: 'triangle',    layer: 'findings' },
  'WDF':       { abbr: 'WDF',  label: 'Wood Decaying Fungus',              color: '#CC2200', category: 'Finding',   shape: 'triangle',    layer: 'findings' },
  'OHB':       { abbr: 'OHB',  label: 'Old House Borers',                  color: '#CC2200', category: 'Finding',   shape: 'triangle',    layer: 'findings' },
  'PPB':       { abbr: 'PPB',  label: 'Powderpost Beetles',                color: '#CC2200', category: 'Finding',   shape: 'triangle',    layer: 'findings' },
  'ETW':       { abbr: 'ETW',  label: 'Earth-to-Wood Contact',             color: '#CC2200', category: 'Finding',   shape: 'triangle',    layer: 'findings' },
  'X':         { abbr: 'X',    label: 'Visible Pest Damage',               color: '#CC2200', category: 'Finding',   shape: 'triangle',    layer: 'findings' },
  'MX':        { abbr: 'MX',   label: 'Visible Moisture Damage',           color: '#2563EB', category: 'Finding',   shape: 'triangle',    layer: 'findings' },
  'IN-T':      { abbr: 'IN-T', label: 'Previous / Inactive Infestation',   color: '#CC2200', category: 'Finding',   shape: 'triangle',    layer: 'findings' },
  'moisture':  { abbr: '💧',   label: 'Moisture Reading',                  color: '#2563EB', category: 'Finding',   shape: 'droplet',     layer: 'findings'  },
  // Treatments — all yellow/gold (#D4A017), shape: square by default
  'trench-treat':     { abbr: 'TT',  label: 'Trench / Treat',                color: '#D4A017', category: 'Treatment', shape: 'dashed-line',    layer: 'treatments'       },
  'hollow-block':     { abbr: 'HB',  label: 'Hollow Block Drill / Injection', color: '#D4A017', category: 'Treatment', shape: 'square',         layer: 'treatments'            },
  'sub-slab':         { abbr: 'SS',  label: 'Sub-Slab Drill / Injection',     color: '#D4A017', category: 'Treatment', shape: 'square',         layer: 'treatments'            },
  'vertical-drill':   { abbr: 'VD',  label: 'Vertical Drilling',              color: '#D4A017', category: 'Treatment', shape: 'arrow-vertical', layer: 'treatments'    },
  'horizontal-drill': { abbr: 'HD',  label: 'Horizontal Drilling',            color: '#D4A017', category: 'Treatment', shape: 'arrow-horizontal', layer: 'treatments'  },
  'interior-foam':    { abbr: 'IF',  label: 'Interior Foam',                  color: '#D4A017', category: 'Treatment', shape: 'square',         layer: 'treatments'            },
  // Devices — all render as circles
  'atbs-station':       { abbr: 'BS',  label: 'ATBS Station',      color: '#2E7D32', category: 'Device', shape: 'circle', layer: 'devices' },
  'core-station':       { abbr: 'CB',  label: 'Core Station',      color: '#1B5E20', category: 'Device', shape: 'circle', layer: 'devices' },
  'dehumidifier-device':{ abbr: 'DH',  label: 'Dehumidifier',      color: '#00838F', category: 'Device', shape: 'circle', layer: 'devices' },
  'sump-pump-device':   { abbr: 'SP',  label: 'Sump Pump',         color: '#00695C', category: 'Device', shape: 'circle', layer: 'devices' },
};

// ------ SYMBOLS (structural/environmental) ------
export type SymbolType =
  | 'bushes' | 'ac-unit' | 'crawlspace-access'
  | 'chimney' | 'electrical-wire' | 'gas-line'
  | 'brick-block-steps' | 'custom-symbol';

export interface CanvasSymbol {
  id: string;
  type: SymbolType;
  x: number;
  y: number;
  rotation: number;
  label?: string;
  /** User-provided label for custom-symbol type */
  customLabel?: string;
  /** Scale multiplier for the symbol. Default: 1.0 */
  size?: number;
  /** Layer assignment, default 'structures' */
  layer: LayerName;
}

export interface SymbolDef {
  label: string;
  abbr: string;
  color: string;
}

export const SYMBOL_CONFIG: Record<SymbolType, SymbolDef> = {
  'bushes':            { label: 'Bushes / Shrubs',     abbr: '🌿', color: '#4CAF50' },
  'ac-unit':           { label: 'AC Unit',             abbr: 'AC', color: '#2563EB' },
  'crawlspace-access': { label: 'Crawlspace Access',   abbr: 'CA', color: '#000000' },
  'chimney':           { label: 'Chimney',             abbr: 'CH', color: '#111111' },
  'electrical-wire':   { label: 'Electrical Wire',     abbr: '⚡', color: '#FFC107' },
  'gas-line':          { label: 'Gas Line',            abbr: 'GL', color: '#CC2200' },
  'brick-block-steps': { label: 'Brick / Block Steps', abbr: 'ST', color: '#8B5E3C' },
  'custom-symbol':     { label: 'Custom Symbol',       abbr: '?',  color: '#6B7280' },
};

// ------ PHOTO PINS ------
export interface CanvasPhoto {
  id: string;
  x: number;
  y: number;
  dataUrl: string;
  caption: string;
  width: number;
  height: number;
  /** Layer assignment. Photos live on the notes layer by default. */
  layer: LayerName;
}

// ------ TEXT ANNOTATIONS ------
export interface CanvasTextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  /** Rotation in degrees */
  rotation?: number;
  /** Layer assignment, default 'notes' */
  layer: LayerName;
}

// ------ FULL STATE ------
export interface CanvasState {
  shapes: CanvasShape[];
  markers: CanvasMarker[];
  symbols: CanvasSymbol[];
  photos: CanvasPhoto[];
  annotations: CanvasTextAnnotation[];
  ftPerGrid: number;
  /** Undo history — each entry is a full snapshot of the canvas state */
  undoStack?: CanvasState[];
}

// ------ FOUNDATION OPTIONS ------
export const FOUNDATION_OPTIONS = [
  'Crawlspace',
  'Slab',
  'Basement',
  'Combo',
  'Other',
] as const;

export const FOUNDATION_WALLS = [
  'Single Brick',
  'Double Brick',
  'Hollow Block',
  'Hollow Block + Brick Veneer',
] as const;

export const CRAWLSPACE_CLEARANCE = [
  'Low - Completely Inaccessible',
  'Low - Partially Inaccessible',
  'Low - Accessible Throughout',
  'Moderate/Average',
  'High - Ample Clearance',
] as const;

// ------ FINDINGS CHECKLIST ------
export const FINDINGS_CHECKLIST = [
  'Live Termite Activity',
  'Evidence of Previous / Inactive Activity',
  'Wood-Decaying Fungus',
  'Powderpost Beetles',
  'Old House Borers',
  'Moisture Damage',
  'High Moisture',
  'Structure Damage',
  'Pipe Leak',
  'Insulation in Poor Condition',
  'Insulation Missing / Fallen',
  'Crawldoor in Poor Condition',
] as const;

// ------ MOISTURE HELPER ------
/**
 * Returns a human-readable descriptor and display color for a moisture meter
 * reading (expressed as a percentage).
 *
 * <10%        → Low      (red    — abnormally dry / instrument issue)
 * 10–16%      → Optimal  (green  — normal range)
 * 17–19%      → High     (yellow — elevated, monitor)
 * ≥20%        → *HIGH*   (red   — action required)
 */
export function getMoistureDescriptor(reading: number): { text: string; color: string } {
  if (reading < 10) {
    return { text: 'Low', color: '#CC2200' };
  } else if (reading <= 16) {
    return { text: 'Optimal', color: '#16A34A' };
  } else if (reading <= 19) {
    return { text: 'High', color: '#D97706' };
  } else {
    return { text: '*HIGH*', color: '#CC2200' };
  }
}
