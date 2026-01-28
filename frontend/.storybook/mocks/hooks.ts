// Mock hooks for Storybook

// Mock useAuth hook (default export)
const useAuth = () => ({
  user: {
    id: 1,
    username: 'johndoe',
    email: 'john.doe@example.com',
    first_name: 'John',
    last_name: 'Doe',
    roles: ['Organization Admin'],
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
    organization: {
      id: 1,
      name: 'Example Organization',
      plan_id: null,
    },
    is_verified: true,
  },
  logout: async () => {
    console.log('[Storybook] Logout called');
  },
  loading: false,
  error: null,
});

export default useAuth;

// Mock useAuthStore for ProtectedRoute
export const useAuthStore = () => ({
  user: {
    id: 1,
    username: 'johndoe',
    email: 'john.doe@example.com',
    first_name: 'John',
    last_name: 'Doe',
    roles: ['User'],
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
    organization: {
      id: 1,
      name: 'Example Organization',
      plan_id: null,
    },
    is_verified: true,
  },
  isAuthenticated: true,
  loading: false,
  initialized: true,
});

// Mock useTaskData hook
export const useTaskData = () => {
  const formatDate = (daysAgo: number) => {
    const today = new Date();
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  const mockTasks = [
    {
      id: 1,
      summary: 'Q4 Budget Request',
      type: 'budget',
      status: 'IN_PROGRESS',
      owner: { id: 1, username: 'johndoe' },
      project: { id: 1, name: 'Finance Team' },
      updated_at: formatDate(1),
      created_at: formatDate(5),
    },
    {
      id: 2,
      summary: 'Marketing Campaign Asset',
      type: 'asset',
      status: 'DRAFT',
      owner: { id: 1, username: 'johndoe' },
      project: { id: 2, name: 'Marketing Team' },
      updated_at: formatDate(2),
      created_at: formatDate(6),
    },
    {
      id: 3,
      summary: 'Product Retrospective',
      type: 'retrospective',
      status: 'COMPLETED',
      owner: { id: 1, username: 'johndoe' },
      project: { id: 3, name: 'Product Team' },
      updated_at: formatDate(3),
      created_at: formatDate(7),
    },
    {
      id: 4,
      summary: 'System Scaling Plan',
      type: 'scaling',
      status: 'IN_PROGRESS',
      owner: { id: 1, username: 'johndoe' },
      project: { id: 4, name: 'Engineering' },
      updated_at: formatDate(5),
      created_at: formatDate(10),
    },
    {
      id: 5,
      summary: 'Performance Optimization',
      type: 'optimization',
      status: 'IN_PROGRESS',
      owner: { id: 1, username: 'johndoe' },
      project: { id: 4, name: 'Engineering' },
      updated_at: formatDate(6),
      created_at: formatDate(12),
    },
  ];

  return {
    tasks: mockTasks,
    fetchTasks: async (params?: any) => {
      console.log('[Storybook] Fetch tasks called with:', params);
      return mockTasks;
    },
    loading: false,
    error: null,
  };
};
