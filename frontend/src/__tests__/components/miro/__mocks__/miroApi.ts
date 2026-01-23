import { MiroBoard, BoardItem, BoardRevision, CreateMiroBoardData, CreateBoardItemData, UpdateBoardItemData, CreateBoardRevisionData } from '@/lib/api/miroApi';

// Mock data generators
export const createMockBoard = (overrides?: Partial<MiroBoard>): MiroBoard => ({
  id: 'board-1',
  project_id: 1,
  title: 'Test Board',
  share_token: 'test-token',
  viewport: { x: 0, y: 0, zoom: 1 },
  is_archived: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockBoardItem = (overrides?: Partial<BoardItem>): BoardItem => ({
  id: 'item-1',
  board_id: 'board-1',
  type: 'text',
  x: 100,
  y: 100,
  width: 200,
  height: 50,
  rotation: 0,
  style: {},
  content: 'Test Item',
  z_index: 1,
  is_deleted: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockBoardRevision = (overrides?: Partial<BoardRevision>): BoardRevision => ({
  id: 'rev-1',
  board_id: 'board-1',
  version: 1,
  snapshot: {
    viewport: { x: 0, y: 0, zoom: 1 },
    items: [createMockBoardItem()],
  },
  note: null,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Mock API implementation
export const mockMiroApi = {
  getBoards: jest.fn<Promise<MiroBoard[]>, []>(),
  getBoard: jest.fn<Promise<MiroBoard>, [string]>(),
  createBoard: jest.fn<Promise<MiroBoard>, [CreateMiroBoardData]>(),
  updateBoard: jest.fn<Promise<MiroBoard>, [string, Partial<MiroBoard>]>(),
  deleteBoard: jest.fn<Promise<void>, [string]>(),
  getBoardItems: jest.fn<Promise<BoardItem[]>, [string, boolean?]>(),
  createBoardItem: jest.fn<Promise<BoardItem>, [string, CreateBoardItemData]>(),
  updateBoardItem: jest.fn<Promise<BoardItem>, [string, UpdateBoardItemData]>(),
  deleteBoardItem: jest.fn<Promise<void>, [string]>(),
  batchUpdateBoardItems: jest.fn<Promise<{ updated: BoardItem[]; failed: Array<{ id: string; error: string }> }>, [string, Array<{ id: string } & Partial<UpdateBoardItemData>>]>(),
  listBoardRevisions: jest.fn<Promise<BoardRevision[]>, [string, number?]>(),
  createBoardRevision: jest.fn<Promise<BoardRevision>, [string, CreateBoardRevisionData]>(),
  restoreBoardRevision: jest.fn<Promise<BoardRevision>, [string, number]>(),
};

// Default implementations
mockMiroApi.getBoards.mockResolvedValue([createMockBoard()]);
mockMiroApi.getBoard.mockResolvedValue(createMockBoard());
mockMiroApi.createBoard.mockResolvedValue(createMockBoard());
mockMiroApi.updateBoard.mockResolvedValue(createMockBoard());
mockMiroApi.deleteBoard.mockResolvedValue(undefined);
mockMiroApi.getBoardItems.mockResolvedValue([createMockBoardItem()]);
mockMiroApi.createBoardItem.mockResolvedValue(createMockBoardItem());
mockMiroApi.updateBoardItem.mockResolvedValue(createMockBoardItem());
mockMiroApi.deleteBoardItem.mockResolvedValue(undefined);
mockMiroApi.batchUpdateBoardItems.mockResolvedValue({ updated: [createMockBoardItem()], failed: [] });
mockMiroApi.listBoardRevisions.mockResolvedValue([createMockBoardRevision()]);
mockMiroApi.createBoardRevision.mockResolvedValue(createMockBoardRevision());
mockMiroApi.restoreBoardRevision.mockResolvedValue(createMockBoardRevision());

export default mockMiroApi;

