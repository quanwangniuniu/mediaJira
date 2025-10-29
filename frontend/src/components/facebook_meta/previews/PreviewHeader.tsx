import React from 'react';
import { Ellipsis, Expand, Bug } from 'lucide-react';

interface PreviewHeaderProps {
  title: string;
  icon?: React.ReactNode;
  isVisible?: boolean;
  showDropdown?: boolean;
  onToggleDropdown?: () => void;
  onExpand?: () => void;
  onReportProblem?: () => void;
}

const PreviewHeader: React.FC<PreviewHeaderProps> = ({
  title,
  icon,
  isVisible = true,
  showDropdown = false,
  onToggleDropdown,
  onExpand,
  onReportProblem,
}) => {
  return (
    <div className={`flex justify-between items-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex items-center">
        {icon && (
          <div className="w-6 h-6 mr-3 flex items-center justify-center">
            {icon}
          </div>
        )}
        <span className="text-lg font-medium">{title}</span>
      </div>

      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDropdown?.();
          }}
          className="px-4 py-3 border border-gray-400 hover:bg-gray-200 rounded-sm flex items-center justify-center transition-colors"
        >
          <Ellipsis className="w-5 h-6" />
        </button>

        {showDropdown && (
          <div className="absolute top-15 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 px-1 min-w-[220px] z-50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand?.();
              }}
              className="w-full px-4 py-2 text-left text-base hover:bg-gray-100 flex items-center rounded"
            >
              <Expand className="w-4 h-4 mr-3" />
              Expand
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReportProblem?.();
              }}
              className="w-full px-4 py-2 text-left text-base hover:bg-gray-100 flex items-center rounded"
            >
              <Bug className="w-4 h-4 mr-3" />
              Report a problem
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewHeader;

