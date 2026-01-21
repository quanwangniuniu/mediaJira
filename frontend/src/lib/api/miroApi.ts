import api from "@/lib/api";

class MiroApiError extends Error {
  constructor(message: string, public status?: number, public response?: any) {
    super(message);
    this.name = "MiroApiError";
  }
}

const normalizeApiError = (error: any, fallbackMessage: string) => {
  const status = error?.response?.status;
  const errorData = error?.response?.data;
  const message =
    errorData?.error ||
    errorData?.detail ||
    error?.message ||
    fallbackMessage;
  const apiError = new MiroApiError(message, status);
  apiError.response = errorData;
  throw apiError;
};

export interface MiroBoard {
  id: string;
  project_id: number;
  title: string;
  share_token: string;
  viewport: {
    x?: number;
    y?: number;
    zoom?: number;
    [key: string]: any;
  };
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMiroBoardData {
  project_id: number;
  title: string;
  viewport?: {
    x?: number;
    y?: number;
    zoom?: number;
    [key: string]: any;
  };
}

export interface UpdateMiroBoardData {
  title?: string;
  viewport?: {
    x?: number;
    y?: number;
    zoom?: number;
    [key: string]: any;
  };
  is_archived?: boolean;
}

export interface BoardItem {
  id: string;
  board_id: string;
  type: 'text' | 'shape' | 'sticky_note' | 'frame' | 'line' | 'connector' | 'freehand';
  parent_item_id?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number | null;
  style: Record<string, any>;
  content: string;
  z_index: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBoardItemData {
  type: BoardItem['type'];
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  style?: Record<string, any>;
  content?: string;
  z_index?: number;
  parent_item_id?: string | null;
}

export interface UpdateBoardItemData {
  type?: BoardItem['type'];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number | null;
  style?: Record<string, any>;
  content?: string;
  z_index?: number;
  is_deleted?: boolean;
  parent_item_id?: string | null;
}

export interface BoardRevision {
  id: string;
  board_id: string;
  version: number;
  snapshot: {
    viewport?: {
      x?: number;
      y?: number;
      zoom?: number;
    };
    items?: Array<{
      id: string;
      type: BoardItem['type'];
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number | null;
      style: Record<string, any>;
      content: string;
      z_index: number;
      parent_item_id?: string | null;
    }>;
  };
  note?: string | null;
  created_at: string;
}

export interface CreateBoardRevisionData {
  snapshot: {
    viewport: {
      x?: number;
      y?: number;
      zoom?: number;
    };
    items: Array<{
      id: string;
      type: BoardItem['type'];
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number | null;
      style: Record<string, any>;
      content: string;
      z_index: number;
      parent_item_id?: string | null;
    }>;
  };
  note?: string;
}

function normalizeBoardItem(raw: any): BoardItem {
  const id = raw?.id ?? raw?.item_id ?? raw?.pk ?? raw?.uuid;
  if (!id) {
    throw new MiroApiError("Invalid board item: missing id", 500, raw);
  }

  return {
    ...raw,
    id: String(id),
    board_id: String(raw?.board_id ?? raw?.boardId ?? raw?.board ?? raw?.board_id),
  } as BoardItem;
}

export const miroApi = {
  // Get all boards
  getBoards: async (): Promise<MiroBoard[]> => {
    try {
      const response = await api.get("/api/miro/boards/");
      const data = response.data;
      return data?.results || data || [];
    } catch (error) {
      console.error("Failed to fetch Miro boards:", error);
      return normalizeApiError(error, "Failed to fetch Miro boards");
    }
  },

  // Get single board by ID
  getBoard: async (id: string): Promise<MiroBoard> => {
    try {
      const response = await api.get(`/api/miro/boards/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch Miro board ${id}:`, error);
      return normalizeApiError(error, `Failed to fetch Miro board ${id}`);
    }
  },

  // Create new board
  createBoard: async (data: CreateMiroBoardData): Promise<MiroBoard> => {
    try {
      const payload: any = {
        project_id: data.project_id,
        title: data.title || "Untitled Board",
      };

      if (data.viewport) {
        payload.viewport = data.viewport;
      }

      const response = await api.post("/api/miro/boards/", payload);
      return response.data;
    } catch (error) {
      console.error("Failed to create Miro board:", error);
      return normalizeApiError(error, "Failed to create Miro board");
    }
  },

  // Update board (PATCH)
  updateBoard: async (
    id: string,
    data: UpdateMiroBoardData
  ): Promise<MiroBoard> => {
    try {
      const response = await api.patch(`/api/miro/boards/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update Miro board ${id}:`, error);
      return normalizeApiError(error, `Failed to update Miro board ${id}`);
    }
  },

  // Delete board (soft delete via archive)
  deleteBoard: async (id: string): Promise<void> => {
    try {
      await miroApi.updateBoard(id, { is_archived: true });
    } catch (error) {
      console.error(`Failed to delete Miro board ${id}:`, error);
      normalizeApiError(error, `Failed to delete Miro board ${id}`);
      throw error;
    }
  },

  // Board Items API
  getBoardItems: async (boardId: string, includeDeleted: boolean = false): Promise<BoardItem[]> => {
    try {
      const params = includeDeleted ? { include_deleted: 'true' } : {};
      const response = await api.get(`/api/miro/boards/${boardId}/items/`, { params });
      const data = response.data || [];
      if (!Array.isArray(data)) return [];
      return data.map(normalizeBoardItem);
    } catch (error) {
      console.error(`Failed to fetch board items for board ${boardId}:`, error);
      return normalizeApiError(error, `Failed to fetch board items`);
    }
  },

  createBoardItem: async (boardId: string, data: CreateBoardItemData): Promise<BoardItem> => {
    try {
      const response = await api.post(`/api/miro/boards/${boardId}/items/`, data);
      return normalizeBoardItem(response.data);
    } catch (error) {
      console.error(`Failed to create board item:`, error);
      return normalizeApiError(error, `Failed to create board item`);
    }
  },

  updateBoardItem: async (itemId: string, data: UpdateBoardItemData): Promise<BoardItem> => {
    try {
      if (!itemId) {
        throw new MiroApiError("Missing itemId for update", 400);
      }
      const response = await api.patch(`/api/miro/items/${itemId}/`, data);
      return normalizeBoardItem(response.data);
    } catch (error) {
      console.error(`Failed to update board item ${itemId}:`, error);
      return normalizeApiError(error, `Failed to update board item`);
    }
  },

  deleteBoardItem: async (itemId: string): Promise<void> => {
    try {
      if (!itemId) {
        throw new MiroApiError("Missing itemId for delete", 400);
      }
      await api.delete(`/api/miro/items/${itemId}/`);
    } catch (error) {
      console.error(`Failed to delete board item ${itemId}:`, error);
      normalizeApiError(error, `Failed to delete board item`);
      throw error;
    }
  },

  batchUpdateBoardItems: async (
    boardId: string,
    items: Array<{ id: string } & Partial<UpdateBoardItemData>>
  ): Promise<{ updated: BoardItem[]; failed: Array<{ id: string; error: string }> }> => {
    try {
      const response = await api.patch(`/api/miro/boards/${boardId}/items/batch/`, {
        items,
      });
      return {
        ...response.data,
        updated: Array.isArray(response.data?.updated)
          ? response.data.updated.map(normalizeBoardItem)
          : [],
      };
    } catch (error) {
      console.error(`Failed to batch update board items:`, error);
      return normalizeApiError(error, `Failed to batch update board items`);
    }
  },

  // Board Revisions API
  listBoardRevisions: async (boardId: string, limit: number = 20): Promise<BoardRevision[]> => {
    try {
      const response = await api.get(`/api/miro/boards/${boardId}/revisions/`, {
        params: { limit },
      });
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch board revisions for board ${boardId}:`, error);
      return normalizeApiError(error, `Failed to fetch board revisions`);
    }
  },

  createBoardRevision: async (
    boardId: string,
    data: CreateBoardRevisionData
  ): Promise<BoardRevision> => {
    try {
      const response = await api.post(`/api/miro/boards/${boardId}/revisions/`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to create board revision:`, error);
      return normalizeApiError(error, `Failed to create board revision`);
    }
  },

  restoreBoardRevision: async (boardId: string, version: number): Promise<BoardRevision> => {
    try {
      const response = await api.post(
        `/api/miro/boards/${boardId}/revisions/${version}/restore/`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to restore board revision ${version}:`, error);
      return normalizeApiError(error, `Failed to restore board revision`);
    }
  },
};

export { MiroApiError };

