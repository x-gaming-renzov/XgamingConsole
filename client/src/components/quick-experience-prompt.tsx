import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";


interface QuickExperiencePromptProps {
  open: boolean;
  onClose: () => void;
}

interface ExperienceDraft {
  draftId: string;
  name: string;
  objects: Array<{
    objectId: string;
    variants: {
      control: Record<string, any>;
      A: Record<string, any>;
    };
  }>;
  campaignId?: string;
  target?: {
    segments?: { segmentId: string; split: number }[];
    split?: number;
  };
}

export default function QuickExperiencePrompt({ open, onClose }: QuickExperiencePromptProps) {
  const [prompt, setPrompt] = useState("");
  const [campaignHint, setCampaignHint] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Mock campaign options for now
  const campaigns = [
    { id: "tiktok", name: "TikTok Acquisition", utmSource: "tiktok" },
    { id: "facebook", name: "Facebook Campaign", utmSource: "facebook" },
    { id: "google", name: "Google Ads", utmSource: "google" },
    { id: "organic", name: "Organic Growth", utmSource: "organic" }
  ];

  const handleGenerateDraft = async () => {
    if (prompt.length < 10) return;

    setIsGenerating(true);
    
    try {
      // Make API call to generate draft
      const response = await fetch("/api/ai/experience_draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          campaignHint: campaignHint || undefined
        })
      });

      const draft: ExperienceDraft = await response.json();
      
      // Close modal and navigate to wizard with draft ID
      onClose();
      setLocation(`/experiences/new?draft=${draft.draftId}`);
      
      toast({
        title: "Draft Created",
        description: "AI has generated your experience template. Review and customize before launching."
      });
      
    } catch (error) {
      console.error("Failed to generate draft:", error);
      
      // Show fallback dialog
      const shouldContinue = confirm(
        "Couldn't create draft. Open blank wizard?"
      );
      
      if (shouldContinue) {
        onClose();
        setLocation("/experiences/new");
      }
      
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setPrompt("");
      setCampaignHint("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Describe your FTUE idea
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="prompt">What experience do you want to create?</Label>
            <Textarea
              id="prompt"
              placeholder="e.g. Double coins on Level 5 for TikTok users."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="mt-1"
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {prompt.length}/500 characters (minimum 10)
            </p>
          </div>

          <div>
            <Label htmlFor="campaign">Campaign (Optional)</Label>
            <Select value={campaignHint} onValueChange={setCampaignHint} disabled={isGenerating}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Auto-detect from prompt or select..." />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name} ({campaign.utmSource})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleGenerateDraft}
            disabled={prompt.length < 10 || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Drafting experience... (5-10s)
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Draft
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}