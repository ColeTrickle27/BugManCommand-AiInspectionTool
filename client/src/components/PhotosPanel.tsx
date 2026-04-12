import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, X, ImagePlus, MapPin } from "lucide-react";
import type { CanvasPhoto } from "@/lib/canvas-types";
import { generateId } from "@/lib/canvas-types";

interface Props {
  photos: CanvasPhoto[];
  onPhotosChange: (photos: CanvasPhoto[]) => void;
}

export default function PhotosPanel({ photos, onPhotosChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        // Place at a default position; user can drag on canvas
        onPhotosChange([
          ...photos,
          {
            id: generateId(),
            dataUrl,
            caption: '',
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            width: 80,
            height: 60,
            // Photos live on the notes layer so they can be toggled separately
            layer: 'notes',
          } as CanvasPhoto,
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (id: string) => onPhotosChange(photos.filter((p) => p.id !== id));

  const updateCaption = (id: string, caption: string) =>
    onPhotosChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Inspection Photos</h3>
          <span className="text-xs text-muted-foreground">{photos.length} photos</span>
        </div>
        <p className="text-xs text-muted-foreground">Photos are pinned on the graph. Drag them to the correct location in Select mode.</p>

        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}
          className="w-full gap-2" data-testid="add-photo-btn">
          <ImagePlus className="h-4 w-4" /> Add Photos
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />

        {photos.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Camera className="h-8 w-8" />
            <p className="text-xs text-center">No photos yet. Upload photos to pin them on the graph.</p>
          </div>
        )}

        <div className="space-y-3">
          {photos.map((photo) => (
            <div key={photo.id} className="border border-border rounded-md overflow-hidden">
              <div className="relative">
                <img src={photo.dataUrl} alt={photo.caption || 'Inspection photo'} className="w-full h-28 object-cover" />
                <button onClick={() => removePhoto(photo.id)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/50 rounded px-1.5 py-0.5">
                  <MapPin className="h-3 w-3 text-white" />
                  <span className="text-[10px] text-white">Pinned on graph</span>
                </div>
              </div>
              <div className="p-2">
                <Input value={photo.caption} onChange={(e) => updateCaption(photo.id, e.target.value)}
                  placeholder="Add caption..." className="h-7 text-xs" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
