'use client';

import { PriorityBreakdown } from '@/types/dashboard';

interface PriorityBreakdownChartProps {
  data: PriorityBreakdown[];
}

export default function PriorityBreakdownChart({ data }: PriorityBreakdownChartProps) {
  // Find the maximum count for scaling
  const maxCount = Math.max(...data.map(item => item.count), 1);
  const chartHeight = 260;

  // Priority colors, icons and display names matching Jira
  const priorityConfig: Record<string, { color: string; icon: JSX.Element; displayName: string }> = {
    HIGHEST: {
      color: '#DC2626',
      displayName: 'Highest',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 1l-1.5 1.5L10.793 6.793H2v2h8.793L6.5 13.086 8 14.586 14.586 8z"/>
        </svg>
      )
    },
    HIGH: {
      color: '#EA580C',
      displayName: 'High',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 3l-1.5 1.5 3.293 3.293H2v2h7.793L6.5 13.086 8 14.586 14.586 8z"/>
        </svg>
      )
    },
    MEDIUM: {
      color: '#6B7280',
      displayName: 'Medium',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2 7h12v2H2z"/>
        </svg>
      )
    },
    LOW: {
      color: '#2563EB',
      displayName: 'Low',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 13l1.5-1.5-3.293-3.293H14v-2H6.207l3.293-3.293L8 1.414 1.414 8z"/>
        </svg>
      )
    },
    LOWEST: {
      color: '#10B981',
      displayName: 'Lowest',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15l1.5-1.5L5.207 9.207H14v-2H5.207l4.293-4.293L8 1.414 1.414 8z"/>
        </svg>
      )
    },
  };

  return (
    <div className="space-y-4">
      {/* Vertical Bar Chart */}
      <div className="relative pt-4" style={{ height: chartHeight }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-10 flex flex-col justify-between text-xs text-gray-500">
          <span>{maxCount}</span>
          <span>{Math.floor(maxCount / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart bars */}
        <div className="ml-8 h-full flex items-end justify-around gap-4 border-b border-gray-300 pb-2">
          {data.map((item) => {
            const config = priorityConfig[item.priority] || priorityConfig.MEDIUM;
            const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const barHeight = `${percentage}%`;

            return (
              <div key={item.priority} className="flex-1 flex flex-col items-center group relative">
                {/* Tooltip on hover */}
                {item.count > 0 && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                    {config.displayName}
                    <div className="font-semibold">{item.count}</div>
                  </div>
                )}

                {/* Bar */}
                <div
                  className="w-full max-w-[60px] rounded-t transition-all duration-500 ease-out relative group-hover:opacity-80"
                  style={{
                    height: barHeight,
                    backgroundColor: config.color,
                    minHeight: item.count > 0 ? '4px' : '0px'
                  }}
                >
                  {/* Count label inside bar for taller bars */}
                  {item.count > 0 && percentage > 20 && (
                    <div className="absolute inset-x-0 top-2 text-center">
                      <span className="text-xs font-semibold text-white">{item.count}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="ml-8 mt-2 flex items-start justify-around gap-4">
          {data.map((item) => {
            const config = priorityConfig[item.priority] || priorityConfig.MEDIUM;
            return (
              <div key={item.priority} className="flex-1 flex flex-col items-center text-center">
                <div className="text-gray-600 mb-1" style={{ color: config.color }}>
                  {config.icon}
                </div>
                <span className="text-xs text-gray-700 font-medium">{config.displayName}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
