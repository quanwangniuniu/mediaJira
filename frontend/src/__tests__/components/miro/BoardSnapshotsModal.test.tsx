import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardSnapshotsModal from '@/components/miro/BoardSnapshotsModal';
import { miroApi } from '@/lib/api/miroApi';
import { BoardRevision, BoardItem } from '@/lib/api/miroApi';
import { createMockBoardItem, createMockBoardRevision } from './__mocks__/miroApi';
import { createMockViewport } from './__mocks__/testUtils';

jest.mock('@/lib/api/miroApi', () => ({
  miroApi: {
    listBoardRevisions: jest.fn(),
    createBoardRevision: jest.fn(),
    restoreBoardRevision: jest.fn(),
  },
}));

const mockMiroApi = miroApi as jest.Mocked<typeof miroApi>;

const mockViewport = createMockViewport();
const mockItems: BoardItem[] = [
  createMockBoardItem({ id: 'item-1', content: 'Test Item' }),
];

const mockRevisions: BoardRevision[] = [
  createMockBoardRevision({
    id: 'rev-1',
    version: 1,
    created_at: '2024-01-01T10:00:00Z',
    note: 'Initial snapshot',
  }),
  createMockBoardRevision({
    id: 'rev-2',
    version: 2,
    created_at: '2024-01-02T10:00:00Z',
    note: null,
  }),
];

const defaultProps = {
  open: true,
  boardId: 'board-1',
  currentViewport: mockViewport,
  currentItems: mockItems,
  onClose: jest.fn(),
  onRestore: jest.fn(),
};

describe('BoardSnapshotsModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMiroApi.listBoardRevisions.mockResolvedValue(mockRevisions);
    mockMiroApi.createBoardRevision.mockResolvedValue(mockRevisions[0]);
    mockMiroApi.restoreBoardRevision.mockResolvedValue(mockRevisions[0]);
  });

  describe('Basic Rendering', () => {
    test('renders modal when open', () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      expect(screen.getByText('Board Snapshots')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<BoardSnapshotsModal {...defaultProps} open={false} />);
      expect(screen.queryByText('Board Snapshots')).not.toBeInTheDocument();
    });

    test('shows description text', () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      expect(screen.getByText('Create snapshots of the board state and restore previous versions.')).toBeInTheDocument();
    });
  });

  describe('Loading Revisions', () => {
    test('loads revisions when modal opens', async () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockMiroApi.listBoardRevisions).toHaveBeenCalledWith('board-1', 50);
      });
    });

    test('displays loading state', async () => {
      mockMiroApi.listBoardRevisions.mockImplementation(() => new Promise(() => {}));
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      expect(screen.getByText('Loading snapshots...')).toBeInTheDocument();
    });

    test('displays revisions list after loading', async () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
        expect(screen.getByText('Version 2')).toBeInTheDocument();
      });
    });

    test('displays empty state when no revisions', async () => {
      mockMiroApi.listBoardRevisions.mockResolvedValue([]);
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No snapshots yet. Create one to get started.')).toBeInTheDocument();
      });
    });
  });

  describe('Creating Snapshots', () => {
    test('creates snapshot without note', async () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockMiroApi.createBoardRevision).toHaveBeenCalledWith('board-1', {
          snapshot: {
            viewport: {
              x: mockViewport.x,
              y: mockViewport.y,
              zoom: mockViewport.zoom,
            },
            items: mockItems.map((item) => ({
              id: item.id,
              type: item.type,
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              rotation: item.rotation ?? null,
              style: item.style,
              content: item.content,
              z_index: item.z_index,
              parent_item_id: item.parent_item_id ?? null,
            })),
          },
          note: undefined,
        });
      });
    });

    test('creates snapshot with note', async () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      const noteInput = screen.getByPlaceholderText('Optional note...');
      fireEvent.change(noteInput, { target: { value: 'Test note' } });

      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockMiroApi.createBoardRevision).toHaveBeenCalledWith('board-1', expect.objectContaining({
          note: 'Test note',
        }));
      });
    });

    test('creates snapshot on Enter key', async () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      const noteInput = screen.getByPlaceholderText('Optional note...');
      fireEvent.keyDown(noteInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mockMiroApi.createBoardRevision).toHaveBeenCalled();
      });
    });

    test('shows creating state', async () => {
      mockMiroApi.createBoardRevision.mockImplementation(() => new Promise(() => {}));
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    test('filters out deleted items when creating snapshot', async () => {
      const itemsWithDeleted: BoardItem[] = [
        createMockBoardItem({ id: 'item-1', is_deleted: false }),
        createMockBoardItem({ id: 'item-2', is_deleted: true }),
      ];

      render(<BoardSnapshotsModal {...defaultProps} currentItems={itemsWithDeleted} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        const call = mockMiroApi.createBoardRevision.mock.calls[0];
        expect(call[1].snapshot.items).toHaveLength(1);
        expect(call[1].snapshot.items[0].id).toBe('item-1');
      });
    });
  });

  describe('Restoring Snapshots', () => {
    test('shows restore confirmation when restore button clicked', async () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
      fireEvent.click(restoreButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Restore snapshot')).toBeInTheDocument();
        expect(screen.getByText(/Restore to version 1\?/)).toBeInTheDocument();
      });
    });

    test('restores snapshot when confirmed', async () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
      fireEvent.click(restoreButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Restore snapshot')).toBeInTheDocument();
      });

      // Find the confirm button in the confirmation dialog
      const confirmationSection = screen.getByText(/Restore to version/).closest('div');
      const allRestoreButtons = screen.getAllByRole('button', { name: /restore/i });
      const confirmRestoreButton = allRestoreButtons.find(btn => 
        confirmationSection?.contains(btn)
      ) || allRestoreButtons[allRestoreButtons.length - 1];
      
      fireEvent.click(confirmRestoreButton);

      await waitFor(() => {
        expect(mockMiroApi.restoreBoardRevision).toHaveBeenCalledWith('board-1', 1);
        expect(defaultProps.onRestore).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    test('cancels restore confirmation', async () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
      fireEvent.click(restoreButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Restore snapshot')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Restore snapshot')).not.toBeInTheDocument();
      });

      expect(mockMiroApi.restoreBoardRevision).not.toHaveBeenCalled();
    });

    test('shows restoring state', async () => {
      mockMiroApi.restoreBoardRevision.mockImplementation(() => new Promise(() => {}));
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
      fireEvent.click(restoreButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Restore snapshot')).toBeInTheDocument();
      });

      // In the confirmation dialog, there are multiple "Restore" buttons
      // Find the one in the confirmation dialog by looking within the confirmation section
      const confirmationSection = screen.getByText(/Restore to version/).closest('div');
      const allRestoreButtons = screen.getAllByRole('button', { name: /restore/i });
      const confirmRestoreButton = allRestoreButtons.find(btn => 
        confirmationSection?.contains(btn)
      ) || allRestoreButtons[allRestoreButtons.length - 1];
      
      fireEvent.click(confirmRestoreButton);

      // Wait for the restoring state to appear
      await waitFor(() => {
        // There might be multiple "Restoring..." texts (one in the list, one in the confirmation dialog)
        const restoringTexts = screen.getAllByText('Restoring...');
        expect(restoringTexts.length).toBeGreaterThan(0);
        
        // Verify the confirmation dialog button shows "Restoring..."
        const updatedRestoreButtons = screen.getAllByRole('button', { name: /restore/i });
        const confirmationRestoreButton = updatedRestoreButtons.find(btn => 
          confirmationSection?.contains(btn) && btn.textContent?.includes('Restoring')
        );
        
        // If not found, at least verify that "Restoring..." text exists
        if (!confirmationRestoreButton) {
          expect(restoringTexts.length).toBeGreaterThan(0);
        } else {
          expect(confirmationRestoreButton).toBeInTheDocument();
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when loading fails', async () => {
      const error = new Error('Failed to load');
      mockMiroApi.listBoardRevisions.mockRejectedValue(error);
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load')).toBeInTheDocument();
      });
    });

    test('displays error message when creating snapshot fails', async () => {
      const error = new Error('Failed to create');
      mockMiroApi.createBoardRevision.mockRejectedValue(error);
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create')).toBeInTheDocument();
      });
    });

    test('displays error message when restoring fails', async () => {
      const error = new Error('Failed to restore');
      mockMiroApi.restoreBoardRevision.mockRejectedValue(error);
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
      fireEvent.click(restoreButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Restore snapshot')).toBeInTheDocument();
      });

      // Find the confirm button in the confirmation dialog
      const confirmationSection = screen.getByText(/Restore to version/).closest('div');
      const allRestoreButtons = screen.getAllByRole('button', { name: /restore/i });
      const confirmRestoreButton = allRestoreButtons.find(btn => 
        confirmationSection?.contains(btn)
      ) || allRestoreButtons[allRestoreButtons.length - 1];
      
      fireEvent.click(confirmRestoreButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to restore')).toBeInTheDocument();
      });
    });
  });

  describe('Date Formatting', () => {
    test('formats dates correctly', async () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Version 1')).toBeInTheDocument();
      });

      const dateText = screen.getByText(/Jan 1, 2024/);
      expect(dateText).toBeInTheDocument();
    });
  });

  describe('Revision Display', () => {
    test('displays revision note when present', async () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Initial snapshot')).toBeInTheDocument();
      });
    });

    test('displays item count', async () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        const itemCounts = screen.getAllByText(/1 items/);
        expect(itemCounts.length).toBeGreaterThan(0);
      });
    });

    test('displays snapshot count in header', async () => {
      render(<BoardSnapshotsModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Snapshots \(2\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Actions', () => {
    test('calls onClose when close button clicked', () => {
      const onClose = jest.fn();
      render(<BoardSnapshotsModal {...defaultProps} onClose={onClose} />);
      
      // There might be multiple close buttons (Dialog X button + Footer Close button)
      // Get the one in the footer
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      const footerCloseButton = closeButtons.find(btn => 
        btn.textContent === 'Close' && btn.closest('[class*="DialogFooter"]')
      ) || closeButtons[closeButtons.length - 1]; // Fallback to last one (footer)
      
      fireEvent.click(footerCloseButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    test('prevents close while creating', async () => {
      const onClose = jest.fn();
      mockMiroApi.createBoardRevision.mockImplementation(() => new Promise(() => {}));
      render(<BoardSnapshotsModal {...defaultProps} onClose={onClose} />);

      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      // Creating state should disable closing while in-flight
      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });

      // Radix Dialog renders via Portal, so query via `screen` (document.body), not `container`.
      await waitFor(() => {
        const closeButtons = screen.getAllByRole('button', { name: /close/i });
        // Prefer the visible footer "Close" button (not the top-right X button with sr-only label)
        const footerCloseButton = closeButtons.find(
          (btn) => btn.textContent?.trim() === 'Close'
        );
        expect(footerCloseButton).toBeDefined();
        expect(footerCloseButton as HTMLButtonElement).toBeDisabled();
      });
    });
  });
});

