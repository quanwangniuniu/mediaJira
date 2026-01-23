import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateBoardModal from '@/components/miro/CreateBoardModal';
import { ProjectData } from '@/lib/api/projectApi';
import { createMockProjects } from './__mocks__/testUtils';

const mockProjects: ProjectData[] = createMockProjects(2);

const defaultProps = {
  open: true,
  isCreating: false,
  onClose: jest.fn(),
  onCreate: jest.fn(),
  onCreateLegacy: jest.fn(),
};

describe('CreateBoardModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders modal when open', () => {
      render(<CreateBoardModal {...defaultProps} />);
      expect(screen.getByText('Create New Board')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<CreateBoardModal {...defaultProps} open={false} />);
      expect(screen.queryByText('Create New Board')).not.toBeInTheDocument();
    });

    test('shows correct description for project-scoped mode', () => {
      render(
        <CreateBoardModal
          {...defaultProps}
          projectId={1}
          projectName="Test Project"
        />
      );
      expect(screen.getByText('Create a board for this project.')).toBeInTheDocument();
    });

    test('shows correct description for legacy mode', () => {
      render(<CreateBoardModal {...defaultProps} projects={mockProjects} />);
      expect(screen.getByText('Choose a project and create a board.')).toBeInTheDocument();
    });
  });

  describe('Project Selection (Legacy Mode)', () => {
    test('renders project select dropdown', () => {
      render(<CreateBoardModal {...defaultProps} projects={mockProjects} />);
      const select = screen.getByLabelText('Project');
      expect(select).toBeInTheDocument();
    });

    test('displays all projects in dropdown', () => {
      render(<CreateBoardModal {...defaultProps} projects={mockProjects} />);
      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.getByText('Project 2')).toBeInTheDocument();
    });

    test('shows "No projects available" when projects array is empty', () => {
      render(<CreateBoardModal {...defaultProps} projects={[]} />);
      expect(screen.getByText('No projects available')).toBeInTheDocument();
    });

    test('disables select when creating', () => {
      render(
        <CreateBoardModal
          {...defaultProps}
          projects={mockProjects}
          isCreating={true}
        />
      );
      const select = screen.getByLabelText('Project');
      expect(select).toBeDisabled();
    });
  });

  describe('Project Display (New API Mode)', () => {
    test('displays project name when projectId is provided', () => {
      render(
        <CreateBoardModal
          {...defaultProps}
          projectId={1}
          projectName="Test Project"
        />
      );
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    test('does not show project select when projectId is provided', () => {
      render(
        <CreateBoardModal
          {...defaultProps}
          projectId={1}
          projectName="Test Project"
        />
      );
      const select = screen.queryByLabelText('Project');
      expect(select).not.toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    test('renders title input field', () => {
      render(<CreateBoardModal {...defaultProps} />);
      const input = screen.getByLabelText('Board Title');
      expect(input).toBeInTheDocument();
    });

    test('allows typing in title input', () => {
      render(<CreateBoardModal {...defaultProps} />);
      const input = screen.getByLabelText('Board Title') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'My Board' } });
      expect(input.value).toBe('My Board');
    });

    test('disables input when creating', () => {
      render(<CreateBoardModal {...defaultProps} isCreating={true} />);
      const input = screen.getByLabelText('Board Title');
      expect(input).toBeDisabled();
    });

    test('resets form when modal opens', () => {
      const { rerender } = render(
        <CreateBoardModal {...defaultProps} open={false} />
      );
      
      rerender(<CreateBoardModal {...defaultProps} open={true} />);
      const input = screen.getByLabelText('Board Title') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  describe('Form Validation', () => {
    test('disables create button when title is empty', () => {
      render(<CreateBoardModal {...defaultProps} projects={mockProjects} />);
      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).toBeDisabled();
    });

    test('enables create button when form is valid', () => {
      render(
        <CreateBoardModal
          {...defaultProps}
          projectId={1}
          projectName="Test"
        />
      );
      const input = screen.getByLabelText('Board Title');
      fireEvent.change(input, { target: { value: 'My Board' } });
      
      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).not.toBeDisabled();
    });
  });

  describe('Form Submission (New API)', () => {
    test('calls onCreate with title when submitted', async () => {
      const onCreate = jest.fn();
      render(
        <CreateBoardModal
          {...defaultProps}
          projectId={1}
          projectName="Test"
          onCreate={onCreate}
        />
      );
      
      const input = screen.getByLabelText('Board Title');
      fireEvent.change(input, { target: { value: 'My Board' } });
      
      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith({ title: 'My Board' });
      });
    });

    test('trims whitespace from title', async () => {
      const onCreate = jest.fn();
      render(
        <CreateBoardModal
          {...defaultProps}
          projectId={1}
          projectName="Test"
          onCreate={onCreate}
        />
      );
      
      const input = screen.getByLabelText('Board Title');
      fireEvent.change(input, { target: { value: '  My Board  ' } });
      
      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith({ title: 'My Board' });
      });
    });

    test('does not submit when title is only whitespace', () => {
      const onCreate = jest.fn();
      render(
        <CreateBoardModal
          {...defaultProps}
          projectId={1}
          projectName="Test"
          onCreate={onCreate}
        />
      );
      
      const input = screen.getByLabelText('Board Title');
      fireEvent.change(input, { target: { value: '   ' } });
      
      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);
      
      expect(onCreate).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission (Legacy API)', () => {
    test('calls onCreateLegacy with projectId and title', async () => {
      const onCreateLegacy = jest.fn();
      render(
        <CreateBoardModal
          {...defaultProps}
          projects={mockProjects}
          onCreateLegacy={onCreateLegacy}
        />
      );
      
      const input = screen.getByLabelText('Board Title');
      fireEvent.change(input, { target: { value: 'My Board' } });
      
      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(onCreateLegacy).toHaveBeenCalledWith({
          projectId: 1,
          title: 'My Board',
        });
      });
    });

    test('uses selected project ID', async () => {
      const onCreateLegacy = jest.fn();
      render(
        <CreateBoardModal
          {...defaultProps}
          projects={mockProjects}
          onCreateLegacy={onCreateLegacy}
        />
      );
      
      const select = screen.getByLabelText('Project');
      fireEvent.change(select, { target: { value: '2' } });
      
      const input = screen.getByLabelText('Board Title');
      fireEvent.change(input, { target: { value: 'My Board' } });
      
      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(onCreateLegacy).toHaveBeenCalledWith({
          projectId: 2,
          title: 'My Board',
        });
      });
    });
  });

  describe('Modal Actions', () => {
    test('calls onClose when cancel button is clicked', () => {
      const onClose = jest.fn();
      render(<CreateBoardModal {...defaultProps} onClose={onClose} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    test('shows "Creating..." text when isCreating is true', () => {
      render(<CreateBoardModal {...defaultProps} isCreating={true} />);
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });
});

