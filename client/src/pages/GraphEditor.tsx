import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type Konva from "konva";
import TermiteCanvas from "@/components/TermiteCanvas";
import CanvasToolbar from "@/components/CanvasToolbar";
import ShapesPanel, { type FillColorOption, FILL_COLOR_VALUES } from "@/components/ShapesPanel";
import MarkersPanel from "@/components/MarkersPanel";
import SymbolsPanel from "@/components/SymbolsPanel";
import PropertiesPanel from "@/components/PropertiesPanel";
import InspectionForm, { type InspectionData, DEFAULT_INSPECTION } from "@/components/InspectionForm";
import PhotosPanel from "@/components/PhotosPanel";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { generatePdf } from "@/lib/pdf-generator";
import { generateInspectionNotes, generateRecommendations } from "@/lib/ai-recommendations";
import type {
  CanvasShape,
  CanvasMarker,
  CanvasSymbol,
  CanvasPhoto,
  CanvasTextAnnotation,
  MarkerType,
  SymbolType,
  LayerName,
} from "@/lib/canvas-types";
import { DEFAULT_FT_PER_GRID, getMoistureDescriptor } from "@/lib/canvas-types";
import {
  Pencil,
  MapPin,
  Boxes,
  SlidersHorizontal,
  FileText,
  Camera,
  Menu,
  ChevronLeft,
  Bug,
  ImageIcon,
  Save,
  FolderOpen,
  Sparkles,
  RefreshCcw,
} from "lucide-react";

interface InlinePromptState {
  message: string;
  defaultValue: string;
  resolve: (value: string | null) => void;
}

function InlinePromptOverlay({ state, onClose }: { state: InlinePromptState; onClose: () => void }) {
  const [value, setValue] = useState(state.defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);
  const submit = () => {
    state.resolve(value);
    onClose();
  };
  const cancel = () => {
    state.resolve(null);
    onClose();
  };
  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/40" onClick={cancel}>
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 w-80 space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium text-foreground">{state.message}</p>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") cancel();
          }}
          className="h-9 text-sm"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
          <Button size="sm" onClick={submit}>OK</Button>
        </div>
      </div>
    </div>
  );
}

interface DraftListOverlayProps {
  drafts: SavedDraft[];
  onClose: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

function DraftListOverlay({ drafts, onClose, onOpen, onDelete }: DraftListOverlayProps) {
  return (
    <div className="absolute inset-0 z-[105] flex items-center justify-center bg-black/35" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl w-[min(92vw,760px)] max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Open Draft</h2>
            <p className="text-xs text-muted-foreground">Drafts are stored in this browser for direct Netlify deployment.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        <div className="overflow-auto max-h-[calc(80vh-64px)] p-3">
          {drafts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No saved drafts yet.
            </div>
          ) : (
            <div className="space-y-2">
              {drafts.map((draft) => (
                <div key={draft.id} className="rounded-lg border border-border p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{draft.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {draft.customerName || "Untitled customer"} · Saved {new Date(draft.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onOpen(draft.id)}>Open</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(draft.id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ViewportRequest {
  type: "zoomIn" | "zoomOut" | "reset";
  nonce: number;
}

interface CanvasSnapshot {
  shapes: CanvasShape[];
  markers: CanvasMarker[];
  symbols: CanvasSymbol[];
  photos: CanvasPhoto[];
  annotations: CanvasTextAnnotation[];
}

interface DraftPayload {
  shapes: CanvasShape[];
  markers: CanvasMarker[];
  symbols: CanvasSymbol[];
  photos: CanvasPhoto[];
  annotations: CanvasTextAnnotation[];
  ftPerGrid: number;
  drawingLabel: string;
  showPhotos: boolean;
  companyLogo: string;
  inspectionData: InspectionData;
  /** Persisted layer visibility map */
  layerVisibility: Record<LayerName, boolean>;
}

interface SavedDraft {
  id: string;
  name: string;
  customerName: string;
  updatedAt: string;
  payload: DraftPayload;
}

const DRAFTS_STORAGE_KEY = "holloman-termite-graph-drafts-v2";

const createDraftId = () => `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function readDrafts(): SavedDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: SavedDraft[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

export default function GraphEditor() {
  const { toast } = useToast();
  const stageRef = useRef<Konva.Stage | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [inlinePrompt, setInlinePrompt] = useState<InlinePromptState | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [viewportRequest, setViewportRequest] = useState<ViewportRequest | null>(null);

  const [shapes, setShapes] = useState<CanvasShape[]>([]);
  const [markers, setMarkers] = useState<CanvasMarker[]>([]);
  const [symbols, setSymbols] = useState<CanvasSymbol[]>([]);
  const [photos, setPhotos] = useState<CanvasPhoto[]>([]);
  const [annotations, setAnnotations] = useState<CanvasTextAnnotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>("select");
  const [selectedMarkerType, setSelectedMarkerType] = useState<MarkerType | null>(null);
  const [selectedSymbolType, setSelectedSymbolType] = useState<SymbolType | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [drawingLabel, setDrawingLabel] = useState("");
  const [ftPerGrid, setFtPerGrid] = useState(DEFAULT_FT_PER_GRID);
  const [fillColorOption, setFillColorOption] = useState<FillColorOption>("transparent");
  const [fillColor, setFillColor] = useState<string>("transparent");
  const [textColor, setTextColor] = useState("#333");
  const [textSize, setTextSize] = useState(13);
  const [customSymbolLabel, setCustomSymbolLabel] = useState("");
  const [showPhotos, setShowPhotos] = useState(true);
  const [sidebarTab, setSidebarTab] = useState("shapes");
  const [showSidebar, setShowSidebar] = useState(true);
  const [inspectionData, setInspectionData] = useState<InspectionData>(DEFAULT_INSPECTION);
  const [companyLogo, setCompanyLogo] = useState<string>("");
  const [clipboard, setClipboard] = useState<any>(null);
  const [undoStack, setUndoStack] = useState<CanvasSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasSnapshot[]>([]);

  // Layer visibility state.  Each layer can be toggled on/off independently.
  const [layerVisibility, setLayerVisibility] = useState<Record<LayerName, boolean>>({
    structures: true,
    findings: true,
    treatments: true,
    devices: true,
    materials: true,
    notes: true,
  });

 

  const handlePrompt = useCallback((message: string, defaultValue: string, resolve: (value: string | null) => void) => {
    setInlinePrompt({ message, defaultValue, resolve });
  }, []);

  const draftPayload = useMemo<DraftPayload>(() => ({
    shapes,
    markers,
    symbols,
    photos,
    annotations,
    ftPerGrid,
    drawingLabel,
    showPhotos,
    companyLogo,
    inspectionData,
    layerVisibility,
  }), [shapes, markers, symbols, photos, annotations, ftPerGrid, drawingLabel, showPhotos, companyLogo, inspectionData]);

 const markDirty = useCallback(() => {
  setSaveState((prev) => (prev === "saving" ? prev : "dirty"));
}, []);

const handleToggleLayer = useCallback((layer: LayerName, visible: boolean) => {
  setLayerVisibility((prev) => ({ ...prev, [layer]: visible }));
  markDirty();
}, [markDirty]);

  const hydrateDraft = useCallback((payload: DraftPayload) => {
    setShapes(payload.shapes ?? []);
    setMarkers(payload.markers ?? []);
    setSymbols(payload.symbols ?? []);
    setPhotos(payload.photos ?? []);
    setAnnotations(payload.annotations ?? []);
    setFtPerGrid(payload.ftPerGrid ?? DEFAULT_FT_PER_GRID);
    setDrawingLabel(payload.drawingLabel ?? "");
    setShowPhotos(payload.showPhotos ?? true);
    setCompanyLogo(payload.companyLogo ?? "");
    setInspectionData(payload.inspectionData ?? DEFAULT_INSPECTION);
    // Restore layer visibility if present, otherwise default to all true
    setLayerVisibility(payload.layerVisibility ?? {
      structures: true,
      findings: true,
      treatments: true,
      devices: true,
      materials: true,
      notes: true,
    });
    setUndoStack([]);
    setRedoStack([]);
    setSelectedShapeId(null);
    setSelectedMarkerId(null);
    setSelectedSymbolId(null);
    setSelectedAnnotationId(null);
    setSelectedTool("select");
  }, []);

  useEffect(() => {
    setDrafts(readDrafts());
  }, []);

  const persistDraft = useCallback((draftId: string, name: string, payload: DraftPayload) => {
    const existing = readDrafts();
    const updatedAt = new Date().toISOString();
    const next: SavedDraft = {
      id: draftId,
      name,
      customerName: payload.inspectionData.customerName,
      updatedAt,
      payload,
    };
    const merged = [next, ...existing.filter((item) => item.id !== draftId)].slice(0, 25);
    writeDrafts(merged);
    setDrafts(merged);
    setCurrentDraftId(draftId);
    setSaveState("saved");
    setLastSavedAt(updatedAt);
  }, []);

  const handleSaveDraft = useCallback(() => {
    const runSave = (draftName: string) => {
      setSaveState("saving");
      const safeName = draftName.trim() || inspectionData.customerName.trim() || "Untitled Draft";
      const id = currentDraftId ?? createDraftId();
      persistDraft(id, safeName, draftPayload);
      toast({ title: "Draft saved", description: `Saved as “${safeName}”.` });
    };

    if (currentDraftId) {
      const current = drafts.find((item) => item.id === currentDraftId);
      runSave(current?.name || inspectionData.customerName || "Untitled Draft");
      return;
    }

    handlePrompt("Name this draft", inspectionData.customerName || "", (value) => {
      if (value === null) return;
      runSave(value);
    });
  }, [currentDraftId, drafts, draftPayload, handlePrompt, inspectionData.customerName, persistDraft, toast]);

  const handleOpenDraft = useCallback((draftId: string) => {
    const found = readDrafts().find((item) => item.id === draftId);
    if (!found) {
      toast({ title: "Draft not found", description: "That draft is no longer available.", variant: "destructive" });
      return;
    }
    hydrateDraft(found.payload);
    setCurrentDraftId(found.id);
    setLastSavedAt(found.updatedAt);
    setSaveState("saved");
    setShowDrafts(false);
    toast({ title: "Draft loaded", description: `Opened “${found.name}”.` });
  }, [hydrateDraft, toast]);

  const handleDeleteDraft = useCallback((draftId: string) => {
    const next = readDrafts().filter((item) => item.id !== draftId);
    writeDrafts(next);
    setDrafts(next);
    if (currentDraftId === draftId) {
      setCurrentDraftId(null);
      setSaveState("idle");
      setLastSavedAt(null);
    }
  }, [currentDraftId]);

  useEffect(() => {
    if (!currentDraftId || saveState !== "dirty") return;
    const timer = window.setTimeout(() => {
      const existing = readDrafts().find((item) => item.id === currentDraftId);
      if (!existing) return;
      setSaveState("saving");
      persistDraft(currentDraftId, existing.name, draftPayload);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [currentDraftId, draftPayload, persistDraft, saveState]);

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [
      ...prev.slice(-49),
      { shapes, markers, symbols, photos, annotations },
    ]);
    setRedoStack([]);
  }, [shapes, markers, symbols, photos, annotations]);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const snapshot = next.pop()!;
      setRedoStack((r) => [...r.slice(-49), { shapes, markers, symbols, photos, annotations }]);
      setShapes(snapshot.shapes);
      setMarkers(snapshot.markers);
      setSymbols(snapshot.symbols);
      setPhotos(snapshot.photos);
      setAnnotations(snapshot.annotations);
      markDirty();
      return next;
    });
  }, [annotations, markDirty, markers, photos, shapes, symbols]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const snapshot = next.pop()!;
      setUndoStack((u) => [...u.slice(-49), { shapes, markers, symbols, photos, annotations }]);
      setShapes(snapshot.shapes);
      setMarkers(snapshot.markers);
      setSymbols(snapshot.symbols);
      setPhotos(snapshot.photos);
      setAnnotations(snapshot.annotations);
      markDirty();
      return next;
    });
  }, [annotations, markDirty, markers, photos, shapes, symbols]);

  const handleCopy = useCallback(() => {
    if (selectedShapeId) {
      const shape = shapes.find((s) => s.id === selectedShapeId);
      if (shape) setClipboard({ type: "shape", data: shape });
    } else if (selectedMarkerId) {
      const marker = markers.find((m) => m.id === selectedMarkerId);
      if (marker) setClipboard({ type: "marker", data: marker });
    } else if (selectedSymbolId) {
      const symbol = symbols.find((s) => s.id === selectedSymbolId);
      if (symbol) setClipboard({ type: "symbol", data: symbol });
    } else if (selectedAnnotationId) {
      const annotation = annotations.find((a) => a.id === selectedAnnotationId);
      if (annotation) setClipboard({ type: "annotation", data: annotation });
    }
  }, [annotations, markers, selectedAnnotationId, selectedMarkerId, selectedShapeId, selectedSymbolId, shapes, symbols]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    pushUndo();
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const OFFSET = 20;
    if (clipboard.type === "shape") {
      const orig = clipboard.data as CanvasShape;
      setShapes((prev) => [...prev, { ...orig, id: newId, x: orig.x + OFFSET, y: orig.y + OFFSET }]);
    } else if (clipboard.type === "marker") {
      const orig = clipboard.data as CanvasMarker;
      setMarkers((prev) => [...prev, { ...orig, id: newId, x: orig.x + OFFSET, y: orig.y + OFFSET }]);
    } else if (clipboard.type === "symbol") {
      const orig = clipboard.data as CanvasSymbol;
      setSymbols((prev) => [...prev, { ...orig, id: newId, x: orig.x + OFFSET, y: orig.y + OFFSET }]);
    } else if (clipboard.type === "annotation") {
      const orig = clipboard.data as CanvasTextAnnotation;
      setAnnotations((prev) => [...prev, { ...orig, id: newId, x: orig.x + OFFSET, y: orig.y + OFFSET }]);
    }
    markDirty();
  }, [clipboard, markDirty, pushUndo]);

  const resetEditor = useCallback(() => {
    setShapes([]);
    setMarkers([]);
    setSymbols([]);
    setPhotos([]);
    setAnnotations([]);
    setInspectionData(DEFAULT_INSPECTION);
    setCompanyLogo("");
    setUndoStack([]);
    setRedoStack([]);
    setClipboard(null);
    setSelectedShapeId(null);
    setSelectedMarkerId(null);
    setSelectedSymbolId(null);
    setSelectedAnnotationId(null);
    setDrawingLabel("");
    setCurrentDraftId(null);
    setSaveState("idle");
    setLastSavedAt(null);
  }, []);

  const handleStartNewReport = useCallback(() => {
    if (window.confirm("Start a new report? Unsaved changes in the current report will be cleared.")) {
      resetEditor();
    }
  }, [resetEditor]);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setCompanyLogo(result);
        markDirty();
      }
    };
    reader.readAsDataURL(file);
  }, [markDirty]);

  const generateAi = useCallback((mode: "notes" | "recommendations" | "both") => {
    const params = {
      customerName: inspectionData.customerName,
      address: inspectionData.customerAddress,
      inspectionDate: inspectionData.inspectionDate,
      inspectorName: inspectionData.inspectorName,
      foundationType: inspectionData.foundationType,
      foundationWalls: inspectionData.foundationWalls,
      crawlspaceClearance: inspectionData.crawlspaceClearance,
      constructionType: inspectionData.constructionType,
      crawlspaceEncapsulated: inspectionData.crawlspaceEncapsulated,
      partiallyEncapsulated: inspectionData.partiallyEncapsulated,
      encapsulationCondition: inspectionData.encapsulationCondition,
      moistureBarrier: inspectionData.moistureBarrier,
      moistureBarrierCondition: inspectionData.moistureBarrierCondition,
      moistureBarrierThickness: inspectionData.moistureBarrierThickness,
      dehumidifierInPlace: inspectionData.dehumidifierInPlace,
      dehumidifierOperational: inspectionData.dehumidifierOperational,
      dehumidifierNotOperationalReason: inspectionData.dehumidifierNotOperationalReason,
      additionalDehumidifierNeeded: inspectionData.additionalDehumidifierNeeded,
      frenchDrainInPlace: inspectionData.frenchDrainInPlace,
      sumpPumpInPlace: inspectionData.sumpPumpInPlace,
      sumpPumpOperational: inspectionData.sumpPumpOperational,
      sumpPumpNotOperationalReason: inspectionData.sumpPumpNotOperationalReason,
      findingsChecked: inspectionData.findingsChecked,
      findingsOther: inspectionData.findingsOther,
      markers,
      notes: inspectionData.notes,
    };

    setInspectionData((prev) => ({
      ...prev,
      notes: mode === "notes" || mode === "both" ? generateInspectionNotes(params) : prev.notes,
      recommendations: mode === "recommendations" || mode === "both" ? generateRecommendations(params) : prev.recommendations,
    }));
    markDirty();
    toast({ title: "AI sections generated", description: mode === "both" ? "Notes and recommendations updated." : `${mode} updated.` });
  }, [inspectionData, markDirty, markers, toast]);

  const handleToolChange = useCallback((tool: string) => {
    setSelectedTool(tool);
    if (!tool.startsWith("marker")) setSelectedMarkerType(null);
    if (tool !== "symbol") setSelectedSymbolType(null);
  }, []);

  const handleSelectMarkerType = useCallback((type: MarkerType | null) => {
    setSelectedMarkerType(type);
    if (type) setSelectedTool("marker");
  }, []);

  const handleSelectSymbolType = useCallback((type: SymbolType | null) => {
    setSelectedSymbolType(type);
    if (type) setSelectedTool("symbol");
  }, []);

  const handleAddShape = useCallback((shape: CanvasShape) => {
    pushUndo();
    setShapes((prev) => [...prev, { ...shape, label: drawingLabel, fill: fillColor }]);
    markDirty();
  }, [drawingLabel, fillColor, markDirty, pushUndo]);

  const handleUpdateShape = useCallback((updated: CanvasShape) => {
    setShapes((prev) => prev.map((shape) => (shape.id === updated.id ? updated : shape)));
    markDirty();
  }, [markDirty]);

  const handleDeleteShape = useCallback((id: string) => {
    pushUndo();
    setShapes((prev) => prev.filter((shape) => shape.id !== id));
    setSelectedShapeId(null);
    markDirty();
  }, [markDirty, pushUndo]);

  const handleUpdateMarker = useCallback((updated: CanvasMarker) => {
    setMarkers((prev) => prev.map((marker) => (marker.id === updated.id ? updated : marker)));
    markDirty();
  }, [markDirty]);

  const handleDeleteMarker = useCallback((id: string) => {
    pushUndo();
    setMarkers((prev) => prev.filter((marker) => marker.id !== id));
    setSelectedMarkerId(null);
    markDirty();
  }, [markDirty, pushUndo]);

  const handleMoisturePrompt = useCallback((markerId: string) => {
    handlePrompt("Enter moisture reading (%)", "", (input) => {
      if (input === null) return;
      const reading = parseFloat(input);
      if (!Number.isNaN(reading)) {
        const descriptor = getMoistureDescriptor(reading);
        setMarkers((prev) => prev.map((marker) => marker.id === markerId ? { ...marker, moistureReading: reading, moistureDescriptor: descriptor.text } : marker));
        markDirty();
      }
    });
  }, [handlePrompt, markDirty]);

  const handleUpdateSymbol = useCallback((updated: CanvasSymbol) => {
    setSymbols((prev) => prev.map((symbol) => (symbol.id === updated.id ? updated : symbol)));
    markDirty();
  }, [markDirty]);

  const handleDeleteSymbol = useCallback((id: string) => {
    pushUndo();
    setSymbols((prev) => prev.filter((symbol) => symbol.id !== id));
    setSelectedSymbolId(null);
    markDirty();
  }, [markDirty, pushUndo]);

  const handleUpdateAnnotation = useCallback((updated: CanvasTextAnnotation) => {
    setAnnotations((prev) => prev.map((annotation) => annotation.id === updated.id ? updated : annotation));
    markDirty();
  }, [markDirty]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    pushUndo();
    setAnnotations((prev) => prev.filter((annotation) => annotation.id !== id));
    setSelectedAnnotationId(null);
    markDirty();
  }, [markDirty, pushUndo]);

  const handleDeleteSelected = useCallback(() => {
    pushUndo();
    if (selectedShapeId) {
      setShapes((prev) => prev.filter((shape) => shape.id !== selectedShapeId));
      setSelectedShapeId(null);
    }
    if (selectedMarkerId) {
      setMarkers((prev) => prev.filter((marker) => marker.id !== selectedMarkerId));
      setSelectedMarkerId(null);
    }
    if (selectedSymbolId) {
      setSymbols((prev) => prev.filter((symbol) => symbol.id !== selectedSymbolId));
      setSelectedSymbolId(null);
    }
    if (selectedAnnotationId) {
      setAnnotations((prev) => prev.filter((annotation) => annotation.id !== selectedAnnotationId));
      setSelectedAnnotationId(null);
    }
    markDirty();
  }, [markDirty, pushUndo, selectedAnnotationId, selectedMarkerId, selectedShapeId, selectedSymbolId]);

  const handleExportPdf = useCallback(async () => {
    try {
      await generatePdf(stageRef, inspectionData, photos, markers, symbols, ftPerGrid, companyLogo);
      toast({ title: "PDF generated", description: "Inspection report downloaded." });
    } catch (err) {
      console.error(err);
      toast({ title: "Export failed", description: "There was an error generating the PDF.", variant: "destructive" });
    }
  }, [companyLogo, ftPerGrid, inspectionData, markers, photos, symbols, toast]);

  const selectedShape = shapes.find((shape) => shape.id === selectedShapeId) || null;
  const selectedMarker = markers.find((marker) => marker.id === selectedMarkerId) || null;
  const selectedSymbol = symbols.find((symbol) => symbol.id === selectedSymbolId) || null;
  const selectedAnnotation = annotations.find((annotation) => annotation.id === selectedAnnotationId) || null;

  const itemCount = `${shapes.length} shapes · ${markers.length} markers · ${symbols.length} symbols`;
  const saveIndicator = saveState === "saving"
    ? "Saving…"
    : saveState === "saved"
      ? `Saved${lastSavedAt ? ` ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}`
      : saveState === "dirty"
        ? "Unsaved changes"
        : "Not saved";

  return (
    <div className="h-screen flex flex-col bg-background" data-testid="graph-editor">
      <header className="flex items-center gap-2 px-3 md:px-4 h-14 bg-card border-b border-border shrink-0">
        <Button variant="ghost" size="sm" className="lg:hidden h-8 w-8 p-0" onClick={() => setShowSidebar(!showSidebar)}>
          {showSidebar ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Bug className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold leading-none truncate">Holloman Exterminators</h1>
            <p className="text-xs text-muted-foreground leading-tight truncate">Termite Inspection Graph</p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="hidden md:block text-right mr-2">
          <div className="text-xs text-muted-foreground">{itemCount}</div>
          <div className="text-[11px] text-muted-foreground">{saveIndicator}</div>
        </div>

        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setShowDrafts(true)}>
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Drafts</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleSaveDraft}>
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 hidden md:inline-flex" onClick={() => logoInputRef.current?.click()}>
          <ImageIcon className="h-3.5 w-3.5" />
          <span>{companyLogo ? "Logo ✓" : "Logo"}</span>
        </Button>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className={`${showSidebar ? "w-72 lg:w-80" : "w-0"} transition-all duration-200 border-r border-border bg-card flex flex-col overflow-hidden shrink-0`}>
          <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-border bg-transparent px-0.5 h-10 shrink-0">
              <TabsTrigger value="shapes" className="text-[11px] gap-0.5 data-[state=active]:bg-accent/50 flex-1 h-8 px-1"><Pencil className="h-3 w-3" /><span className="hidden sm:inline">Draw</span></TabsTrigger>
              <TabsTrigger value="markers" className="text-[11px] gap-0.5 data-[state=active]:bg-accent/50 flex-1 h-8 px-1"><MapPin className="h-3 w-3" /><span className="hidden sm:inline">Markers</span></TabsTrigger>
              <TabsTrigger value="symbols" className="text-[11px] gap-0.5 data-[state=active]:bg-accent/50 flex-1 h-8 px-1"><Boxes className="h-3 w-3" /><span className="hidden sm:inline">Symbols</span></TabsTrigger>
              <TabsTrigger value="properties" className="text-[11px] gap-0.5 data-[state=active]:bg-accent/50 flex-1 h-8 px-1"><SlidersHorizontal className="h-3 w-3" /><span className="hidden sm:inline">Props</span></TabsTrigger>
              <TabsTrigger value="report" className="xl:hidden text-[11px] gap-0.5 data-[state=active]:bg-accent/50 flex-1 h-8 px-1"><FileText className="h-3 w-3" /></TabsTrigger>
              <TabsTrigger value="photos" className="xl:hidden text-[11px] gap-0.5 data-[state=active]:bg-accent/50 flex-1 h-8 px-1"><Camera className="h-3 w-3" /></TabsTrigger>
            </TabsList>

            <TabsContent value="shapes" className="flex-1 mt-0 min-h-0">
              <ShapesPanel
                activeTool={selectedTool}
                onToolChange={handleToolChange}
                onAddShape={handleAddShape}
                drawingLabel={drawingLabel}
                onDrawingLabelChange={(value) => { setDrawingLabel(value); markDirty(); }}
                fillColor={fillColorOption}
                onFillColorChange={(opt) => {
                  setFillColorOption(opt);
                  setFillColor(FILL_COLOR_VALUES[opt]);
                  markDirty();
                }}
              />
            </TabsContent>

            <TabsContent value="markers" className="flex-1 mt-0 min-h-0">
              <MarkersPanel selectedMarkerType={selectedMarkerType} onSelectMarkerType={handleSelectMarkerType} onToolChange={handleToolChange} />
            </TabsContent>

            <TabsContent value="symbols" className="flex-1 mt-0 min-h-0">
              <SymbolsPanel selectedSymbolType={selectedSymbolType} onSelectSymbolType={handleSelectSymbolType} onToolChange={handleToolChange} onCustomSymbolLabel={setCustomSymbolLabel} />
            </TabsContent>

            <TabsContent value="properties" className="flex-1 mt-0 min-h-0">
              <PropertiesPanel
                selectedShape={selectedShape}
                selectedMarker={selectedMarker}
                selectedSymbol={selectedSymbol}
                selectedAnnotation={selectedAnnotation}
                onUpdateShape={handleUpdateShape}
                onUpdateMarker={handleUpdateMarker}
                onUpdateSymbol={handleUpdateSymbol}
                onUpdateAnnotation={handleUpdateAnnotation}
                onDeleteShape={handleDeleteShape}
                onDeleteMarker={handleDeleteMarker}
                onDeleteSymbol={handleDeleteSymbol}
                onDeleteAnnotation={handleDeleteAnnotation}
                ftPerGrid={ftPerGrid}
              />
            </TabsContent>

            <TabsContent value="report" className="xl:hidden flex-1 mt-0 min-h-0">
              <div className="flex gap-2 px-4 pt-3 pb-2 border-b border-border">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => generateAi("notes")}><Sparkles className="h-3.5 w-3.5" /> Notes</Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => generateAi("recommendations")}><Sparkles className="h-3.5 w-3.5" /> Recs</Button>
              </div>
              <InspectionForm data={inspectionData} onChange={(next) => { setInspectionData(next); markDirty(); }} />
            </TabsContent>

            <TabsContent value="photos" className="xl:hidden flex-1 mt-0 min-h-0">
              <div className="flex items-center justify-between px-4 pt-2">
                <span className="text-xs font-medium">Show on Graph</span>
                <Switch checked={showPhotos} onCheckedChange={(checked) => { setShowPhotos(checked); markDirty(); }} />
              </div>
              <PhotosPanel photos={photos} onPhotosChange={(next) => { setPhotos(next); markDirty(); }} />
            </TabsContent>
          </Tabs>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 relative">
          <CanvasToolbar
            selectedTool={selectedTool}
            onToolChange={handleToolChange}
            onZoomIn={() => setViewportRequest({ type: "zoomIn", nonce: Date.now() })}
            onZoomOut={() => setViewportRequest({ type: "zoomOut", nonce: Date.now() })}
            onResetView={() => setViewportRequest({ type: "reset", nonce: Date.now() })}
            onDeleteSelected={handleDeleteSelected}
            onExportPdf={handleExportPdf}
            hasSelection={!!selectedShapeId || !!selectedMarkerId || !!selectedSymbolId || !!selectedAnnotationId}
            ftPerGrid={ftPerGrid}
            onFtPerGridChange={(value) => { setFtPerGrid(value); markDirty(); }}
            onUndo={handleUndo}
            canUndo={undoStack.length > 0}
            onRedo={handleRedo}
            canRedo={redoStack.length > 0}
            onStartNewReport={handleStartNewReport}
          />

          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => generateAi("notes")}>
              <Sparkles className="h-3.5 w-3.5" /> Generate Notes
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => generateAi("recommendations")}>
              <Sparkles className="h-3.5 w-3.5" /> Generate Recs
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 hidden md:inline-flex" onClick={() => generateAi("both")}>
              <RefreshCcw className="h-3.5 w-3.5" /> Refresh Both
            </Button>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground md:hidden">{saveIndicator}</span>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {/* Layer visibility toggles */}
            <div className="flex flex-wrap gap-3 items-center px-2 py-1 border-b border-border bg-card/60 text-xs">
              {(
                [
                  { key: 'structures', label: 'Structures' },
                  { key: 'findings', label: 'Findings' },
                  { key: 'treatments', label: 'Treatment Methods' },
                  { key: 'devices', label: 'Devices' },
                  { key: 'materials', label: 'Materials' },
                  { key: 'notes', label: 'Notes' },
                ] as { key: LayerName; label: string }[]
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-1">
                  <Switch
                    id={`layer-${key}`}
                    checked={layerVisibility[key]}
                    onCheckedChange={(checked) => handleToggleLayer(key, checked)}
                  />
                  <label htmlFor={`layer-${key}`} className="cursor-pointer select-none">
                    {label}
                  </label>
                </div>
              ))}
            </div>
            {/* Canvas */}
            <TermiteCanvas
              shapes={shapes}
              markers={markers}
              symbols={symbols}
              photos={photos}
              annotations={annotations}
              selectedTool={selectedTool}
              selectedMarkerType={selectedMarkerType}
              selectedSymbolType={selectedSymbolType}
              /* Wrap state updates in pushUndo so undo removes items drawn/edited in canvas */
              onShapesChange={(next) => { pushUndo(); setShapes(next); markDirty(); }}
              onMarkersChange={(next) => { pushUndo(); setMarkers(next); markDirty(); }}
              onSymbolsChange={(next) => { pushUndo(); setSymbols(next); markDirty(); }}
              onPhotosChange={(next) => { pushUndo(); setPhotos(next); markDirty(); }}
              onAnnotationsChange={(next) => { pushUndo(); setAnnotations(next); markDirty(); }}
              onSelectShape={(id) => { setSelectedShapeId(id); if (id) setSidebarTab("properties"); }}
              onSelectMarker={(id) => { setSelectedMarkerId(id); if (id) setSidebarTab("properties"); }}
              onSelectSymbol={(id) => { setSelectedSymbolId(id); if (id) setSidebarTab("properties"); }}
              selectedShapeId={selectedShapeId}
              selectedMarkerId={selectedMarkerId}
              selectedSymbolId={selectedSymbolId}
              stageRef={stageRef}
              ftPerGrid={ftPerGrid}
              drawingLabel={drawingLabel}
              fillColor={fillColor}
              customSymbolLabel={customSymbolLabel}
              showPhotos={showPhotos}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onCopy={handleCopy}
              onPaste={handlePaste}
              onDeleteSelected={handleDeleteSelected}
              onToolChange={handleToolChange}
              onMoisturePrompt={handleMoisturePrompt}
              textColor={textColor}
              textSize={textSize}
              selectedAnnotationId={selectedAnnotationId}
              onSelectAnnotation={setSelectedAnnotationId}
              onPrompt={handlePrompt}
              viewportRequest={viewportRequest}
              layerVisibility={layerVisibility}
            />
          </div>

          {inlinePrompt && <InlinePromptOverlay state={inlinePrompt} onClose={() => setInlinePrompt(null)} />}
          {showDrafts && (
            <DraftListOverlay drafts={drafts} onClose={() => setShowDrafts(false)} onOpen={handleOpenDraft} onDelete={handleDeleteDraft} />
          )}
        </main>

        <aside className="hidden xl:flex w-80 2xl:w-96 border-l border-border bg-card flex-col shrink-0">
          <Tabs defaultValue="report" className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-border bg-transparent px-1 h-10 shrink-0">
              <TabsTrigger value="report" className="text-xs gap-1 data-[state=active]:bg-accent/50 flex-1 h-8"><FileText className="h-3.5 w-3.5" /> Report</TabsTrigger>
              <TabsTrigger value="photos" className="text-xs gap-1 data-[state=active]:bg-accent/50 flex-1 h-8"><Camera className="h-3.5 w-3.5" /> Photos</TabsTrigger>
            </TabsList>
            <TabsContent value="report" className="flex-1 mt-0 min-h-0">
              <div className="flex gap-2 px-4 pt-3 pb-2 border-b border-border">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => generateAi("notes")}><Sparkles className="h-3.5 w-3.5" /> Notes</Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => generateAi("recommendations")}><Sparkles className="h-3.5 w-3.5" /> Recs</Button>
              </div>
              <InspectionForm data={inspectionData} onChange={(next) => { setInspectionData(next); markDirty(); }} />
            </TabsContent>
            <TabsContent value="photos" className="flex-1 mt-0 min-h-0">
              <div className="flex items-center justify-between px-4 pt-2">
                <span className="text-xs font-medium">Show on Graph</span>
                <Switch checked={showPhotos} onCheckedChange={(checked) => { setShowPhotos(checked); markDirty(); }} />
              </div>
              <PhotosPanel photos={photos} onPhotosChange={(next) => { setPhotos(next); markDirty(); }} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
