import { useCallback } from 'react';
import { TaskAPI } from '@/lib/api/taskApi';
import { TaskData, CreateTaskData } from '@/types/task';
import { useTaskStore } from '@/lib/taskStore';
import { mockTasks } from '@/mock/mockTasks'; // ✅ mock fallback data

const USE_MOCK = true; // ✅ mock mode switch (false = use backend)

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
    // ✅ mock mode: return mockTasks instead of backend
    if (USE_MOCK) {
      console.log('🧩 Using mockTasks instead of backend');
      setTasks(mockTasks);
      return mockTasks;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await TaskAPI.getTasks(params);
      const fetchedTasks = response.data.results || response.data;
      setTasks(fetchedTasks);
      return fetchedTasks;
    } catch (err) {
      setError(err);
      console.error('Failed to fetch tasks:', err);
      throw err;
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
    // ✅ mock mode: create locally
    if (USE_MOCK) {
      console.log('🧩 Mock mode: creating task locally');
      const newTask = { id: Date.now(), ...taskData } as TaskData;
      addTask(newTask);
      return newTask;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await TaskAPI.createTask(taskData);
      const newTask = response.data;
      
      // Add the new task to the list
      addTask(newTask);
      
      return newTask;
    } catch (err) {
      setError(err);
      console.error('Failed to create task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addTask, setLoading, setError]);

  return {
    tasks,
    currentTask,
    loading,
    error,
    fetchTasks,
    fetchTask,
    createTask,
    updateTask,
  };
};
