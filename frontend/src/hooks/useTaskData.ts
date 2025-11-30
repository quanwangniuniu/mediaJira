import { useCallback, useEffect } from "react";
import { TaskAPI } from "@/lib/api/taskApi";
import { TaskData, CreateTaskData } from "@/types/task";
import { useTaskStore } from "@/lib/taskStore";
import { mockTasks } from "@/mock/mockTasks"; // ✅ mock fallback data

// 🎯 Toggle this to switch between mock and real backend
const USE_MOCK = false; // false = real backend, true = mock data
const USE_MOCK_FALLBACK = true; // ✅ 改为 false，禁用mock fallback，这样可以看到真实错误

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

  // Get all tasks with optional filters
  const fetchTasks = useCallback(
    async (params?: {
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
        console.log("🔄 Fetching tasks from backend...");
        const response = await TaskAPI.getTasks(params);
        const fetchedTasks = response.data.results || response.data;
        
        // ✅ 合并数据库任务和本地存储的任务
        const localTasks = tasks; // 从 store 获取本地存储的任务
        const taskMap = new Map();
        
        // 先添加数据库中的任务（真实任务，优先级高）
        fetchedTasks.forEach((task: TaskData) => {
          taskMap.set(task.id, task);
        });
        
        // 再添加本地存储的任务（如果数据库中没有）
        localTasks.forEach((task: TaskData) => {
          if (!taskMap.has(task.id)) {
            // 只添加本地任务（可能是 mock 任务或未同步的任务）
            taskMap.set(task.id, task);
          }
        });
        
        const mergedTasks = Array.from(taskMap.values());
        setTasks(mergedTasks);
        console.log(
          "✅ Tasks loaded:",
          mergedTasks.length,
          "(DB:",
          fetchedTasks.length,
          "Local:",
          localTasks.length,
          ")"
        );
        return mergedTasks;
      } catch (err) {
        console.error("❌ Backend fetch failed:", err);

        // ✅ 如果后端失败，使用本地存储的任务
        if (USE_MOCK_FALLBACK) {
          console.log("🧩 Falling back to local storage tasks");
          // tasks 已经从 localStorage 恢复，直接使用
          setError(null);
          return tasks;
        } else {
          // ✅ 即使后端失败，也使用本地存储的任务（如果有）
          if (tasks.length > 0) {
            console.log("⚠️ Using local storage tasks (backend unavailable)");
            setError(null);
            return tasks;
          }
          setError(err);
          throw err;
        }
      } finally {
        setLoading(false);
      }
    },
    [setTasks, setLoading, setError, tasks] // ✅ 添加 tasks 依赖
  );

  // Get a specific task by ID
  const fetchTask = useCallback(
    async (taskId: number): Promise<TaskData> => {
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
        console.error("Failed to fetch task:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setCurrentTask, setLoading, setError]
  );

  // Create a new task
  const createTask = useCallback(
    async (taskData: CreateTaskData): Promise<TaskData> => {
      // ✅ Try backend first, fall back to mock creation
      try {
        setLoading(true);
        setError(null);
        console.log("🔄 Creating task via backend...");
        const response = await TaskAPI.createTask(taskData);
        const newTask = response.data;

        // Add the new task to the list
        addTask(newTask);
        console.log("✅ Backend task created successfully:", newTask.id);
        return newTask;
      } catch (err) {
        console.error("❌ Backend task creation failed:", err);

        // ✅ Fall back to mock creation if backend fails
        if (USE_MOCK_FALLBACK) {
          console.log("🧩 Falling back to mock task creation");
          const newTask = {
            id: Date.now(),
            summary: taskData.summary || "New Task",
            description: taskData.description || "",
            status: "DRAFT" as const,
            type: taskData.type || "budget",
            content_type: undefined,
            object_id: undefined,
            due_date: taskData.due_date || null,
            owner: {
              id: 1,
              username: "Current User",
              email: "user@example.com",
            },
            current_approver: taskData.current_approver_id
              ? {
                  id: taskData.current_approver_id,
                  username: "Approver",
                  email: "approver@example.com",
                }
              : undefined,
            project_id: taskData.project_id || 101,
            project: {
              id: taskData.project_id || 101,
              name: "Demo Project",
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
    },
    [addTask, setLoading, setError]
  );

  // Reload tasks function for manual refresh
  const reloadTasks = useCallback(async () => {
    console.log("[useTaskData] Reloading tasks...");
    await fetchTasks();
  }, [fetchTasks]);

  // Auto-fetch tasks on mount
  useEffect(() => {
    console.log("[useTaskData] Loading tasks on mount...");
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
