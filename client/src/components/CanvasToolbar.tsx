import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  MousePointer2, Hand, Type, Trash2, ZoomIn, ZoomOut, RotateCcw, Download, Ruler, Undo2, Redo2, FilePlus2,
} from "lucide-react";

interface Props {
  selectedTool: string | null;
  onToolChange: (tool: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onDeleteSelected: () => void;
  onExportPdf: () => void;
  hasSelection: boolean;
  ftPerGrid: number;
  onFtPerGridChange: (v: number) => void;
  // Undo / Redo
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onStartNewReport: () => void;
}

export default function CanvasToolbar({
  selectedTool, onToolChange,
  onZoomIn, onZoomOut, onResetView,
  onDeleteSelected, onExportPdf,
  hasSelection, ftPerGrid, onFtPerGridChange,
  onUndo, canUndo,
  onRedo, canRedo,
  onStartNewReport,
}: Props) {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'pan',    icon: Hand,           label: 'Pan (M)' },
    { id: 'text',   icon: Type,           label: 'Add Text (T)' },
  ];

  return (
    <div className="flex items-center gap-1 p-2 bg-card border-b border-border flex-wrap" data-testid="canvas-toolbar">
      {/* Tool buttons: Select | Pan | Text */}
      {tools.map((tool) => (
        <Tooltip key={tool.id}>
          <TooltipTrigger asChild>
            <Button variant={selectedTool === tool.id ? 'default' : 'ghost'} size="sm"
              onClick={() => onToolChange(tool.id)} className="h-8 w-8 p-0" data-testid={`tool-${tool.id}`}>
              <tool.icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{tool.label}</TooltipContent>
        </Tooltip>
      ))}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Undo button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className={`h-8 w-8 p-0${!canUndo ? ' opacity-50 cursor-not-allowed' : ''}`}
            data-testid="undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
      </Tooltip>

      {/* Redo button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            className={`h-8 w-8 p-0${!canRedo ? ' opacity-50 cursor-not-allowed' : ''}`}
            data-testid="redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Redo (Ctrl+Shift+Z)</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Zoom controls */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onZoomIn} className="h-8 w-8 p-0"><ZoomIn className="h-4 w-4" /></Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Zoom In</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onZoomOut} className="h-8 w-8 p-0"><ZoomOut className="h-4 w-4" /></Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Zoom Out</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onResetView} className="h-8 w-8 p-0"><RotateCcw className="h-4 w-4" /></Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Reset View</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Scale control */}
      <div className="flex items-center gap-1.5">
        <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground hidden sm:inline">Scale:</span>
        <Input type="number" min={0.5} max={20} step={0.5}
          value={ftPerGrid} onChange={(e) => onFtPerGridChange(parseFloat(e.target.value) || 2)}
          className="h-7 w-14 text-xs text-center" data-testid="scale-input" />
        <span className="text-xs text-muted-foreground">ft/grid</span>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Delete (conditional) */}
      {hasSelection && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onDeleteSelected}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive" data-testid="delete-selected">
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Delete Selected</TooltipContent>
        </Tooltip>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* New Report button */}
      <Button variant="outline" size="sm" onClick={onStartNewReport} className="gap-1.5" data-testid="new-report">
        <FilePlus2 className="h-4 w-4" />
        <span className="hidden sm:inline">New Report</span>
      </Button>

      {/* Export PDF button */}
      <Button variant="default" size="sm" onClick={onExportPdf} className="gap-1.5" data-testid="export-pdf">
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export PDF</span>
      </Button>
    </div>
  );
}
