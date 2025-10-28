'use client';

import { useState, useEffect } from 'react';
import ReportAPI from '@/lib/api/reportApi';

// 🎯 Toggle this to switch between mock and real backend
const USE_MOCK = false; // false = real backend, true = mock data

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

const ReportActions: React.FC<ReportActionsProps> = ({ reportId }) => {
  const [status, setStatus] = useState('draft');
  const [approval, setApproval] = useState('pending');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // Add flag to prevent unnecessary refetch

  const fetchReport = async () => {
    try {
      console.log('🔄 Fetching report from backend:', reportId);
      const res = await ReportAPI.getReportById(reportId);
      const data = res.data || res;
      
      console.log('📊 Report data received:', data);
      setStatus(data?.status || 'draft');
      
      if (Array.isArray(data?.approvals) && data.approvals.length > 0) {
        const latestApproval = data.approvals[data.approvals.length - 1];
        setApproval(latestApproval.status);
        console.log('✅ Report status updated:', { 
          status: data?.status, 
          approval: latestApproval.status,
          approvals: data.approvals 
        });
      } else {
        setApproval('pending');
        console.log('⚠️ No approvals found, setting to pending');
      }
    } catch (error) {
      console.error('❌ Failed to fetch report:', error);
      // Keep current state on error
    }
  };

  useEffect(() => {
    if (!isUpdating) {
      fetchReport();
    }
  }, [reportId, isUpdating]);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setLoading(true);
      console.log('🔄 Submitting report to backend:', reportId);
      await ReportAPI.submitReport(reportId);
      console.log('✅ Report submitted successfully');
      await fetchReport(); // Refresh status
    } catch (error) {
      console.error('❌ Failed to submit report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setLoading(true);
      setIsUpdating(true); // Prevent refetch during update
      console.log(`[ReportActions] Before approve: status=${status}, approval=${approval}`);
      console.log(`[ReportActions] Approving report ID ${reportId}`);
      
      const response = await ReportAPI.approveReport(reportId, 'approve', 'Approved');
      console.log('[ReportActions] ✅ Backend approval updated successfully');
      
      // Use the response data directly instead of fetching again
      const updatedData = response.data;
      console.log('[ReportActions] 🔁 Backend response data:', updatedData);
      
      // Update state with the response data
      setStatus(updatedData?.status || 'draft');
      
      if (Array.isArray(updatedData?.approvals) && updatedData.approvals.length > 0) {
        const latestApproval = updatedData.approvals[updatedData.approvals.length - 1];
        setApproval(latestApproval.status);
        console.log('[ReportActions] After backend update: status=', updatedData?.status, 'approval=', latestApproval.status);
      } else {
        setApproval('pending');
        console.log('[ReportActions] ⚠️ No approvals in response, setting to pending');
      }
      
    } catch (error) {
      console.error('[ReportActions] ❌ Failed to approve report:', error);
    } finally {
      setLoading(false);
      setIsUpdating(false); // Re-enable refetch
    }
  };

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setLoading(true);
      console.log('🔄 Starting PDF export process for report:', reportId);
      
      // Step 1: Trigger the export job (creates ReportAsset)
      console.log('📤 Triggering export job...');
      await ReportAPI.exportReport(reportId, 'pdf', true);
      console.log('✅ Export job triggered successfully');
      
      // Step 2: Wait a moment for the job to complete, then download
      console.log('⏳ Waiting for export to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      // Step 3: Download the generated PDF
      console.log('📥 Downloading PDF from backend...');
      const response = await ReportAPI.downloadPDF(reportId);
      console.log('✅ PDF downloaded successfully');
      
      // Step 4: Create blob URL for download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      
      // Step 5: Auto-download the file
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('🎉 PDF download completed successfully');
      
    } catch (error) {
      console.error('❌ PDF export/download failed:', error);
      alert('Failed to generate PDF. Please ensure the report is approved and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Debug button rendering logic
  console.log(`[ReportActions] Button rendering - status: ${status}, approval: ${approval}`);
  console.log(`[ReportActions] Show Submit: ${status === 'draft'}`);
  console.log(`[ReportActions] Show Approve: ${status === 'in_review' || (status === 'approved' && approval === 'pending')}`);
  console.log(`[ReportActions] Show Download: ${status === 'approved' && approval === 'approved'}`);
  console.log(`[ReportActions] Download condition: status='${status}' === 'approved' && approval='${approval}' === 'approved'`);

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
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        )}
        {status === 'in_review' && (
          <button
            data-action
            disabled={loading}
            onClick={handleApprove}
            className="bg-green-500 text-white text-xs px-3 py-1 rounded"
          >
            {loading ? 'Approving...' : 'Approve'}
          </button>
        )}
        {status === 'approved' && approval === 'pending' && (
          <button
            data-action
            disabled={loading}
            onClick={handleApprove}
            className="bg-green-500 text-white text-xs px-3 py-1 rounded"
          >
            {loading ? 'Approving...' : 'Approve'}
          </button>
        )}
        {status === 'approved' && approval === 'approved' && (
          <button
            data-action
            disabled={loading}
            onClick={handleExport}
            className="bg-purple-500 text-white text-xs px-3 py-1 rounded"
          >
            {loading ? 'Generating PDF...' : 'Download PDF'}
          </button>
        )}
        
        {/* Show status message when no action is available */}
        {status === 'approved' && approval !== 'pending' && approval !== 'approved' && (
          <span className="text-xs text-yellow-600 px-2 py-1">
            Report approved but waiting for approver approval
          </span>
        )}
        {status !== 'draft' && status !== 'in_review' && status !== 'approved' && (
          <span className="text-xs text-gray-500 px-2 py-1">
            No action available for status: {status}
          </span>
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
