import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PreviewExpandModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const PreviewExpandModal: React.FC<PreviewExpandModalProps> = ({
  isOpen,
  onClose,
  children,
  title
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-[600px] mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-6 px-[146.5px] overflow-auto max-h-[calc(90vh-140px)] bg-gray-100 min-h-[300px]">
          {children}
          <div className="flex justify-center px-4 pt-4">
            <span className="text-sm text-gray-500 text-center">Full-size preview</span>
          </div>
        </div>

        {/* Footer with Close Button */}
        <div className="flex justify-end p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm border border-gray-500 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PreviewExpandModal;
