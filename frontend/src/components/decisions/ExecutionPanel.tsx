'use client';

const ExecutionPanel = () => {
  return (
    <div className="h-full overflow-y-auto border-l border-gray-200 bg-gray-50 px-4 py-4">
      <h3 className="text-sm font-semibold text-gray-900">Execution</h3>
      <p className="mt-1 text-xs text-gray-500">
        Available after commitment.
      </p>
      <button
        type="button"
        disabled
        className="mt-4 w-full cursor-not-allowed rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-400"
      >
        Create Task(s)
      </button>
    </div>
  );
};

export default ExecutionPanel;
