'use client';

import ExecutionPanel from '@/components/decisions/ExecutionPanel';
import SignalsPanel from '@/components/decisions/SignalsPanel';
import type {
  DecisionCommittedResponse,
  DecisionSignalDraft,
  DecisionOptionDraft,
} from '@/types/decision';

const statusColor = (status: string) => {
  switch (status) {
    case 'AWAITING_APPROVAL':
      return 'bg-blue-100 text-blue-800';
    case 'COMMITTED':
      return 'bg-emerald-100 text-emerald-800';
    case 'REVIEWED':
      return 'bg-purple-100 text-purple-800';
    case 'ARCHIVED':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const groupSignals = (signals: DecisionSignalDraft[]) => {
  return signals.reduce<Record<string, DecisionSignalDraft[]>>((acc, signal) => {
    const key = signal.type || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(signal);
    return acc;
  }, {});
};

interface DecisionDetailViewProps {
  decision: DecisionCommittedResponse;
}

const DecisionDetailView = ({ decision }: DecisionDetailViewProps) => {
  const hasSignals = Array.isArray(decision.signals) && decision.signals.length > 0;
  const groupedSignals = hasSignals ? groupSignals(decision.signals!) : {};
  const options = (decision.options || []) as DecisionOptionDraft[];
  const selectedOption = options.find((option) => option.isSelected);

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {decision.status === 'AWAITING_APPROVAL' ? (
        <div className="border-b border-blue-100 bg-blue-50 px-6 py-3 text-sm text-blue-800">
          <span className="font-semibold">Pending approval.</span>{' '}
          This decision was submitted and is waiting for approval.
        </div>
      ) : null}
      <div className="flex flex-1 min-h-0">
        <div className="h-full w-[24%] min-w-[240px] max-w-[320px]">
          {hasSignals ? (
            <div className="h-full overflow-y-auto border-r border-gray-200 bg-white">
              <div className="px-4 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Signals</h3>
                <p className="mt-1 text-xs text-gray-500">Captured context signals.</p>
              </div>
              <div className="space-y-4 px-4 pb-4">
                {Object.entries(groupedSignals).map(([type, signals]) => (
                  <div key={type} className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {type}
                    </div>
                    <div className="space-y-2">
                      {signals.map((signal) => (
                        <div
                          key={signal.id}
                          className="rounded-lg border border-gray-200 bg-white p-3"
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {signal.description}
                          </div>
                          {signal.severity ? (
                            <div className="mt-1 text-xs text-gray-500">
                              Severity: {signal.severity}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <SignalsPanel selectedSignalIds={[]} onToggle={() => null} readOnly />
          )}
        </div>
        <div className="h-full flex-1 min-w-0 bg-gray-50">
          <div className="flex h-full flex-col gap-6 overflow-y-auto px-6 py-6">
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(
                    decision.status
                  )}`}
                >
                  {decision.status}
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {decision.title || 'Untitled decision'}
              </h2>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Context Summary</h3>
              <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                {decision.contextSummary || '—'}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Options</h3>
              <div className="space-y-2">
                {options.length > 0 ? (
                  options.map((option, index) => {
                    const isSelected = option.isSelected;
                    return (
                      <div
                        key={`opt-${index}`}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                          isSelected
                            ? 'border-emerald-300 bg-emerald-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div
                          className={`h-2 w-2 rounded-full ${
                            isSelected ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                        />
                        <span className="text-gray-800">
                          {option.text || `Option ${index + 1}`}
                        </span>
                        {isSelected ? (
                          <span className="ml-auto text-xs font-semibold text-emerald-600">
                            Selected
                          </span>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-3 text-sm text-gray-500">
                    No options recorded.
                  </div>
                )}
              </div>
              {selectedOption ? null : (
                <p className="text-xs text-gray-400">No selected option.</p>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Reasoning</h3>
              <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                {decision.reasoning || '—'}
              </p>
            </section>

            <section className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 lg:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">Risk Level</h3>
                <p className="text-sm text-gray-700">
                  {decision.riskLevel || '—'}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">Confidence</h3>
                <p className="text-sm text-gray-700">
                  {decision.confidenceScore ?? '—'}
                </p>
              </div>
            </section>
          </div>
        </div>
        <div className="h-full w-[24%] min-w-[220px] max-w-[320px]">
          <div className="h-full border-l border-gray-200 bg-gray-50">
            <ExecutionPanel />
            <div className="px-4 pb-4 text-xs text-gray-500">
              Execution is managed after commitment.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecisionDetailView;
