import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import QuoteApp from '@/pages/QuoteApp';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import '@/index.css';
import InstallPrompt from '@/components/InstallPrompt';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <QuoteApp />
        <InstallPrompt />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
