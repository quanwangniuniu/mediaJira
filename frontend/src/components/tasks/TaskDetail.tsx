'use client';

import { useEffect, useState } from "react";
import { TaskData } from "@/types/task";
import { RemovablePicker } from "../ui/RemovablePicker";
import { approverApi } from "@/lib/api/approverApi";
import { TaskAPI } from "@/lib/api/taskApi";
import { BudgetRequestData, BudgetPoolData } from "@/lib/api/budgetApi";
import { BudgetAPI } from "@/lib/api/budgetApi";
import { useBudgetData } from "@/hooks/useBudgetData";
import { useTaskStore } from "@/lib/taskStore";
import { Clock, Calendar, Tag, User, Sun, FileText, Lock } from 'lucide-react';

interface TaskDetailProps {
  task: TaskData;
  currentUser?: {
    id?: string | number;
    username: string;
    email: string;
  };
}

interface ApprovalRecord {
  id: number;
  task: number;
  approved_by: {
    id: number;
    username: string;
  };
  is_approved: boolean;
  comment: string;
  step_number: number;
  decided_time: string;
}

export default function TaskDetail({ task, currentUser }: TaskDetailProps) {

  const { updateTask } = useTaskStore();
  const { startReview: startBudgetReview, makeDecision: makeBudgetDecision } = useBudgetData();

  const [isReviewing, setIsReviewing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showRevise, setShowRevise] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const [approvers, setApprovers] = useState<{id: number, username: string, email: string}[]>([]);
  const [nextApprover, setNextApprover] = useState<string | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  
  // Budget request and budget pool data
  const [budgetRequest, setBudgetRequest] = useState<BudgetRequestData | null>(null);
  const [budgetPool, setBudgetPool] = useState<BudgetPoolData | null>(null);
  const [loadingBudgetData, setLoadingBudgetData] = useState(false);

  // Conditional rendering based on task status
  useEffect(() => {
    if (task.type === 'asset') {
      setIsReviewing(false);
      setIsLocked(false);
      setShowRevise(false);
      return;
    }

    const canReview = canReviewTask(); 
    const canRevise = canReviseTask();

    if (task.status === 'UNDER_REVIEW') {
      if (canReview) {
        setIsReviewing(true);
      } else {
        setIsReviewing(false);
      }
      
    } else if (task.status === 'LOCKED') {
      setIsReviewing(false);
      setIsLocked(true);

    } else if (task.status === 'REJECTED') {
      if (canRevise) {
        setShowRevise(true);
      }
    }  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.status, task.type, task.current_approver?.id, currentUser?.id]);

  // Get approvers list
  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        setLoadingApprovers(true);
        const approvers = await approverApi.getApprovers(task.type);
        setApprovers(approvers);
      } catch (error) {
        console.error('Error fetching approvers:', error);
        setApprovers([]);
      } finally {
        setLoadingApprovers(false);
      }
    };
    fetchApprovers();
  }, [task.type]);

  // Get approval history
  useEffect(() => {
    const fetchApprovalHistory = async () => {
      try {
        setLoadingHistory(true);
        const response = await TaskAPI.getApprovalHistory(task.id!);
        setApprovalHistory(response.data.history || []);
      } catch (error) {
        console.error('Error fetching approval history:', error);
        setApprovalHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchApprovalHistory();
  }, [task.id]);

  // Get budget request and budget pool data if task type is budget
  useEffect(() => {
    const fetchBudgetData = async () => {
      if (task.type !== 'budget' || !task.object_id) return;
      
      try {
        setLoadingBudgetData(true);
        
        // Get budget request
        const budgetResponse = await BudgetAPI.getBudgetRequest(Number(task.object_id));
        const budgetData = budgetResponse.data;
        setBudgetRequest(budgetData);
        
        // Get budget pool if budget request has budget_pool
        if (budgetData.budget_pool) {
          const poolResponse = await BudgetAPI.getBudgetPool(budgetData.budget_pool);
          const poolData = poolResponse.data;
          setBudgetPool(poolData);
        }
      } catch (error) {
        console.error('Error fetching budget data:', error);
      } finally {
        setLoadingBudgetData(false);
      }
    };
    
    fetchBudgetData();
  }, [task.type, task.object_id, budgetRequest?.status]);

  // Helper function to get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'UNDER_REVIEW':
        return 'bg-blue-100 text-blue-800';
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'LOCKED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'date not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to format date with time
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'date not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper function to get initials
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  // Helper function to get status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'LOCKED':
        return <Lock className="w-3 h-3" />;
      case 'UNDER_REVIEW':
        return <Clock className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const formatDateOnly = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeOnly = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const statusBadgeStyles: Record<string, string> = {
    APPROVED: 'bg-green-100 text-green-700 border border-green-200',
    SUBMITTED: 'bg-green-50 text-green-600 border border-green-200',
    UNDER_REVIEW: 'bg-yellow-50 text-yellow-600 border border-yellow-200',
    PENDING: 'bg-yellow-50 text-yellow-600 border border-yellow-200',
    DRAFT: 'bg-gray-50 text-gray-600 border border-gray-200',
    REJECTED: 'bg-red-50 text-red-600 border border-red-200',
    LOCKED: 'bg-gray-100 text-gray-700 border border-gray-200',
    SCHEDULED: 'bg-blue-50 text-blue-600 border border-blue-200',
    COMPLETED: 'bg-green-50 text-green-600 border border-green-200',
    IN_PROGRESS: 'bg-purple-50 text-purple-600 border border-purple-200',
    CANCELLED: 'bg-red-50 text-red-600 border border-red-200',
  };

  const renderStatusBadge = (status?: string) => {
    if (!status) return <span className="text-sm text-gray-500">Unknown</span>;
    const normalized = status.toUpperCase();
    const classes = statusBadgeStyles[normalized] || 'bg-gray-100 text-gray-700 border border-gray-200';
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${classes}`}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
      </span>
    );
  };

  const renderAssignees = () => {
    const chips = [
      task.owner?.username && { label: task.owner.username, color: 'bg-blue-100 text-blue-700' },
      task.current_approver?.username && { label: task.current_approver.username, color: 'bg-orange-100 text-orange-700' },
    ].filter(Boolean) as { label: string; color: string }[];

    if (chips.length === 0) {
      return <span className="text-sm text-gray-500">No assignees</span>;
    }

    return (
      <div className="flex items-center gap-2">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${chip.color}`}
          >
            {chip.label.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
    );
  };

  const budgetFallback: BudgetRequestData = {
    id: 0,
    amount: '3000.00',
    currency: 'AUD',
    ad_channel: 1,
    ad_channel_detail: { id: 1, name: 'TikTok' },
    status: 'Draft',
    notes: 'ASAP Please!',
    is_escalated: false,
  };

  const renderBudgetDetails = () => {
    if (loadingBudgetData) {
      return (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm">Loading budget details...</p>
        </div>
      );
    }

    const info = budgetRequest || budgetFallback;
    const pool = budgetPool || {
      id: 1,
      available_amount: '1',
      total_amount: '1',
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Status</p>
            {renderStatusBadge(info.status)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Amount</p>
            <p className="text-sm text-gray-900">{info.amount} {info.currency}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Advertising Channel</p>
            <p className="text-sm text-gray-900">{info.ad_channel_detail?.name || 'TikTok'}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Is Escalated?</p>
            <p className="text-sm text-gray-900">{info.is_escalated ? 'Yes' : 'No'}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Budget Pool</p>
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <ul className="space-y-2 text-sm text-gray-700">
              <li><span className="font-medium">Budget Pool ID:</span> {pool.id}</li>
              <li><span className="font-medium">Available Amount:</span> {pool.available_amount}</li>
              <li><span className="font-medium">Total Amount:</span> {pool.total_amount}</li>
            </ul>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Notes</p>
          <div className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm text-gray-700">
            {info.notes || 'No notes'}
          </div>
        </div>
      </div>
    );
  };

  const renderAssetDetails = () => {
    const assetInfo = {
      owner: task.owner?.username || 'Ariel',
      campaign: task.project?.name || 'Social Media Campaign',
      deliverables: [
        'Hero video (30s)',
        'Cutdown (15s)',
        'Three static banners',
      ],
      status: task.status || 'Draft',
      due: formatDateOnly(task.due_date),
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Status</p>
            {renderStatusBadge(assetInfo.status)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Owner</p>
            <p className="text-sm text-gray-900">{assetInfo.owner}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Campaign</p>
            <p className="text-sm text-gray-900">{assetInfo.campaign}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Due</p>
            <p className="text-sm text-gray-900">{assetInfo.due}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Deliverables</p>
          <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
            {assetInfo.deliverables.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const renderRetrospectiveDetails = () => {
    const info = retrospective || {
      status: 'scheduled',
      status_display: 'Scheduled',
      report_url: null,
      reviewed_by: '',
    };

    const reportAvailable = info.report_url ? 'Yes' : 'No';
    const approvalState = info.reviewed_by ? 'Approved' : 'Pending';

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Retrospective Status</p>
            {renderStatusBadge(info.status?.toUpperCase())}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Report Available</p>
            <p className="text-sm text-gray-900">{reportAvailable}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Approval State</p>
            <p className="text-sm text-gray-900">{approvalState}</p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-sm text-gray-700">
          <p className="font-semibold text-gray-900 mb-2">Next steps</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Complete retrospective analysis</li>
            <li>Generate a shareable report</li>
            <li>Collect approvals from stakeholders</li>
          </ul>
        </div>

        <div>
          <button
            onClick={handleStartAnalysis}
            disabled={startingAnalysis}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              startingAnalysis ? 'bg-blue-200 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {startingAnalysis ? 'Starting Analysis...' : 'Start Analysis'}
          </button>
        </div>
      </div>
    );
  };

  const reportDataFallback = () => ({
    template: reportData?.report_template_id || 'Template-01',
    owner: reportData?.owner_id || (task.owner?.username ?? 'Ariel'),
    path: reportData?.slice_config?.csv_file_path || '/reports/demo.csv',
  });

  const renderReportDetails = () => {
    const info = reportDataFallback();
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Template ID</p>
            <p className="text-sm text-gray-900">{info.template}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Owner</p>
            <p className="text-sm text-gray-900">{info.owner}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">File Path</p>
            <p className="text-sm text-gray-900 break-all">{info.path}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Status</p>
            {renderStatusBadge(task.status)}
          </div>
        </div>
      </div>
    );
  };

  const renderDetailsContent = () => {
    switch (task.type) {
      case 'budget':
        return renderBudgetDetails();
      case 'asset':
        return renderAssetDetails();
      case 'retrospective':
        return renderRetrospectiveDetails();
      case 'report':
        return renderReportDetails();
      default:
        return (
          <p className="text-sm text-gray-600">
            Detailed information for this task type will be available soon.
          </p>
        );
    }
  };

  const renderActivityContent = () => {
    const history = approvalHistory.length > 0
      ? approvalHistory.map((record) => ({
          id: record.id,
          name: record.approved_by.username,
          approved: record.is_approved,
          comment: record.comment,
          time: record.decided_time,
        }))
      : [
          {
            id: 1,
            name: task.owner?.username || 'Cindy',
            approved: true,
            comment: `${task.owner?.username || 'Cindy'} approved and locked this task`,
            time: new Date().toISOString(),
          },
          {
            id: 2,
            name: task.current_approver?.username || 'Xinyi',
            approved: true,
            comment: `${task.current_approver?.username || 'Xinyi'} forwarded this task`,
            time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          },
        ];

    return (
      <div className="relative">
        <div className="absolute left-2 top-0 bottom-0 border-l border-dashed border-gray-300"></div>
        <div className="space-y-6">
          {history.map((entry, index) => (
            <div key={entry.id} className="relative pl-10">
              <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-semibold">
                {entry.name.charAt(0).toUpperCase()}
              </span>
              <p className="text-sm font-semibold text-gray-900">
                {entry.name}{' '}
                <span className="text-xs font-normal text-gray-500">
                  {entry.approved ? 'approved' : 'rejected'}
                </span>
              </p>
              <p className="text-xs text-gray-400 mb-1">{formatDateTime(entry.time)}</p>
              <p className="text-sm text-gray-700">{entry.comment}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCommentsContent = () => {
    const approverOptions = approvers.length > 0
      ? approvers.map(approver => ({ value: approver.id.toString(), label: approver.username }))
      : [
          { value: '1', label: 'Cindy' },
          { value: '2', label: 'Xinyi' },
        ];

    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Comment</p>
          <div className="relative">
            <textarea
              className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-700"
              rows={3}
              placeholder="Add Comment"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Next Approver</p>
          <RemovablePicker
            options={approverOptions}
            placeholder="Select next approver"
            value={nextApprover}
            onChange={(val) => setNextApprover(val)}
            loading={loadingApprovers}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleApprove}
            className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={handleReject}
            className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    );
  };

  // Active tab state
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'comments'>('details');

  // Check if current user can review this task
  const canReviewTask = () => {
    if (task.type === 'asset') return false;
    if (!currentUser?.id || !task?.current_approver?.id) return false;

    return currentUser.id.toString() === task.current_approver.id.toString();
  };

  // Check if current user can revise this task
  const canReviseTask = () => {
    if (!currentUser?.id || !task?.owner?.id) return false;

    return currentUser.id.toString() === task.owner.id.toString();
  };

  // Handle start review button click
  const handleStartReview = async () => {
    if (task.type === 'asset') {
      alert('Asset tasks must be reviewed via the asset panel.');
      return;
    }

    if (!canReviewTask()) {
      alert("You don't have permission to review this task");
      return;
    }

    try {
      // Call task start_review API
      const taskResponse = await TaskAPI.startReview(task.id!);
      console.log('Review started for task:', task?.id);

      // TODO: Probably need to remove this after future task backend implementation
      // If task type is budget and has object_id, also call budget_approval start_review API
      if (task.type === 'budget' && task.object_id) {
        try {
          await startBudgetReview(Number(task.object_id));
          console.log('Review started for budget request:', task.object_id);
          
          // Refresh budget request data to update UI
          const budgetResponse = await BudgetAPI.getBudgetRequest(Number(task.object_id));
          setBudgetRequest(budgetResponse.data);
        } catch (budgetError) {
          console.error('Error starting budget review:', budgetError);
          // Don't fail the entire operation if budget review fails
          // The task review has already succeeded
        }
      }

      setIsReviewing(true);

      if (taskResponse.data.task) {
        Object.assign(task, taskResponse.data.task);
        updateTask(task.id!, taskResponse.data.task);
      }
      
    } catch (error) {
      console.error('Error starting review:', error);
      alert('Failed to start review. Please try again.');
    }
  };

  // Handle start revise button click
  const handleStartRevise = async () => {
    if (!canReviseTask()) {
      alert("You don't have permission to revise this task");
      return;
    }

    try {
      // Call revise API
      const response = await TaskAPI.revise(task.id!);
      setIsRevising(true);
      setShowRevise(false);
      console.log('Revise started for task:', task?.id);

      if (response.data.task) {
        Object.assign(task, response.data.task);
        updateTask(task.id!, response.data.task);
      }
    } catch (error) {
      console.error('Error starting revise:', error);
      alert('Failed to start revise. Please try again.');
    }
  };

  // Handle approve button click: approve --> lock or forward to next approver
  const handleApprove = async () => {
    try {
      // Call task make_approval API
      const taskResponse = await TaskAPI.makeApproval(task.id!, {
        action: 'approve',
        comment: reviewComment
      });

      // TODO: Probably need to remove this after future task backend implementation
      // If task type is budget and has object_id, also call budget_approval makeDecision API
      if (task.type === 'budget' && task.object_id) {
        try {
          const budgetDecisionData = {
            decision: 'approve' as const,
            comment: reviewComment,
            ...(nextApprover && { next_approver: parseInt(nextApprover) })
          };
          
          await makeBudgetDecision(Number(task.object_id), budgetDecisionData);
          console.log('Budget request approved:', task.object_id);
          
          // Refresh budget request data to update UI
          const budgetResponse = await BudgetAPI.getBudgetRequest(Number(task.object_id));
          setBudgetRequest(budgetResponse.data);
        } catch (budgetError) {
          console.error('Error approving budget request:', budgetError);
          // Don't fail the entire operation if budget approval fails
          // The task approval has already succeeded
        }
      }

      // Update task data with the response
      if (taskResponse.data.task) {
        // Update the task object with new data
        Object.assign(task, taskResponse.data.task);
        // Force re-render by updating a state variable
        setApprovalHistory(prev => [...prev]);
        // Update global store
        updateTask(task.id!, taskResponse.data.task);
      }

      // If no next approver selected, lock the task
      if (!nextApprover) {
        const lockResponse = await TaskAPI.lock(task.id!);
        // Update task data with lock response
        if (lockResponse.data.task) {
          Object.assign(task, lockResponse.data.task);
          updateTask(task.id!, lockResponse.data.task);
        }
        alert('Task approved and locked (no next approver selected)');
      } else {
        // Forward to next approver
        const forwardResponse = await TaskAPI.forward(task.id!, {
          next_approver_id: parseInt(nextApprover),
          comment: reviewComment
        });
        // Update task data with forward response
        if (forwardResponse.data.task) {
          Object.assign(task, forwardResponse.data.task);
          updateTask(task.id!, forwardResponse.data.task);
        }
        alert('Task approved and forwarded to next approver');
      }

      // Reset form and close review section
      setIsReviewing(false);
      setReviewComment('');
      setNextApprover(null);
      
      // Refresh approval history
      const historyResponse = await TaskAPI.getApprovalHistory(task.id!);
      setApprovalHistory(historyResponse.data.history || []);
      
      console.log('Task approved successfully. Status updated to:', taskResponse.data.task?.status);
      
    } catch (error) {
      console.error('Error approving task:', error);
      alert('Failed to approve task. Please try again.');
    }
  };

  // Handle reject button click
  const handleReject = async () => {
    try {
      // Call task make_approval API
      const taskResponse = await TaskAPI.makeApproval(task.id!, {
        action: 'reject',
        comment: reviewComment
      });

      // TODO: Probably need to remove this after future task backend implementation
      // If task type is budget and has object_id, also call budget_approval makeDecision API
      if (task.type === 'budget' && task.object_id) {
        try {
          const budgetDecisionData = {
            decision: 'reject' as const,
            comment: reviewComment
          };
          
          await makeBudgetDecision(Number(task.object_id), budgetDecisionData);
          console.log('Budget request rejected:', task.object_id);
          
          // Refresh budget request data to update UI
          const budgetResponse = await BudgetAPI.getBudgetRequest(Number(task.object_id));
          setBudgetRequest(budgetResponse.data);
        } catch (budgetError) {
          console.error('Error rejecting budget request:', budgetError);
          // Don't fail the entire operation if budget rejection fails
          // The task rejection has already succeeded
        }
      }

      // Update task data with the response
      if (taskResponse.data.task) {
        Object.assign(task, taskResponse.data.task);
        updateTask(task.id!, taskResponse.data.task);
      }

      alert('Task rejected');
      
      // Reset form and close review section
      setIsReviewing(false);
      setReviewComment('');
      setNextApprover(null);
      
      // Refresh approval history
      const historyResponse = await TaskAPI.getApprovalHistory(task.id!);
      setApprovalHistory(historyResponse.data.history || []);
      
    } catch (error) {
      console.error('Error rejecting task:', error);
      alert('Failed to reject task. Please try again.');
    }
  };

  // Get status label for display
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'UNDER_REVIEW':
        return 'Pending';
      default:
        return status?.replace('_', ' ') || 'Unknown';
    }
  };

  // Get status color for badge
  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'UNDER_REVIEW':
        return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'SUBMITTED':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'DRAFT':
        return 'bg-gray-50 text-gray-700 border border-gray-200';
      case 'LOCKED':
        return 'bg-gray-50 text-gray-700 border border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  // Get created time (use due_date - 7 days as fallback, or current time)
  const getCreatedTime = () => {
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const createdDate = new Date(dueDate);
      createdDate.setDate(createdDate.getDate() - 7);
      return formatDateTime(createdDate.toISOString());
    }
    return formatDateTime(new Date().toISOString());
  };

  // Get assignees list
  const assignees = [];
  if (task.owner) assignees.push(task.owner);
  if (task.current_approver && task.current_approver.id !== task.owner?.id) {
    assignees.push(task.current_approver);
  }

  return (
<<<<<<< HEAD
    <div className="grid md:grid-cols-3 grid-cols-2 gap-6 h-full min-h-0">
      {/* Left section - 2/3 of the modal, scrollable */}
      <ScrollArea className="col-span-2 h-full min-h-0">
        <div className="space-y-6 h-full flex flex-col px-1">

          {/* Task Summary & Description */}
          <section>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              {task?.summary || 'Task Summary'}
            </h1>
            <Accordion type="multiple" defaultValue={["item-1"]}>
              <AccordionItem value="item-1" className="border-none">
                <AccordionTrigger >
                  <h2 className="font-semibold text-gray-900 text-lg">Task Description</h2>
                </AccordionTrigger>
                <AccordionContent className="min-h-0 overflow-y-auto">
                  <p className="text-gray-700 mb-4">
                    {task?.description || 'Empty description'}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Dynamic Content based on task type */}
          {task?.type === 'budget' && (
            <BudgetRequestDetail 
              budgetRequest={budgetRequest || undefined}
              budgetPool={budgetPool || undefined}
              loading={loadingBudgetData}
            />
          )}
          {task?.type === 'asset' && (
            <AssetDetail 
              taskId={task.id}
              assetId={task.object_id || null}
            />
          )}
          {task?.type === 'retrospective' && <RetrospectiveDetail />}


          {/* Operation Section */}
          {isReviewing && (
            <section className="flex flex-col gap-4 ">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Add your review opinions</h2>

              <div>
                <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-1">
                  Comment
                </label>
                <textarea
                  id="review-comment"
                  name="review-comment"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  />
=======
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1 h-full min-h-0">
        <div className="space-y-6 p-6">
          {/* Task Overview Section - Top Left */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Task Overview */}
            <div className="md:col-span-1 space-y-4">
              {/* Created time */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <label className="block text-xs font-medium text-gray-500">Created time</label>
                  <p className="text-sm text-gray-900">{getCreatedTime()}</p>
                </div>
>>>>>>> 9b1c841 (feat: finalize Task core FE module (SMP-254))
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-gray-400" />
                <div>
                  <label className="block text-xs font-medium text-gray-500">Status</label>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(task?.status)}`}>
                    {getStatusIcon(task?.status)}
                    {getStatusLabel(task?.status)}
                  </span>
                </div>
              </div>

              {/* Due date */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <label className="block text-xs font-medium text-gray-500">Due date</label>
                  <p className="text-sm text-gray-900">{task.due_date ? formatDateTime(task.due_date) : 'Not set'}</p>
                </div>
              </div>

              {/* Tag */}
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <div>
                  <label className="block text-xs font-medium text-gray-500">Tag</label>
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    {task.type === 'budget' ? 'Budgetrequest' : task.type || 'Task'}
                  </span>
                </div>
              </div>

              {/* Assignees */}
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Assignees</label>
                  <div className="flex items-center gap-2">
                    {assignees.length > 0 ? (
                      assignees.map((assignee, index) => (
                        <div key={assignee.id} className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                          index === 0 ? 'bg-blue-600' : 'bg-orange-500'
                        }`}>
                          {getInitials(assignee.username)}
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Task Description and Content */}
            <div className="md:col-span-2 space-y-6">
              {/* Task Description */}
              <section>
                <h2 className="font-semibold text-gray-900 text-lg mb-3">Task Description</h2>
                <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                  <p className="text-sm text-gray-700">
                    {task?.description || 'Empty description'}
                  </p>
                </div>
              </section>

              {/* Navigation Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'details'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'activity'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Activity
                  </button>
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'comments'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Comments
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mt-4">
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    {/* Budget Request Details for budget tasks */}
                    {task?.type === 'budget' && (
                      <section>
                        <h2 className="font-semibold text-gray-900 text-lg mb-4">Budget Request Details</h2>
                        {loadingBudgetData ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="mt-2 text-gray-600 text-sm">Loading budget details...</p>
                          </div>
                        ) : budgetRequest ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <label className="block text-sm font-semibold text-gray-900">Status</label>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(budgetRequest.status)}`}>
                                {getStatusIcon(budgetRequest.status)}
                                {budgetRequest.status || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="block text-sm font-semibold text-gray-900">Amount</label>
                              <span className="text-sm text-gray-900">
                                {budgetRequest.amount} {budgetRequest.currency}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="block text-sm font-semibold text-gray-900">Advertising Channel</label>
                              <span className="text-sm text-gray-900">
                                {budgetRequest.ad_channel_detail?.name || budgetRequest.ad_channel || 'Unknown'}
                              </span>
                            </div>
                            {budgetPool && (
                              <div className="flex flex-col gap-2">
                                <label className="block text-sm font-semibold text-gray-900">Budget Pool</label>
                                <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-700">Budget Pool ID: </span>
                                      <span className="text-gray-900">{budgetPool.id}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Available Amount: </span>
                                      <span className="text-gray-900">{budgetPool.available_amount}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Total Amount: </span>
                                      <span className="text-gray-900">{budgetPool.total_amount}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <label className="block text-sm font-semibold text-gray-900">Is Escalated?</label>
                              <span className="text-sm text-gray-900">
                                {budgetRequest.is_escalated ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="block text-sm font-semibold text-gray-900">Notes</label>
                              <input
                                type="text"
                                value={budgetRequest.notes || ''}
                                readOnly
                                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-900"
                                placeholder="No notes"
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No budget request data available</p>
                        )}
                      </section>
                    )}

                    {/* Other task types */}
                    {task?.type === 'asset' && <AssetDetail />}
                    {task?.type === 'retrospective' && <RetrospectiveDetail />}
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-3">
                    {loadingHistory ? (
                      <p className="text-gray-500 text-sm">Loading activity...</p>
                    ) : approvalHistory.length === 0 ? (
                      <p className="text-gray-500 text-sm">No activity yet for this task.</p>
                    ) : (
                      approvalHistory.map((record, index) => (
                        <div key={record.id} className="flex gap-3">
                          <div className={`w-3 h-3 rounded-full mt-1 ${
                            index === approvalHistory.length - 1 ? 'bg-blue-500' : 'bg-gray-300'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {record.approved_by.username} 
                              <span className="text-xs font-normal text-gray-600 ml-1">
                                {record.is_approved ? 'approved' : 'rejected'}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(record.decided_time)}</p>
                            {record.comment && (
                              <p className="text-xs text-gray-900 mt-1">{record.comment}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'comments' && (
                  <div>
                    <p className="text-gray-500 text-sm">Comments feature coming soon...</p>
                  </div>
                )}
              </div>


              {/* Operation Section */}
              {isReviewing && (
                <section className="flex flex-col gap-4 border-t border-gray-200 pt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Add your review opinions</h2>

                  <div>
                    <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-1">
                      Comment
                    </label>
                    <textarea
                      id="review-comment"
                      name="review-comment"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                  </div>

                  <div>
                    <p className="block text-sm font-medium text-gray-700 mb-1">
                      Next Approver
                    </p>
                    <RemovablePicker 
                      options={approvers.map(approver => ({ value: approver.id.toString(), label: approver.username }))} 
                      placeholder="Select next approver" 
                      value={nextApprover}
                      onChange={(val) => setNextApprover(val)}
                      loading={loadingApprovers}
                    />
                  </div>

                  <div className="flex flex-row gap-4 justify-center mt-4">
                    <button 
                      onClick={handleApprove}
                      className="px-3 py-1.5 rounded text-white bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={handleReject}
                      className="px-3 py-1.5 rounded text-white bg-red-600 hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </section>
              )}

              {/* Action Buttons */}
              {task.status === "SUBMITTED" && !isReviewing && (
                <div className="border-t border-gray-200 pt-6">
                  <button 
                    disabled={isReviewing}
                    onClick={handleStartReview}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors
                      ${isReviewing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}
                    `}
                  >
                    {canReviewTask() ? 'Start Review' : 'Start Review (No Permission)'}
                  </button>
                </div>
              )}
              {showRevise && !isRevising && (
                <div className="border-t border-gray-200 pt-6">
                  <button 
                    disabled={isRevising}
                    onClick={handleStartRevise}
                    className="w-full px-4 py-2 text-sm font-medium rounded-md transition-colors bg-yellow-600 text-white hover:bg-yellow-700"
                  >
                    Revise
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}