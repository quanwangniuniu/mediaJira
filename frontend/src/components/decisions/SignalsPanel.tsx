'use client';

import { useMemo } from 'react';

export interface MockSignal {
  id: number;
  type: string;
  title: string;
  detail: string;
}

const MOCK_SIGNALS: MockSignal[] = [
  {
    id: 1,
    type: 'Performance',
    title: 'ROAS dropped 18% week over week',
    detail: 'US prospecting campaigns underperforming',
  },
  {
    id: 2,
    type: 'Performance',
    title: 'CPA rising for Meta retargeting',
    detail: 'Attribution window adjustment impacted',
  },
  {
    id: 3,
    type: 'Client Change',
    title: 'Client shifted focus to subscriptions',
    detail: 'Need to emphasize retention offers',
  },
  {
    id: 4,
    type: 'Intuition',
    title: 'Creative fatigue likely in video ads',
    detail: 'High frequency with stagnant CTR',
  },
  {
    id: 5,
    type: 'Platform',
    title: 'Google Ads policy update on claims',
    detail: 'Copy needs compliance review',
  },
  {
    id: 6,
    type: 'Client Change',
    title: 'Client requested channel diversification',
    detail: 'Expand to TikTok and YouTube',
  },
];

interface SignalsPanelProps {
  selectedSignalIds: number[];
  onToggle: (signalId: number) => void;
  readOnly?: boolean;
}

const SignalsPanel = ({
  selectedSignalIds,
  onToggle,
  readOnly = false,
}: SignalsPanelProps) => {
  const grouped = useMemo(() => {
    return MOCK_SIGNALS.reduce<Record<string, MockSignal[]>>((acc, signal) => {
      if (!acc[signal.type]) acc[signal.type] = [];
      acc[signal.type].push(signal);
      return acc;
    }, {});
  }, []);

  return (
    <div className="h-full overflow-y-auto border-r border-gray-200 bg-white">
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Signals</h3>
        <p className="mt-1 text-xs text-gray-500">
          Reference-only signals. Select the relevant ones for context.
        </p>
      </div>
      <div className="space-y-4 px-4 pb-4">
        {Object.entries(grouped).map(([type, signals]) => (
          <div key={type} className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {type}
            </div>
            <div className="space-y-2">
              {signals.map((signal) => {
                const checked = selectedSignalIds.includes(signal.id);
                return (
                  <label
                    key={signal.id}
                    className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition ${
                      checked
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {signal.title}
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => (readOnly ? null : onToggle(signal.id))}
                        disabled={readOnly}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                    </div>
                    <span className="text-xs text-gray-500">{signal.detail}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SignalsPanel;
