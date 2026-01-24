'use client';

/**
 * Side panel component for AidGap
 * Shows region details when a region is selected
 */

import React from 'react';
import { useViewStore } from '@/app_state/viewStore';
import type { RegionDetail } from '@/core/data/schema';
import { COVERAGE_COLORS, NEED_FACTORS } from '@/core/graph/constants';
import { getInterpolatedCoverageColor } from '@/app_state/selectors';
import MetricCard from '../ui/MetricCard';
import BarBreakdown from '../ui/BarBreakdown';
import TopList from '../ui/TopList';

interface SidePanelProps {
  detail: RegionDetail | null;
  isLoading?: boolean;
}

export default function SidePanel({ detail, isLoading }: SidePanelProps) {
  const sidePanelOpen = useViewStore((state) => state.sidePanelOpen);
  const closeSidePanel = useViewStore((state) => state.closeSidePanel);

  if (!sidePanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={closeSidePanel}
      />

      {/* Panel */}
      <div className="fixed right-0 top-16 bottom-0 w-96 bg-gray-900 border-l border-gray-700 z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {detail?.regionName || 'Loading...'}
            </h2>
            {detail && (
              <p className="text-sm text-gray-400">{detail.countryName}</p>
            )}
          </div>
          <button
            onClick={closeSidePanel}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : detail ? (
            <div className="p-4 space-y-4">
              {/* Coverage Index Card */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">Coverage Index</h3>
                  <CoverageIndicator value={detail.normalizedCoverage} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">
                    {(detail.normalizedCoverage * 100).toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500">
                    (raw: {detail.coverageIndex.toFixed(3)})
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Relative to other regions in this country
                </p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Population"
                  value={formatNumber(detail.population)}
                  icon="users"
                />
                <MetricCard
                  label="Need Level"
                  value={detail.needLevel.toUpperCase()}
                  subvalue={`Factor: ×${NEED_FACTORS[detail.needLevel]}`}
                  icon="alert"
                  highlight={detail.needLevel === 'high'}
                />
                <MetricCard
                  label="Organizations"
                  value={detail.organizations.length.toString()}
                  icon="building"
                />
                <MetricCard
                  label="Overlap Intensity"
                  value={`${(detail.overlapIntensity * 100).toFixed(0)}%`}
                  subvalue="Org density"
                  icon="layers"
                />
              </div>

              {/* Aid Type Breakdown */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Aid Type Distribution
                </h3>
                <BarBreakdown
                  items={detail.aidTypes.map((t) => ({
                    label: t.aidType.charAt(0).toUpperCase() + t.aidType.slice(1),
                    value: t.count,
                    percentage: t.percentage,
                    color: getAidTypeColor(t.aidType),
                  }))}
                />
              </div>

              {/* Organizations List */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Organizations Operating ({detail.organizations.length})
                </h3>
                <TopList
                  items={detail.organizations.map((org) => ({
                    id: org.orgId,
                    name: org.orgName,
                    value: org.projectCount,
                    subtext: org.aidTypes.join(', '),
                  }))}
                  maxItems={10}
                />
              </div>

              {/* Synthetic Data Notice */}
              <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="text-xs text-yellow-400 font-medium">
                      Synthetic Demo Data
                    </p>
                    <p className="text-xs text-yellow-400/70 mt-0.5">
                      This data is generated for demonstration purposes and does
                      not represent real aid coverage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function CoverageIndicator({ value }: { value: number }) {
  const color = getInterpolatedCoverageColor(value);
  const label = value < 0.33 ? 'High Gap' : value < 0.66 ? 'Medium' : 'Well Covered';
  
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.3)`,
        color: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
      }}
    >
      {label}
    </span>
  );
}

function getAidTypeColor(aidType: string): string {
  switch (aidType) {
    case 'food':
      return '#22c55e'; // green
    case 'medical':
      return '#ef4444'; // red
    case 'infrastructure':
      return '#3b82f6'; // blue
    default:
      return '#6b7280'; // gray
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}
