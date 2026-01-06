import api from "../api";
import { DashboardSummary } from "@/types/dashboard";

export const DashboardAPI = {
  // Get dashboard summary with optional project filter
  getSummary: (params?: { project_id?: number }) =>
    api.get<DashboardSummary>("/api/dashboard/summary/", { params }),
};
