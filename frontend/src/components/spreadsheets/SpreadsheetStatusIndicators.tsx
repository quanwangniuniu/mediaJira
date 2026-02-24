'use client';

interface SpreadsheetStatusIndicatorsProps {
  saveError: string | null;
  isSaving: boolean;
  pendingOpsSize: number;
  isImporting: boolean;
  importProgress: { current: number; total: number } | null;
  hydrationStatus: 'idle' | 'importing' | 'hydrating' | 'ready';
}

export default function SpreadsheetStatusIndicators({
  saveError,
  isSaving,
  pendingOpsSize,
  isImporting,
  importProgress,
  hydrationStatus,
}: SpreadsheetStatusIndicatorsProps) {
  return (
    <>
      {saveError && (
        <div className="absolute top-2 right-2 z-30 bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded text-xs">
          {saveError}
        </div>
      )}
      {isSaving && pendingOpsSize > 0 && (
        <div className="absolute top-2 right-2 z-30 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded text-xs">
          Saving...
        </div>
      )}
      {(isImporting && importProgress) || hydrationStatus === 'hydrating' ? (
        <div className="absolute top-2 left-2 z-30 bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1 rounded text-xs">
          {hydrationStatus === 'hydrating'
            ? 'Preparing sheet...'
            : `Importing... ${importProgress!.current}/${importProgress!.total}`}
        </div>
      ) : null}
    </>
  );
}
