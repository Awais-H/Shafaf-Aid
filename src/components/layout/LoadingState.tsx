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
        {/* Loading spinner */}
        <div className="relative mb-6">
          <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin" />
        </div>

        {/* Loading text */}
        <h2 className="text-xl font-semibold text-white mb-2">Shafaf Aid</h2>
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
}
