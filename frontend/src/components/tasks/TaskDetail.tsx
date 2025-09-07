'use client';

import { useEffect, useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../ui/accordion";
import { ScrollArea } from "../ui/scroll-area";
import { TaskData } from "@/types/task";
import { RemovablePicker } from "../ui/RemovablePicker";
import { approverApi } from "@/lib/api/approverApi";
import { TaskAPI } from "@/lib/api/taskApi";
import { BudgetRequestData, BudgetPoolData } from "@/lib/api/budgetApi";
import { BudgetAPI } from "@/lib/api/budgetApi";
import { useBudgetData } from "@/hooks/useBudgetData";
import { useTaskStore } from "@/lib/taskStore";
import AssetDetail from "./AssetDetail";
import RetrospectiveDetail from "./RetrospectiveDetail";
import BudgetRequestDetail from "./BudgetRequestDetail";

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
  }, [])

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

  // Check if current user can review this task
  const canReviewTask = () => {
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

  return (
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
          {task?.type === 'asset' && <AssetDetail />}
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
                  className="px-3 py-1.5 rounded text-white bg-green-600 hover:bg-green-700">Approve</button>
                <button 
                  onClick={handleReject}
                  className="px-3 py-1.5 rounded text-white bg-red-600 hover:bg-red-700">Reject</button>
                {/* <button 
                  onClick={() => setIsReviewing(false)}
                  className="px-3 py-1.5 rounded text-white bg-gray-500 hover:bg-gray-600">Cancel</button> */}
              </div>
          
            </section>
          )}
        </div>
      </ScrollArea>

      {/* Right section - 1/3 of the modal, fixed height with scroll */}
      <ScrollArea className="md:col-span-1 col-span-2 flex flex-col h-full min-h-0 px-1">
        {/* Task Basic Info */}
        <Accordion type="multiple" className="mb-4 w-full max-h-full overflow-y-auto shrink-0 px-4 border-gray-300 border rounded-md" defaultValue={["item-1"]}>
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger >
              <span className="font-semibold text-gray-900">Task Details</span>
            </AccordionTrigger>
            <AccordionContent className="min-h-0 overflow-y-auto">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 tracking-wide">Status</label>
                <span className={`inline-block px-2 py-1 text-sm font-medium rounded-full ${getStatusColor(task?.status)}`}>
                  {task?.status?.replace('_', ' ') || 'Unknown'}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 tracking-wide">Type</label>
                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                  {task?.type || 'Unknown'}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 tracking-wide">Owner</label>
                <p className="text-sm text-gray-900">{task?.owner?.username || 'Unassigned'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 tracking-wide">Current Approver</label>
                <p className="text-sm text-gray-900">{task?.current_approver?.username || 'No approver assigned'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 tracking-wide">Project</label>
                <p className="text-sm text-gray-900">{task?.project?.name || 'Unknown Project'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 tracking-wide">Due Date</label>
                <p className="text-sm text-gray-900">{formatDate(task?.due_date)}</p>
              </div>
            </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        {/* Approval Timeline */}
        <Accordion type="multiple" className="mb-4 w-full max-h-full min-h-0 overflow-y-auto px-4 border-gray-300 border rounded-md" defaultValue={["item-1"]}>
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger>
              <span className="font-semibold text-gray-900">Approval Timeline</span>
            </AccordionTrigger>
            <AccordionContent className="min-h-0 overflow-y-auto">
              <div className="space-y-3">
                {loadingHistory ? (
                  <p>Loading approval history...</p>
                ) : approvalHistory.length === 0 ? (
                  <p>No approval history yet for this task.</p>
                ) : (
                  approvalHistory.map((record, index) => (
                    <div key={record.id} className="flex flew-row">
                      <div className={`w-3 h-3 rounded-full mr-3 mt-1 ${
                        index === approvalHistory.length - 1 ? 'bg-blue-500' : 'bg-gray-300'
                      }`}>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{record.approved_by.username} 
                          <span className="text-xs font-normal text-gray-900"> {record.is_approved ? 'approved' : 'rejected'}</span>
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(record.decided_time)}</p>
                        <p className="text-xs text-gray-900">{record.comment}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Operations */}
        { task.status === "SUBMITTED" && (
          <div className="max-h-full overflow-y-auto">
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
        {showRevise && (
          <div className="max-h-full overflow-y-auto ">
            <button 
              disabled={isRevising}
              onClick={handleStartRevise}
              className="w-full px-4 py-2 text-sm font-medium rounded-md transition-colors bg-yellow-600 text-white hover:bg-yellow-700">
                Revise
            </button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}