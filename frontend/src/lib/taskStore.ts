import { create } from "zustand";
import { persist } from "zustand/middleware"; // ✅ 导入 persist 中间件
import { TaskData } from "@/types/task";

interface TaskStore {
  tasks: TaskData[];
  currentTask: TaskData | null;
  loading: boolean;
  error: any;

  // Actions
  setTasks: (tasks: TaskData[]) => void;
  setCurrentTask: (task: TaskData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: any) => void;

  // Update specific task
  updateTask: (taskId: number, updatedData: Partial<TaskData>) => void;

  // Add new task
  addTask: (task: TaskData) => void;

  // Remove task
  removeTask: (taskId: number) => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      currentTask: null,
      loading: false,
      error: null,

      setTasks: (tasks) => set({ tasks }),
      setCurrentTask: (currentTask) => set({ currentTask }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      updateTask: (taskId, updatedData) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, ...updatedData } : task
          ),
          currentTask:
            state.currentTask && state.currentTask.id === taskId
              ? { ...state.currentTask, ...updatedData }
              : state.currentTask,
        }));
      },

      addTask: (task) => {
        set((state) => ({
          tasks: [task, ...state.tasks],
        }));
      },

      removeTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId),
        }));
      },
    }),
    {
      name: 'task-storage', // localStorage 的 key 名称
      partialize: (state) => ({
        // ✅ 只持久化 tasks，不持久化 loading 和 error（这些是临时状态）
        tasks: state.tasks,
        currentTask: state.currentTask,
      }),
    }
  )
);
