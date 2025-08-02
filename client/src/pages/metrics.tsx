import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConsoleLayout from "@/components/console-layout";
import { 
  Plus, 
  BarChart3, 
  Search,
  TrendingUp,
  Users,
  Calculator,
  Repeat
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Metric {
  pid: string;
  name: string;
  description: string;
  type: 'count' | 'aggregation' | 'ratio' | 'retention';
  created_at: string;
  updated_at: string;
  status: 'active' | 'draft';
}

const getMetricTypeIcon = (type: string) => {
  switch (type) {
    case 'count':
      return <Users className="w-4 h-4" />;
    case 'aggregation':
      return <Calculator className="w-4 h-4" />;
    case 'ratio':
      return <TrendingUp className="w-4 h-4" />;
    case 'retention':
      return <Repeat className="w-4 h-4" />;
    default:
      return <BarChart3 className="w-4 h-4" />;
  }
};

const getMetricTypeColor = (type: string) => {
  switch (type) {
    case 'count':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'aggregation':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'ratio':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'retention':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatMetricType = (type: string) => {
  switch (type) {
    case 'count':
      return 'Count';
    case 'aggregation':
      return 'Aggregation';
    case 'ratio':
      return 'Ratio';
    case 'retention':
      return 'Retention';
    default:
      return type;
  }
};

export default function Metrics() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: metrics, isLoading } = useQuery<Metric[]>({
    queryKey: ["/api/metrics"],
  });

  // Filter metrics based on search query
  const filteredMetrics = metrics?.filter(metric =>
    metric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    metric.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    metric.type.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <>
      <ConsoleLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Metrics</h1>
              <p className="text-muted-foreground">Track and analyze key performance indicators</p>
            </div>
            <Button onClick={() => window.location.href = '/metrics/builder'} className="text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Metric
            </Button>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Metrics List */}
          <Card>
            <CardContent className="py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredMetrics && filteredMetrics.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMetrics.map((metric) => (
                      <TableRow 
                        key={metric.pid} 
                        className="group hover:bg-accent/30 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/metrics/builder?id=${metric.pid}`}
                      >
                        <TableCell>
                          <div className="flex items-center">
                            <div className="font-medium text-foreground">{metric.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs line-clamp-2">
                            {metric.description || "No description"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-medium ${getMetricTypeColor(metric.type)}`}
                          >
                            {formatMetricType(metric.type)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchQuery ? "No metrics found" : "No metrics yet"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? "Try adjusting your search terms" 
                      : "Create your first metric to start tracking key performance indicators."
                    }
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => window.location.href = '/metrics/builder'} className="text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Metric
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ConsoleLayout>
    </>
  );
} 