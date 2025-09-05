import React from 'react';
import { ModePill } from './ModePill';

interface Recommendation {
  category: string;
  what: string;
  why_this_game: string;
  business_metrics: Array<{
    metric: string;
    weight: number;
  }>;
  business_impact_score: number;
  impact_score_1_to_10: number;
  commonality: {
    count: number;
    percent: number;
  };
  expected_lift_band: string;
  risks_guardrails: string[];
  assumptions: string;
  evidence: Array<{
    studio: string;
    page: number;
  }>;
  confidence: string;
  mode: 'Sparrow' | 'Shifu';
  allocation_method: string;
  stat_output: string;
  why_this_mode: string;
}

interface CategoryCardProps {
  recommendation: Recommendation;
  className?: string;
}

export function CategoryCard({ recommendation, className = "" }: CategoryCardProps) {
  const {
    category,
    what,
    why_this_game,
    business_metrics,
    business_impact_score,
    impact_score_1_to_10,
    commonality,
    expected_lift_band,
    risks_guardrails,
    assumptions,
    evidence,
    confidence,
    mode,
    allocation_method,
    stat_output,
    why_this_mode
  } = recommendation;

  return (
    <div 
      className={`bg-gray-800 rounded-lg border border-gray-700 p-6 hover:bg-gray-750 transition-colors duration-200 ${className}`}
      data-testid={`category-card-${category.replace(/\W+/g, '-').toLowerCase()}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-white">{category}</h3>
            <ModePill mode={mode} />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-purple-400 font-medium">
              Business Impact: {business_impact_score}/100
            </span>
            <span className="text-blue-400 font-medium">
              Impact: {impact_score_1_to_10}/10
            </span>
            <span className="text-green-400 font-medium">
              Commonality: {commonality.percent}%
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{business_impact_score}</div>
          <div className="text-xs text-gray-400">Business Impact</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-300 mb-4 leading-relaxed">{what}</p>

      {/* Why This Game */}
      <div className="bg-gray-700 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-semibold text-purple-400 mb-2">Why This Game</h4>
        <p className="text-gray-200 text-sm">{why_this_game}</p>
      </div>

      {/* Business Impact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-green-400 mb-2">Expected Lift</h4>
          <p className="text-white font-bold">{expected_lift_band}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-yellow-400 mb-2">Confidence</h4>
          <p className="text-gray-300">{confidence}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-blue-400 mb-2">Key Metrics</h4>
          <div className="flex flex-wrap gap-1">
            {business_metrics.slice(0, 2).map((metricObj, idx) => (
              <span 
                key={idx}
                className="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded"
              >
                {metricObj.metric}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Mode & Allocation */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-orange-400 mb-2">Implementation</h4>
        <div className="space-y-1 text-sm">
          <p className="text-gray-300"><strong>Method:</strong> {allocation_method}</p>
          <p className="text-gray-300"><strong>Output:</strong> {stat_output}</p>
          <p className="text-gray-200 text-xs">{why_this_mode}</p>
        </div>
      </div>

      {/* Assumptions */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-cyan-400 mb-2">Assumptions</h4>
        <p className="text-gray-300 text-sm">{assumptions}</p>
      </div>

      {/* Risks */}
      {risks_guardrails && risks_guardrails.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-400 mb-2">Key Risks</h4>
          <div className="flex flex-wrap gap-2">
            {risks_guardrails.slice(0, 3).map((risk, idx) => (
              <span 
                key={idx}
                className="px-2 py-1 bg-red-900/30 text-red-300 text-xs rounded"
              >
                {risk}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}