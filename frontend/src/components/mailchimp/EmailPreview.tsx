"use client";

import React from "react";
import { X, Mail, Calendar, Users } from "lucide-react";

interface EmailPreviewProps {
  draft: {
    id: number;
    subject: string;
    preview_text?: string;
    from_name: string;
    reply_to: string;
    template_data?: {
      template: {
        name: string;
        type: string;
      };
      default_content: {
        sections: Array<{
          content: string;
          type: string;
        }>;
      };
    };
    created_at: string;
    updated_at: string;
    status: string;
  };
  onClose: () => void;
}

export default function EmailPreview({ draft, onClose }: EmailPreviewProps) {
  const renderContent = (content: string, type: string) => {
    if (type === "html") {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: content }}
          className="prose max-w-none"
        />
      );
    }

    if (type === "image") {
      return (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <img
            src={content || "/placeholder-image.png"}
            alt="Email content"
            className="max-w-full h-auto mx-auto"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              target.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div className="hidden text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-2" />
            <p>Image placeholder</p>
            <p className="text-sm">{content || "No image URL provided"}</p>
          </div>
        </div>
      );
    }

    // Default to text
    return <div className="whitespace-pre-wrap text-gray-800">{content}</div>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Email Preview
              </h2>
              <p className="text-sm text-gray-500">
                Preview of "{draft.subject}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Email Preview */}
        <div className="p-6">
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Email Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {draft.from_name}
                    </p>
                    <p className="text-sm text-gray-500">{draft.reply_to}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {new Date(draft.updated_at).toLocaleDateString()}
                  </p>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      draft.status === "draft"
                        ? "bg-gray-100 text-gray-800"
                        : draft.status === "scheduled"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {draft.status}
                  </span>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {draft.subject}
              </h1>

              {draft.preview_text && (
                <p className="text-gray-600 text-sm">{draft.preview_text}</p>
              )}
            </div>

            {/* Email Content */}
            <div className="p-6">
              {draft.template_data?.default_content?.sections?.length > 0 ? (
                <div className="space-y-6">
                  {draft.template_data.default_content.sections.map(
                    (section, index) => (
                      <div
                        key={index}
                        className="border-l-4 border-blue-200 pl-4"
                      >
                        <div className="mb-2">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {section.type.toUpperCase()}
                          </span>
                        </div>
                        {renderContent(section.content, section.type)}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No content sections</p>
                  <p className="text-sm">
                    This email draft doesn't have any content sections yet.
                  </p>
                </div>
              )}
            </div>

            {/* Email Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Created: {new Date(draft.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Updated: {new Date(draft.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {draft.template_data?.template?.name && (
                  <div className="text-right">
                    <p className="font-medium">
                      Template: {draft.template_data.template.name}
                    </p>
                    <p className="text-xs">
                      Type: {draft.template_data.template.type}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
