import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface CopiedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CopiedModal({ open, onOpenChange }: CopiedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Copied to Clipboard
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-gray-300">
            The experiment summary has been copied to your clipboard and is ready to share!
          </p>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}