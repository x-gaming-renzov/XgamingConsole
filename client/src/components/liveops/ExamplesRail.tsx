import React from 'react';
import { ExternalLink } from 'lucide-react';

interface ExampleStudio {
  studio: string;
  game: string;
  example: string;
}

interface ExamplesRailProps {
  examples: ExampleStudio[];
  title?: string;
  className?: string;
}

export function ExamplesRail({ examples, title = "Studio Examples", className = "" }: ExamplesRailProps) {
  if (!examples || examples.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        {title}
        <ExternalLink className="w-4 h-4 text-gray-400" />
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {examples.map((example, idx) => (
          <div 
            key={idx}
            className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors duration-200"
          >
            <div className="mb-2">
              <h4 className="font-semibold text-white text-sm">{example.studio}</h4>
              <p className="text-blue-400 text-sm">{example.game}</p>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">{example.example}</p>
          </div>
        ))}
      </div>
      
      {examples.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No examples available for this genre combination.</p>
        </div>
      )}
    </div>
  );
}