'use client';
import { X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Modal from "@/components/ui/Modal";
import TaskDetailPreview from "@/components/tasks/TaskDetailPreview";
import { useTaskData } from "@/hooks/useTaskData";

export default function TaskModalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.taskId;
  const { currentTask, fetchTask, loading, error } = useTaskData();
  // Fetch task data when component mounts
  useEffect(() => {
   fetchTask(Number(taskId));
  }, [taskId, fetchTask]);

  const handleClose = () => {
    router.back();
  };

  return (
    <Modal isOpen={true} onClose={()=>{}}>
      <div className="p-5 bg-white rounded-3xl flex flex-col shadow-lg">
        <div className="flex justify-end mb-2">
          <X onClick={handleClose} className="w-6 h-6 text-gray-500 hover:text-gray-700 cursor-pointer" />
        </div>
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="ml-2 text-gray-600">Loading task...</p>
            </div>
          ) : error || !currentTask ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-600 mb-4">
                  Error loading task: {error?.message || error?.toString() || 'Unknown error'}
                </p>
              </div>
            </div>
          ) : (
            <TaskDetailPreview task={currentTask} />
          )}
        </div>
      </div>
    </Modal>
  );
}