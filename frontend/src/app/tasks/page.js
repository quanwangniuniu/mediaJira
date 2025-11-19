'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Filter as FilterIcon, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import useAuth from '@/hooks/useAuth';
import { useTaskData } from '@/hooks/useTaskData';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useBudgetPoolData } from '@/hooks/useBudgetPoolData';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AssetAPI } from '@/lib/api/assetApi';
import { TaskAPI } from '@/lib/api/taskApi';
import { BudgetAPI } from '@/lib/api/budgetApi';
import { ReportAPI } from '@/lib/api/reportApi';
import { RetrospectiveAPI } from '@/lib/api/retrospectiveApi';
import Modal from '@/components/ui/Modal';
import NewTaskForm from '@/components/tasks/NewTaskForm';
import NewBudgetRequestForm from '@/components/tasks/NewBudgetRequestForm';
import NewAssetForm from '@/components/tasks/NewAssetForm';
import NewRetrospectiveForm from '@/components/tasks/NewRetrospectiveForm';
import NewReportForm from '@/components/tasks/NewReportForm';
import TaskCard from '@/components/tasks/TaskCard';
import NewBudgetPool from '@/components/budget/NewBudgetPool';
import { mockTasks } from '@/mock/mockTasks';





function TasksPageContent() {
  const { user, loading: userLoading, logout } = useAuth();
  const router = useRouter();
  
  // Task data management
  const { tasks, loading: tasksLoading, error: tasksError, fetchTasks, createTask, updateTask, reloadTasks } = useTaskData();
  
  // Budget pool data management
  const { createBudgetPool, loading: budgetPoolLoading, error: budgetPoolError } = useBudgetPoolData();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createBudgetPoolModalOpen, setCreateBudgetPoolModalOpen] = useState(false);
  
  const [taskData, setTaskData] = useState({
    project_id: null,
    type: '',
    summary: '',
    description: '',
    current_approver_id: null,
    due_date: '',
  })
  const [budgetData, setBudgetData] = useState({
    amount: '',
    currency: '',
    ad_channel: null,
    notes: '',
  })
  const [budgetPoolData, setBudgetPoolData] = useState({
    project: null,
    ad_channel: null,
    total_amount: '',
    currency: '',
  })
  const [assetData, setAssetData] = useState({
    tags: '',
    team: '',
    notes: '',
    file: null,
  })
  const [retrospectiveData, setRetrospectiveData] = useState({})

  const [reportData, setReportData] = useState({
  title: '',
  owner_id: '',
  report_template_id: '',
  slice_config: {
    csv_file_path: '',
  },
  });
  


  // 🎯 Toggle this to switch between mock and real backend
const USE_MOCK_FALLBACK = false; // true = include mock cards for demo

const formatTimeAgo = () => '10 seconds ago';
  
  // ✅ Smart fallback logic - use mock data for demo if enabled
  const tasksWithFallback = useMemo(() => {
    const tasksFromStore = Array.isArray(tasks) ? tasks : [];
    const merged = new Map();

    if (USE_MOCK_FALLBACK) {
      mockTasks.forEach(task => {
        const key = task.id ?? `mock-${task.summary}-${task.type}`;
        merged.set(key, task);
      });
    } else {
      tasksFromStore.forEach(task => {
        const key = task.id ?? `task-${task.summary}-${task.type}`;
        merged.set(key, task);
      });
      return Array.from(merged.values());
    }

    tasksFromStore.forEach(task => {
      const key = task.id ?? `task-${task.summary}-${task.type}-${task.due_date ?? ''}`;
      const existing = merged.get(key);
      merged.set(key, existing ? { ...existing, ...task } : task);
    });

    return Array.from(merged.values());
  }, [tasks, USE_MOCK_FALLBACK]);
  
  console.log(`[TasksPage] Rendering ${tasks?.length || 0} tasks`);
  console.log(`✅ Backend tasks:`, tasks);
  console.log(`✅ Tasks with fallback:`, tasksWithFallback);
  console.log(`✅ Tasks loading:`, tasksLoading);
  console.log(`✅ Tasks error:`, tasksError);



  const [taskType, setTaskType] = useState('');
  const [contentType, setContentType] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOption, setSortOption] = useState('recent');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date());
  const filterMenuRef = useRef(null);
  const sortMenuRef = useRef(null);
  const filterButtonRef = useRef(null);
  const sortButtonRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const filterOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'UNDER_REVIEW', label: 'Under review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'LOCKED', label: 'Locked' },
  ];

  const sortOptionsList = [
    { value: 'recent', label: 'Recently updated' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'due-date', label: 'Due date' },
    { value: 'alphabetical', label: 'Alphabetical' },
  ];

  const filteredSortedTasks = useMemo(() => {
    if (!Array.isArray(tasksWithFallback)) {
      return [];
    }

    const matchesFilter = (task) => {
      if (filterStatus === 'all') return true;
      const status = (task.status || '').toUpperCase();
      return status === filterStatus.toUpperCase();
    };

    const filtered = tasksWithFallback.filter(matchesFilter);
    const sorted = [...filtered];

    sorted.sort((a, b) => {
      const getTimestamp = (task) => {
        const created = task.created_at ? new Date(task.created_at).getTime() : 0;
        const updated = task.updated_at ? new Date(task.updated_at).getTime() : 0;
        return Math.max(created, updated, task.id || 0);
      };

      switch (sortOption) {
        case 'alphabetical':
          return (a.summary || '').localeCompare(b.summary || '');
        case 'due-date': {
          const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
          const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
          return dateA - dateB;
        }
        case 'oldest':
          return getTimestamp(a) - getTimestamp(b);
        case 'recent':
        default:
          return getTimestamp(b) - getTimestamp(a);
      }
    });

    return sorted;
  }, [tasksWithFallback, filterStatus, sortOption]);

  const tasksByType = useMemo(() => {
    return filteredSortedTasks.reduce(
      (acc, task) => {
        if (!task || !task.type) {
          return acc;
        }
        const type = task.type;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(task);
        return acc;
      },
      { budget: [], asset: [], retrospective: [], report: [] }
    );
  }, [filteredSortedTasks]);

  const totalTasksCount = filteredSortedTasks.length;
  const updatedAgo = useMemo(() => formatTimeAgo(), [lastUpdatedAt]);

  useEffect(() => {
    const syncUpdatedAt = () => setLastUpdatedAt(new Date());
    if (!tasksLoading) {
      syncUpdatedAt();
    }
  }, [tasksLoading, tasksWithFallback]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isFilterMenuOpen &&
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target) &&
        (!filterButtonRef.current || !filterButtonRef.current.contains(event.target))
      ) {
        setIsFilterMenuOpen(false);
      }

      if (
        isSortMenuOpen &&
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target) &&
        (!sortButtonRef.current || !sortButtonRef.current.contains(event.target))
      ) {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterMenuOpen, isSortMenuOpen]);

  // Task type configuration - defines how each task type should be handled
  const taskTypeConfig = {
    budget: {
      contentType: 'budgetrequest',
      formData: budgetData,
      setFormData: setBudgetData,
      validation: null, // Will be set below
      api: BudgetAPI.createBudgetRequest,
      formComponent: NewBudgetRequestForm,
      requiredFields: ['amount', 'currency', 'ad_channel'],
      getPayload: (createdTask) => {
        // Ensure current_approver is provided
        if (!taskData.current_approver_id) {
          throw new Error('Approver is required for budget request');
        }
        return {
          task: createdTask.id,
          amount: budgetData.amount,
          currency: budgetData.currency,
          ad_channel: budgetData.ad_channel,
          notes: budgetData.notes || '',
          current_approver: taskData.current_approver_id
        };
      }
    },
    asset: {
      contentType: 'asset',
      formData: assetData,
      setFormData: setAssetData,
      validation: null, // Will be set below
      api: AssetAPI.createAsset,
      formComponent: NewAssetForm,
      requiredFields: ['tags'], // Tags are required
      getPayload: (createdTask) => {
        const tagsArray = (assetData.tags || '')
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);
        const payload = {
          task: createdTask.id,
          tags: tagsArray,
        };
        if (assetData.team) {
          const teamNum = Number(assetData.team);
          if (!Number.isNaN(teamNum)) {
            payload.team = teamNum;
          }
        }
        return payload;
      }
    },
    retrospective: {
      contentType: 'retrospectivetask',
      formData: retrospectiveData,
      setFormData: setRetrospectiveData,
      validation: null, // Will be set below
      api: RetrospectiveAPI.createRetrospective,
      formComponent: NewRetrospectiveForm,
      requiredFields: ['campaign'],
      getPayload: (createdTask) => ({
        campaign: retrospectiveData.campaign || taskData.project_id?.toString(),
        scheduled_at: retrospectiveData.scheduled_at || new Date().toISOString(),
        status: retrospectiveData.status || 'scheduled',
      })
    },
    report: {
      contentType: 'report',
      formData: reportData,
      setFormData: setReportData,
      validation: null, // will be set below
      api: ReportAPI.createReport,
      formComponent: NewReportForm,
      requiredFields: ['title', 'owner_id', 'report_template_id', 'slice_config.csv_file_path'],
      getPayload: (createdTask) => {
        return {
          task: createdTask.id,
          title: reportData.title,
          owner_id: reportData.owner_id,
          report_template_id: reportData.report_template_id,
          slice_config: {
            csv_file_path: reportData.slice_config?.csv_file_path || '',
          },
        };
      },
    },
  };

  // Form validation rules
  const taskValidationRules = {
    project_id: (value) => !value || value == 0 ? 'Project is required' : '',
    type: (value) => !value ? 'Task type is required' : '',
    summary: (value) => !value ? 'Task summary is required' : '',
    // Only require approver when type is 'budget'
    current_approver_id: (value) => (taskData.type === 'budget' && !value) ? 'Approver is required for budget' : '',
  };

  const budgetValidationRules = {
    amount: (value) => {
      if (!value || value.trim() === '') return 'Amount is required';
      return '';
    },
    currency: (value) => {
      if (!value || value.trim() === '') return 'Currency is required';
      return '';
    },
    ad_channel: (value) => !value || value === 0 ? 'Ad channel is required' : '',
  };

  const budgetPoolValidationRules = {
    project: (value) => !value || value === 0 ? 'Project is required' : '',
    ad_channel: (value) => !value || value === 0 ? 'Advertising channel is required' : '',
    total_amount: (value) => {
      if (!value || value.trim() === '') return 'Total amount is required';
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) return 'Total amount must be a positive number';
      return '';
    },
    currency: (value) => {
      if (!value || value.trim() === '') return 'Currency is required';
      if (value.length !== 3) return 'Currency must be 3 characters (e.g., AUD, USD)';
      return '';
    },
  };

  // TODO: Add validation rules for asset
  const assetValidationRules = {};
  const retrospectiveValidationRules = {
    campaign: (value) => {
      if (!value || value.toString().trim() === '') return 'Campaign (Project) is required';
      return '';
    },
  };

  const reportValidationRules = {
  title: (value) => {
    if (!value || value.trim() === '') return 'Title is required';
    return '';
  },
  owner_id: (value) => {
    if (!value || value.trim() === '') return 'Owner ID is required';
    return '';
  },
  report_template_id: (value) => {
    if (!value || value.trim() === '') return 'Template ID is required';
    return '';
  },
  'slice_config.csv_file_path': (value) => {
    // Temporarily make CSV file optional until upload endpoint is fixed
    // if (!value || value.trim() === '') return 'CSV file must be uploaded';
    return '';
  },
};


  // Initialize validation hooks
  const taskValidation = useFormValidation(taskValidationRules);
  const budgetValidation = useFormValidation(budgetValidationRules);
  const budgetPoolValidation = useFormValidation(budgetPoolValidationRules);
  const assetValidation = useFormValidation(assetValidationRules);
  const retrospectiveValidation = useFormValidation(retrospectiveValidationRules);
  const reportValidation = useFormValidation(reportValidationRules);

  // Assign validation hooks to config
  taskTypeConfig.budget.validation = budgetValidation;
  taskTypeConfig.asset.validation = assetValidation;
  taskTypeConfig.retrospective.validation = retrospectiveValidation;
  taskTypeConfig.report.validation = reportValidation;

  const handleTaskDataChange = (newTaskData) => {
    setTaskData(prev => ({ ...prev, ...newTaskData }));

    // If task type is changed, update the task type
    if (newTaskData.type && newTaskData.type !== taskData.type) {
      setTaskType(newTaskData.type);
    }
  };

  const handleBudgetDataChange = (newBudgetData) => {
    setBudgetData(prev => ({ ...prev, ...newBudgetData }));
  };

  const handleAssetDataChange = (newAssetData) => {
    setAssetData(prev => ({ ...prev, ...newAssetData }));
  };

  const handleRetrospectiveDataChange = (newRetrospectiveData) => {
    setRetrospectiveData(prev => ({ ...prev, ...newRetrospectiveData }));
  };

  const handleBudgetPoolDataChange = (newBudgetPoolData) => {
    setBudgetPoolData(prev => ({ ...prev, ...newBudgetPoolData }));
  };

  const handleReportDataChange = (newReportData) => {
    setReportData(prev => ({ ...prev, ...newReportData }));
  };


  // Handle task card click
  const handleTaskClick = (task) => {
    // Navigate to task detail page
    router.push(`/tasks/${task.id}`);
  };

  // Generic function to create task type specific object
  const createTaskTypeObject = async (taskType, createdTask) => {
    const config = taskTypeConfig[taskType];
    if (!config || !config.api) {
      console.warn(`No API configured for task type: ${taskType}`);
      return null;
    }

    const payload = config.getPayload(createdTask);
    console.log(`Creating ${taskType} with payload:`, payload);
    
    try {
      const response = await config.api(payload);
      // Handle different response formats:
      // - Some APIs return {data: object}
      // - Some APIs (like AssetAPI.createAsset) return the object directly
      const createdObject = response?.data || response;
      console.log(`${taskType} created:`, createdObject);
      return createdObject;
    } catch (error) {
      // Handle case where retrospective already exists
      if (taskType === 'retrospective' && error.response?.status === 400) {
        const errorData = error.response.data;
        // Check if error is about retrospective already existing
        if (errorData.campaign && 
            (Array.isArray(errorData.campaign) && errorData.campaign[0]?.includes('already exists')) ||
            (typeof errorData.campaign === 'string' && errorData.campaign.includes('already exists'))) {
          console.warn('Retrospective already exists, attempting to find existing one...');
          
          // Try to find existing retrospective for this campaign
          try {
            const campaignId = payload.campaign;
            const retrospectivesResponse = await RetrospectiveAPI.getRetrospectives({ campaign: campaignId });
            if (retrospectivesResponse.data && retrospectivesResponse.data.length > 0) {
              console.log('Found existing retrospective:', retrospectivesResponse.data[0]);
              return retrospectivesResponse.data[0];
            }
          } catch (findError) {
            console.error('Failed to find existing retrospective:', findError);
          }
        }
      }
      // Re-throw the error if we couldn't handle it
      throw error;
    }
  };

  // Generic function to reset form data
  const resetFormData = () => {
    setTaskData({
      project_id: null,
      type: '',
      summary: '',
      description: '',
      current_approver_id: null,
      due_date: '',
    });
    setBudgetData({
      amount: '',
      currency: '',
      ad_channel: null,
      notes: '',
    });
    setBudgetPoolData({
      project: null,
      ad_channel: null,
      total_amount: '',
      currency: '',
    });
    setAssetData({
      tags: '',
      team: '',
      notes: '',
      file: null,
    });
    setRetrospectiveData({});
    setReportData({
      title: '',
      owner_id: '',
      report_template_id: '',
      slice_config: {
        csv_file_path: '',
      },
    });
    setTaskType('');
    setContentType('');
  };

  // Generic function to clear validation errors
  const clearAllValidationErrors = () => {
    taskValidation.clearErrors();
    budgetValidation.clearErrors();
    budgetPoolValidation.clearErrors();
    assetValidation.clearErrors();
    retrospectiveValidation.clearErrors();
  };

  // Submit method to create task and related objects
  const handleSubmit = async () => {
    if (isSubmitting) return;

    const requiredTaskFields = taskData.type === 'budget'
      ? ['project_id', 'type', 'summary', 'current_approver_id']
      : ['project_id', 'type', 'summary'];
    if (!taskValidation.validateForm(taskData, requiredTaskFields)) {
      return;
    }

    const config = taskTypeConfig[taskData.type];
    if (config && config.validation && config.requiredFields.length > 0) {
      if (!config.validation.validateForm(config.formData, config.requiredFields)) {
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const taskPayload = {
        project_id: taskData.project_id,
        type: taskData.type,
        summary: taskData.summary,
        description: taskData.description || '',
        current_approver_id: taskData.type === 'report' ? user?.id : taskData.current_approver_id,
        due_date: taskData.due_date || null,
      };

      console.log('Creating task with payload:', taskPayload);
      const createdTask = await createTask(taskPayload);
      console.log('Task created:', createdTask);

      setContentType(config?.contentType || '');
      const createdObject = await createTaskTypeObject(taskData.type, createdTask);

      const canLinkToBackend =
        !!createdObject?.id &&
        !!config?.contentType &&
        !USE_MOCK_FALLBACK;

      if (createdObject) {
        if (canLinkToBackend) {
          await TaskAPI.linkTask(
            createdTask.id,
            config.contentType,
            createdObject.id.toString()
          );
        }

        const updatedTask = {
          ...createdTask,
          content_type: config?.contentType,
          object_id: createdObject.id ? createdObject.id.toString() : createdTask.object_id,
          linked_object: createdObject,
        };

        updateTask(createdTask.id, updatedTask);
      }

      resetFormData();
      setCreateModalOpen(false);
      clearAllValidationErrors();
      
      alert('Task created successfully!');

      console.log('Task creation completed successfully');

    } catch (error) {
      console.error('Error creating task:', error);
      console.error('Error details:', {
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
        message: error.message
      });

      let errorMessage = 'Failed to create task.';

      if (error.response?.data) {
        if (error.response.data.campaign) {
          errorMessage = `Campaign error: ${Array.isArray(error.response.data.campaign) ? error.response.data.campaign[0] : error.response.data.campaign}`;
        } else if (error.response.data.scheduled_at) {
          errorMessage = `Scheduled at error: ${Array.isArray(error.response.data.scheduled_at) ? error.response.data.scheduled_at[0] : error.response.data.scheduled_at}`;
        } else if (error.response.data.status) {
          errorMessage = `Status error: ${Array.isArray(error.response.data.status) ? error.response.data.status[0] : error.response.data.status}`;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === 'object') {
          const firstError = Object.values(error.response.data)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };


  // Submit method to create budget pool
  const handleSubmitBudgetPool = async () => {
    // Validate budget pool form
    if (!budgetPoolValidation.validateForm(budgetPoolData, ['project', 'ad_channel', 'total_amount', 'currency'])) {
      return;
    }
    
    try {
      // Create budget pool
      console.log('Creating budget pool:', budgetPoolData);
      const createdBudgetPool = await createBudgetPool(budgetPoolData);
      console.log('Budget pool created successfully:', createdBudgetPool);
      
      // Show success message
      alert('Budget pool created successfully!');
      
      // Close budget pool modal and return to task creation modal
      setCreateBudgetPoolModalOpen(false);
      setCreateModalOpen(true);
      
      // Reset budget pool form data
      setBudgetPoolData({
        project: null,
        ad_channel: null,
        total_amount: '',
        currency: '',
      });
      
      // Clear validation errors
      budgetPoolValidation.clearErrors();
      
    } catch (error) {
      console.error('Error creating budget pool:', error);
      alert('Failed to create budget pool: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUserAction = async (action) => {
    if (action === 'settings') {
      // Handle settings
    } else if (action === 'logout') {
      await logout();
    }
  };

  const handleCreateBudgetPool = () => {
    setCreateBudgetPoolModalOpen(true);
    setCreateModalOpen(false);
  };

  const layoutUser = user
    ? {
        name: user.username || user.email,
        email: user.email,
        role: user.roles && user.roles.length > 0 ? user.roles[0] : undefined,
      }
    : undefined;

  const headerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;
      headerRef.current.style.transform = `translateX(${window.scrollX}px)`;
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (headerRef.current) {
        headerRef.current.style.transform = '';
      }
    };
  }, []);

  return (
    <Layout user={layoutUser} onUserAction={handleUserAction}>
      <div className="min-h-screen bg-white">
        <div className="flex min-h-screen flex-col">
          <div className="sticky top-0 z-30 px-0 pt-0 pb-2 md:px-0 bg-white">
            <div className="flex flex-col">
              <div className="flex flex-col gap-1.5 border-b border-gray-100 bg-white px-6 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black uppercase leading-none text-gray-900">TODAY</span>
                    <div className="h-4 w-4 rounded-full border-2 border-blue-500" />
                  </div>
                  <p className="text-xs text-gray-500">
                    {totalTasksCount} task{totalTasksCount === 1 ? '' : 's'}, updated {updatedAgo}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#2D72FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f5ee6]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Task</span>
                  </button>

                  <div className="relative" ref={filterButtonRef}>
                    <button
                      onClick={() => setIsFilterMenuOpen((open) => !open)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                        isFilterMenuOpen
                          ? 'border-blue-400 bg-blue-50 text-blue-600'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <FilterIcon className="h-4 w-4" />
                      <span>Filter</span>
                    </button>
                    {isFilterMenuOpen && (
                      <div
                        ref={filterMenuRef}
                        onMouseLeave={() => setIsFilterMenuOpen(false)}
                        className="absolute left-0 top-[calc(100%+8px)] z-30 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg"
                      >
                        <div className="flex flex-col">
                          {filterOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setFilterStatus(option.value);
                                setIsFilterMenuOpen(false);
                              }}
                              className={`px-4 py-2 text-left text-sm transition ${
                                filterStatus === option.value ? 'bg-indigo-50 font-medium text-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={sortButtonRef}>
                    <button
                      onClick={() => setIsSortMenuOpen((open) => !open)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                        isSortMenuOpen
                          ? 'border-blue-400 bg-blue-50 text-blue-600'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      <span>Sort</span>
                    </button>
                    {isSortMenuOpen && (
                      <div
                        ref={sortMenuRef}
                        onMouseLeave={() => setIsSortMenuOpen(false)}
                        className="absolute left-0 top-[calc(100%+8px)] z-30 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg"
                      >
                        <div className="flex flex-col">
                          {sortOptionsList.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setSortOption(option.value);
                                setIsSortMenuOpen(false);
                              }}
                              className={`px-4 py-2 text-left text-sm transition ${
                                sortOption === option.value ? 'bg-indigo-50 font-medium text-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {tasksLoading && (
                <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-white/70 px-4 py-3 text-indigo-600 shadow-sm">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-l-transparent" />
                  <span className="text-sm font-medium">Loading tasks...</span>
                </div>
              )}

              {/* Error State */}
              {tasksError && (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
                  <span>Error loading tasks: {tasksError.message}</span>
                  <button
                    onClick={() => fetchTasks()}
                    className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Task Columns */}
              {!tasksLoading && !tasksError && (
                <div className="rounded-[28px] bg-white pb-5 pr-5 pt-0 pl-0 shadow-[0_12px_40px_-20px_rgba(79,70,229,0.45)]">
                  <div className="rounded-3xl border border-white/60 bg-white/80 pb-4 pr-4 pt-0 pl-0 backdrop-blur">
                    <div
                      ref={scrollContainerRef}
                      className="overflow-x-auto pb-4"
                      style={{ scrollbarGutter: 'stable both-edges' }}
                    >
                      <div className="flex w-max flex-row gap-3 pr-6">
                        {/* Budget Tasks */}
                        <div className="w-[340px] flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between rounded-t-xl bg-blue-100 px-4 py-3">
                            <h2 className="text-base font-semibold text-gray-900">Budget Tasks</h2>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                              {tasksByType.budget.length}
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 px-4 py-4">
                            {tasksByType.budget.length === 0 ? (
                              <p className="text-sm text-gray-500">No budget tasks found</p>
                            ) : (
                              tasksByType.budget.map((task) => (
                                <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
                              ))
                            )}
                          </div>
                        </div>

                        {/* Asset Tasks */}
                        <div className="w-[340px] flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between rounded-t-xl bg-blue-100 px-4 py-3">
                            <h2 className="text-base font-semibold text-gray-900">Assets Tasks</h2>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                              {tasksByType.asset.length}
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 px-4 py-4">
                            {tasksByType.asset.length === 0 ? (
                              <p className="text-sm text-gray-500">No asset tasks found</p>
                            ) : (
                              tasksByType.asset.map((task) => (
                                <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
                              ))
                            )}
                          </div>
                        </div>

                        {/* Retrospective Tasks */}
                        <div className="w-[340px] flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between rounded-t-xl bg-blue-100 px-4 py-3">
                            <h2 className="text-base font-semibold text-gray-900">Retrospective Tasks</h2>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                              {tasksByType.retrospective.length}
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 px-4 py-4">
                            {tasksByType.retrospective.length === 0 ? (
                              <p className="text-sm text-gray-500">No retrospective tasks found</p>
                            ) : (
                              tasksByType.retrospective.map((task) => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  onClick={handleTaskClick}
                                  onDelete={async () => {
                                    await reloadTasks();
                                  }}
                                />
                              ))
                            )}
                          </div>
                        </div>

                        {/* Report Tasks */}
                        <div className="w-[340px] flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between rounded-t-xl bg-blue-100 px-4 py-3">
                            <h2 className="text-base font-semibold text-gray-900">Report Tasks</h2>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                              {tasksByType.report.length}
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 px-4 py-4">
                            {tasksByType.report.length === 0 ? (
                              <p className="text-sm text-gray-500">No report tasks found</p>
                            ) : (
                              tasksByType.report.map((task) => (
                                <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      <Modal isOpen={createModalOpen} onClose={() => {}}>
          <div className="flex flex-col justify-center items-center p-8 gap-10 bg-white rounded-md">

            {/* Header */}
            <div className="flex flex-col gap-2 w-full">
              <h2 className="text-lg font-bold">New Task Form</h2>
              <p className="text-sm text-gray-500">Required fields are marked with an asterisk *</p>
            </div>

            {/* Task info */}
            <NewTaskForm 
              onTaskDataChange={handleTaskDataChange} 
              taskData={taskData}
              validation={taskValidation}
            />

            {/* Task Type specific forms - conditionally render based on chosen task type */}
            {taskType === 'budget' && (
              <NewBudgetRequestForm 
                onBudgetDataChange={handleBudgetDataChange} 
                budgetData={budgetData}
                taskData={taskData}
                validation={budgetValidation}
                onCreateBudgetPool={handleCreateBudgetPool}
              />
            )}
            {taskType === 'asset' && (
              <NewAssetForm 
                onAssetDataChange={handleAssetDataChange}
                assetData={assetData}
                taskData={taskData}
                validation={assetValidation}
              />
            )}
            {taskType === 'retrospective' && (
              <NewRetrospectiveForm 
                onRetrospectiveDataChange={handleRetrospectiveDataChange}
                retrospectiveData={retrospectiveData}
                taskData={taskData}
                validation={retrospectiveValidation}
              />
          )}
          
            {taskType === 'report' && (
              <NewReportForm 
                onReportDataChange={handleReportDataChange}
                reportData={reportData}
                taskData={taskData}
                validation={reportValidation}
              />
          )}

            

            {/* Buttons */}
            <div className="flex flex-row flex-between gap-4">
              <button 
                onClick={() => setCreateModalOpen(false)} 
                className="px-3 py-1.5 rounded text-white bg-gray-500 hover:bg-gray-600"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                className="px-3 py-1.5 rounded text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Submit'}
              </button>
            </div>

          </div>        
      </Modal>

      {/* Create Budget Pool Modal */}
      <Modal isOpen={createBudgetPoolModalOpen} onClose={() => setCreateBudgetPoolModalOpen(false)}>
        <div className="flex flex-col justify-center items-center p-8 gap-10 bg-white rounded-md">
          {/* Header */}
          <div className="flex flex-col gap-2 w-full">
            <h2 className="text-lg font-bold">Create Budget Pool</h2>
          </div>

          {/* Budget Pool Form */}
          <NewBudgetPool 
            onBudgetPoolDataChange={handleBudgetPoolDataChange}
            budgetPoolData={budgetPoolData}
            validation={budgetPoolValidation}
            loading={budgetPoolLoading}
          />

          {/* Error Display */}
          {budgetPoolError && (
            <div className="w-full p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="text-sm">Error: {budgetPoolError.response?.data?.message || budgetPoolError.message}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-row flex-between gap-4">
            <button 
              onClick={() => setCreateBudgetPoolModalOpen(false)} 
              className="px-3 py-1.5 rounded text-white bg-gray-500 hover:bg-gray-600"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmitBudgetPool}
              className="px-3 py-1.5 rounded text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
              disabled={budgetPoolLoading}
            >
              {budgetPoolLoading ? 'Creating...' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>

    </Layout>
  );
}

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <TasksPageContent />
    </ProtectedRoute>
  );
}

