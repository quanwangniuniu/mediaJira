import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

// New StatusBadge component with To Do, In Progress, Done statuses
// This is a separate component from the existing StatusBadge.js
function TaskStatusBadge({ 
  status, 
  getBackgroundColor 
}: { 
  status: string;
  getBackgroundColor?: (status: string) => string;
}) {
  const getStatusStyle = (status: string) => {
    const baseStyle = {
      alignItems: 'center',
      borderWidth: 0,
      borderRadius: 'var(--ds-radius-small, 3px)',
      boxSizing: 'border-box' as const,
      display: 'block',
      flexGrow: 1,
      flexShrink: 1,
      fontSize: '14px',
      fontStyle: 'normal',
      fontFamily:
        '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
      fontWeight: 500,
      height: '32px',
      lineHeight: '32px',
      marginTop: '0px',
      marginRight: '2px',
      marginBottom: '0px',
      marginLeft: '2px',
      maxWidth: '100%',
      position: 'relative' as const,
      textAlign: 'center' as const,
      whiteSpace: 'nowrap' as const,
      cursor: 'pointer',
      paddingRight: '10px',
      paddingLeft: '10px',
      verticalAlign: 'middle' as const,
      width: 'auto',
      justifyContent: 'center',
      color: 'rgb(41, 42, 46)',
      colorScheme: 'light',
      overflowX: 'hidden' as const,
      overflowY: 'hidden' as const,
      overflowWrap: 'break-word' as const,
      textOverflow: 'ellipsis',
      transitionProperty: 'opacity',
      transitionDuration: '0.3s',
      transitionTimingFunction: 'ease',
      transitionDelay: '0s',
      opacity: 1,
      visibility: 'visible' as const,
      pointerEvents: 'auto' as const,
      WebkitBoxFlex: 1,
    };

    // Use provided function or default logic
    const backgroundColor = getBackgroundColor 
      ? getBackgroundColor(status)
      : (() => {
          switch (status) {
            case 'To Do':
              return '#0515240f';
            case 'In Progress':
              return '#669df1';
            case 'Done':
              return '#94c748';
            default:
              return '#0515240f';
          }
        })();

    return {
      ...baseStyle,
      backgroundColor,
    };
  };

  const statusStyle = getStatusStyle(status);
  
  return (
    <span style={{ ...statusStyle, display: 'inline-flex', alignItems: 'center' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: '32px',
          lineHeight: '32px',
        }}
      >
        {status}
      </span>
      <span
        style={{
          marginLeft: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          lineHeight: '32px',
          height: '32px',
          marginTop: '3px',
        }}
      >
        <ChevronDown
          className="h-4 w-4"
          aria-hidden="true"
        />
      </span>
    </span>
  );
}

export default {
  title: 'UI/StatusBadge',
  component: TaskStatusBadge,
  parameters: {
    layout: 'centered',
    // Visual testing: Ensures consistent rendering
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024],
    },
    // Documentation: Auto-generates docs
    docs: {
      description: {
        component:
          'StatusBadge is a component that displays task status information with color-coded styling. It supports three status types: To Do (grey), In Progress (blue), and Done (green). Each status has a distinct color scheme to provide visual feedback.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['To Do', 'In Progress', 'Done'],
      description:
        'The status type that determines the badge color and styling. Must be one of: "To Do" (grey), "In Progress" (blue), or "Done" (green).',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
  },
};

// Default status badge
export const Default = {
  args: {
    status: 'To Do',
  },
};

// Status variations
export const ToDo = {
  args: {
    status: 'To Do',
  },
};

export const InProgress = {
  args: {
    status: 'In Progress',
  },
};

export const Done = {
  args: {
    status: 'Done',
  },
};

// Edge case: Invalid status (should fallback to default)
export const InvalidStatus = {
  args: {
    status: 'invalid-status',
  },
};

// Grid showing all statuses
export const AllStatuses = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="flex flex-col items-center gap-2">
        <TaskStatusBadge status="To Do" />
        <span className="text-xs text-gray-600">To Do</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <TaskStatusBadge status="In Progress" />
        <span className="text-xs text-gray-600">In Progress</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <TaskStatusBadge status="Done" />
        <span className="text-xs text-gray-600">Done</span>
      </div>
    </div>
  ),
};

// Interactive dropdown menu with status selection
export const WithDropdownMenu = {
  parameters: {
    layout: 'padded',
    padding: 200,
  },
  render: () => {
    const [selectedStatus, setSelectedStatus] = useState('To Do');
    const [isOpen, setIsOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('To do');
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const [createdStatuses, setCreatedStatuses] = useState<Array<{ name: string; category: string }>>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editStatus, setEditStatus] = useState<string>('');
    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState('To do');
    const [isEditCategoryDropdownOpen, setIsEditCategoryDropdownOpen] = useState(false);
    const [isEditStatusDropdownOpen, setIsEditStatusDropdownOpen] = useState(false);
    const [focusedStatusIndex, setFocusedStatusIndex] = useState(-1);
    const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(-1);
    const [focusedEditStatusIndex, setFocusedEditStatusIndex] = useState(-1);
    const [focusedEditCategoryIndex, setFocusedEditCategoryIndex] = useState(-1);
    const createStatusButtonRef = useRef<HTMLButtonElement>(null);
    const editStatusButtonRef = useRef<HTMLButtonElement>(null);
    const viewWorkflowButtonRef = useRef<HTMLButtonElement>(null);
    const categoryInputRef = useRef<HTMLDivElement>(null);
    const editCategoryInputRef = useRef<HTMLDivElement>(null);
    const editStatusInputRef = useRef<HTMLDivElement>(null);
    
    // Refs for keyboard navigation
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);
    const editStatusDropdownRef = useRef<HTMLDivElement>(null);
    const editCategoryDropdownRef = useRef<HTMLDivElement>(null);
    const createModalRef = useRef<HTMLDivElement>(null);
    const editModalRef = useRef<HTMLDivElement>(null);
    
    const [editedStatuses, setEditedStatuses] = useState<Record<string, { name: string; category: string }>>({});

    const predefinedStatuses = ['To Do', 'In Progress', 'Done'];
    const categoryOptions = ['To do', 'In Progress', 'Done'];
    
    // Get all statuses: check edited first, then created, then predefined
    const getDisplayName = (status: string) => {
      return editedStatuses[status]?.name || status;
    };
    
    const getAllStatuses = () => {
      const edited = Object.values(editedStatuses).map(s => s.name);
      const created = createdStatuses.map(s => s.name);
      const predefined = predefinedStatuses.filter(s => !editedStatuses[s]);
      return [...edited, ...predefined, ...created];
    };
    
    const allStatuses = getAllStatuses();
    const otherStatuses = allStatuses.filter(s => s !== selectedStatus);
    
    // Keyboard navigation for main status dropdown - only handles arrow keys for status items
    useEffect(() => {
      if (!isOpen) {
        setFocusedStatusIndex(-1);
        return;
      }
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;
        
        // Check if focus is on an action button (should use Tab/Enter, not arrow keys)
        const target = e.target as HTMLElement;
        const isOnActionButton = target.closest('[role="group"][aria-label="Actions"]');
        
        // Only handle arrow keys when not on action buttons
        if (!isOnActionButton) {
          switch (e.key) {
            case 'ArrowDown':
              e.preventDefault();
              setFocusedStatusIndex(prev => {
                const maxIndex = otherStatuses.length - 1;
                return prev < maxIndex ? prev + 1 : 0;
              });
              break;
            case 'ArrowUp':
              e.preventDefault();
              setFocusedStatusIndex(prev => {
                const maxIndex = otherStatuses.length - 1;
                return prev > 0 ? prev - 1 : maxIndex;
              });
              break;
            case 'Enter':
              e.preventDefault();
              if (focusedStatusIndex >= 0 && focusedStatusIndex < otherStatuses.length) {
                setSelectedStatus(otherStatuses[focusedStatusIndex]);
                setIsOpen(false);
              }
              break;
          }
        }
        
        // Handle Escape regardless of focus
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsOpen(false);
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, focusedStatusIndex, otherStatuses]);
    
    // Keyboard navigation for category dropdown (Create modal)
    useEffect(() => {
      if (!isCategoryDropdownOpen) {
        setFocusedCategoryIndex(-1);
        return;
      }
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isCategoryDropdownOpen) return;
        
        // Only handle if focus is on category input or dropdown items
        const target = e.target as HTMLElement;
        const isOnCategoryInput = target === categoryInputRef.current || target.closest('[role="combobox"]') === categoryInputRef.current;
        const isOnCategoryDropdown = target.closest('[role="menu"][aria-label="Category options"]') === categoryDropdownRef.current;
        
        if (!isOnCategoryInput && !isOnCategoryDropdown) return;
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setFocusedCategoryIndex(prev => {
              const maxIndex = categoryOptions.length - 1;
              if (prev === -1) return 0; // Start from first item
              return prev < maxIndex ? prev + 1 : 0;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setFocusedCategoryIndex(prev => {
              const maxIndex = categoryOptions.length - 1;
              if (prev === -1) return maxIndex; // Start from last item
              return prev > 0 ? prev - 1 : maxIndex;
            });
            break;
          case 'Enter':
            e.preventDefault();
            if (focusedCategoryIndex >= 0 && focusedCategoryIndex < categoryOptions.length) {
              setCategory(categoryOptions[focusedCategoryIndex]);
              setIsCategoryDropdownOpen(false);
              categoryInputRef.current?.focus(); // Return focus to input
            } else if (focusedCategoryIndex === -1) {
              // If no item is focused, select current category (do nothing)
              setIsCategoryDropdownOpen(false);
            }
            break;
          case 'Escape':
            e.preventDefault();
            setIsCategoryDropdownOpen(false);
            categoryInputRef.current?.focus(); // Return focus to input
            break;
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isCategoryDropdownOpen, focusedCategoryIndex, categoryOptions]);
    
    // Keyboard navigation for edit status dropdown
    useEffect(() => {
      if (!isEditStatusDropdownOpen) {
        setFocusedEditStatusIndex(-1);
        return;
      }
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isEditStatusDropdownOpen) return;
        
        // Only handle if focus is on status input or dropdown items
        const target = e.target as HTMLElement;
        const isOnStatusInput = target === editStatusInputRef.current || target.closest('[role="combobox"]') === editStatusInputRef.current;
        const isOnStatusDropdown = target.closest('[role="menu"][aria-label="Status options"]') === editStatusDropdownRef.current;
        
        if (!isOnStatusInput && !isOnStatusDropdown) return;
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setFocusedEditStatusIndex(prev => {
              const maxIndex = allStatuses.length - 1;
              if (prev === -1) return 0; // Start from first item
              return prev < maxIndex ? prev + 1 : 0;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setFocusedEditStatusIndex(prev => {
              const maxIndex = allStatuses.length - 1;
              if (prev === -1) return maxIndex; // Start from last item
              return prev > 0 ? prev - 1 : maxIndex;
            });
            break;
          case 'Enter':
            e.preventDefault();
            if (focusedEditStatusIndex >= 0 && focusedEditStatusIndex < allStatuses.length) {
              const status = allStatuses[focusedEditStatusIndex];
              setEditStatus(status);
              setEditName(status);
              const category = getStatusCategory(status);
              setEditCategory(category || 'To do');
              setIsEditStatusDropdownOpen(false);
              editStatusInputRef.current?.focus(); // Return focus to input
            } else if (focusedEditStatusIndex === -1) {
              // If no item is focused, close dropdown
              setIsEditStatusDropdownOpen(false);
            }
            break;
          case 'Escape':
            e.preventDefault();
            setIsEditStatusDropdownOpen(false);
            editStatusInputRef.current?.focus(); // Return focus to input
            break;
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isEditStatusDropdownOpen, focusedEditStatusIndex, allStatuses]);
    
    // Keyboard navigation for edit category dropdown
    useEffect(() => {
      if (!isEditCategoryDropdownOpen) {
        setFocusedEditCategoryIndex(-1);
        return;
      }
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isEditCategoryDropdownOpen) return;
        
        // Only handle if focus is on category input or dropdown items
        const target = e.target as HTMLElement;
        const isOnCategoryInput = target === editCategoryInputRef.current || target.closest('[role="combobox"]') === editCategoryInputRef.current;
        const isOnCategoryDropdown = target.closest('[role="menu"][aria-label="Category options"]') === editCategoryDropdownRef.current;
        
        if (!isOnCategoryInput && !isOnCategoryDropdown) return;
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setFocusedEditCategoryIndex(prev => {
              const maxIndex = categoryOptions.length - 1;
              if (prev === -1) return 0; // Start from first item
              return prev < maxIndex ? prev + 1 : 0;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setFocusedEditCategoryIndex(prev => {
              const maxIndex = categoryOptions.length - 1;
              if (prev === -1) return maxIndex; // Start from last item
              return prev > 0 ? prev - 1 : maxIndex;
            });
            break;
          case 'Enter':
            e.preventDefault();
            if (focusedEditCategoryIndex >= 0 && focusedEditCategoryIndex < categoryOptions.length) {
              setEditCategory(categoryOptions[focusedEditCategoryIndex]);
              setIsEditCategoryDropdownOpen(false);
              editCategoryInputRef.current?.focus(); // Return focus to input
            } else if (focusedEditCategoryIndex === -1) {
              // If no item is focused, select current category (do nothing)
              setIsEditCategoryDropdownOpen(false);
            }
            break;
          case 'Escape':
            e.preventDefault();
            setIsEditCategoryDropdownOpen(false);
            editCategoryInputRef.current?.focus(); // Return focus to input
            break;
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isEditCategoryDropdownOpen, focusedEditCategoryIndex, categoryOptions]);

    const getStatusCategory = (status: string): string | null => {
      // Check if it's an edited status (by original name or current name)
      const editedByOriginal = editedStatuses[status];
      if (editedByOriginal) {
        return editedByOriginal.category;
      }
      // Check if it's an edited status by current name
      const editedStatus = Object.entries(editedStatuses).find(([_, value]) => value.name === status);
      if (editedStatus) {
        return editedStatus[1].category;
      }
      // Check if it's a created status
      const createdStatus = createdStatuses.find(s => s.name === status);
      if (createdStatus) {
        return createdStatus.category;
      }
      // Map predefined statuses to categories
      switch (status) {
        case 'To Do':
          return 'To do';
        case 'In Progress':
          return 'In Progress';
        case 'Done':
          return 'Done';
        default:
          return null;
      }
    };

    const getStatusColor = (status: string) => {
      const category = getStatusCategory(status);
      
      // Use category-based colors
      switch (category) {
        case 'To do':
          return { bg: 'rgb(221, 222, 225)', text: 'rgb(41, 42, 46)' };
        case 'In Progress':
          return { bg: 'rgb(143, 184, 246)', text: 'rgb(41, 42, 46)' };
        case 'Done':
          return { bg: 'rgb(179, 223, 114)', text: 'rgb(41, 42, 46)' };
        default:
          return { bg: 'rgb(221, 222, 225)', text: 'rgb(41, 42, 46)' };
      }
    };

    const getStatusBackgroundColor = (status: string): string => {
      const category = getStatusCategory(status);
      
      // Map category to badge background color
      switch (category) {
        case 'To do':
          return '#0515240f';
        case 'In Progress':
          return '#669df1';
        case 'Done':
          return '#94c748';
        default:
          return '#0515240f';
      }
    };

    const getCategoryColor = (cat: string) => {
      switch (cat) {
        case 'To do':
          return 'rgb(230, 232, 235)'; // Shallow grey (shallower version of #0515240f)
        case 'In Progress':
          return 'rgb(200, 220, 250)'; // Shallow blue (shallower version of #669df1)
        case 'Done':
          return 'rgb(210, 235, 180)'; // Shallow green (shallower version of #94c748)
        default:
          return 'rgb(230, 232, 235)';
      }
    };

    return (
        <div
          style={{
            minHeight: 700,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <div className="relative inline-block">
            {/* Trigger */}
            <div onClick={() => setIsOpen((v) => !v)} style={{ cursor: 'pointer' }}>
              <TaskStatusBadge status={selectedStatus} getBackgroundColor={getStatusBackgroundColor} />
            </div>
      
            {/* Dropdown menu */}
            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsOpen(false)}
                />
      
                <div 
                  ref={statusDropdownRef}
                  role="menu"
                  aria-label="Status options"
                  className="absolute left-0 top-full mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg text-sm z-30"
                >
                  <div className="border-b border-gray-200" role="group" aria-label="Status list">
                    {otherStatuses.map((status, index) => {
                      const colors = getStatusColor(status);
                      const isFocused = index === focusedStatusIndex;
                      return (
                        <div
                          key={status}
                          role="menuitem"
                          tabIndex={-1}
                          aria-label={`Select status ${status}`}
                          className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer ${isFocused ? 'bg-blue-50' : ''}`}
                          onClick={() => {
                            setSelectedStatus(status);
                            setIsOpen(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedStatus(status);
                              setIsOpen(false);
                            }
                          }}
                        >
                          <span
                            className="inline-flex items-center rounded-sm"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                              height: '16px',
                              borderRadius: '3px',
                              boxSizing: 'border-box',
                              paddingLeft: '4px',
                              paddingRight: '4px',
                              fontSize: '11px',
                              fontWeight: 500,
                              fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                            }}
                          >
                            {status.toUpperCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
      
                    <div className="py-1" role="group" aria-label="Actions">
                      <button 
                        ref={createStatusButtonRef}
                        type="button"
                        tabIndex={0}
                        className="block w-full px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          setIsCreateModalOpen(true);
                        }}
                        onKeyDown={(e) => {
                          // Prevent arrow keys from working on buttons
                          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                          // Handle Tab cycling: if Shift+Tab on first button, wrap to last
                          if (e.key === 'Tab' && e.shiftKey) {
                            e.preventDefault();
                            viewWorkflowButtonRef.current?.focus();
                          }
                        }}
                      >
                        Create status
                      </button>
                      <button 
                        ref={editStatusButtonRef}
                        type="button"
                        tabIndex={0}
                        className="block w-full px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          setIsEditModalOpen(true);
                          // Initialize edit fields with first available status
                          if (allStatuses.length > 0) {
                            const firstStatus = allStatuses[0];
                            setEditStatus(firstStatus);
                            setEditName(firstStatus);
                            const category = getStatusCategory(firstStatus);
                            setEditCategory(category || 'To do');
                          }
                        }}
                        onKeyDown={(e) => {
                          // Prevent arrow keys from working on buttons
                          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                      >
                        Edit status
                      </button>
                      <button 
                        ref={viewWorkflowButtonRef}
                        type="button"
                        tabIndex={0}
                        className="block w-full px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                        onKeyDown={(e) => {
                          // Prevent arrow keys from working on buttons
                          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                          // Handle Tab cycling: if Tab on last button, wrap to first
                          if (e.key === 'Tab' && !e.shiftKey) {
                            e.preventDefault();
                            createStatusButtonRef.current?.focus();
                          }
                        }}
                      >
                        View workflow
                      </button>
                    </div>
                 </div>
               </>
             )}

             {/* Create Status Modal - positioned southwest of button */}
             {isCreateModalOpen && (
               <>
                 <div
                   className="fixed inset-0 z-20"
                   onClick={() => {
                     setIsCreateModalOpen(false);
                     setName('');
                     setCategory('To do');
                   }}
                 />
                 <div 
                   ref={createModalRef}
                   className="absolute right-0 top-full mt-1 w-80 rounded-md border border-gray-200 bg-white shadow-xl z-30"
                   onClick={(e) => e.stopPropagation()}
                   onKeyDown={(e) => {
                     // Trap Tab within modal
                     if (e.key === 'Tab') {
                       // Get all potentially focusable elements
                       const allElements = createModalRef.current?.querySelectorAll(
                         'input, button, [tabindex]:not([tabindex="-1"])'
                       ) as NodeListOf<HTMLElement>;
                       if (!allElements || allElements.length === 0) return;
                       
                       // Filter out disabled buttons and other non-focusable elements
                       const focusableElements = Array.from(allElements).filter(el => {
                         // Skip disabled buttons
                         if (el.tagName === 'BUTTON' && el.hasAttribute('disabled')) {
                           return false;
                         }
                         // Skip hidden elements
                         if (el.offsetParent === null) {
                           return false;
                         }
                         return true;
                       }) as HTMLElement[];
                       
                       if (focusableElements.length === 0) return;
                       
                       const firstElement = focusableElements[0];
                       const lastElement = focusableElements[focusableElements.length - 1];
                       
                       if (e.shiftKey) {
                         // Shift+Tab
                         if (document.activeElement === firstElement) {
                           e.preventDefault();
                           lastElement.focus();
                         }
                       } else {
                         // Tab
                         if (document.activeElement === lastElement) {
                           e.preventDefault();
                           firstElement.focus();
                         }
                       }
                     }
                   }}
                 >
                   <div className="p-4">
                     <h2 className="text-base font-semibold text-gray-900 mb-2">
                       Create status
                     </h2>
                     <p className="text-xs text-gray-600 mb-4">
                       Required fields are marked with an asterisk
                       <span
                         style={{
                           color: 'rgb(174, 46, 36)',
                           colorScheme: 'light',
                           cursor: 'default',
                           display: 'inline',
                           fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                           fontSize: '6px',
                           fontStyle: 'normal',
                           fontWeight: 700,
                           height: 'auto',
                           lineHeight: '16px',
                           paddingInlineStart: '2px',
                           pointerEvents: 'auto',
                           visibility: 'visible',
                           width: 'auto',
                           verticalAlign: 'super',
                           marginTop: '-2px',
                         }}
                       >
                         ✱
                       </span>
                     </p>

                     <div className="space-y-3">
                       {/* Name Field */}
                       <div>
                         <label className="block text-xs font-semibold text-gray-700 mb-1">
                           Name
                           <span
                             style={{
                               color: 'rgb(174, 46, 36)',
                               colorScheme: 'light',
                               cursor: 'default',
                               display: 'inline',
                               fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                               fontSize: '6px',
                               fontStyle: 'normal',
                               fontWeight: 700,
                               height: 'auto',
                               lineHeight: '16px',
                               paddingInlineStart: '2px',
                               pointerEvents: 'auto',
                               visibility: 'visible',
                               width: 'auto',
                               verticalAlign: 'super',
                               marginTop: '-2px',
                             }}
                           >
                             ✱
                           </span>
                         </label>
                         <input
                           type="text"
                           value={name}
                           onChange={(e) => setName(e.target.value)}
                           className="w-full"
                           style={{
                             alignItems: 'center',
                             backgroundColor: 'rgb(255, 255, 255)',
                             borderColor: 'rgb(140, 143, 151)',
                             borderStyle: 'solid',
                             borderWidth: '0.909091px',
                             borderRadius: '3px',
                             boxSizing: 'border-box',
                             color: 'rgb(41, 42, 46)',
                             cursor: 'text',
                             display: 'block',
                             fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                             fontSize: '14px',
                             fontStyle: 'normal',
                             fontWeight: 400,
                             height: '32px',
                             justifyContent: 'space-between',
                             lineHeight: '20px',
                             maxWidth: '100%',
                             overflowWrap: 'break-word',
                             overflowX: 'hidden',
                             overflowY: 'hidden',
                             paddingTop: '1px',
                             paddingBottom: '1px',
                             paddingLeft: '8px',
                             paddingRight: '8px',
                             pointerEvents: 'auto',
                             transitionProperty: 'background-color, border-color',
                             transitionDuration: '0.2s',
                             transitionTimingFunction: 'ease-in-out',
                             visibility: 'visible',
                           }}
                           placeholder=""
                           onClick={(e) => e.stopPropagation()}
                         />
                       </div>

                       {/* Category Field */}
                       <div className="relative">
                         <label className="block text-xs font-semibold text-gray-700 mb-1">
                           Category
                           <span
                             style={{
                               color: 'rgb(174, 46, 36)',
                               colorScheme: 'light',
                               cursor: 'default',
                               display: 'inline',
                               fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                               fontSize: '6px',
                               fontStyle: 'normal',
                               fontWeight: 700,
                               height: 'auto',
                               lineHeight: '16px',
                               paddingInlineStart: '2px',
                               pointerEvents: 'auto',
                               visibility: 'visible',
                               width: 'auto',
                               verticalAlign: 'super',
                               marginTop: '-2px',
                             }}
                           >
                             ✱
                           </span>
                         </label>
                         <div className="relative">
                           {/* Custom Input Field */}
                           {isCategoryDropdownOpen && (
                             <div
                               className="fixed inset-0 z-30"
                               onClick={() => setIsCategoryDropdownOpen(false)}
                             />
                           )}
                           <div
                             ref={categoryInputRef}
                             tabIndex={0}
                             role="combobox"
                             aria-expanded={isCategoryDropdownOpen}
                             aria-haspopup="listbox"
                             onClick={(e) => {
                               e.stopPropagation();
                              setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                            }}
                             onKeyDown={(e) => {
                               if (e.key === ' ' || e.key === 'Enter') {
                                 e.preventDefault();
                                 setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                               }
                               // Arrow keys are handled by the category dropdown useEffect
                             }}
                             className="w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                             style={{
                               alignItems: 'center',
                               backgroundColor: 'rgb(255, 255, 255)',
                               borderColor: isCategoryDropdownOpen ? 'rgb(0, 82, 204)' : 'rgb(140, 143, 151)',
                               borderStyle: 'solid',
                               borderWidth: '0.909091px',
                               borderRadius: '3px',
                               boxSizing: 'border-box',
                               color: 'rgb(41, 42, 46)',
                               display: 'flex',
                               fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                               fontSize: '14px',
                               fontStyle: 'normal',
                               fontWeight: 400,
                               height: '32px',
                               justifyContent: 'space-between',
                               lineHeight: '20px',
                               paddingLeft: '8px',
                               paddingRight: '8px',
                               pointerEvents: 'auto',
                               transitionProperty: 'background-color, border-color',
                               transitionDuration: '0.2s',
                               transitionTimingFunction: 'ease-in-out',
                             }}
                           >
                             <div className="flex items-center gap-2">
                               {/* Colored Square Icon */}
                               <div
                                 style={{
                                   width: '16px',
                                   height: '16px',
                                   backgroundColor: getCategoryColor(category),
                                   border: '1px solid rgb(200, 200, 200)',
                                   borderRadius: '2px',
                                   flexShrink: 0,
                                 }}
                               />
                               <span>{category}</span>
                             </div>
                             <ChevronDown className="h-4 w-4 text-gray-500" />
                           </div>

                           {/* Dropdown Menu */}
                           {isCategoryDropdownOpen && (
                             <div
                               ref={categoryDropdownRef}
                               role="menu"
                               aria-label="Category options"
                               className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                               onClick={(e) => e.stopPropagation()}
                             >
                               {categoryOptions.map((option, index) => {
                                 // Determine background color based on hover, selection, and focus state
                                 let backgroundColor = 'rgb(255, 255, 255)';
                                 const isFocused = index === focusedCategoryIndex;
                                 if (isFocused) {
                                   backgroundColor = category === option ? 'rgb(222, 235, 255)' : 'rgb(242, 243, 245)';
                                 } else if (hoveredCategory === option) {
                                   // Hovered option: blue if selected, grey if not
                                   backgroundColor = category === option ? 'rgb(222, 235, 255)' : 'rgb(242, 243, 245)';
                                 } else if (category === option) {
                                   // Selected but not hovered: shallow blue if another is hovered, normal blue otherwise
                                   backgroundColor = hoveredCategory ? 'rgb(235, 244, 255)' : 'rgb(222, 235, 255)';
                                 }
                                 
                                 return (
                                   <div
                                     key={option}
                                     role="menuitem"
                                     tabIndex={0}
                                     aria-label={`Select category ${option}`}
                                     aria-selected={category === option}
                                     onMouseEnter={() => setHoveredCategory(option)}
                                     onMouseLeave={() => setHoveredCategory(null)}
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setCategory(option);
                                       setIsCategoryDropdownOpen(false);
                                       setHoveredCategory(null);
                                     }}
                                     onKeyDown={(e) => {
                                       if (e.key === 'Enter' || e.key === ' ') {
                                         e.preventDefault();
                                         setCategory(option);
                                         setIsCategoryDropdownOpen(false);
                                         setHoveredCategory(null);
                                       }
                                     }}
                                     className="flex items-center gap-2 cursor-pointer"
                                     style={{
                                       backgroundColor,
                                       padding: '6px 12px',
                                       height: '32px',
                                       fontFamily: '"Atlassian Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                       fontSize: '14px',
                                       fontWeight: 400,
                                       lineHeight: '20px',
                                       letterSpacing: '-0.005em',
                                       color: '#172B4D',
                                       WebkitFontSmoothing: 'antialiased',
                                       MozOsxFontSmoothing: 'grayscale',
                                       transition: 'background-color 0.1s ease',
                                     }}
                                   >
                                   {/* Colored Square Icon */}
                                   <div
                                     style={{
                                       width: '16px',
                                       height: '16px',
                                       backgroundColor: getCategoryColor(option),
                                       border: '1px solid rgb(200, 200, 200)',
                                       borderRadius: '2px',
                                       flexShrink: 0,
                                     }}
                                   />
                                   <span>
                                     {option}
                                   </span>
                                 </div>
                               );
                               })}
                             </div>
                           )}
                         </div>
                       </div>
                     </div>

                     {/* Action Buttons */}
                     <div className="flex justify-end gap-2 mt-4">
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           setIsCreateModalOpen(false);
                           setName('');
                           setCategory('To do');
                         }}
                         className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                       >
                         Cancel
                       </button>
                       <button
                         disabled={!name.trim()}
                         onClick={(e) => {
                           e.stopPropagation();
                           if (name.trim()) {
                            // Add new status
                            if (name.trim()) {
                              setCreatedStatuses(prev => [...prev, { name: name.trim(), category }]);
                              setSelectedStatus(name.trim()); // Select the newly created status
                            }
                            setIsCreateModalOpen(false);
                            setName('');
                            setCategory('To do');
                           }
                         }}
                         className="px-3 py-1.5 text-xs font-medium text-white rounded-md"
                         style={{
                           backgroundColor: name.trim() ? '#2563eb' : '#9ca3af',
                           cursor: name.trim() ? 'pointer' : 'not-allowed',
                         }}
                       >
                         Create
                       </button>
                     </div>
                   </div>
                </div>
              </>
            )}

            {/* Edit Status Modal */}
            {isEditModalOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditStatus('');
                    setEditName('');
                    setEditCategory('To do');
                  }}
                />
                <div 
                  ref={editModalRef}
                  className="absolute right-0 top-full mt-1 w-80 rounded-md border border-gray-200 bg-white shadow-xl z-30"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    // Trap Tab within modal
                    if (e.key === 'Tab') {
                      // Get all potentially focusable elements
                      const allElements = editModalRef.current?.querySelectorAll(
                        'input, button, [tabindex]:not([tabindex="-1"])'
                      ) as NodeListOf<HTMLElement>;
                      if (!allElements || allElements.length === 0) return;
                      
                      // Filter out disabled buttons and other non-focusable elements
                      const focusableElements = Array.from(allElements).filter(el => {
                        // Skip disabled buttons
                        if (el.tagName === 'BUTTON' && el.hasAttribute('disabled')) {
                          return false;
                        }
                        // Skip hidden elements
                        if (el.offsetParent === null) {
                          return false;
                        }
                        return true;
                      }) as HTMLElement[];
                      
                      if (focusableElements.length === 0) return;
                      
                      const firstElement = focusableElements[0];
                      const lastElement = focusableElements[focusableElements.length - 1];
                      
                      if (e.shiftKey) {
                        // Shift+Tab
                        if (document.activeElement === firstElement) {
                          e.preventDefault();
                          lastElement.focus();
                        }
                      } else {
                        // Tab
                        if (document.activeElement === lastElement) {
                          e.preventDefault();
                          firstElement.focus();
                        }
                      }
                    }
                  }}
                >
                  <div className="p-4">
                    <h2 className="text-base font-semibold text-gray-900 mb-2">
                      Edit status
                    </h2>
                    <p className="text-xs text-gray-600 mb-4">
                      Required fields are marked with an asterisk
                      <span
                        style={{
                          color: 'rgb(174, 46, 36)',
                          colorScheme: 'light',
                          cursor: 'default',
                          display: 'inline',
                          fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                          fontSize: '6px',
                          fontStyle: 'normal',
                          fontWeight: 700,
                          height: 'auto',
                          lineHeight: '16px',
                          paddingInlineStart: '2px',
                          pointerEvents: 'auto',
                          visibility: 'visible',
                          width: 'auto',
                          verticalAlign: 'super',
                          marginTop: '-2px',
                        }}
                      >
                        ✱
                      </span>
                    </p>

                    <div className="space-y-3">
                      {/* Status Field */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Status
                          <span
                            style={{
                              color: 'rgb(174, 46, 36)',
                              colorScheme: 'light',
                              cursor: 'default',
                              display: 'inline',
                              fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                              fontSize: '6px',
                              fontStyle: 'normal',
                              fontWeight: 700,
                              height: 'auto',
                              lineHeight: '16px',
                              paddingInlineStart: '2px',
                              pointerEvents: 'auto',
                              visibility: 'visible',
                              width: 'auto',
                              verticalAlign: 'super',
                              marginTop: '-2px',
                            }}
                          >
                            ✱
                          </span>
                        </label>
                        <div className="relative">
                          {isEditStatusDropdownOpen && (
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setIsEditStatusDropdownOpen(false)}
                            />
                          )}
                          <div
                            ref={editStatusInputRef}
                            tabIndex={0}
                            role="combobox"
                            aria-expanded={isEditStatusDropdownOpen}
                            aria-haspopup="listbox"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditStatusDropdownOpen(!isEditStatusDropdownOpen);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                setIsEditStatusDropdownOpen(!isEditStatusDropdownOpen);
                              }
                              // Arrow keys are handled by the edit status dropdown useEffect
                            }}
                            className="w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                            style={{
                              alignItems: 'center',
                              backgroundColor: 'rgb(255, 255, 255)',
                              borderColor: isEditStatusDropdownOpen ? 'rgb(0, 82, 204)' : 'rgb(140, 143, 151)',
                              borderStyle: 'solid',
                              borderWidth: '0.909091px',
                              borderRadius: '3px',
                              boxSizing: 'border-box',
                              color: 'rgb(41, 42, 46)',
                              display: 'flex',
                              fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                              fontSize: '14px',
                              fontStyle: 'normal',
                              fontWeight: 400,
                              height: '32px',
                              justifyContent: 'space-between',
                              lineHeight: '20px',
                              paddingLeft: '8px',
                              paddingRight: '8px',
                              pointerEvents: 'auto',
                              transitionProperty: 'background-color, border-color',
                              transitionDuration: '0.2s',
                              transitionTimingFunction: 'ease-in-out',
                            }}
                          >
                            {editStatus ? (
                              <span
                                className="inline-flex items-center rounded-sm"
                                style={{
                                  backgroundColor: getStatusColor(editStatus).bg,
                                  color: getStatusColor(editStatus).text,
                                  height: '16px',
                                  borderRadius: '3px',
                                  boxSizing: 'border-box',
                                  paddingLeft: '4px',
                                  paddingRight: '4px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                                }}
                              >
                                {editStatus.toUpperCase()}
                              </span>
                            ) : (
                              <span style={{ color: 'rgb(140, 143, 151)' }}>Select status</span>
                            )}
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          </div>

                          {/* Status Dropdown Menu */}
                          {isEditStatusDropdownOpen && (
                            <div
                              ref={editStatusDropdownRef}
                              role="menu"
                              aria-label="Status options"
                              className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {allStatuses.map((status, index) => {
                                const colors = getStatusColor(status);
                                const isFocused = index === focusedEditStatusIndex;
                                return (
                                  <div
                                    key={status}
                                    role="menuitem"
                                    tabIndex={0}
                                    aria-label={`Select status ${status}`}
                                    aria-selected={editStatus === status}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditStatus(status);
                                      setEditName(status);
                                      const category = getStatusCategory(status);
                                      setEditCategory(category || 'To do');
                                      setIsEditStatusDropdownOpen(false);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setEditStatus(status);
                                        setEditName(status);
                                        const category = getStatusCategory(status);
                                        setEditCategory(category || 'To do');
                                        setIsEditStatusDropdownOpen(false);
                                      }
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer ${isFocused ? 'bg-blue-50' : ''}`}
                                  >
                                    <span
                                      className="inline-flex items-center rounded-sm"
                                      style={{
                                        backgroundColor: colors.bg,
                                        color: colors.text,
                                        height: '16px',
                                        borderRadius: '3px',
                                        boxSizing: 'border-box',
                                        paddingLeft: '4px',
                                        paddingRight: '4px',
                                        fontSize: '11px',
                                        fontWeight: 500,
                                        fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                                      }}
                                    >
                                      {status.toUpperCase()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Name Field */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Name
                          <span
                            style={{
                              color: 'rgb(174, 46, 36)',
                              colorScheme: 'light',
                              cursor: 'default',
                              display: 'inline',
                              fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                              fontSize: '6px',
                              fontStyle: 'normal',
                              fontWeight: 700,
                              height: 'auto',
                              lineHeight: '16px',
                              paddingInlineStart: '2px',
                              pointerEvents: 'auto',
                              visibility: 'visible',
                              width: 'auto',
                              verticalAlign: 'super',
                              marginTop: '-2px',
                            }}
                          >
                            ✱
                          </span>
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full"
                          style={{
                            alignItems: 'center',
                            backgroundColor: 'rgb(255, 255, 255)',
                            borderColor: 'rgb(140, 143, 151)',
                            borderStyle: 'solid',
                            borderWidth: '0.909091px',
                            borderRadius: '3px',
                            boxSizing: 'border-box',
                            color: 'rgb(41, 42, 46)',
                            cursor: 'text',
                            display: 'block',
                            fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                            fontSize: '14px',
                            fontStyle: 'normal',
                            fontWeight: 400,
                            height: '32px',
                            justifyContent: 'space-between',
                            lineHeight: '20px',
                            maxWidth: '100%',
                            overflowWrap: 'break-word',
                            overflowX: 'hidden',
                            overflowY: 'hidden',
                            paddingTop: '1px',
                            paddingBottom: '1px',
                            paddingLeft: '8px',
                            paddingRight: '8px',
                            pointerEvents: 'auto',
                            transitionProperty: 'background-color, border-color',
                            transitionDuration: '0.2s',
                            transitionTimingFunction: 'ease-in-out',
                            visibility: 'visible',
                          }}
                          placeholder=""
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Category Field - Same as Create modal */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Category
                          <span
                            style={{
                              color: 'rgb(174, 46, 36)',
                              colorScheme: 'light',
                              cursor: 'default',
                              display: 'inline',
                              fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                              fontSize: '6px',
                              fontStyle: 'normal',
                              fontWeight: 700,
                              height: 'auto',
                              lineHeight: '16px',
                              paddingInlineStart: '2px',
                              pointerEvents: 'auto',
                              visibility: 'visible',
                              width: 'auto',
                              verticalAlign: 'super',
                              marginTop: '-2px',
                            }}
                          >
                            ✱
                          </span>
                        </label>
                        <div className="relative">
                          {isEditCategoryDropdownOpen && (
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setIsEditCategoryDropdownOpen(false)}
                            />
                          )}
                          <div
                            ref={editCategoryInputRef}
                            tabIndex={0}
                            role="combobox"
                            aria-expanded={isEditCategoryDropdownOpen}
                            aria-haspopup="listbox"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditCategoryDropdownOpen(!isEditCategoryDropdownOpen);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                setIsEditCategoryDropdownOpen(!isEditCategoryDropdownOpen);
                              }
                              // Arrow keys are handled by the edit category dropdown useEffect
                            }}
                            className="w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                            style={{
                              alignItems: 'center',
                              backgroundColor: 'rgb(255, 255, 255)',
                              borderColor: isEditCategoryDropdownOpen ? 'rgb(0, 82, 204)' : 'rgb(140, 143, 151)',
                              borderStyle: 'solid',
                              borderWidth: '0.909091px',
                              borderRadius: '3px',
                              boxSizing: 'border-box',
                              color: 'rgb(41, 42, 46)',
                              display: 'flex',
                              fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                              fontSize: '14px',
                              fontStyle: 'normal',
                              fontWeight: 400,
                              height: '32px',
                              justifyContent: 'space-between',
                              lineHeight: '20px',
                              paddingLeft: '8px',
                              paddingRight: '8px',
                              pointerEvents: 'auto',
                              transitionProperty: 'background-color, border-color',
                              transitionDuration: '0.2s',
                              transitionTimingFunction: 'ease-in-out',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  backgroundColor: getCategoryColor(editCategory),
                                  border: '1px solid rgb(200, 200, 200)',
                                  borderRadius: '2px',
                                  flexShrink: 0,
                                }}
                              />
                              <span>{editCategory}</span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          </div>

                          {/* Category Dropdown Menu */}
                          {isEditCategoryDropdownOpen && (
                            <div
                              ref={editCategoryDropdownRef}
                              role="menu"
                              aria-label="Category options"
                              className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {categoryOptions.map((option, index) => {
                                const isFocused = index === focusedEditCategoryIndex;
                                return (
                                <div
                                  key={option}
                                  role="menuitem"
                                  tabIndex={0}
                                  aria-label={`Select category ${option}`}
                                  aria-selected={editCategory === option}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditCategory(option);
                                    setIsEditCategoryDropdownOpen(false);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setEditCategory(option);
                                      setIsEditCategoryDropdownOpen(false);
                                    }
                                  }}
                                  className="flex items-center gap-2 cursor-pointer"
                                  style={{
                                    backgroundColor: isFocused 
                                      ? (editCategory === option ? 'rgb(222, 235, 255)' : 'rgb(242, 243, 245)')
                                      : (editCategory === option ? 'rgb(222, 235, 255)' : 'rgb(255, 255, 255)'),
                                    padding: '6px 12px',
                                    height: '32px',
                                    fontFamily: '"Atlassian Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                    fontSize: '14px',
                                    fontWeight: 400,
                                    lineHeight: '20px',
                                    letterSpacing: '-0.005em',
                                    color: '#172B4D',
                                    WebkitFontSmoothing: 'antialiased',
                                    MozOsxFontSmoothing: 'grayscale',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      backgroundColor: getCategoryColor(option),
                                      border: '1px solid rgb(200, 200, 200)',
                                      borderRadius: '2px',
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span>{option}</span>
                                </div>
                              );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditModalOpen(false);
                          setEditStatus('');
                          setEditName('');
                          setEditCategory('To do');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={!editStatus || !editName.trim()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editStatus && editName.trim()) {
                            // Find original status name (check if it's already edited)
                            const originalStatus = predefinedStatuses.includes(editStatus) 
                              ? editStatus 
                              : Object.keys(editedStatuses).find(key => editedStatuses[key].name === editStatus) || editStatus;
                            
                            // Check if it's a created status
                            const createdIndex = createdStatuses.findIndex(s => s.name === editStatus);
                            if (createdIndex !== -1) {
                              // Update in created statuses
                              setCreatedStatuses(prev => {
                                const updated = [...prev];
                                updated[createdIndex] = { name: editName.trim(), category: editCategory };
                                return updated;
                              });
                            } else {
                              // It's a predefined status, track in edited statuses
                              const originalStatus = predefinedStatuses.includes(editStatus) 
                                ? editStatus 
                                : Object.keys(editedStatuses).find(key => editedStatuses[key].name === editStatus) || editStatus;
                              
                              setEditedStatuses(prev => ({
                                ...prev,
                                [originalStatus]: { name: editName.trim(), category: editCategory }
                              }));
                            }
                            
                            // If editing the currently selected status, update selection
                            if (selectedStatus === editStatus) {
                              setSelectedStatus(editName.trim());
                            }
                            
                            setIsEditModalOpen(false);
                            setEditStatus('');
                            setEditName('');
                            setEditCategory('To do');
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-white rounded-md"
                        style={{
                          backgroundColor: (editStatus && editName.trim()) ? '#2563eb' : '#9ca3af',
                          cursor: (editStatus && editName.trim()) ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      );
  },
};

// Create Status Modal - Standalone story
export const CreateStatusModal = {
  parameters: {
    layout: 'padded',
    padding: 200,
  },
  render: () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(true);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('To do');
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(-1);
    const categoryInputRef = useRef<HTMLDivElement>(null);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);
    const createModalRef = useRef<HTMLDivElement>(null);
    
    const categoryOptions = ['To do', 'In Progress', 'Done'];
    
    const getCategoryColor = (cat: string) => {
      switch (cat) {
        case 'To do':
          return 'rgb(230, 232, 235)';
        case 'In Progress':
          return 'rgb(200, 220, 250)';
        case 'Done':
          return 'rgb(210, 235, 180)';
        default:
          return 'rgb(230, 232, 235)';
      }
    };
    
    // Keyboard navigation for category dropdown
    useEffect(() => {
      if (!isCategoryDropdownOpen) {
        setFocusedCategoryIndex(-1);
        return;
      }
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isCategoryDropdownOpen) return;
        
        const target = e.target as HTMLElement;
        const isOnCategoryInput = target === categoryInputRef.current || target.closest('[role="combobox"]') === categoryInputRef.current;
        const isOnCategoryDropdown = target.closest('[role="menu"][aria-label="Category options"]') === categoryDropdownRef.current;
        
        if (!isOnCategoryInput && !isOnCategoryDropdown) return;
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setFocusedCategoryIndex(prev => {
              const maxIndex = categoryOptions.length - 1;
              if (prev === -1) return 0;
              return prev < maxIndex ? prev + 1 : 0;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setFocusedCategoryIndex(prev => {
              const maxIndex = categoryOptions.length - 1;
              if (prev === -1) return maxIndex;
              return prev > 0 ? prev - 1 : maxIndex;
            });
            break;
          case 'Enter':
            e.preventDefault();
            if (focusedCategoryIndex >= 0 && focusedCategoryIndex < categoryOptions.length) {
              setCategory(categoryOptions[focusedCategoryIndex]);
              setIsCategoryDropdownOpen(false);
              categoryInputRef.current?.focus();
            } else if (focusedCategoryIndex === -1) {
              setIsCategoryDropdownOpen(false);
            }
            break;
          case 'Escape':
            e.preventDefault();
            setIsCategoryDropdownOpen(false);
            categoryInputRef.current?.focus();
            break;
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isCategoryDropdownOpen, focusedCategoryIndex, categoryOptions]);
    
    return (
      <div style={{ minHeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        {isCreateModalOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setIsCreateModalOpen(false)}
            />
            <div 
              ref={createModalRef}
              className="relative w-80 rounded-md border border-gray-200 bg-white shadow-xl z-30"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  const allElements = createModalRef.current?.querySelectorAll(
                    'input, button, [tabindex]:not([tabindex="-1"])'
                  ) as NodeListOf<HTMLElement>;
                  if (!allElements || allElements.length === 0) return;
                  
                  const focusableElements = Array.from(allElements).filter(el => {
                    if (el.tagName === 'BUTTON' && el.hasAttribute('disabled')) {
                      return false;
                    }
                    if (el.offsetParent === null) {
                      return false;
                    }
                    return true;
                  }) as HTMLElement[];
                  
                  if (focusableElements.length === 0) return;
                  
                  const firstElement = focusableElements[0];
                  const lastElement = focusableElements[focusableElements.length - 1];
                  
                  if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                      e.preventDefault();
                      lastElement.focus();
                    }
                  } else {
                    if (document.activeElement === lastElement) {
                      e.preventDefault();
                      firstElement.focus();
                    }
                  }
                }
              }}
            >
              <div className="p-4">
                <h2 className="text-base font-semibold text-gray-900 mb-2">Create status</h2>
                <p className="text-xs text-gray-600 mb-4">
                  Required fields are marked with an asterisk
                  <span style={{ color: 'rgb(174, 46, 36)', fontSize: '6px', fontWeight: 700, marginLeft: '2px', verticalAlign: 'super', marginTop: '-2px' }}>✱</span>
                </p>

                <div className="space-y-3">
                  {/* Name Field */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Name
                      <span style={{ color: 'rgb(174, 46, 36)', fontSize: '6px', fontWeight: 700, marginLeft: '2px', verticalAlign: 'super', marginTop: '-2px' }}>✱</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full"
                      style={{
                        backgroundColor: 'rgb(255, 255, 255)',
                        borderColor: 'rgb(140, 143, 151)',
                        borderStyle: 'solid',
                        borderWidth: '0.909091px',
                        borderRadius: '3px',
                        boxSizing: 'border-box',
                        color: 'rgb(41, 42, 46)',
                        fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                        fontSize: '14px',
                        fontWeight: 400,
                        height: '32px',
                        lineHeight: '20px',
                        paddingTop: '1px',
                        paddingBottom: '1px',
                        paddingLeft: '8px',
                        paddingRight: '8px',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Category Field - Same code as in WithDropdownMenu */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Category
                      <span style={{ color: 'rgb(174, 46, 36)', fontSize: '6px', fontWeight: 700, marginLeft: '2px', verticalAlign: 'super', marginTop: '-2px' }}>✱</span>
                    </label>
                    <div className="relative">
                      {isCategoryDropdownOpen && (
                        <div className="fixed inset-0 z-30" onClick={() => setIsCategoryDropdownOpen(false)} />
                      )}
                      <div
                        ref={categoryInputRef}
                        tabIndex={0}
                        role="combobox"
                        aria-expanded={isCategoryDropdownOpen}
                        aria-haspopup="listbox"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                          }
                        }}
                        className="w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                        style={{
                          alignItems: 'center',
                          backgroundColor: 'rgb(255, 255, 255)',
                          borderColor: isCategoryDropdownOpen ? 'rgb(0, 82, 204)' : 'rgb(140, 143, 151)',
                          borderStyle: 'solid',
                          borderWidth: '0.909091px',
                          borderRadius: '3px',
                          display: 'flex',
                          fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                          fontSize: '14px',
                          fontWeight: 400,
                          height: '32px',
                          justifyContent: 'space-between',
                          paddingLeft: '8px',
                          paddingRight: '8px',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div style={{ width: '16px', height: '16px', backgroundColor: getCategoryColor(category), border: '1px solid rgb(200, 200, 200)', borderRadius: '2px', flexShrink: 0 }} />
                          <span>{category}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </div>

                      {isCategoryDropdownOpen && (
                        <div
                          ref={categoryDropdownRef}
                          role="menu"
                          aria-label="Category options"
                          className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {categoryOptions.map((option, index) => {
                            let backgroundColor = 'rgb(255, 255, 255)';
                            const isFocused = index === focusedCategoryIndex;
                            if (isFocused) {
                              backgroundColor = category === option ? 'rgb(222, 235, 255)' : 'rgb(242, 243, 245)';
                            } else if (hoveredCategory === option) {
                              backgroundColor = category === option ? 'rgb(222, 235, 255)' : 'rgb(242, 243, 245)';
                            } else if (category === option) {
                              backgroundColor = hoveredCategory ? 'rgb(235, 244, 255)' : 'rgb(222, 235, 255)';
                            }
                            
                            return (
                              <div
                                key={option}
                                role="menuitem"
                                tabIndex={0}
                                aria-label={`Select category ${option}`}
                                aria-selected={category === option}
                                onMouseEnter={() => setHoveredCategory(option)}
                                onMouseLeave={() => setHoveredCategory(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCategory(option);
                                  setIsCategoryDropdownOpen(false);
                                  setHoveredCategory(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setCategory(option);
                                    setIsCategoryDropdownOpen(false);
                                    setHoveredCategory(null);
                                  }
                                }}
                                className="flex items-center gap-2 cursor-pointer"
                                style={{
                                  backgroundColor,
                                  padding: '6px 12px',
                                  height: '32px',
                                  fontFamily: '"Atlassian Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                  fontSize: '14px',
                                  fontWeight: 400,
                                  lineHeight: '20px',
                                  letterSpacing: '-0.005em',
                                  color: '#172B4D',
                                  WebkitFontSmoothing: 'antialiased',
                                  MozOsxFontSmoothing: 'grayscale',
                                }}
                              >
                                <div style={{ width: '16px', height: '16px', backgroundColor: getCategoryColor(option), border: '1px solid rgb(200, 200, 200)', borderRadius: '2px', flexShrink: 0 }} />
                                <span>{option}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreateModalOpen(false);
                      setName('');
                      setCategory('To do');
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!name.trim()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (name.trim()) {
                        setIsCreateModalOpen(false);
                        setName('');
                        setCategory('To do');
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded-md"
                    style={{
                      backgroundColor: name.trim() ? '#2563eb' : '#9ca3af',
                      cursor: name.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  },
};

// Edit Status Modal - Standalone story
export const EditStatusModal = {
  parameters: {
    layout: 'padded',
    padding: 200,
  },
  render: () => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(true);
    const [editStatus, setEditStatus] = useState<string>('To Do');
    const [editName, setEditName] = useState('To Do');
    const [editCategory, setEditCategory] = useState('To do');
    const [isEditCategoryDropdownOpen, setIsEditCategoryDropdownOpen] = useState(false);
    const [isEditStatusDropdownOpen, setIsEditStatusDropdownOpen] = useState(false);
    const [focusedEditStatusIndex, setFocusedEditStatusIndex] = useState(-1);
    const [focusedEditCategoryIndex, setFocusedEditCategoryIndex] = useState(-1);
    const editStatusInputRef = useRef<HTMLDivElement>(null);
    const editCategoryInputRef = useRef<HTMLDivElement>(null);
    const editStatusDropdownRef = useRef<HTMLDivElement>(null);
    const editCategoryDropdownRef = useRef<HTMLDivElement>(null);
    const editModalRef = useRef<HTMLDivElement>(null);
    
    const predefinedStatuses = ['To Do', 'In Progress', 'Done'];
    const categoryOptions = ['To do', 'In Progress', 'Done'];
    const allStatuses = predefinedStatuses;
    
    const getStatusCategory = (status: string): string | null => {
      switch (status) {
        case 'To Do':
          return 'To do';
        case 'In Progress':
          return 'In Progress';
        case 'Done':
          return 'Done';
        default:
          return null;
      }
    };
    
    const getStatusColor = (status: string) => {
      const category = getStatusCategory(status);
      switch (category) {
        case 'To do':
          return { bg: 'rgb(221, 222, 225)', text: 'rgb(41, 42, 46)' };
        case 'In Progress':
          return { bg: 'rgb(143, 184, 246)', text: 'rgb(41, 42, 46)' };
        case 'Done':
          return { bg: 'rgb(179, 223, 114)', text: 'rgb(41, 42, 46)' };
        default:
          return { bg: 'rgb(221, 222, 225)', text: 'rgb(41, 42, 46)' };
      }
    };
    
    const getCategoryColor = (cat: string) => {
      switch (cat) {
        case 'To do':
          return 'rgb(230, 232, 235)';
        case 'In Progress':
          return 'rgb(200, 220, 250)';
        case 'Done':
          return 'rgb(210, 235, 180)';
        default:
          return 'rgb(230, 232, 235)';
      }
    };
    
    // Keyboard navigation handlers (simplified versions)
    useEffect(() => {
      if (!isEditStatusDropdownOpen) {
        setFocusedEditStatusIndex(-1);
        return;
      }
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isEditStatusDropdownOpen) return;
        const target = e.target as HTMLElement;
        const isOnStatusInput = target === editStatusInputRef.current || target.closest('[role="combobox"]') === editStatusInputRef.current;
        const isOnStatusDropdown = target.closest('[role="menu"][aria-label="Status options"]') === editStatusDropdownRef.current;
        
        if (!isOnStatusInput && !isOnStatusDropdown) return;
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setFocusedEditStatusIndex(prev => {
              const maxIndex = allStatuses.length - 1;
              if (prev === -1) return 0;
              return prev < maxIndex ? prev + 1 : 0;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setFocusedEditStatusIndex(prev => {
              const maxIndex = allStatuses.length - 1;
              if (prev === -1) return maxIndex;
              return prev > 0 ? prev - 1 : maxIndex;
            });
            break;
          case 'Enter':
            e.preventDefault();
            if (focusedEditStatusIndex >= 0 && focusedEditStatusIndex < allStatuses.length) {
              const status = allStatuses[focusedEditStatusIndex];
              setEditStatus(status);
              setEditName(status);
              const category = getStatusCategory(status);
              setEditCategory(category || 'To do');
              setIsEditStatusDropdownOpen(false);
              editStatusInputRef.current?.focus();
            }
            break;
          case 'Escape':
            e.preventDefault();
            setIsEditStatusDropdownOpen(false);
            editStatusInputRef.current?.focus();
            break;
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isEditStatusDropdownOpen, focusedEditStatusIndex, allStatuses]);
    
    useEffect(() => {
      if (!isEditCategoryDropdownOpen) {
        setFocusedEditCategoryIndex(-1);
        return;
      }
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isEditCategoryDropdownOpen) return;
        const target = e.target as HTMLElement;
        const isOnCategoryInput = target === editCategoryInputRef.current || target.closest('[role="combobox"]') === editCategoryInputRef.current;
        const isOnCategoryDropdown = target.closest('[role="menu"][aria-label="Category options"]') === editCategoryDropdownRef.current;
        
        if (!isOnCategoryInput && !isOnCategoryDropdown) return;
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setFocusedEditCategoryIndex(prev => {
              const maxIndex = categoryOptions.length - 1;
              if (prev === -1) return 0;
              return prev < maxIndex ? prev + 1 : 0;
            });
            break;
          case 'ArrowUp':
            e.preventDefault();
            setFocusedEditCategoryIndex(prev => {
              const maxIndex = categoryOptions.length - 1;
              if (prev === -1) return maxIndex;
              return prev > 0 ? prev - 1 : maxIndex;
            });
            break;
          case 'Enter':
            e.preventDefault();
            if (focusedEditCategoryIndex >= 0 && focusedEditCategoryIndex < categoryOptions.length) {
              setEditCategory(categoryOptions[focusedEditCategoryIndex]);
              setIsEditCategoryDropdownOpen(false);
              editCategoryInputRef.current?.focus();
            }
            break;
          case 'Escape':
            e.preventDefault();
            setIsEditCategoryDropdownOpen(false);
            editCategoryInputRef.current?.focus();
            break;
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isEditCategoryDropdownOpen, focusedEditCategoryIndex, categoryOptions]);
    
    return (
      <div style={{ minHeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        {isEditModalOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsEditModalOpen(false)} />
            <div 
              ref={editModalRef}
              className="relative w-80 rounded-md border border-gray-200 bg-white shadow-xl z-30"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  const allElements = editModalRef.current?.querySelectorAll(
                    'input, button, [tabindex]:not([tabindex="-1"])'
                  ) as NodeListOf<HTMLElement>;
                  if (!allElements || allElements.length === 0) return;
                  
                  const focusableElements = Array.from(allElements).filter(el => {
                    if (el.tagName === 'BUTTON' && el.hasAttribute('disabled')) {
                      return false;
                    }
                    if (el.offsetParent === null) {
                      return false;
                    }
                    return true;
                  }) as HTMLElement[];
                  
                  if (focusableElements.length === 0) return;
                  
                  const firstElement = focusableElements[0];
                  const lastElement = focusableElements[focusableElements.length - 1];
                  
                  if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                      e.preventDefault();
                      lastElement.focus();
                    }
                  } else {
                    if (document.activeElement === lastElement) {
                      e.preventDefault();
                      firstElement.focus();
                    }
                  }
                }
              }}
            >
              <div className="p-4">
                <h2 className="text-base font-semibold text-gray-900 mb-2">Edit status</h2>
                <p className="text-xs text-gray-600 mb-4">
                  Required fields are marked with an asterisk
                  <span style={{ color: 'rgb(174, 46, 36)', fontSize: '6px', fontWeight: 700, marginLeft: '2px', verticalAlign: 'super', marginTop: '-2px' }}>✱</span>
                </p>

                <div className="space-y-3">
                  {/* Status, Name, and Category fields - Same structure as in WithDropdownMenu but simplified */}
                  {/* Status Field */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Status
                      <span style={{ color: 'rgb(174, 46, 36)', fontSize: '6px', fontWeight: 700, marginLeft: '2px', verticalAlign: 'super', marginTop: '-2px' }}>✱</span>
                    </label>
                    <div className="relative">
                      {isEditStatusDropdownOpen && (
                        <div className="fixed inset-0 z-30" onClick={() => setIsEditStatusDropdownOpen(false)} />
                      )}
                      <div
                        ref={editStatusInputRef}
                        tabIndex={0}
                        role="combobox"
                        aria-expanded={isEditStatusDropdownOpen}
                        aria-haspopup="listbox"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditStatusDropdownOpen(!isEditStatusDropdownOpen);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setIsEditStatusDropdownOpen(!isEditStatusDropdownOpen);
                          }
                        }}
                        className="w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                        style={{
                          alignItems: 'center',
                          backgroundColor: 'rgb(255, 255, 255)',
                          borderColor: isEditStatusDropdownOpen ? 'rgb(0, 82, 204)' : 'rgb(140, 143, 151)',
                          borderStyle: 'solid',
                          borderWidth: '0.909091px',
                          borderRadius: '3px',
                          display: 'flex',
                          fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                          fontSize: '14px',
                          fontWeight: 400,
                          height: '32px',
                          justifyContent: 'space-between',
                          paddingLeft: '8px',
                          paddingRight: '8px',
                        }}
                      >
                        {editStatus ? (
                          <span className="inline-flex items-center rounded-sm" style={{ backgroundColor: getStatusColor(editStatus).bg, color: getStatusColor(editStatus).text, height: '16px', borderRadius: '3px', paddingLeft: '4px', paddingRight: '4px', fontSize: '11px', fontWeight: 500 }}>
                            {editStatus.toUpperCase()}
                          </span>
                        ) : (
                          <span style={{ color: 'rgb(140, 143, 151)' }}>Select status</span>
                        )}
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </div>

                      {isEditStatusDropdownOpen && (
                        <div ref={editStatusDropdownRef} role="menu" aria-label="Status options" className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50" onClick={(e) => e.stopPropagation()}>
                          {allStatuses.map((status, index) => {
                            const colors = getStatusColor(status);
                            const isFocused = index === focusedEditStatusIndex;
                            return (
                              <div
                                key={status}
                                role="menuitem"
                                tabIndex={0}
                                aria-label={`Select status ${status}`}
                                aria-selected={editStatus === status}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditStatus(status);
                                  setEditName(status);
                                  const category = getStatusCategory(status);
                                  setEditCategory(category || 'To do');
                                  setIsEditStatusDropdownOpen(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setEditStatus(status);
                                    setEditName(status);
                                    const category = getStatusCategory(status);
                                    setEditCategory(category || 'To do');
                                    setIsEditStatusDropdownOpen(false);
                                  }
                                }}
                                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer ${isFocused ? 'bg-blue-50' : ''}`}
                              >
                                <span className="inline-flex items-center rounded-sm" style={{ backgroundColor: colors.bg, color: colors.text, height: '16px', borderRadius: '3px', paddingLeft: '4px', paddingRight: '4px', fontSize: '11px', fontWeight: 500 }}>
                                  {status.toUpperCase()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name Field */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Name
                      <span style={{ color: 'rgb(174, 46, 36)', fontSize: '6px', fontWeight: 700, marginLeft: '2px', verticalAlign: 'super', marginTop: '-2px' }}>✱</span>
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full"
                      style={{
                        backgroundColor: 'rgb(255, 255, 255)',
                        borderColor: 'rgb(140, 143, 151)',
                        borderStyle: 'solid',
                        borderWidth: '0.909091px',
                        borderRadius: '3px',
                        fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                        fontSize: '14px',
                        fontWeight: 400,
                        height: '32px',
                        paddingLeft: '8px',
                        paddingRight: '8px',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Category Field */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Category
                      <span style={{ color: 'rgb(174, 46, 36)', fontSize: '6px', fontWeight: 700, marginLeft: '2px', verticalAlign: 'super', marginTop: '-2px' }}>✱</span>
                    </label>
                    <div className="relative">
                      {isEditCategoryDropdownOpen && (
                        <div className="fixed inset-0 z-30" onClick={() => setIsEditCategoryDropdownOpen(false)} />
                      )}
                      <div
                        ref={editCategoryInputRef}
                        tabIndex={0}
                        role="combobox"
                        aria-expanded={isEditCategoryDropdownOpen}
                        aria-haspopup="listbox"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditCategoryDropdownOpen(!isEditCategoryDropdownOpen);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setIsEditCategoryDropdownOpen(!isEditCategoryDropdownOpen);
                          }
                        }}
                        className="w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                        style={{
                          alignItems: 'center',
                          backgroundColor: 'rgb(255, 255, 255)',
                          borderColor: isEditCategoryDropdownOpen ? 'rgb(0, 82, 204)' : 'rgb(140, 143, 151)',
                          borderStyle: 'solid',
                          borderWidth: '0.909091px',
                          borderRadius: '3px',
                          display: 'flex',
                          fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                          fontSize: '14px',
                          fontWeight: 400,
                          height: '32px',
                          justifyContent: 'space-between',
                          paddingLeft: '8px',
                          paddingRight: '8px',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div style={{ width: '16px', height: '16px', backgroundColor: getCategoryColor(editCategory), border: '1px solid rgb(200, 200, 200)', borderRadius: '2px', flexShrink: 0 }} />
                          <span>{editCategory}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </div>

                      {isEditCategoryDropdownOpen && (
                        <div ref={editCategoryDropdownRef} role="menu" aria-label="Category options" className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50" onClick={(e) => e.stopPropagation()}>
                          {categoryOptions.map((option, index) => {
                            const isFocused = index === focusedEditCategoryIndex;
                            return (
                              <div
                                key={option}
                                role="menuitem"
                                tabIndex={0}
                                aria-label={`Select category ${option}`}
                                aria-selected={editCategory === option}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditCategory(option);
                                  setIsEditCategoryDropdownOpen(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setEditCategory(option);
                                    setIsEditCategoryDropdownOpen(false);
                                  }
                                }}
                                className="flex items-center gap-2 cursor-pointer"
                                style={{
                                  backgroundColor: isFocused ? (editCategory === option ? 'rgb(222, 235, 255)' : 'rgb(242, 243, 245)') : (editCategory === option ? 'rgb(222, 235, 255)' : 'rgb(255, 255, 255)'),
                                  padding: '6px 12px',
                                  height: '32px',
                                  fontFamily: '"Atlassian Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                                  fontSize: '14px',
                                  fontWeight: 400,
                                  lineHeight: '20px',
                                  color: '#172B4D',
                                }}
                              >
                                <div style={{ width: '16px', height: '16px', backgroundColor: getCategoryColor(option), border: '1px solid rgb(200, 200, 200)', borderRadius: '2px', flexShrink: 0 }} />
                                <span>{option}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditModalOpen(false);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!editStatus || !editName.trim()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (editStatus && editName.trim()) {
                        setIsEditModalOpen(false);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded-md"
                    style={{
                      backgroundColor: (editStatus && editName.trim()) ? '#2563eb' : '#9ca3af',
                      cursor: (editStatus && editName.trim()) ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  },
};
