'use client';

import { useState, useEffect } from 'react';
import ReportAPI from '@/lib/api/reportApi';

const USE_MOCK = true;

interface ReportActionsProps {
  reportId: string | number;
}

const colorMap: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  in_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  published: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  pending: 'bg-gray-100 text-gray-800',
};

const mockReport = {
  id: 0,
  status: 'draft',
  approvals: [{ id: 'mock1', status: 'pending' }],
};

const ReportActions: React.FC<ReportActionsProps> = ({ reportId }) => {
  const [status, setStatus] = useState(mockReport.status);
  const [approval, setApproval] = useState(mockReport.approvals[0].status);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    if (USE_MOCK) {
      setStatus(mockReport.status);
      setApproval(mockReport.approvals[0].status);
      return;
    }

    try {
      const res = await ReportAPI.getReportById(reportId);
      const data = res.data || res;
      setStatus(data?.status || mockReport.status);
      if (Array.isArray(data?.approvals) && data.approvals.length > 0) {
        setApproval(data.approvals[data.approvals.length - 1].status);
      } else {
        setApproval('pending');
      }
    } catch {
      setStatus(mockReport.status);
      setApproval(mockReport.approvals[0].status);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (USE_MOCK) {
      setStatus('in_review');
      setApproval('pending');
      return;
    }

    try {
      setLoading(true);
      await ReportAPI.submitReport(reportId);
      await fetchReport();
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (USE_MOCK) {
      setStatus('approved');
      setApproval('approved');
      return;
    }

    try {
      setLoading(true);
      await ReportAPI.approveReport(reportId, 'approve', 'Approved');
      await fetchReport();
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (USE_MOCK) {
      setPdfUrl('/mock/report.pdf');
      return;
    }

    try {
      setLoading(true);
      const res = await ReportAPI.exportReport(reportId, 'pdf', true);
      const data = res.data || res;
      setPdfUrl(data.file_url || data.url || '/mock/report.pdf');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100" data-action>
      <div className="flex flex-col text-xs mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-600">Report Status:</span>
          <span
            className={`px-2 py-0.5 rounded-full ${
              colorMap[status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {String(status)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-semibold text-gray-600">Approval Status:</span>
          <span
            className={`px-2 py-0.5 rounded-full ${
              colorMap[approval] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {String(approval)}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        {status === 'draft' && (
          <button
            data-action
            disabled={loading}
            onClick={handleSubmit}
            className="bg-blue-500 text-white text-xs px-3 py-1 rounded"
          >
            Submit
          </button>
        )}
        {status === 'in_review' && (
          <button
            data-action
            disabled={loading}
            onClick={handleApprove}
            className="bg-green-500 text-white text-xs px-3 py-1 rounded"
          >
            Approve
          </button>
        )}
        {status === 'approved' && (
          <button
            data-action
            disabled={loading}
            onClick={handleExport}
            className="bg-purple-500 text-white text-xs px-3 py-1 rounded"
          >
            Export PDF
          </button>
        )}
      </div>

      {pdfUrl && (
        <div className="mt-2 text-xs">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Download PDF
          </a>
        </div>
      )}
    </div>
  );
};

export default ReportActions;
