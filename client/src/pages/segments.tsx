import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConsoleLayout from "@/components/console-layout";
import SegmentForm from "@/components/segment-form";
import { 
  Plus, 
  Users, 
  Search
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Segment {
  id: string;
  name: string;
  description: string;
  rule_config: {
    conditions: Array<{
      field: string;
      operator: string;
      value: string | string[] | number | boolean;
    }>;
  };
  createdAt: string;
  experienceCount: number;
}

export default function Segments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSegmentForm, setShowSegmentForm] = useState(false);

  const { data: segments, isLoading } = useQuery<Segment[]>({
    queryKey: ["/api/segments"],
  });

  const formatRulesDisplay = (ruleConfig: any) => {
    if (!ruleConfig || !ruleConfig.conditions || !Array.isArray(ruleConfig.conditions)) {
      return "No rules defined";
    }

    const formatCondition = (condition: any) => {
      const value = Array.isArray(condition.value) ? condition.value.join(", ") : condition.value;
      return `${condition.field} ${condition.operator} ${value}`;
    };

    // Show first 2 conditions and add "..." if there are more
    const conditions = ruleConfig.conditions.slice(0, 2).map(formatCondition);
    if (ruleConfig.conditions.length > 2) {
      conditions.push(`+${ruleConfig.conditions.length - 2} more`);
    }
    
    return conditions.join("\nAND ");
  };

  // Filter segments based on search query
  const filteredSegments = segments?.filter(segment =>
    segment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    segment.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <>
      <ConsoleLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
      <div className="flex items-center justify-between">
        <div>
              <h1 className="text-2xl font-bold text-foreground">Segments</h1>
          <p className="text-muted-foreground">Define player groups for targeted experiences</p>
        </div>
            <Button onClick={() => setShowSegmentForm(true)} className="text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Segment
            </Button>
        </div>

          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                placeholder="Search segments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                  />
                </div>
              </div>

          {/* Segments List */}
          <Card>
            <CardContent className="py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredSegments && filteredSegments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Rules</TableHead>
                      <TableHead>Experiences</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSegments.map((segment) => (
                      <TableRow 
                        key={segment.id} 
                        className="group hover:bg-accent/30 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/segments/${segment.id}`}
                      >
                        <TableCell>
                          <div className="font-medium text-foreground">{segment.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs line-clamp-2">
                            {segment.description || "No description"}
                              </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground font-mono max-w-md whitespace-pre-wrap">
                            {formatRulesDisplay(segment.rule_config)}
                            </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {segment.experienceCount} experiences
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchQuery ? "No segments found" : "No segments yet"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? "Try adjusting your search terms" 
                      : "Create one to target an Experience at the right audience."
                    }
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setShowSegmentForm(true)} className="text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Segment
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ConsoleLayout>

      <SegmentForm 
        open={showSegmentForm}
        onClose={() => setShowSegmentForm(false)}
      />
    </>
  );
}