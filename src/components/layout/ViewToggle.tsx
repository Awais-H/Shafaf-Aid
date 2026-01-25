'use client';

/**
 * View Toggle Component
 * Allows switching between 2D flat map and 3D globe views
 */

import React from 'react';

interface ViewToggleProps {
  view: '2d' | '3d';
  onChange: (view: '2d' | '3d') => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div 
      className="flex items-center gap-1 p-1 rounded-xl"
      style={{
        background: 'rgba(10, 10, 10, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* 3D Button */}
      <button
        onClick={() => onChange('3d')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
          ${view === '3d' 
            ? 'bg-white/10 text-white' 
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }
        `}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <line x1="12" y1="2" x2="12" y2="22" />
        </svg>
        <span>Globe</span>
      </button>
      
      {/* 2D Button */}
      <button
        onClick={() => onChange('2d')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
          ${view === '2d' 
            ? 'bg-white/10 text-white' 
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }
        `}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="12" y1="3" x2="12" y2="21" />
        </svg>
        <span>Map</span>
      </button>
    </div>
  );
}
