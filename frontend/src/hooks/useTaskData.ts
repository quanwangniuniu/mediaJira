import { useCallback, useEffect } from 'react';
import { TaskAPI } from '@/lib/api/taskApi';
import { TaskData, CreateTaskData } from '@/types/task';
import { useTaskStore } from '@/lib/taskStore';
import { mockTasks } from '@/mock/mockTasks'; // ✅ mock fallback data

// 🎯 Toggle this to switch between mock and real backend
const USE_MOCK = false; // false = real backend, true = mock data  
const USE_MOCK_FALLBACK = true; // true = fallback to mock data when backend fails

export const useTaskData = () => {
  const { 
    tasks, 
    currentTask, 
    loading, 
    error, 
    setTasks, 
    setCurrentTask, 
    setLoading, 
    setError,
    updateTask,
    addTask
  } = useTaskStore();

  // Get all tasks with optional filters
  const fetchTasks = useCallback(async (params?: {
    type?: string;
    project_id?: number;
    owner_id?: number;
    status?: string;
    content_type?: string;
    object_id?: string;
  }) => {
    // ✅ Try backend first, fall back to mock data
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching tasks from backend...');
      const response = await TaskAPI.getTasks(params);
      const fetchedTasks = response.data.results || response.data;
      setTasks(fetchedTasks);
      console.log('✅ Backend tasks fetched successfully:', fetchedTasks.length);
      return fetchedTasks;
    } catch (err) {
      console.error('❌ Backend fetch failed:', err);
      
      // ✅ Fall back to mock data if backend fails
      if (USE_MOCK_FALLBACK) {
        console.log('🧩 Falling back to mock data');
        setTasks(mockTasks);
        setError(null); // Clear error when using mock data
        return mockTasks;
      } else {
        setError(err);
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, [setTasks, setLoading, setError]);

  // Get a specific task by ID
  const fetchTask = useCallback(async (taskId: number): Promise<TaskData> => {
    // ✅ mock mode: get task from mockTasks
    if (USE_MOCK) {
      console.log(`🧩 Mock mode: fetching task ${taskId} locally`);
      const task = mockTasks.find((t) => t.id === taskId) as TaskData;
      setCurrentTask(task);
      return task;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await TaskAPI.getTask(taskId);
      const task = response.data;
      setCurrentTask(task);
      return task;
    } catch (err) {
      setError(err);
      console.error('Failed to fetch task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setCurrentTask, setLoading, setError]);

  // Create a new task
  const createTask = useCallback(async (taskData: CreateTaskData): Promise<TaskData> => {
    // ✅ Try backend first, fall back to mock creation
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Creating task via backend...');
      const response = await TaskAPI.createTask(taskData);
      const newTask = response.data;
      
      // Add the new task to the list
      addTask(newTask);
      console.log('✅ Backend task created successfully:', newTask.id);
      return newTask;
    } catch (err) {
      console.error('❌ Backend task creation failed:', err);
      
      // ✅ Fall back to mock creation if backend fails
      if (USE_MOCK_FALLBACK) {
        console.log('🧩 Falling back to mock task creation');
        const newTask = {
          id: Date.now(),
          summary: taskData.summary || 'New Task',
          description: taskData.description || '',
          status: 'DRAFT' as const,
          type: taskData.type || 'budget',
          content_type: undefined,
          object_id: undefined,
          due_date: taskData.due_date || null,
          owner: {
            id: 1,
            username: 'Current User',
            email: 'user@example.com',
          },
          current_approver: taskData.current_approver_id ? {
            id: taskData.current_approver_id,
            username: 'Approver',
            email: 'approver@example.com',
          } : undefined,
          project_id: taskData.project_id || 101,
          project: {
            id: taskData.project_id || 101,
            name: 'Demo Project',
          },
        } as TaskData;
        addTask(newTask);
        setError(null); // Clear error when using mock data
        return newTask;
      } else {
        setError(err);
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, [addTask, setLoading, setError]);

  // Reload tasks function for manual refresh
  const reloadTasks = useCallback(async () => {
    console.log('[useTaskData] Reloading tasks...');
    await fetchTasks();
  }, [fetchTasks]);

  // Auto-fetch tasks on mount
  useEffect(() => {
    console.log('[useTaskData] Loading tasks on mount...');
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    currentTask,
    loading,
    error,
    fetchTasks,
    fetchTask,
    createTask,
    updateTask,
    reloadTasks,
  };
};
