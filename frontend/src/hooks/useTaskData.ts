import { useCallback, useState } from "react";
import { TaskAPI } from "@/lib/api/taskApi";
import api from "@/lib/api";
import { TaskData, CreateTaskData, TaskListFilters } from "@/types/task";
import { useTaskStore } from "@/lib/taskStore";

type TaskFetchParams = TaskListFilters & {
  content_type?: string;
  object_id?: string;
  page?: number;
};

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

  const [lastParams, setLastParams] = useState<TaskFetchParams | undefined>(
    undefined,
  );

  // Get all tasks with optional filters
  const fetchTasks = useCallback(
    async (params?: TaskFetchParams) => {
      // Record the last request parameters
      setLastParams(params || undefined);
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/d1c5a812-8fba-4f4b-91ec-d69ecfc99679",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: "usetaskdata-project-debug-v1",
            hypothesisId: "H1",
            location: "useTaskData.ts:fetchTasks:entry",
            message: "fetchTasks called with params",
            data: {
              hasParams: Boolean(params),
              project_id: params?.project_id ?? null,
              include_subtasks: params?.include_subtasks ?? null,
              all_projects: params?.all_projects ?? null,
              type: params?.type ?? null,
            },
            timestamp: Date.now(),
          }),
        },
      ).catch(() => {});
      // #endregion

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
            // #region agent log
            fetch(
              "http://127.0.0.1:7242/ingest/d1c5a812-8fba-4f4b-91ec-d69ecfc99679",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  runId: "usetaskdata-project-debug-v1",
                  hypothesisId: "H3",
                  location: "useTaskData.ts:fetchTasks:nextUrlRequest",
                  message: "Requesting paginated next URL",
                  data: { nextUrl, page },
                  timestamp: Date.now(),
                }),
              },
            ).catch(() => {});
            // #endregion
            // If we have a next URL, use it directly
            response = await api.get(nextUrl);
          } else {
            // Otherwise, use TaskAPI with params and page number
            const requestParams = { ...params, page };
            // #region agent log
            fetch(
              "http://127.0.0.1:7242/ingest/d1c5a812-8fba-4f4b-91ec-d69ecfc99679",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  runId: "usetaskdata-project-debug-v1",
                  hypothesisId: "H2",
                  location: "useTaskData.ts:fetchTasks:firstPageRequest",
                  message: "Requesting tasks with TaskAPI.getTasks",
                  data: {
                    page,
                    project_id: requestParams.project_id ?? null,
                    include_subtasks: requestParams.include_subtasks ?? null,
                    all_projects: requestParams.all_projects ?? null,
                  },
                  timestamp: Date.now(),
                }),
              },
            ).catch(() => {});
            // #endregion
            response = await TaskAPI.getTasks(requestParams);
          }

          const responseData: any = response.data;
          const tasks =
            responseData.results ||
            (Array.isArray(responseData) ? responseData : []);
          // #region agent log
          fetch(
            "http://127.0.0.1:7242/ingest/d1c5a812-8fba-4f4b-91ec-d69ecfc99679",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                runId: "usetaskdata-project-debug-v1",
                hypothesisId: "H4",
                location: "useTaskData.ts:fetchTasks:responseParsed",
                message: "Parsed tasks response page",
                data: {
                  page,
                  hasResultsField: Boolean(
                    responseData && responseData.results,
                  ),
                  isArrayResponse: Array.isArray(responseData),
                  parsedTaskCount: Array.isArray(tasks) ? tasks.length : -1,
                  next: responseData?.next ?? null,
                },
                timestamp: Date.now(),
              }),
            },
          ).catch(() => {});
          // #endregion
          allTasks = allTasks.concat(tasks);

          nextUrl = responseData.next || null;
          page++;

          // Safety limit to prevent infinite loops
          if (page > 100) break;
        } while (nextUrl);

        setTasks(allTasks);
        console.log("Backend tasks fetched successfully:", allTasks.length);
        return allTasks;
      } catch (err) {
        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/d1c5a812-8fba-4f4b-91ec-d69ecfc99679",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              runId: "usetaskdata-project-debug-v1",
              hypothesisId: "H5",
              location: "useTaskData.ts:fetchTasks:catch",
              message: "fetchTasks threw error",
              data: {
                message: (err as any)?.message ?? null,
                status: (err as any)?.response?.status ?? null,
                responseDetail:
                  (err as any)?.response?.data?.detail ??
                  (err as any)?.response?.data?.message ??
                  null,
                responseDataType: typeof (err as any)?.response?.data,
              },
              timestamp: Date.now(),
            }),
          },
        ).catch(() => {});
        // #endregion
        console.error("Backend fetch failed:", err);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setTasks, setLoading, setError],
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
    [setCurrentTask, setLoading, setError],
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
          err,
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
    [addTask, setLoading, setError],
  );

  // Reload tasks function for manual refresh
  const reloadTasks = useCallback(async () => {
    console.log(
      "[useTaskData] Reloading tasks with last params...",
      lastParams,
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
