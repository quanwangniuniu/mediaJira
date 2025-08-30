import { useState, useEffect, useCallback } from 'react';
import { TaskAPI } from '@/lib/api/taskApi';
import { TaskData, CreateTaskData } from '@/types/task';

export const useTaskData = () => {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [currentTask, setCurrentTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

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
  }, []);

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
  }, []);

  // Create a new task
  const createTask = useCallback(async (taskData: CreateTaskData): Promise<TaskData> => {
    try {
      setLoading(true);
      setError(null);
      const response = await TaskAPI.createTask(taskData);
      const newTask = response.data;
      
      // Add the new task to the list
      setTasks(prev => [newTask, ...prev]);
      
      return newTask;
    } catch (err) {
      setError(err);
      console.error('Failed to create task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tasks,
    currentTask,
    loading,
    error,
    fetchTasks,
    fetchTask,
    createTask,
  };
};
