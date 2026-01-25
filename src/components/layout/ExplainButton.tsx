'use client';

import { useViewStore } from '@/app_state/viewStore';

interface ExplainButtonProps {
  opacity?: number;
}

export default function ExplainButton({ opacity = 1 }: ExplainButtonProps) {
  const toggleExplainDrawer = useViewStore((state) => state.toggleExplainDrawer);

  return (
    <button
      onClick={toggleExplainDrawer}
      className="fixed left-4 bottom-4 z-40 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all duration-200"
      style={{ opacity }}
      aria-label="Explain"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </button>
  );
}
