import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

interface ComingSoonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
}

export function ComingSoonModal({ open, onOpenChange, feature }: ComingSoonModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Construction className="w-5 h-5 text-orange-400" />
            Coming Soon
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-gray-300">
            {feature} integration is coming soon! We're working hard to bring you seamless sharing capabilities.
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