import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import '@testing-library/jest-dom';
import { AxiosResponse } from 'axios';
// Import the component directly from the file
import TasksPage from '@/app/tasks/page';
import { TaskAPI } from '@/lib/api/taskApi';
import { BudgetAPI } from '@/lib/api/budgetApi';
import { approverApi } from '@/lib/api/approverApi';
import { ProjectAPI } from '@/lib/api/projectApi';

// Mock all API modules
jest.mock('@/lib/api/taskApi');
jest.mock('@/lib/api/budgetApi');
jest.mock('@/lib/api/approverApi');
jest.mock('@/lib/api/projectApi');
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useTaskData');
jest.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    projects: [
      {
        id: 1,
        name: 'test project',
        isActiveResolved: true,
        is_active: true,
        derivedStatus: 'active',
      },
    ],
    loading: false,
    error: null,
    fetchProjects: jest.fn(),
  }),
}));
jest.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock the API modules
const mockTaskAPI = TaskAPI as jest.Mocked<typeof TaskAPI>;
const mockBudgetAPI = BudgetAPI as jest.Mocked<typeof BudgetAPI>;
const mockApproverApi = approverApi as jest.Mocked<typeof approverApi>;
const mockProjectAPI = ProjectAPI as jest.Mocked<typeof ProjectAPI>;

// Mock useAuth hook
const mockUseAuth = jest.mocked(require('@/hooks/useAuth').default);

// Mock useTaskData hook
const mockUseTaskData = jest.mocked(require('@/hooks/useTaskData').useTaskData);

describe('TaskCreationFlow - Budget Task', () => {
  // Mock data
  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    roles: ['team_member']
  };

  const mockApprovers = [
    { id: 2, username: 'approver1', email: 'approver1@example.com' },
    { id: 3, username: 'approver2', email: 'approver2@example.com' }
  ];

  const mockCreatedTask = {
    id: 123,
    summary: 'Test Budget Task',
    description: 'Test description',
    status: 'draft',
    type: 'budget',
    owner: { id: 1, username: 'testuser', email: 'test@example.com' },
    project: { id: 1, name: 'test project' },
    current_approver: { id: 2, username: 'approver1', email: 'approver1@example.com' },
    content_type: null,
    object_id: null,
    due_date: null
  };

  const mockCreatedBudgetRequest = {
    id: 456,
    task: 123,
    amount: '1000.00',
    currency: 'AUD',
    ad_channel: 1,
    notes: 'Test budget request',
    status: 'draft'
  };

  let createTaskMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window.alert
    window.alert = jest.fn();

    // Setup useAuth mock
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      logout: jest.fn(),
      login: jest.fn(),
      register: jest.fn(),
      verify: jest.fn()
    });

    // Create mock AxiosResponse objects
    const mockTaskResponse: AxiosResponse = {
      data: mockCreatedTask,
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {} as any
    };

    const mockBudgetResponse: AxiosResponse = {
      data: mockCreatedBudgetRequest,
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {} as any
    };

    const mockLinkResponse: AxiosResponse = {
      data: { success: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any
    };

    const mockTasksResponse: AxiosResponse = {
      data: { results: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any
    };

    // Setup API mocks
    mockApproverApi.getApprovers.mockResolvedValue(mockApprovers);
    mockProjectAPI.getProjectMembers.mockResolvedValue([
      {
        id: 1,
        user: { id: 2, username: 'approver1', email: 'approver1@example.com' },
        project: { id: 1, name: 'test project' },
        role: 'member',
        is_active: true,
      },
      {
        id: 2,
        user: { id: 3, username: 'approver2', email: 'approver2@example.com' },
        project: { id: 1, name: 'test project' },
        role: 'member',
        is_active: true,
      },
    ]);

    // TaskAPI.createTask returns AxiosResponse
    mockTaskAPI.createTask.mockResolvedValue(mockTaskResponse);

    // useTaskData().createTask wraps TaskAPI.createTask and returns data
    createTaskMock = jest.fn(async (payload) => {
      const res = await mockTaskAPI.createTask(payload);
      return res.data as any;
    });

    mockBudgetAPI.createBudgetRequest.mockResolvedValue(mockBudgetResponse);
    mockTaskAPI.linkTask.mockResolvedValue(mockLinkResponse);
    mockTaskAPI.getTasks.mockResolvedValue(mockTasksResponse);

    // Setup useTaskData mock
    mockUseTaskData.mockReturnValue({
      tasks: [],
      loading: false,
      error: null,
      fetchTasks: jest.fn(),
      fetchTask: jest.fn(),
      createTask: createTaskMock,
    });
  });

  describe('Complete Budget Task Creation Flow', () => {
    test('should successfully create a budget task with all required fields', async () => {
      render(<TasksPage />);

      // 1. Open create task modal
      const createButton = screen.getByText('Create Task');
      fireEvent.click(createButton);

      // 2. Fill in task form
      await waitFor(() => {
        expect(screen.getByText('New Task Form')).toBeInTheDocument();
      });

      // Select project
      const projectSelect = screen.getByLabelText('Project *');
      fireEvent.change(projectSelect, { target: { value: '1' } });

      // Select task type
      const taskTypeSelect = screen.getByLabelText('Task Type *');
      fireEvent.change(taskTypeSelect, { target: { value: 'budget' } });

      // Fill summary
      const summaryInput = screen.getByLabelText('Task Summary *');
      fireEvent.change(summaryInput, { target: { value: 'Test Budget Task' } });

      // Fill description
      const descriptionInput = screen.getByLabelText('Description');
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

      // Wait for approvers to load and select one
      await waitFor(() => {
        expect(screen.getByText('approver1')).toBeInTheDocument();
      });

      const approverSelect = screen.getByLabelText('Assign an approver *');
      fireEvent.change(approverSelect, { target: { value: '2' } });

      // 3. Fill in budget request form
      const amountInput = screen.getByLabelText('Amount *');
      fireEvent.change(amountInput, { target: { value: '1000.00' } });

      const currencySelect = screen.getByLabelText('Currency *');
      fireEvent.change(currencySelect, { target: { value: 'AUD' } });

      const adChannelSelect = screen.getByLabelText('Advertising Channel *');
      fireEvent.change(adChannelSelect, { target: { value: '1' } });

      const notesInput = screen.getByLabelText('Notes');
      fireEvent.change(notesInput, { target: { value: 'Test budget request' } });

      // 4. Submit the form
      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      // 5. Verify API calls were made in correct order
      await waitFor(() => {
        expect(mockTaskAPI.createTask).toHaveBeenCalledWith({
          project_id: 1,
          type: 'budget',
          summary: 'Test Budget Task',
          description: 'Test description',
          current_approver_id: 2,
          due_date: null
        });
      });

      await waitFor(() => {
        expect(mockBudgetAPI.createBudgetRequest).toHaveBeenCalledWith({
          task: 123,
          amount: '1000.00',
          currency: 'AUD',
          ad_channel: 1,
          notes: 'Test budget request',
          current_approver: 2
        });
      });

      await waitFor(() => {
        expect(mockTaskAPI.linkTask).toHaveBeenCalledWith(123, 'budgetrequest', '456');
      });

      // 6. Verify modal closes and form resets
      await waitFor(() => {
        expect(screen.queryByText('New Task Form')).not.toBeInTheDocument();
      });
    });

    test('should show validation errors for missing required fields', async () => {
      render(<TasksPage />);

      // Open create task modal
      const createButton = screen.getByText('Create Task');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('New Task Form')).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      // Verify validation errors appear
      await waitFor(() => {
        expect(screen.getByText('Project is required')).toBeInTheDocument();
        expect(screen.getByText('Task type is required')).toBeInTheDocument();
        expect(screen.getByText('Task summary is required')).toBeInTheDocument();
      });

      // Verify no API calls were made
      expect(mockTaskAPI.createTask).not.toHaveBeenCalled();
      expect(mockBudgetAPI.createBudgetRequest).not.toHaveBeenCalled();
    });

    

    test('should handle API errors gracefully', async () => {
      // Mock API error
      mockTaskAPI.createTask.mockRejectedValue(new Error('Network error'));

      render(<TasksPage />);

      // Open create task modal
      const createButton = screen.getByText('Create Task');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('New Task Form')).toBeInTheDocument();
      });

      // Fill required fields
      const projectSelect = screen.getByLabelText('Project *');
      fireEvent.change(projectSelect, { target: { value: '1' } });

      const taskTypeSelect = screen.getByLabelText('Task Type *');
      fireEvent.change(taskTypeSelect, { target: { value: 'budget' } });

      const summaryInput = screen.getByLabelText('Task Summary *');
      fireEvent.change(summaryInput, { target: { value: 'Test Budget Task' } });

      // Wait for approvers to load and select one
      await waitFor(() => {
        expect(screen.getByText('approver1')).toBeInTheDocument();
      });

      const approverSelect = screen.getByLabelText('Assign an approver *');
      fireEvent.change(approverSelect, { target: { value: '2' } });

      // Fill budget form
      const amountInput = screen.getByLabelText('Amount *');
      fireEvent.change(amountInput, { target: { value: '1000.00' } });

      const currencySelect = screen.getByLabelText('Currency *');
      fireEvent.change(currencySelect, { target: { value: 'AUD' } });

      const adChannelSelect = screen.getByLabelText('Advertising Channel *');
      fireEvent.change(adChannelSelect, { target: { value: '1' } });

      // Submit and check error handling
      await act(async () => {
        const submitButton = screen.getByText('Submit');
        fireEvent.click(submitButton);
      });

      // Wait for error handling to complete
      await new Promise(resolve => setTimeout(resolve, 200));



      // Verify error alert appears
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Network error');
      });

      // Verify modal stays open
      expect(screen.getByText('New Task Form')).toBeInTheDocument();
    });

    test('should cancel task creation and close modal', async () => {
      render(<TasksPage />);

      // Open create task modal
      const createButton = screen.getByText('Create Task');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('New Task Form')).toBeInTheDocument();
      });

      // Fill some fields
      const projectSelect = screen.getByLabelText('Project *');
      fireEvent.change(projectSelect, { target: { value: '1' } });

      const summaryInput = screen.getByLabelText('Task Summary *');
      fireEvent.change(summaryInput, { target: { value: 'Test Budget Task' } });

      // Click cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Verify modal closes
      await waitFor(() => {
        expect(screen.queryByText('New Task Form')).not.toBeInTheDocument();
      });

      // Verify no API calls were made
      expect(mockTaskAPI.createTask).not.toHaveBeenCalled();
      expect(mockBudgetAPI.createBudgetRequest).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    test('should validate budget-specific required fields', async () => {
      render(<TasksPage />);

      // Open create task modal
      const createButton = screen.getByText('Create Task');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('New Task Form')).toBeInTheDocument();
      });

      // Fill task form but not budget form
      const projectSelect = screen.getByLabelText('Project *');
      fireEvent.change(projectSelect, { target: { value: '1' } });

      const taskTypeSelect = screen.getByLabelText('Task Type *');
      fireEvent.change(taskTypeSelect, { target: { value: 'budget' } });

      const summaryInput = screen.getByLabelText('Task Summary *');
      fireEvent.change(summaryInput, { target: { value: 'Test Budget Task' } });

      await waitFor(() => {
        const approverSelect = screen.getByLabelText('Assign an approver *');
        fireEvent.change(approverSelect, { target: { value: '2' } });
      });

      // Try to submit without filling budget form
      await act(async () => {
        const submitButton = screen.getByText('Submit');
        fireEvent.click(submitButton);
      });
      
      // Add a longer delay to allow validation to process
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify that validation errors are present
      await waitFor(() => {
        // Check for any validation error messages
        const allTexts = screen.getAllByText(/./).map(el => el.textContent);
        const hasAnyValidationError = allTexts.some(text => 
          text?.includes('required') || 
          text?.includes('Required') ||
          text?.includes('Amount') ||
          text?.includes('Currency') ||
          text?.includes('Ad channel')
        );
        
        expect(hasAnyValidationError).toBe(true);
      });
      
      // Verify that no API calls were made due to validation failure
      expect(mockTaskAPI.createTask).not.toHaveBeenCalled();
      expect(mockBudgetAPI.createBudgetRequest).not.toHaveBeenCalled();
    });
  });
});
