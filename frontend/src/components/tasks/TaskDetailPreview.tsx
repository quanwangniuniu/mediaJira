'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { TaskData } from '@/types/task';
import { RemovablePicker } from '../ui/RemovablePicker';
import { approverApi } from '@/lib/api/approverApi';
import { BudgetAPI, BudgetPoolData, BudgetRequestData } from '@/lib/api/budgetApi';
import { TaskAPI } from '@/lib/api/taskApi';
import { RetrospectiveAPI, RetrospectiveTaskData } from '@/lib/api/retrospectiveApi';
import { Calendar, Clock, Sun, Tag, User } from 'lucide-react';

type ActiveTab = 'details' | 'activity' | 'comments';

interface TimelineItem {
  id: number;
  name: string;
  action: string;
  timestamp: string;
  comment?: string;
}

interface TaskDetailPreviewProps {
  task: TaskData;
}

const APPROVER_FALLBACK = [
  { id: 1, username: 'Cindy', email: 'cindy@example.com' },
  { id: 2, username: 'Xinyi', email: 'xinyi@example.com' },
];

const ACTIVITY_FALLBACK: TimelineItem[] = [
  {
    id: 1,
    name: 'Cindy',
    action: 'approved and locked',
    timestamp: '2025-09-03T16:12:00.000Z',
    comment:
      'Cindy changed status of “Budget for inviting famous TikTok celebrities” to LOCKED',
  },
  {
    id: 2,
    name: 'Xinyi',
    action: 'approved and forwarded',
    timestamp: '2025-09-03T13:12:00.000Z',
    comment:
      'Xinyi changed the status of “Budget for inviting famous TikTok celebrities” from APPROVED to UNDER REVIEW',
  },
];

const statusBadgeStyles: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700 border border-green-200',
  SUBMITTED: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  UNDER_REVIEW: 'bg-amber-50 text-amber-600 border border-amber-200',
  PENDING: 'bg-amber-50 text-amber-600 border border-amber-200',
  DRAFT: 'bg-gray-50 text-gray-600 border border-gray-200',
  REJECTED: 'bg-red-50 text-red-600 border border-red-200',
  LOCKED: 'bg-gray-100 text-gray-700 border border-gray-300',
  SCHEDULED: 'bg-blue-50 text-blue-600 border border-blue-200',
  COMPLETED: 'bg-green-50 text-green-600 border border-green-200',
  IN_PROGRESS: 'bg-purple-50 text-purple-600 border border-purple-200',
  CANCELLED: 'bg-red-50 text-red-600 border border-red-200',
};

const formatDateOnly = (value?: string) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTimeOnly = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const renderStatusBadge = (status?: string) => {
  if (!status) return <span className="text-xs text-gray-500">Unknown</span>;
  const normalized = status.toUpperCase();
  const classes =
    statusBadgeStyles[normalized] ||
    'bg-gray-100 text-gray-700 border border-gray-200';
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${classes}`}
    >
      <span className="w-2 h-2 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
};

export default function TaskDetailPreview({ task }: TaskDetailPreviewProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [approvers, setApprovers] = useState(APPROVER_FALLBACK);
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const [nextApprover, setNextApprover] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [approvalHistory, setApprovalHistory] =
    useState<TimelineItem[]>(ACTIVITY_FALLBACK);
  const [budgetRequest, setBudgetRequest] =
    useState<BudgetRequestData | null>(null);
  const [budgetPool, setBudgetPool] = useState<BudgetPoolData | null>(null);
  const [retrospective, setRetrospective] =
    useState<RetrospectiveTaskData | null>(null);
  const [startingAnalysis, setStartingAnalysis] = useState(false);

  const createdDateValue =
    (task as any)?.created_at || task.due_date || new Date().toISOString();
  const dueDateValue = task.due_date || createdDateValue;
  const tagLabel = task.content_type || task.type || 'Task';

  useEffect(() => {
    const loadApprovers = async () => {
      if (!task.type) return;
      try {
        setLoadingApprovers(true);
        const result = await approverApi.getApprovers(task.type);
        if (result && result.length > 0) {
          setApprovers(result);
        } else {
          setApprovers(APPROVER_FALLBACK);
        }
      } catch {
        setApprovers(APPROVER_FALLBACK);
      } finally {
        setLoadingApprovers(false);
      }
    };

    loadApprovers();
  }, [task.type]);

  useEffect(() => {
    const loadBudget = async () => {
      if (task.type !== 'budget' || !task.object_id) return;
      try {
        const response = await BudgetAPI.getBudgetRequest(Number(task.object_id));
        setBudgetRequest(response.data);
        if (response.data?.budget_pool) {
          const pool = await BudgetAPI.getBudgetPool(response.data.budget_pool);
          setBudgetPool(pool.data);
        }
      } catch {
        setBudgetRequest(null);
        setBudgetPool(null);
      }
    };

    loadBudget();
  }, [task.type, task.object_id]);

  useEffect(() => {
    const loadRetrospective = async () => {
      if (task.type !== 'retrospective' || !task.object_id) return;
      try {
        const response = await RetrospectiveAPI.getRetrospective(task.object_id);
        setRetrospective(response.data);
      } catch {
        setRetrospective(null);
      }
    };

    loadRetrospective();
  }, [task.type, task.object_id]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await TaskAPI.getApprovalHistory(task.id!);
        const history = response.data.history || [];
        if (history.length === 0) {
          setApprovalHistory(ACTIVITY_FALLBACK);
        } else {
          setApprovalHistory(
            history.map((item: any, index: number) => ({
              id: item.id || index,
              name: item.approved_by?.username || 'Approver',
              action: item.is_approved ? 'approved' : 'rejected',
              timestamp: item.decided_time,
              comment: item.comment,
            }))
          );
        }
      } catch {
        setApprovalHistory(ACTIVITY_FALLBACK);
      }
    };

    loadHistory();
  }, [task.id]);

  const assignees = useMemo(() => {
    const chips = [];
    if (task.owner?.username) {
      chips.push({ label: task.owner.username, color: 'bg-blue-100 text-blue-700' });
    }
    if (
      task.current_approver?.username &&
      task.current_approver.username !== task.owner?.username
    ) {
      chips.push({
        label: task.current_approver.username,
        color: 'bg-orange-100 text-orange-700',
      });
    }
    return chips;
  }, [task.owner, task.current_approver]);

  const budgetInfo = budgetRequest || ({
    amount: '3000.00',
    currency: 'AUD',
    ad_channel_detail: { name: 'TikTok' },
    status: task.status || 'Draft',
    notes: 'ASAP Please!',
  } as BudgetRequestData);

  const assetDetails = {
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

  const retrospectiveInfo = retrospective || ({
    status: 'scheduled',
    report_url: null,
    reviewed_by: null,
  } as RetrospectiveTaskData);

  const reportDetails = {
    template: task.linked_object?.report_template_id || 'Template-01',
    owner: task.linked_object?.owner_id || task.owner?.username || 'Ariel',
    path: task.linked_object?.slice_config?.csv_file_path || '/reports/demo.csv',
  };

  const headerItems = [
    {
      key: 'created',
      icon: <Sun className="w-4 h-4 text-gray-400" />,
      label: 'Created time',
      value: formatDateOnly(createdDateValue),
      hint: formatTimeOnly(createdDateValue),
    },
    {
      key: 'status',
      icon: <Clock className="w-4 h-4 text-gray-400" />,
      label: 'Status',
      custom: renderStatusBadge(task.status),
    },
    {
      key: 'due',
      icon: <Calendar className="w-4 h-4 text-gray-400" />,
      label: 'Due date',
      value: formatDateOnly(dueDateValue),
      hint: formatTimeOnly(dueDateValue),
    },
    {
      key: 'tag',
      icon: <Tag className="w-4 h-4 text-gray-400" />,
      label: 'Tag',
      custom: (
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold capitalize">
          {tagLabel.toString()}
        </span>
      ),
    },
    {
      key: 'assignees',
      icon: <User className="w-4 h-4 text-gray-400" />,
      label: 'Assignees',
      custom:
        assignees.length === 0 ? (
          <span className="text-xs text-gray-500">No assignees</span>
        ) : (
          <div className="flex items-center gap-2">
            {assignees.map((chip) => (
              <span
                key={chip.label}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${chip.color}`}
              >
                {chip.label.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
        ),
    },
  ];

  const renderDetailsContent = () => {
    switch (task.type) {
      case 'budget':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">Status</p>
                {renderStatusBadge(budgetInfo.status)}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">Amount</p>
                <p className="text-xs text-gray-900">
                  {budgetInfo.amount} {budgetInfo.currency}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">
                  Advertising Channel
                </p>
                <p className="text-xs text-gray-900">
                  {budgetInfo.ad_channel_detail?.name || 'TikTok'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">
                  Is Escalated?
                </p>
                <p className="text-xs text-gray-900">
                  {budgetInfo.is_escalated ? 'Yes' : 'No'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-900 mb-2">Budget Pool</p>
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 text-xs text-gray-700 space-y-1.5">
                <div>
                  <span className="font-medium">Budget Pool ID:</span>{' '}
                  {budgetPool?.id ?? 1}
                </div>
                <div>
                  <span className="font-medium">Available Amount:</span>{' '}
                  {budgetPool?.available_amount ?? '1'}
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span>{' '}
                  {budgetPool?.total_amount ?? '1'}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-900 mb-2">Notes</p>
              <div className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs text-gray-700">
                {budgetInfo.notes || 'No notes'}
              </div>
            </div>
          </div>
        );
      case 'asset':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">Status</p>
                {renderStatusBadge(assetDetails.status)}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">Owner</p>
                <p className="text-xs text-gray-900">{assetDetails.owner}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">Campaign</p>
                <p className="text-xs text-gray-900">{assetDetails.campaign}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">Due</p>
                <p className="text-xs text-gray-900">{assetDetails.due}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 mb-2">Deliverables</p>
              <ul className="space-y-1 text-xs text-gray-700 list-disc list-inside">
                {assetDetails.deliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        );
      case 'retrospective':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">Retrospective Status</p>
                {renderStatusBadge(retrospectiveInfo.status?.toUpperCase())}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">Report Available</p>
                <p className="text-xs text-gray-900">
                  {retrospectiveInfo.report_url ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">Approval State</p>
                <p className="text-xs text-gray-900">
                  {retrospectiveInfo.reviewed_by ? 'Approved' : 'Pending'}
                </p>
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 text-xs text-gray-700 space-y-1">
              <p className="font-semibold text-gray-900 mb-1.5">Next steps</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Complete retrospective analysis</li>
                <li>Generate a shareable report</li>
                <li>Collect approvals from stakeholders</li>
              </ul>
            </div>
            <div>
              <button
                onClick={async () => {
                  setStartingAnalysis(true);
                  try {
                    await RetrospectiveAPI.startAnalysis(retrospectiveInfo.id || task.object_id!);
                    alert('Demo: analysis started');
                  } catch {
                    alert('Failed to start analysis');
                  } finally {
                    setStartingAnalysis(false);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  startingAnalysis
                    ? 'bg-blue-200 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {startingAnalysis ? 'Starting Analysis...' : 'Start Analysis'}
              </button>
            </div>
          </div>
        );
      case 'report':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">Template ID</p>
                <p className="text-xs text-gray-900">{reportDetails.template}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-1">Owner</p>
                <p className="text-xs text-gray-900">{reportDetails.owner}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-gray-900 mb-1">File Path</p>
                <p className="text-xs text-gray-900 break-all">{reportDetails.path}</p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <p className="text-xs text-gray-600">
            Detailed information for this task type will be available soon.
          </p>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-[20px]">
      <div className="flex-1 px-4 pb-3">
        <section className="bg-white border border-gray-200 rounded-[20px] shadow-sm">
          <div className="px-4 py-1.5 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">
              {task.summary || 'Untitled Task'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {task.project?.name ? `Project · ${task.project.name}` : 'Task overview'}
            </p>
          </div>

          <div className="px-4 py-3 border-b border-gray-200">
            <div className="grid grid-cols-[auto,1fr] gap-x-16 gap-y-2.5">
              {headerItems.map((item) => (
                <Fragment key={item.key}>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-5 h-5 flex items-center justify-center">{item.icon}</div>
                    <span className="text-[12px] font-medium text-gray-500">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-900">
                    {item.custom ? (
                      item.custom
                    ) : (
                      <>
                        <span>{item.value}</span>
                        {item.hint && (
                          <span className="ml-2 text-[11px] text-gray-400">{item.hint}</span>
                        )}
                      </>
                    )}
                  </div>
                </Fragment>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-xs font-semibold text-gray-900 mb-1">Task Description</h2>
            <div className="bg-gray-100 border border-gray-200 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-700 leading-5">
                {task.description || 'No description provided.'}
              </p>
            </div>
          </div>

          <div className="px-4">
            <div className="flex gap-4 border-b border-gray-200 pt-2">
              {(['details', 'activity', 'comments'] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 text-xs font-semibold ${
                    activeTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 border-b-2 border-transparent hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <TabContent
              activeTab={activeTab}
              renderDetailsContent={renderDetailsContent}
              approvalHistory={approvalHistory}
              reviewComment={reviewComment}
              setReviewComment={setReviewComment}
              nextApprover={nextApprover}
              setNextApprover={setNextApprover}
              approvers={approvers}
              loadingApprovers={loadingApprovers}
              formatDateOnly={formatDateOnly}
              formatTimeOnly={formatTimeOnly}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

interface TabContentProps {
  activeTab: ActiveTab;
  renderDetailsContent: () => JSX.Element | JSX.Element[];
  approvalHistory: TimelineItem[];
  reviewComment: string;
  setReviewComment: (value: string) => void;
  nextApprover: string | null;
  setNextApprover: (value: string | null) => void;
  approvers: { id: number; username: string }[];
  loadingApprovers: boolean;
  formatDateOnly: (value?: string) => string;
  formatTimeOnly: (value?: string) => string;
}

function TabContent({
  activeTab,
  renderDetailsContent,
  approvalHistory,
  reviewComment,
  setReviewComment,
  nextApprover,
  setNextApprover,
  approvers,
  loadingApprovers,
  formatDateOnly,
  formatTimeOnly,
}: TabContentProps) {
  return (
    <div className="py-3 min-h-[320px] max-h-[320px] overflow-y-auto pr-1">
      {activeTab === 'details' && renderDetailsContent()}
      {activeTab === 'activity' && (
        <div className="relative">
          <div className="absolute left-2 top-0 bottom-0 border-l border-dashed border-gray-300"></div>
          <div className="space-y-4">
            {approvalHistory.map((entry) => (
              <div key={entry.id} className="relative pl-10">
                <span className="absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
                  {entry.name.charAt(0).toUpperCase()}
                </span>
                <p className="text-xs font-semibold text-gray-900">
                  {entry.name}{' '}
                  <span className="text-[11px] font-normal text-gray-500">
                    {entry.action}
                  </span>
                </p>
                <p className="text-[11px] text-gray-400 mb-1">
                  {formatDateOnly(entry.timestamp)} · {formatTimeOnly(entry.timestamp)}
                </p>
                {entry.comment && (
                  <p className="text-xs text-gray-700">{entry.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-900 mb-2">Comment</p>
            <textarea
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-700"
              rows={2}
              placeholder="Add Comment"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900 mb-2">Next Approver</p>
            <RemovablePicker
              options={approvers.map((approver) => ({
                value: approver.id.toString(),
                label: approver.username,
              }))}
              placeholder="Select next approver"
              value={nextApprover}
              onChange={(val) => setNextApprover(val)}
              loading={loadingApprovers}
            />
          </div>
          <div className="flex justify-center gap-3 pt-6">
            <button
              onClick={() => {
                alert('Demo: Task approved');
                setReviewComment('');
                setNextApprover(null);
              }}
              className="px-3 py-2 min-w-[88px] rounded-xl bg-green-600 text-white font-semibold text-xs hover:bg-green-700 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => {
                alert('Demo: Task rejected');
                setReviewComment('');
                setNextApprover(null);
              }}
              className="px-3 py-2 min-w-[88px] rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

