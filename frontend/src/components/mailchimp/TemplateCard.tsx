import React from "react";
import { MailchimpTemplate } from "@/lib/api/mailchimpApi";

interface TemplateCardProps {
  template: MailchimpTemplate;
  onApply: (templateId: number) => void;
  onPreview?: (templateId: number) => void;
  disabled?: boolean;
}

export function TemplateCard({
  template,
  onApply,
  onPreview,
  disabled = false,
}: TemplateCardProps) {
  const hasThumbnail = Boolean(template.thumbnail);

  const handleApply = () => {
    if (!disabled) {
      onApply(template.id);
    }
  };

  return (
    <div className="relative group">
      {/* main */}
      <div className="flex flex-col h-[340px] w-[248px] rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex-1 bg-gray-50 rounded-t-xl overflow-hidden">
          {hasThumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={template.thumbnail as string}
              alt={template.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-center space-y-3 text-gray-500">
              <div className="h-20 w-16 rounded-lg border-2 border-dashed border-gray-300" />
              <p className="text-sm px-6">
                {template.category || "Custom template"}
              </p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 space-y-1">
          <p className="font-medium text-sm text-gray-900 truncate">
            {template.name}
          </p>
          {template.category ? (
            <p className="text-xs text-gray-500">{template.category}</p>
          ) : null}
        </div>
      </div>

      {/* hover */}
      <div className="absolute flex items-center justify-center top-0 left-0 h-[340px] w-[248px] rounded-xl border-2 border-emerald-700 bg-white opacity-0 group-hover:opacity-90 transition-opacity duration-200">
        <div className="flex flex-col space-y-4 items-center">
          <button
            className="rounded-md w-28 py-2 text-sm bg-emerald-700 text-white disabled:bg-emerald-400 disabled:cursor-not-allowed"
            onClick={handleApply}
            disabled={disabled}
          >
            {disabled ? "Creating..." : "Apply"}
          </button>
          <button
            className="rounded-md w-28 py-2 text-sm bg-gray-200 text-gray-900 disabled:opacity-60"
            onClick={() => onPreview?.(template.id)}
            disabled={disabled || !onPreview}
          >
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}
