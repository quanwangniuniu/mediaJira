import { useCallback } from 'react';
import { TaskAPI } from '@/lib/api/taskApi';
import { TaskData, CreateTaskData } from '@/types/task';
import { useTaskStore } from '@/lib/taskStore';

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
