'use client';

import { StatusOverview } from '@/types/dashboard';

interface StatusOverviewChartProps {
  data: StatusOverview;
}

export default function StatusOverviewChart({ data }: StatusOverviewChartProps) {
  const { total_work_items, breakdown } = data;

  // Calculate percentages and cumulative for SVG path
  let cumulative = 0;
  const segments = breakdown.map((item) => {
    const percentage = total_work_items > 0 ? (item.count / total_work_items) * 100 : 0;
    const segment = {
      ...item,
      percentage,
      startAngle: cumulative * 3.6, // Convert percentage to degrees
    };
    cumulative += percentage;
    return segment;
  });

  // SVG donut chart parameters
  const size = 200;
  const strokeWidth = 35;
  const radius = (size - strokeWidth) / 2;

  // Function to create SVG arc path
  const createArc = (startAngle: number, percentage: number) => {
    const endAngle = startAngle + percentage * 3.6;
    const largeArc = percentage > 50 ? 1 : 0;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = size / 2 + radius * Math.cos(startRad);
    const y1 = size / 2 + radius * Math.sin(startRad);
    const x2 = size / 2 + radius * Math.cos(endRad);
    const y2 = size / 2 + radius * Math.sin(endRad);

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  return (
    <div className="flex items-center gap-8">
      {/* Donut Chart */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {segments.map((segment, index) => (
            <path
              key={index}
              d={createArc(segment.startAngle, segment.percentage)}
              fill="none"
              stroke={segment.color || '#94A3B8'}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
            />
          ))}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-gray-900">{total_work_items}</div>
          <div className="text-xs text-gray-500 mt-1 max-w-[100px] text-center leading-tight">
            Total work item{total_work_items !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-3">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-sm flex-shrink-0"
              style={{ backgroundColor: segment.color || '#94A3B8' }}
            ></div>
            <div className="flex items-baseline gap-2 flex-1">
              <span className="text-sm text-gray-900 font-medium">{segment.display_name}:</span>
              <span className="text-sm font-semibold text-gray-900">{segment.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
