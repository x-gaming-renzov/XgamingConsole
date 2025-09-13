import React from 'react';

interface ModePillProps {
  mode: 'Sparrow' | 'Shifu';
  className?: string;
}

export function ModePill({ mode, className = "" }: ModePillProps) {
  const isSpanrow = mode === 'Sparrow';
  
  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
        isSpanrow 
          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' 
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      } ${className}`}
      data-testid={`mode-pill-${mode.toLowerCase()}`}
    >
      <span className="text-base">{isSpanrow ? '🏴‍☠️' : '🐼'}</span>
      <span>{mode}</span>
    </span>
  );
}