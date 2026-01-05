'use client';

import { TypeBreakdown } from '@/types/dashboard';

interface TypesOfWorkChartProps {
  data: TypeBreakdown[];
}

export default function TypesOfWorkChart({ data }: TypesOfWorkChartProps) {
  // Type icons and colors matching Jira
  const typeConfig: Record<string, { icon: JSX.Element; color: string }> = {
    budget: {
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: '#3B82F6'
    },
    asset: {
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: '#8B5CF6'
    },
    retrospective: {
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: '#EC4899'
    },
    report: {
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: '#F59E0B'
    },
    execution: {
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: '#10B981'
    },
  };

  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">Type</span>
        <span className="text-sm font-semibold text-gray-700">Distribution</span>
      </div>

      {/* Distribution Rows */}
      <div className="space-y-4">
        {data.map((item, index) => {
          const config = typeConfig[item.type] || {
            icon: (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            ),
            color: '#6B7280'
          };

          return (
            <div key={index} className="flex items-center gap-3">
              {/* Type name */}
              <div className="flex items-center gap-2 min-w-[140px]">
                <div
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
                  style={{ color: config.color }}
                >
                  {config.icon}
                </div>
                <span className="text-sm text-gray-900">{item.display_name}</span>
              </div>

              {/* Progress bar */}
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-1 h-6 bg-gray-200 rounded-sm overflow-hidden relative">
                  <div
                    className="h-full transition-all duration-500 ease-out flex items-center justify-end px-2"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: config.color
                    }}
                  >
                    {item.percentage > 15 && (
                      <span className="text-xs font-semibold text-white">
                        {item.percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-600 min-w-[40px] text-right">
                  {item.percentage < 15 ? `${item.percentage.toFixed(0)}%` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No work items found</p>
        </div>
      )}
    </div>
  );
}
