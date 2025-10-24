"use client";

import React, { useState } from "react";
import { X, Save, Eye, Send, Calendar } from "lucide-react";

interface EmailDraftFormProps {
  draft?: {
    id?: number;
    subject: string;
    preview_text: string;
    from_name: string;
    reply_to: string;
    template_data?: any;
  };
  onSave: (data: any) => void;
  onCancel: () => void;
  onPreview?: () => void;
  onSend?: () => void;
}

export default function EmailDraftForm({
  draft,
  onSave,
  onCancel,
  onPreview,
  onSend,
}: EmailDraftFormProps) {
  const [formData, setFormData] = useState({
    subject: draft?.subject || "",
    preview_text: draft?.preview_text || "",
    from_name: draft?.from_name || "",
    reply_to: draft?.reply_to || "",
    template_data: draft?.template_data || {
      template: {
        name: "",
        type: "custom",
        content_type: "template",
      },
      default_content: {
        sections: [],
      },
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleTemplateChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      template_data: {
        ...prev.template_data,
        template: {
          ...prev.template_data.template,
          [field]: value,
        },
      },
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject line is required";
    }

    if (!formData.from_name.trim()) {
      newErrors.from_name = "From name is required";
    }

    if (!formData.reply_to.trim()) {
      newErrors.reply_to = "Reply-to email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.reply_to)) {
      newErrors.reply_to = "Please enter a valid email address";
    }

    if (!formData.template_data.template.name.trim()) {
      newErrors.template_name = "Template name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const addSection = () => {
    setFormData((prev) => ({
      ...prev,
      template_data: {
        ...prev.template_data,
        default_content: {
          ...prev.template_data.default_content,
          sections: [
            ...prev.template_data.default_content.sections,
            { content: "", type: "text" },
          ],
        },
      },
    }));
  };

  const updateSection = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      template_data: {
        ...prev.template_data,
        default_content: {
          ...prev.template_data.default_content,
          sections: prev.template_data.default_content.sections.map(
            (section: any, i: number) =>
              i === index ? { ...section, [field]: value } : section
          ),
        },
      },
    }));
  };

  const removeSection = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      template_data: {
        ...prev.template_data,
        default_content: {
          ...prev.template_data.default_content,
          sections: prev.template_data.default_content.sections.filter(
            (_: any, i: number) => i !== index
          ),
        },
      },
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {draft?.id ? "Edit Email Draft" : "Create Email Draft"}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Line *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => handleInputChange("subject", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.subject ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter email subject..."
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview Text
              </label>
              <input
                type="text"
                value={formData.preview_text}
                onChange={(e) =>
                  handleInputChange("preview_text", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter preview text..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Name *
              </label>
              <input
                type="text"
                value={formData.from_name}
                onChange={(e) => handleInputChange("from_name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.from_name ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter sender name..."
              />
              {errors.from_name && (
                <p className="mt-1 text-sm text-red-600">{errors.from_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reply-To Email *
              </label>
              <input
                type="email"
                value={formData.reply_to}
                onChange={(e) => handleInputChange("reply_to", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.reply_to ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter reply-to email..."
              />
              {errors.reply_to && (
                <p className="mt-1 text-sm text-red-600">{errors.reply_to}</p>
              )}
            </div>
          </div>

          {/* Template Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Template Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.template_data.template.name}
                  onChange={(e) => handleTemplateChange("name", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.template_name ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="Enter template name..."
                />
                {errors.template_name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.template_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Type
                </label>
                <select
                  value={formData.template_data.template.type}
                  onChange={(e) => handleTemplateChange("type", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="custom">Custom</option>
                  <option value="html">HTML</option>
                  <option value="text">Text</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Content Sections
              </h3>
              <button
                onClick={addSection}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Add Section
              </button>
            </div>

            <div className="space-y-4">
              {formData.template_data.default_content.sections.map(
                (section: any, index: number) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">
                        Section {index + 1}
                      </h4>
                      <button
                        onClick={() => removeSection(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content Type
                        </label>
                        <select
                          value={section.type}
                          onChange={(e) =>
                            updateSection(index, "type", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="text">Text</option>
                          <option value="html">HTML</option>
                          <option value="image">Image</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content
                        </label>
                        <textarea
                          value={section.content}
                          onChange={(e) =>
                            updateSection(index, "content", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                          placeholder="Enter section content..."
                        />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {formData.template_data.default_content.sections.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No content sections added yet.</p>
                <p className="text-sm">
                  Click "Add Section" to start building your email content.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            {onPreview && (
              <button
                onClick={onPreview}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
            )}
            {onSend && (
              <button
                onClick={onSend}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
