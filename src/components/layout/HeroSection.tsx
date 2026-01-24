'use client';

/**
 * Hero Section Component
 * Glassmorphism card with "Shafaf" title that fades on scroll
 */

import React from 'react';

interface HeroSectionProps {
  opacity?: number; // 0-1, controlled by scroll
  visible?: boolean;
}

export default function HeroSection({ opacity = 1, visible = true }: HeroSectionProps) {
  if (!visible && opacity <= 0) return null;
  
  return (
    <div 
      className="fixed inset-0 z-20 flex items-start justify-center pointer-events-none"
      style={{
        opacity: opacity,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      {/* Glassmorphism Card */}
      <div 
        className="mt-8 px-16 py-12 rounded-3xl"
        style={{
          background: 'rgba(10, 10, 10, 0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 0 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Title */}
        <h1 
          className="text-7xl md:text-8xl lg:text-9xl font-semibold tracking-tight text-center"
          style={{
            color: 'rgba(255, 255, 255, 0.55)',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          Shafaf
        </h1>
        
        {/* Subtitle */}
        <p 
          className="mt-4 text-center text-lg"
          style={{
            color: 'rgba(255, 255, 255, 0.35)',
          }}
        >
          Humanitarian Aid Coverage Explorer
        </p>
      </div>
    </div>
  );
}
