'use client';

/**
 * Loading state component for AidGap
 * Shows during data loading
 */

import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Loading data...' }: LoadingStateProps) {
  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Animated logo */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-2xl">AG</span>
          </div>
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-xl border-2 border-red-500/50 animate-ping" />
        </div>

        {/* Loading text */}
        <h2 className="text-xl font-semibold text-white mb-2">Shafaf Aid</h2>
        <p className="text-gray-400">{message}</p>

        {/* Progress indicator */}
        <div className="mt-6 flex items-center justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
