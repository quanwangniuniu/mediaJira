'use client';

import React from 'react';

interface ReportActionsProps {
  reportId: string;
}

const ReportActions: React.FC<ReportActionsProps> = ({ reportId }) => {
  const handleViewReport = () => {
    // Navigate to report detail page if needed
    // For now, this is a placeholder component
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        onClick={handleViewReport}
        className="text-indigo-600 hover:text-indigo-700 hover:underline"
      >
        View Report
      </button>
    </div>
  );
};

export default ReportActions;

