import React from 'react';

interface MetricsImpact {
  [needId: string]: {
    [metric: string]: number; // 0-1 impact score
  };
}

interface NeedsHeatmapProps {
  recommendations: any[];
  className?: string;
}

export function NeedsHeatmap({ recommendations, className = "" }: NeedsHeatmapProps) {
  // Extract metrics and create impact matrix
  const metrics = ['DAU', 'Retention', 'Revenue', 'ARPDAU', 'Session_Length', 'LTV'];
  const needsImpactMap: MetricsImpact = {
    'events_limited_time': {
      'DAU': 0.9,
      'Session_Length': 0.8,
      'Revenue': 0.7,
      'Retention': 0.6,
      'ARPDAU': 0.5,
      'LTV': 0.6
    },
    'battle_pass': {
      'Retention': 0.9,
      'ARPDAU': 0.8,
      'LTV': 0.9,
      'DAU': 0.7,
      'Session_Length': 0.6,
      'Revenue': 0.8
    },
    'dynamic_pricing': {
      'Revenue': 0.95,
      'ARPDAU': 0.9,
      'LTV': 0.6,
      'DAU': 0.3,
      'Session_Length': 0.2,
      'Retention': 0.3
    },
    'social_guilds': {
      'Retention': 0.95,
      'LTV': 0.9,
      'DAU': 0.7,
      'Session_Length': 0.7,
      'ARPDAU': 0.6,
      'Revenue': 0.7
    },
    'energy_optimization': {
      'DAU': 0.8,
      'ARPDAU': 0.7,
      'Session_Length': 0.6,
      'Retention': 0.5,
      'Revenue': 0.6,
      'LTV': 0.5
    }
  };

  const getImpactColor = (impact: number) => {
    if (impact >= 0.8) return 'bg-purple-600';
    if (impact >= 0.6) return 'bg-purple-500';
    if (impact >= 0.4) return 'bg-purple-400';
    if (impact >= 0.2) return 'bg-purple-300';
    return 'bg-gray-600';
  };

  const getImpactOpacity = (impact: number) => {
    return Math.max(0.3, impact);
  };

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
      <h3 className="text-xl font-semibold text-white mb-6">Needs ↔ Metrics Impact Heatmap</h3>
      
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            <div className="text-sm font-medium text-gray-400"></div>
            {metrics.map(metric => (
              <div key={metric} className="text-sm font-medium text-gray-300 text-center">
                {metric.replace('_', ' ')}
              </div>
            ))}
          </div>

          {/* Heatmap Rows */}
          {recommendations.slice(0, 5).map((rec, index) => {
            // Use category name to find impacts, fallback to index-based approach
            const categoryKey = rec.category?.toLowerCase().replace(/[^\w]/g, '_') || `category_${index}`;
            const impacts = needsImpactMap[categoryKey] || needsImpactMap[Object.keys(needsImpactMap)[index]] || {};
            return (
              <div key={rec.category || index} className="grid grid-cols-7 gap-2 mb-2">
                <div className="text-sm text-white font-medium py-2 pr-4 truncate">
                  {rec.category}
                </div>
                {metrics.map(metric => {
                  const impact = impacts[metric] || 0;
                  return (
                    <div 
                      key={metric}
                      className={`h-8 rounded ${getImpactColor(impact)} flex items-center justify-center`}
                      style={{ opacity: getImpactOpacity(impact) }}
                      title={`${rec.category} → ${metric}: ${Math.round(impact * 100)}% impact`}
                    >
                      <span className="text-white text-xs font-bold">
                        {Math.round(impact * 100)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Impact strength: Higher numbers = stronger influence on metric
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">Low</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-gray-600 rounded"></div>
            <div className="w-4 h-4 bg-purple-300 rounded"></div>
            <div className="w-4 h-4 bg-purple-400 rounded"></div>
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <div className="w-4 h-4 bg-purple-600 rounded"></div>
          </div>
          <span className="text-gray-400">High</span>
        </div>
      </div>
    </div>
  );
}