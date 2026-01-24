'use client';

/**
 * Hero Section Component
 * "Shafaf" title positioned behind the globe
 */

import React from 'react';

interface HeroSectionProps {
  opacity?: number; // 0-1, controlled by scroll/zoom
  visible?: boolean;
}

export default function HeroSection({ opacity = 1, visible = true }: HeroSectionProps) {
  if (!visible && opacity <= 0) return null;
  
  return (
    <div 
      className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none"
      style={{
        opacity: opacity,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      {/* Title - positioned to be partially behind globe */}
      <h1 
        className="text-8xl md:text-9xl lg:text-[12rem] xl:text-[14rem] font-semibold tracking-tight text-center select-none"
        style={{
          color: 'rgba(255, 255, 255, 0.45)',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          letterSpacing: '-0.03em',
          transform: 'translateY(-10%)',
        }}
      >
        Shafaf
      </h1>
    </div>
  );
}
