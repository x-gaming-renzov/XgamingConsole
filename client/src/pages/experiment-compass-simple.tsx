import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Compass, Search, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ExperimentCompassSimple() {
  const [input, setInput] = useState("");
  const [playStoreUrl, setPlayStoreUrl] = useState("");

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold">Experiment Compass</h1>
        <p className="text-gray-400">Choose between describing your experiment or mining app store reviews</p>
      </div>

      {/* Tabs */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <Tabs defaultValue="experiment">
            <TabsList className="grid grid-cols-2 bg-gray-700">
              <TabsTrigger value="experiment">
                <Compass className="w-4 h-4 mr-2" />
                Describe Experiment
              </TabsTrigger>
              <TabsTrigger value="reviews">
                <Search className="w-4 h-4 mr-2" />
                Review Miner
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="experiment" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Describe your experiment</h3>
                <Textarea
                  placeholder="e.g., Compare PvP vs Rumble event modes to boost revenue while protecting D7 retention"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="bg-gray-700 border-gray-600"
                />
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Get Recommendation
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Mine app store reviews</h3>
                <Textarea
                  placeholder="https://play.google.com/store/apps/details?id=com.example.app"
                  value={playStoreUrl}
                  onChange={(e) => setPlayStoreUrl(e.target.value)}
                  className="bg-gray-700 border-gray-600"
                />
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Mine Reviews
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}