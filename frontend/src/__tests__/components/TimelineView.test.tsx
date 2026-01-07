import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimelineView from '@/components/tasks/timeline/TimelineView';
import type { TaskData } from '@/types/task';

// Mock TaskAPI
jest.mock('@/lib/api/taskApi', () => ({
  TaskAPI: {
    updateTask: jest.fn().mockResolvedValue({}),
  },
}));

const makeTask = (overrides: Partial<TaskData>): TaskData => ({
  id: Math.floor(Math.random() * 10000),
  summary: 'Task',
  type: 'budget',
  project_id: 1,
  project: { id: 1, name: 'Q4 Performance Campaign' },
  start_date: '2024-02-01',
  due_date: '2024-02-10',
  ...overrides,
});

describe('TimelineView', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-02-05T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders groups by campaign', () => {
    const tasks = [
      makeTask({ summary: 'Finalize Q4 Budget', project: { id: 1, name: 'Q4 Performance Campaign' } }),
      makeTask({ summary: 'Launch Creative Review', project: { id: 2, name: 'Social Media Launch' }, project_id: 2 }),
    ];

    render(<TimelineView tasks={tasks} />);

    expect(screen.getByText('Q4 Performance Campaign')).toBeInTheDocument();
    expect(screen.getByText('Social Media Launch')).toBeInTheDocument();
  });

  it('collapses and expands task rows', () => {
    const tasks = [
      makeTask({ summary: 'Finalize Q4 Budget', project: { id: 1, name: 'Q4 Performance Campaign' } }),
    ];

    render(<TimelineView tasks={tasks} />);

    expect(screen.getByText('Finalize Q4 Budget')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Q4 Performance Campaign/ }));
    expect(screen.queryByText('Finalize Q4 Budget')).not.toBeInTheDocument();
  });

  it('updates date range inputs', () => {
    const tasks = [makeTask({ summary: 'Finalize Q4 Budget' })];
    render(<TimelineView tasks={tasks} />);

    const startInput = screen.getByLabelText('Timeline start date') as HTMLInputElement;
    const endInput = screen.getByLabelText('Timeline end date') as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '2024-02-02' } });
    fireEvent.change(endInput, { target: { value: '2024-02-15' } });

    expect(startInput.value).toBe('2024-02-02');
    expect(endInput.value).toBe('2024-02-15');
  });

  it('switches scale buttons', () => {
    render(<TimelineView tasks={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Month' }));
    expect(screen.getByRole('button', { name: 'Month' })).toHaveClass('bg-indigo-600');

    fireEvent.click(screen.getByRole('button', { name: 'Week' }));
    expect(screen.getByRole('button', { name: 'Week' })).toHaveClass('bg-indigo-600');

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByRole('button', { name: 'Today' })).toHaveClass('bg-indigo-600');
  });

  it('renders type-specific styling for task bars', () => {
    const tasks = [
      makeTask({ id: 101, summary: 'Budget Review', type: 'budget' }),
      makeTask({ id: 202, summary: 'Asset Draft', type: 'asset', project: { id: 1, name: 'Q4 Performance Campaign' } }),
    ];

    render(<TimelineView tasks={tasks} />);

    expect(screen.getByTestId('task-bar-101').className).toContain('bg-purple');
    expect(screen.getByTestId('task-bar-202').className).toContain('bg-indigo');
  });
});

