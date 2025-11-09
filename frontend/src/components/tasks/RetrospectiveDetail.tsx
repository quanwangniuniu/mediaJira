'use client';

import { useState } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../ui/accordion";
import { RetrospectiveTaskData, RetrospectiveAPI } from "@/lib/api/retrospectiveApi";

interface RetrospectiveDetailProps {
  retrospective?: RetrospectiveTaskData;
  loading?: boolean;
  compact?: boolean; // If true, show only essential metadata (for TaskCard)
  onRefresh?: () => void; // Callback to refresh retrospective data after actions
}

export default function RetrospectiveDetail({ retrospective, loading, compact = false, onRefresh }: RetrospectiveDetailProps) {
  const [generatingReport, setGeneratingReport] = useState(false);
  const [approvingReport, setApprovingReport] = useState(false);
  const [startingAnalysis, setStartingAnalysis] = useState(false);

  // Helper function to get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'reported':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date for display
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Format status for display
  const formatStatus = (status?: string) => {
    if (!status) return 'Unknown';
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Handle generate report
  const handleGenerateReport = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!retrospective || !retrospective.id) return;

    try {
      setGeneratingReport(true);
      
      // Call API to generate report (this starts an async Celery task)
      const response = await RetrospectiveAPI.generateReport(retrospective.id, 'pdf');
      
      // Check if API returned an error
      if (response.data.error) {
        setGeneratingReport(false);
        alert(`Failed to start report generation: ${response.data.error}`);
        return;
      }
      
      // Check if report was generated synchronously (should not happen with current backend)
      if (response.data.report_url) {
        setGeneratingReport(false);
        if (onRefresh) {
          await onRefresh();
        }
        alert('Report generated successfully!');
        return;
      }
      
      // Poll for report completion (check every 3 seconds, up to 30 seconds)
      const maxAttempts = 10;
      const pollInterval = 3000;
      let attempts = 0;
      let reportGenerated = false;

      const pollForReport = async () => {
        while (attempts < maxAttempts && !reportGenerated) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          attempts++;

          try {
            // Fetch latest data to check if report was generated
            const latestResponse = await RetrospectiveAPI.getRetrospective(retrospective.id);
            
            if (latestResponse.data.report_url) {
              reportGenerated = true;
              
              // Update parent component state (this will trigger re-render with new prop)
              if (onRefresh) {
                await onRefresh();
              }
              
              setGeneratingReport(false);
              
              // Wait a moment for state to update
              await new Promise(resolve => setTimeout(resolve, 500));
              
              alert('Report generated successfully! The page has been updated.');
              break;
            }
          } catch (error) {
            // Continue polling even if one request fails
          }
        }

        if (!reportGenerated) {
          setGeneratingReport(false);
          
          // Try one final refresh before giving up
          if (onRefresh) {
            await onRefresh();
          }
          
          alert(
            'Report generation timed out. This usually means:\n\n' +
            '1. Celery worker is not running\n' +
            '2. Redis broker is not accessible\n\n' +
            'Please check:\n' +
            '- Start Celery worker: celery -A backend worker --loglevel=info\n' +
            '- Ensure Redis is running: redis-cli ping\n' +
            '- Check backend logs for Celery task errors\n\n' +
            'Refresh the page manually to check if the report was generated.'
          );
        }
      };

      // Start polling in background
      pollForReport();

      // Don't wait for polling to complete, show immediate feedback
      alert('Report generation started. The page will update automatically when the report is ready.');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to generate report';
      alert(`Failed to generate report: ${errorMessage}`);
      setGeneratingReport(false);
    }
  };

  // Handle start analysis
  const handleStartAnalysis = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!retrospective || !retrospective.id) return;

    try {
      setStartingAnalysis(true);
      
      // Call API to start analysis (this starts an async Celery task)
      await RetrospectiveAPI.startAnalysis(retrospective.id);

      // Poll for status updates until retrospective is completed
      // Start polling immediately (don't wait for first interval)
      const maxAttempts = 20; // Check for up to 20 times (60 seconds total)
      const pollInterval = 1000; // Check every 1 second (faster polling since it's quick)
      let attempts = 0;
      let analysisCompleted = false;

      const pollForCompletion = async () => {
        // First check immediately
        while (attempts < maxAttempts && !analysisCompleted) {
          // Wait before checking (except first time)
          if (attempts > 0) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }
          attempts++;
          try {
            const latestResponse = await RetrospectiveAPI.getRetrospective(retrospective.id);
            
            if (latestResponse.data.status === 'completed' || latestResponse.data.status === 'reported') {
              analysisCompleted = true;
              if (onRefresh) {
                await onRefresh();
              }
              setStartingAnalysis(false);
              await new Promise(resolve => setTimeout(resolve, 500));
              alert('Analysis completed successfully! The page has been updated.');
              break;
            }
          } catch (error) {
            // Continue polling even if one request fails
          }
        }
        
        if (!analysisCompleted) {
          setStartingAnalysis(false);
          if (onRefresh) {
            await onRefresh();
          }
          alert(
            'Analysis is taking longer than expected. This usually means:\n\n' +
            '1. Celery worker is processing the task\n' +
            '2. The task encountered an error (check backend logs)\n' +
            '3. Duplicate KPI data exists (this can cause task failure)\n\n' +
            'Please refresh the page manually to check the current status.'
          );
        }
      };

      // Start polling immediately (no alert, polling will handle completion)
      pollForCompletion();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to start analysis';
      alert(`Failed to start analysis: ${errorMessage}`);
      setStartingAnalysis(false);
    }
  };

  // Handle approve report
  const handleApproveReport = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!retrospective || !retrospective.id) return;

    try {
      setApprovingReport(true);
      
      // Call API to approve report
      await RetrospectiveAPI.approveReport(retrospective.id, {
        approved: true,
        comments: 'Approved via frontend'
      });
      
      // Refresh retrospective data to get updated approval state
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to approve report';
      alert(`Failed to approve report: ${errorMessage}`);
    } finally {
      setApprovingReport(false);
    }
  };

  // Compact mode for TaskCard - show only essential metadata
  if (compact) {
    if (loading) {
      return (
        <div className="mt-3 pt-3 border-t border-gray-100" data-action>
          <div className="text-xs text-gray-500">Loading retrospective metadata...</div>
        </div>
      );
    }

    if (!retrospective) {
      return null; // Don't show anything in compact mode if no data
    }
    return (
      <div className="mt-3 pt-3 border-t border-gray-100" data-action>
        <div className="flex flex-col text-xs mb-2 space-y-1">
          {/* Retrospective Status */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-600">Retrospective Status:</span>
            <span
              className={`px-2 py-0.5 rounded-full ${
                getStatusColor(retrospective.status) || 'bg-gray-100 text-gray-800'
              }`}
            >
              {retrospective.status_display || formatStatus(retrospective.status) || 'Unknown'}
            </span>
          </div>

          {/* Report Availability */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-600">Report Available:</span>
            <span className={retrospective.report_url ? 'text-green-600' : 'text-gray-500'}>
              {retrospective.report_url ? 'Yes' : 'No'}
            </span>
          </div>

          {/* Approval State */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-600">Approval State:</span>
            {retrospective.reviewed_by ? (
              <span className="text-green-600">
                Approved by {retrospective.reviewed_by}
                {retrospective.reviewed_at && (
                  <span className="text-gray-500 ml-1">
                    ({new Date(retrospective.reviewed_at).toLocaleDateString()})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-gray-500">Pending</span>
            )}
          </div>

          {/* Start Analysis Button (if scheduled) */}
          {retrospective.status === 'scheduled' && (
            <div className="mt-2">
              <button
                onClick={handleStartAnalysis}
                disabled={startingAnalysis}
                className="w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                data-action
              >
                {startingAnalysis ? 'Starting...' : 'Start Analysis'}
              </button>
            </div>
          )}

          {/* Generate Report Button (if completed but no report) */}
          {retrospective.status === 'completed' && !retrospective.report_url && (
            <div className="mt-2">
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="w-full px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                data-action
              >
                {generatingReport ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          )}

          {/* View Report Link (if report available) */}
          {retrospective.report_url && (
            <div className="mt-2">
              <a
                href={retrospective.report_url.startsWith('http') ? retrospective.report_url : `http://localhost:8000${retrospective.report_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                View Report
              </a>
            </div>
          )}

          {/* Approve Report Button (if report available but not approved) */}
          {retrospective.report_url && !retrospective.reviewed_by && (
            <div className="mt-2">
              <button
                onClick={handleApproveReport}
                disabled={approvingReport}
                className="w-full px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                data-action
              >
                {approvingReport ? 'Approving...' : 'Approve Report'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full mode for detail page
  if (loading) {
    return (
      <section>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm">Loading retrospective details...</p>
        </div>
      </section>
    );
  }

  if (!retrospective) {
    return (
      <section>
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">No retrospective data available</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <Accordion type="multiple" defaultValue={["item-1"]}>
        <AccordionItem value="item-1" className="border-none">
          <AccordionTrigger>
            <h2 className="font-semibold text-gray-900 text-lg">Retrospective Details</h2>
          </AccordionTrigger>
          <AccordionContent className="min-h-0 overflow-y-auto">
            <div className="space-y-8">
              {/* Status */}
              <div className="flex flex-row items-center gap-3">
                <label className="block text-sm font-semibold text-gray-900 tracking-wide">Status</label>
                <span className={`inline-block px-2 py-1 text-sm font-medium rounded-full ${getStatusColor(retrospective.status)}`}>
                  {retrospective.status_display || formatStatus(retrospective.status) || 'Unknown'}
                </span>
              </div>

              {/* Start Analysis Button */}
              {retrospective.status === 'scheduled' && (
                <div className="flex flex-row items-center gap-3">
                  <button
                    onClick={handleStartAnalysis}
                    disabled={startingAnalysis}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                    data-action
                  >
                    {startingAnalysis ? 'Starting Analysis...' : 'Start Analysis'}
                  </button>
                  <span className="text-xs text-gray-500">
                    Start the retrospective analysis process
                  </span>
                </div>
              )}

              {/* Campaign Name */}
              <div className="flex flex-row items-center gap-3">
                <label className="block text-sm font-semibold text-gray-900 tracking-wide">Campaign</label>
                <span className="text-sm text-gray-900">
                  {retrospective.campaign_name || retrospective.campaign || 'Unknown'}
                </span>
              </div>

              {/* Campaign Description */}
              {retrospective.campaign_description && (
                <div className="flex flex-col gap-3">
                  <label className="block text-sm font-semibold text-gray-900 tracking-wide">Campaign Description</label>
                  <span className="text-sm text-gray-900">
                    {retrospective.campaign_description}
                  </span>
                </div>
              )}

              {/* Scheduled At */}
              <div className="flex flex-row items-center gap-3">
                <label className="block text-sm font-semibold text-gray-900 tracking-wide">Scheduled At</label>
                <span className="text-sm text-gray-900">
                  {formatDate(retrospective.scheduled_at)}
                </span>
              </div>

              {/* Started At */}
              {retrospective.started_at && (
                <div className="flex flex-row items-center gap-3">
                  <label className="block text-sm font-semibold text-gray-900 tracking-wide">Started At</label>
                  <span className="text-sm text-gray-900">
                    {formatDate(retrospective.started_at)}
                  </span>
                </div>
              )}

              {/* Completed At */}
              {retrospective.completed_at && (
                <div className="flex flex-row items-center gap-3">
                  <label className="block text-sm font-semibold text-gray-900 tracking-wide">Completed At</label>
                  <span className="text-sm text-gray-900">
                    {formatDate(retrospective.completed_at)}
                  </span>
                </div>
              )}

              {/* Duration */}
              {retrospective.duration_formatted && (
                <div className="flex flex-row items-center gap-3">
                  <label className="block text-sm font-semibold text-gray-900 tracking-wide">Duration</label>
                  <span className="text-sm text-gray-900">
                    {retrospective.duration_formatted}
                  </span>
                </div>
              )}

              {/* Report Availability */}
              <div className="flex flex-row items-center gap-3">
                <label className="block text-sm font-semibold text-gray-900 tracking-wide">Report Available</label>
                <span className={`text-sm ${retrospective.report_url ? 'text-green-600' : 'text-gray-500'}`}>
                  {retrospective.report_url ? 'Yes' : 'No'}
                </span>
              </div>

              {/* Generate Report Button */}
              {retrospective.status === 'completed' && !retrospective.report_url && (
                <div className="flex flex-row items-center gap-3">
                  <button
                    onClick={handleGenerateReport}
                    disabled={generatingReport}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                    data-action
                  >
                    {generatingReport ? 'Generating Report...' : 'Generate Report'}
                  </button>
                </div>
              )}

              {/* Report URL */}
              {retrospective.report_url && (
                <div className="flex flex-col gap-3">
                  <label className="block text-sm font-semibold text-gray-900 tracking-wide">Report URL</label>
                  <a 
                    href={retrospective.report_url.startsWith('http') ? retrospective.report_url : `http://localhost:8000${retrospective.report_url}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-800 underline break-all"
                  >
                    {retrospective.report_url}
                  </a>
                </div>
              )}

              {/* Report Generated At */}
              {retrospective.report_generated_at && (
                <div className="flex flex-row items-center gap-3">
                  <label className="block text-sm font-semibold text-gray-900 tracking-wide">Report Generated At</label>
                  <span className="text-sm text-gray-900">
                    {formatDate(retrospective.report_generated_at)}
                  </span>
                </div>
              )}

              {/* Approval State */}
              <div className="flex flex-col gap-6">
                <label className="block text-sm font-semibold text-gray-900 tracking-wide">Approval State</label>
                <div className="flex flex-col gap-6 border border-gray-200 rounded-md p-4">
                  <div className="flex flex-row items-center gap-3">
                    <label className="block text-sm font-semibold text-gray-500 tracking-wide">Reviewed By</label>
                    <span className="text-sm text-gray-900">
                      {retrospective.reviewed_by || 'Not reviewed'}
                    </span>
                  </div>
                  <div className="flex flex-row items-center gap-3">
                    <label className="block text-sm font-semibold text-gray-500 tracking-wide">Reviewed At</label>
                    <span className="text-sm text-gray-900">
                      {formatDate(retrospective.reviewed_at)}
                    </span>
                  </div>
                </div>
                
                {/* Approve Report Button */}
                {retrospective.report_url && !retrospective.reviewed_by && (
                  <div className="flex flex-row items-center gap-3">
                    <button
                      onClick={handleApproveReport}
                      disabled={approvingReport}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                      data-action
                    >
                      {approvingReport ? 'Approving...' : 'Approve Report'}
                    </button>
                  </div>
                )}
              </div>

              {/* KPI Count */}
              <div className="flex flex-row items-center gap-3">
                <label className="block text-sm font-semibold text-gray-900 tracking-wide">KPI Count</label>
                <span className="text-sm text-gray-900">
                  {retrospective.kpi_count || 0}
                </span>
              </div>

              {/* Insight Count */}
              <div className="flex flex-row items-center gap-3">
                <label className="block text-sm font-semibold text-gray-900 tracking-wide">Insight Count</label>
                <span className="text-sm text-gray-900">
                  {retrospective.insight_count || 0}
                </span>
              </div>

              {/* Created By */}
              <div className="flex flex-row items-center gap-3">
                <label className="block text-sm font-semibold text-gray-900 tracking-wide">Created By</label>
                <span className="text-sm text-gray-900">
                  {retrospective.created_by || 'Unknown'}
                </span>
              </div>

              {/* Created At */}
              <div className="flex flex-row items-center gap-3">
                <label className="block text-sm font-semibold text-gray-900 tracking-wide">Created At</label>
                <span className="text-sm text-gray-900">
                  {formatDate(retrospective.created_at)}
                </span>
              </div>

              {/* Last Updated */}
              <div className="flex flex-row items-center gap-3">
                <label className="block text-sm font-semibold text-gray-900 tracking-wide">Last Updated</label>
                <span className="text-sm text-gray-900">
                  {formatDate(retrospective.updated_at)}
                </span>
              </div>
            </div>
          </AccordionContent>        
        </AccordionItem> 
      </Accordion>
    </section>
  )
}
