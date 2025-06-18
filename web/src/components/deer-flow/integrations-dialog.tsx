'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { X } from 'lucide-react';

interface IntegrationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vaultUrl: string | null;
  serviceName: string;
}

export function IntegrationsDialog({ isOpen, onClose, vaultUrl, serviceName }: IntegrationsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg font-semibold">
                Connect to {serviceName}
              </DialogTitle>
              <Badge variant="secondary" className="text-xs">
                Secure Connection
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            You'll be redirected to authenticate with {serviceName}. Your Omega Intelligence account will remain secure.
          </p>
        </DialogHeader>
        <div className="flex-1 p-4">
          {vaultUrl && (
            <iframe
              src={vaultUrl}
              className="w-full h-full border rounded-lg shadow-sm bg-white"
              title="APIdeck Vault"
              allow="clipboard-read; clipboard-write; camera; microphone"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}