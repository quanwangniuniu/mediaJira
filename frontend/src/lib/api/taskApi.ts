import api from "../api";
import {
  TaskData,
  CreateTaskData,
  TaskApprovalData,
  TaskForwardData,
  TaskLinkData,
  TaskComment,
  TaskRelationsResponse,
  TaskRelationAddRequest,
} from "@/types/task";

export const TaskAPI = {
  // Force create a new task
  forceCreateTask: (data: CreateTaskData) =>
    api.post("/api/tasks/force-create/", data),

  // Get all tasks with optional filters
  getTasks: (params?: {
    type?: string;
    project_id?: number;
    owner_id?: number;
    status?: string;
    content_type?: string;
    object_id?: string;
  }) => api.get("/api/tasks/", { params }),

  // Get a specific task by ID
  getTask: (taskId: number) => api.get(`/api/tasks/${taskId}/`),

  // Update a task
  updateTask: (taskId: number, data: Partial<TaskData>) =>
    api.patch(`/api/tasks/${taskId}/`, data),

  // Create a new task
  createTask: (data: CreateTaskData) => api.post("/api/tasks/", data),

  // Link task to a task type object
  linkTask: (taskId: number, contentType: string, objectId: string) =>
    api.post(`/api/tasks/${taskId}/link/`, {
      content_type: contentType,
      object_id: objectId,
    }),

  // Start review for a task
  startReview: (taskId: number) =>
    api.post(`/api/tasks/${taskId}/start-review/`),

  // Revise a task
  revise: (taskId: number) => api.post(`/api/tasks/${taskId}/revise/`),

  // Make approval decision (approve or reject)
  makeApproval: (taskId: number, data: TaskApprovalData) =>
    api.post(`/api/tasks/${taskId}/make-approval/`, data),

  // Lock a task
  lock: (taskId: number) => api.post(`/api/tasks/${taskId}/lock/`),

  // Forward task to next approver
  forward: (taskId: number, data: TaskForwardData) =>
    api.post(`/api/tasks/${taskId}/forward/`, data),

  // Get approval history
  getApprovalHistory: (taskId: number) =>
    api.get(`/api/tasks/${taskId}/approval-history/`),

  getComments: async (taskId: number): Promise<TaskComment[]> => {
    const response = await api.get(`/api/tasks/${taskId}/comments/`);
    const data: any = response.data;
    if (Array.isArray(data)) {
      return data as TaskComment[];
    }
    return (data.results || []) as TaskComment[];
  },

  createComment: async (
    taskId: number,
    data: { body: string }
  ): Promise<TaskComment> => {
    const response = await api.post(`/api/tasks/${taskId}/comments/`, data);
    return response.data as TaskComment;
  },

  // Delete a task
  deleteTask: (taskId: number) => api.delete(`/api/tasks/${taskId}/`),

  // Get all relations for a task
  getRelations: async (taskId: number): Promise<TaskRelationsResponse> => {
    const response = await api.get(`/api/tasks/${taskId}/relations/`);
    return response.data as TaskRelationsResponse;
  },

  // Add a relation to a task
  addRelation: async (
    taskId: number,
    data: TaskRelationAddRequest
  ): Promise<any> => {
    const response = await api.post(`/api/tasks/${taskId}/relations/`, data);
    return response.data;
  },

  // Delete a relation
  deleteRelation: (taskId: number, relationId: number) =>
    api.delete(`/api/tasks/${taskId}/relations/${relationId}/`),
};
