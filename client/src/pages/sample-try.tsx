import { useEffect, useState } from "react";
import ConsoleLayout from "@/components/console-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

// Page that provides instructions and a launch button for the sample Unity game.
// Visibility is controlled via sidebar (only for apps whose name contains "sample app").
export default function SampleTryPage() {
  const { toast } = useToast();
  const { currentAppId } = useAuth();
  const [sdkKey, setSdkKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchCreds = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await apiRequest("GET", "/api/auth/sdk-credentials");
        const data = await resp.json();
        if (mounted) {
          if (data?.api_key) {
            setSdkKey(data.api_key);
          } else {
            setError("No SDK key returned");
          }
        }
      } catch (e: any) {
        if (mounted) {
          setError(e.message || "Failed to fetch credentials");
        }
      } finally {
        mounted && setLoading(false);
      }
    };

    fetchCreds();
    return () => { mounted = false; };
  }, [currentAppId]);

  const gameUrl = sdkKey ? `https://vampiresurvivor.pages.dev/?sdkkey=${encodeURIComponent(sdkKey)}` : null;

  const handleOpenGame = () => {
    if (!gameUrl) return;
    window.open(gameUrl, "_blank", "noopener,noreferrer");
    toast({ description: "Opened sample game in new tab" });
  };

  return (
    <ConsoleLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <span>Sample App</span>
            <span className="mx-2">/</span>
            <span className="text-foreground">Try It</span>
          </div>
          <h1 className="text-2xl font-semibold">Try the Sample Unity App</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Launch the embedded Vampire Survival sample game and experience real-time personalisation changes powered by Nova.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription>Follow these steps to see personalisations in action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-relaxed">
            <div className="space-y-3">
              <p className="font-medium">-- Try the sample unity app!</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Create a personalisation using the <span className="font-semibold">VampireSurvivalExperience</span> Experience.</li>
                <li>For targeting, you can choose <code className="px-1 py-0.5 bg-muted rounded">country equals &lt;Country Name&gt;</code> e.g. <em>United States</em>, <em>India</em> (you can find a list in the sample unity game).</li>
                <li>Open the sample game and experience the changes in real time!</li>
                <li>You can edit the personalisation, go back to the Welcome screen in the game, and enter the game again to see the changes.</li>
              </ol>
            </div>

            {/* Demo / explainer video (YouTube) - replace ID if video changes */}
            <div className="pt-2 space-y-2">
              <p className="text-sm font-medium">Watch a quick walkthrough:</p>
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-border bg-black">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/7iB4n5WD2Qw"
                  title="Sample App Walkthrough"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
              <a
                href="https://www.youtube.com/watch?v=7iB4n5WD2Qw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                Open on YouTube
              </a>
            </div>

            <div className="pt-2">
              {loading && <p className="text-muted-foreground">Fetching SDK key...</p>}
              {error && <p className="text-destructive">{error}</p>}
              {sdkKey && (
                <div className="text-xs text-muted-foreground break-all">
                  SDK Key: <code className="bg-muted px-1 py-0.5 rounded">{sdkKey}</code>
                </div>
              )}
            </div>

            <Button
              disabled={!sdkKey || loading}
              onClick={handleOpenGame}
              className="mt-2"
            >
              {sdkKey ? "Open Sample Game" : "Waiting for SDK Key..."}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ConsoleLayout>
  );
}
