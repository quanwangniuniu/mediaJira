'use client';

import { useState } from 'react';
import { useReportContext } from '@/contexts/ReportContext';
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
  const { reportId, setReportId } = useReportContext(); // ✅ context
  const [created, setCreated] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    onReportDataChange({
      ...reportData,
      [field]: value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fakePath = `/app/media/uploads/${file.name}`;
    onReportDataChange({
      ...reportData,
      slice_config: {
        csv_file_path: fakePath,
      },
    });
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: reportData.title.trim(),
        owner_id: reportData.owner_id.trim(),
        report_template_id: reportData.report_template_id.trim(),
        slice_config: {
          csv_file_path: reportData.slice_config?.csv_file_path || '',
        },
      };

      const res = await ReportAPI.createReport(payload);
      const result = res.data;

      if (result?.id) {
        setReportId(result.id);
        setCreated(true);
      }
    } catch (err: any) {
      console.error(err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.detail || err.response?.data || err.message || 'Failed to create report');
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
          <p className="text-sm text-red-600 mt-1">{validation.errors.title}</p>
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
          <p className="text-sm text-red-600 mt-1">{validation.errors.owner_id}</p>
        )}
      </div>

      {/* Template ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Template ID *</label>
        <input
          type="text"
          value={reportData.report_template_id}
          onChange={(e) => handleInputChange('report_template_id', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {validation.errors.report_template_id && (
          <p className="text-sm text-red-600 mt-1">{validation.errors.report_template_id}</p>
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
            {validation.errors['slice_config.csv_file_path']}
          </p>
        )}
      </div>

      {/* ✅ 提示信息 */}
      {!reportId && (
        <p className="text-gray-500 text-sm mt-2">
          ⚠️ Please create the report first before submitting the task.
        </p>
      )}
      {reportId && (
        <p className="text-green-600 text-sm mt-2">
          ✅ Report created! ID: <strong>{reportId}</strong>. You can now submit the task.
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
