import api from '../api';
import { TaskData, CreateTaskData, TaskApprovalData, TaskForwardData, TaskLinkData } from '@/types/task';

export const TaskAPI = {

  // Get all tasks with optional filters
  getTasks: (params?: {
    type?: string;
    project_id?: number;
    owner_id?: number;
    status?: string;
    content_type?: string;
    object_id?: string;
  }) => api.get('/api/tasks/', { params }),

  // Get a specific task by ID
  getTask: (taskId: number) => api.get(`/api/tasks/${taskId}/`),

  // Create a new task
  createTask: (data: CreateTaskData) => api.post('/api/tasks/', data),

  // Link task to a task type object
  linkTask: (taskId: number, contentType: string, objectId: string) => 
    api.post(`/api/tasks/${taskId}/link/`, {
      content_type: contentType,
      object_id: objectId
    }),

};
