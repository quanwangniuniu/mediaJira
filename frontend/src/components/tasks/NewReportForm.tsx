'use client';

import { useEffect, useState } from 'react';
import { ReportAPI } from '@/lib/api/reportApi';

export default function NewReportForm({
  reportData,
  onReportDataChange,
  taskData,
  validation,
}: {
  reportData: any;
  onReportDataChange: (data: any) => void;
  taskData: any;
  validation: any;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await ReportAPI.getTemplates();
        setTemplates(res.data || []);
      } catch (err) {
        console.error('Failed to load report templates', err);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    onReportDataChange({
      ...reportData,
      [field]: value,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitting(true);
    setError(null);

    try {
      // Upload file to backend
      const response = await ReportAPI.uploadCSV(file);
      const { file_path } = response.data;
      
      // Update form data with actual file path
      onReportDataChange({
        ...reportData,
        slice_config: {
          csv_file_path: file_path,
        },
      });
      
      // If report is already created, update the backend report
      if (created && reportId) {
        try {
          await ReportAPI.updateReport(reportId, {
            slice_config: {
              csv_file_path: file_path,
            },
          });
          console.log('✅ Report slice_config updated successfully');
        } catch (updateErr) {
          console.error('⚠️ Failed to update report slice_config:', updateErr);
          // Don't show error to user as the file upload was successful
        }
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      // Show actual error message to user
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'CSV upload failed';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: reportData.title.trim(),
        owner_id: reportData.owner_id.trim(),
        report_template_id: reportData.report_template_id?.trim()
          ? reportData.report_template_id.trim()
          : null,
        slice_config: {
          csv_file_path: reportData.slice_config?.csv_file_path || '',
        },
      };

      const res = await ReportAPI.createReport(payload);
      const result = res.data;

      if (result?.id) {
        setCreated(true);
        setReportId(String(result.id));
      }
    } catch (err: any) {
      console.error(err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.detail || 
                          (typeof err.response?.data === 'string' ? err.response.data : null) ||
                          err.message || 
                          'Failed to create report';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleCreateReport} className="space-y-4 w-full">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          type="text"
          value={reportData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {validation.errors.title && (
          <p className="text-sm text-red-600 mt-1">{String(validation.errors.title)}</p>
        )}
      </div>

      {/* Owner ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Owner ID *</label>
        <input
          type="text"
          value={reportData.owner_id}
          onChange={(e) => handleInputChange('owner_id', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {validation.errors.owner_id && (
          <p className="text-sm text-red-600 mt-1">{String(validation.errors.owner_id)}</p>
        )}
      </div>

      {/* Template ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Template (optional)</label>
        <select
          value={reportData.report_template_id}
          onChange={(e) => handleInputChange('report_template_id', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">-- None --</option>
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name || tpl.id}
            </option>
          ))}
        </select>
        {loadingTemplates && (
          <p className="text-sm text-gray-500 mt-1">Loading templates...</p>
        )}
      </div>

      {/* CSV Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Upload CSV File *</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {reportData.slice_config?.csv_file_path && (
          <p className="text-green-600 text-sm mt-1">
            Path: {reportData.slice_config.csv_file_path}
          </p>
        )}
        {validation.errors['slice_config.csv_file_path'] && (
          <p className="text-sm text-red-600 mt-1">
            {String(validation.errors['slice_config.csv_file_path'])}
          </p>
        )}
      </div>

      {/* Success message */}
      {created && (
        <p className="text-green-600 text-sm mt-2">
          ✅ Report created successfully! You can now submit the task.
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Report'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </form>
  );
}
