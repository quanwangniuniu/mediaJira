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

    const collapseButton = screen.getByRole('button', {
      name: /Collapse project Q4 Performance Campaign/i,
    });
    fireEvent.click(collapseButton);

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
    expect(screen.getByRole('button', { name: 'Month' })).toHaveClass('bg-blue-600');

    fireEvent.click(screen.getByRole('button', { name: 'Week' }));
    expect(screen.getByRole('button', { name: 'Week' })).toHaveClass('bg-blue-600');

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByRole('button', { name: 'Today' })).toHaveClass('bg-blue-600');
  });

  it('filters tasks by timeline search', () => {
    const tasks = [
      makeTask({ id: 101, summary: 'Budget Review' }),
      makeTask({ id: 202, summary: 'Asset Draft' }),
    ];

    render(<TimelineView tasks={tasks} />);

    fireEvent.change(screen.getByLabelText('Search timeline'), {
      target: { value: 'Asset' },
    });

    expect(screen.getByText('Asset Draft')).toBeInTheDocument();
    expect(screen.queryByText('Budget Review')).not.toBeInTheDocument();
  });

  it('filters tasks by status category', () => {
    const tasks = [
      makeTask({ id: 101, summary: 'Draft Task', status: 'DRAFT' }),
      makeTask({ id: 202, summary: 'Approved Task', status: 'APPROVED' }),
    ];

    render(<TimelineView tasks={tasks} />);

    fireEvent.change(screen.getByLabelText('Status category filter'), {
      target: { value: 'done' },
    });

    expect(screen.getByText('Approved Task')).toBeInTheDocument();
    expect(screen.queryByText('Draft Task')).not.toBeInTheDocument();
  });

  it('filters tasks by epic', () => {
    const growthTask = makeTask({ id: 101, summary: 'Growth Work' });
    const opsTask = makeTask({ id: 202, summary: 'Ops Work' });
    (growthTask as TaskData & { epic_name: string }).epic_name = 'Growth';
    (opsTask as TaskData & { epic_name: string }).epic_name = 'Ops';

    render(<TimelineView tasks={[growthTask, opsTask]} />);

    fireEvent.change(screen.getByLabelText('Epic filter'), {
      target: { value: 'Growth' },
    });

    expect(screen.getByText('Growth Work')).toBeInTheDocument();
    expect(screen.queryByText('Ops Work')).not.toBeInTheDocument();
  });

  it('shows current user initials in the timeline header avatar', () => {
    render(<TimelineView tasks={[]} currentUser={{ username: 'bob.smith' }} />);
    expect(screen.getByText('BS')).toBeInTheDocument();
  });

  it('renders task bars', () => {
    const tasks = [
      makeTask({ id: 101, summary: 'Budget Review', type: 'budget' }),
      makeTask({ id: 202, summary: 'Asset Draft', type: 'asset', project: { id: 1, name: 'Q4 Performance Campaign' } }),
    ];

    render(<TimelineView tasks={tasks} />);

    expect(screen.getByTestId('task-bar-101')).toBeInTheDocument();
    expect(screen.getByTestId('task-bar-202')).toBeInTheDocument();
  });
});
