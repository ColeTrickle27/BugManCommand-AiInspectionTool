import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-primary text-primary-foreground shadow-lg border-t border-primary/20"
      data-testid="install-prompt">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <Download className="h-5 w-5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Install Termite Graph</p>
          <p className="text-xs opacity-80">Add to home screen for quick access</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleInstall}
          className="shrink-0 text-xs h-8"
          data-testid="btn-install"
        >
          Install
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 opacity-70 hover:opacity-100"
          data-testid="btn-dismiss-install"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
