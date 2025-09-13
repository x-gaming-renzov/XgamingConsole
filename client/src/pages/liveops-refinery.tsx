import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Copy, Download } from 'lucide-react';
import { CategoryCard } from '@/components/liveops/CategoryCard';
import { ModePill } from '@/components/liveops/ModePill';
import { NeedsHeatmap } from '@/components/liveops/NeedsHeatmap';
import { ExamplesRail } from '@/components/liveops/ExamplesRail';

interface AppAnalysis {
  appId: string;
  title: string;
  developer: string;
  genre: string;
  description: string;
  features: string[];
  monetization: string;
  detectedGenre: string;
  ratings: {
    average: number;
    count: number;
  };
}

interface Recommendation {
  id: string;
  title: string;
  category: string;
  description: string;
  business_impact: {
    primary_metrics: string[];
    expected_lift: string;
    implementation_effort: string;
  };
  recommendedMode: 'Sparrow' | 'Shifu';
  needStatement: string;
  fitReason: string;
  score: number;
  exampleStudios: Array<{
    studio: string;
    game: string;
    example: string;
  }>;
  risks: string[];
}

interface LiveOpsResponse {
  recommendations: Recommendation[];
  metadata: {
    analysisDate: string;
    totalRecommendations: number;
    categories: string[];
  };
}

async function analyzeApp(playStoreUrl: string): Promise<AppAnalysis> {
  const response = await fetch("/api/liveops/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playStoreUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to analyze app");
  }

  return response.json();
}

async function getRecommendations(appAnalysis: AppAnalysis): Promise<LiveOpsResponse> {
  const response = await fetch("/api/liveops/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appAnalysis }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get recommendations");
  }

  return response.json();
}

export default function LiveOpsRefinery() {
  const [playStoreUrl, setPlayStoreUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [appAnalysis, setAppAnalysis] = useState<AppAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<LiveOpsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!playStoreUrl.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setAppAnalysis(null);
    setRecommendations(null);

    try {
      // Step 1: Analyze the app
      const analysis = await analyzeApp(playStoreUrl);
      setAppAnalysis(analysis);

      // Step 2: Get recommendations
      const recs = await getRecommendations(analysis);
      setRecommendations(recs);
    } catch (err) {
      console.error("LiveOps analysis failed:", err);
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportJSON = () => {
    if (!recommendations) return;
    
    const data = {
      appAnalysis,
      experiments: (recommendations as any).experiments || [],
      leaderboard: (recommendations as any).leaderboard || [],
      rankings: (recommendations as any).rankings || {},
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liveops-recommendations-${appAnalysis?.appId || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = async () => {
    if (!recommendations) return;
    
    const summary = (recommendations as any).experiments?.map((rec: any, idx: number) => 
      `${idx + 1}. ${rec.category} (${rec.mode})\n   ${rec.what}\n   Business Impact: ${rec.business_impact_score}/100\n`
    ).join('\n') || '';
    
    try {
      await navigator.clipboard.writeText(summary);
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-purple-600 p-3 rounded-full">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            LiveOps <span className="text-purple-400">Refinery</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Paste a Play Store URL to analyze your game and get AI-powered LiveOps recommendations with evidence from top studios.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
          <label className="block text-lg font-medium text-white mb-4">
            Google Play Store URL
          </label>
          <div className="flex gap-4">
            <input
              type="url"
              value={playStoreUrl}
              onChange={(e) => setPlayStoreUrl(e.target.value)}
              placeholder="https://play.google.com/store/apps/details?id=your.game.id"
              className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              data-testid="input-play-store-url"
            />
            <Button
              onClick={handleAnalyze}
              disabled={!playStoreUrl.trim() || isAnalyzing}
              className="bg-purple-600 hover:bg-purple-700 px-8 py-3 flex items-center gap-2"
              data-testid="button-analyze-app"
            >
              <Search className="w-5 h-5" />
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">!</span>
              </div>
              <div>
                <h3 className="text-red-400 font-medium">Analysis Failed</h3>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Analyzing app and generating recommendations...</p>
          </div>
        )}

        {/* App Analysis Summary */}
        {appAnalysis && !isAnalyzing && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{appAnalysis.title}</h2>
                <p className="text-gray-400">{appAnalysis.developer}</p>
              </div>
              <div className="text-right">
                <div className="text-yellow-400 font-bold text-lg">
                  ★ {appAnalysis.ratings.average.toFixed(1)}
                </div>
                <div className="text-gray-400 text-sm">
                  {appAnalysis.ratings.count.toLocaleString()} reviews
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-semibold text-purple-400 mb-2">Detected Genre</h4>
                <p className="text-white capitalize">{appAnalysis.detectedGenre}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-400 mb-2">Monetization</h4>
                <p className="text-white capitalize">{appAnalysis.monetization}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-green-400 mb-2">Detected Features</h4>
                <div className="flex flex-wrap gap-1">
                  {appAnalysis.features.slice(0, 4).map((feature, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-1 bg-green-900/30 text-green-300 text-xs rounded"
                    >
                      {feature}
                    </span>
                  ))}
                  {appAnalysis.features.length > 4 && (
                    <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded">
                      +{appAnalysis.features.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {recommendations && !isAnalyzing && (
          <div className="space-y-8">
            {/* Export Actions */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">
                Top 5 LiveOps Recommendations
              </h2>
              <div className="flex gap-3">
                <Button
                  onClick={handleCopyToClipboard}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  data-testid="button-copy-recommendations"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Summary
                </Button>
                <Button
                  onClick={handleExportJSON}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  data-testid="button-export-json"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
              </div>
            </div>

            {/* Recommendations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {((recommendations as any).experiments || []).map((rec: any, index: number) => (
                <CategoryCard key={rec.category || index} recommendation={rec} />
              ))}
            </div>

            {/* Needs Heatmap */}
            <NeedsHeatmap recommendations={(recommendations as any).experiments || []} />

            {/* Examples Rail */}
            <ExamplesRail 
              examples={((recommendations as any).experiments || []).flatMap((r: any) => r.evidence || []).slice(0, 6)}
              title="Implementation Examples from Top Studios"
            />
          </div>
        )}
      </div>
    </div>
  );
}