import { useCallback, useState } from "react";
import { TaskAPI } from "@/lib/api/taskApi";
import api from "@/lib/api";
import { TaskData, CreateTaskData } from "@/types/task";
import { useTaskStore } from "@/lib/taskStore";

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
    addTask,
  } = useTaskStore();

  const [lastParams, setLastParams] = useState(undefined);

  // Get all tasks with optional filters
  const fetchTasks = useCallback(
    async (params?: {
      type?: string;
      project_id?: number;
      owner_id?: number;
      status?: string;
      content_type?: string;
      object_id?: string;
      include_subtasks?: boolean;
      all_projects?: boolean;
    }) => {
      // Record the last request parameters
      setLastParams(params || undefined);

      try {
        setLoading(true);
        setError(null);
        console.log("Fetching tasks from backend...");
        
        // Fetch all pages of tasks
        let allTasks: any[] = [];
        let nextUrl: string | null = null;
        let page = 1;
        
        do {
          let response: any;
          
          if (nextUrl) {
            // If we have a next URL, use it directly
            response = await api.get(nextUrl);
          } else {
            // Otherwise, use TaskAPI with params and page number
            const requestParams = { ...params, page };
            response = await TaskAPI.getTasks(requestParams);
          }
          
          const responseData: any = response.data;
          const tasks = responseData.results || (Array.isArray(responseData) ? responseData : []);
          allTasks = allTasks.concat(tasks);
          
          nextUrl = responseData.next || null;
          page++;
          
          // Safety limit to prevent infinite loops
          if (page > 100) break;
        } while (nextUrl);
        
        setTasks(allTasks);
        console.log(
          "Backend tasks fetched successfully:",
          allTasks.length
        );
        return allTasks;
      } catch (err) {
        console.error("Backend fetch failed:", err);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setTasks, setLoading, setError]
  );

  // Get a specific task by ID
  const fetchTask = useCallback(
    async (taskId: number): Promise<TaskData> => {
      try {
        setLoading(true);
        setError(null);
        const response = await TaskAPI.getTask(taskId);
        const task = response.data;
        setCurrentTask(task);
        return task;
      } catch (err) {
        setError(err);
        console.error("Failed to fetch task:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setCurrentTask, setLoading, setError]
  );

  // Force create a new task
  const createTask = useCallback(
    async (taskData: CreateTaskData): Promise<TaskData> => {
      setLoading(true);
      setError(null);

      try {
        // Try to create the task normally first
        console.log("Creating task via backend /api/tasks/ ...");
        const response = await TaskAPI.createTask(taskData);
        const newTask = response.data as TaskData;

        addTask(newTask);
        console.log("Backend task created successfully:", newTask.id);
        return newTask;
      } catch (err) {
        console.error(
          "Backend task creation failed, trying /api/tasks/force-create/ ...",
          err
        );

        // Use the fallback interface to try again
        try {
          const forceResponse = await TaskAPI.forceCreateTask(taskData);
          const newTask = forceResponse.data as TaskData;

          addTask(newTask);
          console.log("Task created via force-create:", newTask.id);
          return newTask;
        } catch (forceErr) {
          console.error("Force-create also failed:", forceErr);
          setError(forceErr);
          throw forceErr;
        }
      } finally {
        setLoading(false);
      }
    },
    [addTask, setLoading, setError]
  );

  // Reload tasks function for manual refresh
  const reloadTasks = useCallback(async () => {
    console.log(
      "[useTaskData] Reloading tasks with last params...",
      lastParams
    );
    await fetchTasks(lastParams);
  }, [fetchTasks, lastParams]);

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
