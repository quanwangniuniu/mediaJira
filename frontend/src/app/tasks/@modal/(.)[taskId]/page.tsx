'use client';
import { X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Modal from "@/components/ui/Modal";
import TaskDetail from "@/components/tasks/TaskDetail";
import { useTaskData } from "@/hooks/useTaskData";
import { TaskData } from "@/types/task";
import useAuth from "@/hooks/useAuth";

export default function TaskModalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.taskId;
  const { currentTask, fetchTask, loading, error } = useTaskData();
  const { user } = useAuth();
  const [task, setTask] = useState({
    project_id: null,
    type: '',
    summary: '',
    description: '',
    current_approver_id: null,
    due_date: '',
  });

  // Fetch task data when component mounts
  useEffect(() => {
   fetchTask(Number(taskId));
  }, [taskId, fetchTask]);

  const handleClose = () => {
    router.back();
  };

  return (
    <Modal isOpen={true} onClose={()=>{}}>
      <div className="p-6 h-[80vh] bg-white rounded-md flex flex-col">
        <div className="flex justify-end mb-4">
          <X onClick={handleClose} className="w-6 h-6 text-gray-500 hover:text-gray-700 cursor-pointer" />
        </div>
        <div className="flex-1 h-full min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="ml-2 text-gray-600">Loading task...</p>
            </div>
          ) : error || !currentTask ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-600 mb-4">
                  Error loading task:{" "}
                  {error?.response?.data?.detail ||
                    error?.response?.data?.message ||
                    error?.message ||
                    (typeof error === "string" ? error : "Unknown error")}
                </p>
              </div>
            </div>
          ) : (
            <TaskDetail task={currentTask} currentUser={user || undefined} />
          )}
        </div>
      </div>
    </Modal>
  );
}