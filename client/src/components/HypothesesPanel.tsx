import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Hypothesis } from "@shared/schema";
import { FlaskConical, CheckCircle2 } from "lucide-react";

export function HypothesesPanel({ hypotheses }: { hypotheses: Hypothesis[] }) {
  if (!hypotheses?.length) return null;
  
  return (
    <div className="space-y-3">
      <h3 className="text-xl font-bold flex items-center gap-2 text-purple-300">
        <FlaskConical className="w-5 h-5" /> Hypotheses
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        {hypotheses.map((h) => (
          <Card key={h.id} className="bg-gray-900 border-gray-700 rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600/70">{h.id}</Badge>
                <Badge variant="outline" className="border-gray-600 text-gray-300">
                  {(h.confidence * 100).toFixed(0)}% confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-1 space-y-3">
              <div className="text-base font-semibold">{h.title}</div>
              <p className="text-gray-300">{h.statement}</p>
              <div className="flex flex-wrap gap-2">
                {h.drivers.map((d) => (
                  <Badge key={`drv-${d}`} className="bg-blue-600/30 text-blue-200">{d}</Badge>
                ))}
                {h.tags?.map((t) => (
                  <Badge key={`tag-${t}`} variant="outline" className="border-gray-600 text-gray-300">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Affects: {h.metrics_affected.join(" • ")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default HypothesesPanel;