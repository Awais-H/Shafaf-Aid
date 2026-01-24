'use client';

/**
 * Loading state component
 * Premium dark loading screen with subtle animations
 */

import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Loading data...' }: LoadingStateProps) {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: '#050505' }}
    >
      <div className="text-center">
        {/* Animated globe/circle */}
        <div className="relative mb-8">
          {/* Outer glow ring */}
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(255,106,61,0.15) 0%, transparent 70%)',
              transform: 'scale(2)',
            }}
          />
          
          {/* Main spinner */}
          <div className="relative w-16 h-16">
            {/* Background circle */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
            
            {/* Spinning arc */}
            <svg className="w-16 h-16 animate-spin" style={{ animationDuration: '1.5s' }}>
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="rgba(255,106,61,0.8)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="80 200"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 
          className="text-2xl font-semibold mb-2"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          Shafaf
        </h2>
        
        {/* Loading message */}
        <p style={{ color: 'rgba(255,255,255,0.35)' }}>{message}</p>
      </div>
    </div>
  );
}
