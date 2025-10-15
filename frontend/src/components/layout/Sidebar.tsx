// src/components/layout/Sidebar.tsx
import React, { useState, useEffect } from 'react';
// TODO: In actual projects, uncomment the imports below
// import Link from 'next/link';
// For Next.js 13+ App Router, also import:
// import { usePathname } from 'next/navigation';
// For Next.js 12 Pages Router, also import:
// import { useRouter } from 'next/router';

import { 
  Home, 
  FolderOpen, 
  Shield, 
  MessageSquare, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  BarChart3,
  FileText,
  Calendar,
  Bell,
  ListTodo,
  Facebook,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// TODO: In actual projects, delete this temporary hook and replace with real routing
const useCurrentPath = () => {
  const [pathname, setPathname] = useState('/admin/permissions');
  
  useEffect(() => {
    // TODO: In actual projects, replace with one of the following:
    
    // Option 1: Next.js 13+ App Router
    // const pathname = usePathname();
    // setPathname(pathname);
    
    // Option 2: Next.js 12 Pages Router
    // const router = useRouter();
    // setPathname(router.pathname);
    
    // Option 3: React Router
    // const location = useLocation();
    // setPathname(location.pathname);
    
    // Now we hardcode the current path for demo purposes
    setPathname('/admin/permissions');
  }, []);
  
  return pathname;
};

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  description?: string;
  children?: NavigationItem[];
}

interface SidebarProps {
  className?: string;
  defaultCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  userRole?: string;
}

// Navigation configuration - can be dynamically adjusted based on user role
const getNavigationItems = (userRole?: string, t?: (key: string) => string): NavigationItem[] => {
  const baseItems: NavigationItem[] = [
    {
      name: t ? t('sidebar.home') : 'Home',
      href: '/',
      icon: Home,
      description: t ? t('sidebar.dashboard_overview') : 'Dashboard and overview',
    },
    {
      name: t ? t('sidebar.team') : 'Teams',
      href: '/teams',
      icon: Users,
      description: t ? t('sidebar.manage_team') : 'Manage your team',
    },
    {
      name: t ? t('sidebar.projects') : 'Projects',
      href: '/projects',
      icon: FolderOpen,
      description: t ? t('sidebar.manage_projects') : 'Manage your projects',
      children: [
        { name: t ? t('sidebar.all_projects') : 'All Projects', href: '/projects', icon: FolderOpen },
        { name: t ? t('sidebar.active_projects') : 'Active Projects', href: '/projects/active', icon: FolderOpen },
        { name: t ? t('sidebar.completed') : 'Completed', href: '/projects/completed', icon: FolderOpen },
      ],
    },
    {
      name: t ? t('sidebar.campaigns') : 'Campaigns',
      href: '/campaigns',
      icon: BarChart3,
      description: t ? t('sidebar.campaign_management') : 'Campaign management',
    },
    {
      name: t ? t('sidebar.tasks') : 'Tasks',
      href: '/tasks',
      icon: ListTodo,
      description: t ? t('sidebar.task_management') : 'Manage tasks and reviews',
    },
    {
      name: t ? t('sidebar.facebook_meta') : 'Facebook Meta',
      href: '/facebook_meta',
      icon: Facebook,
      description: t ? t('sidebar.facebook_meta_ad_creative_management') : 'Facebook meta Ad Creative management',
    },
    {
      name: t ? t('sidebar.reports') : 'Reports',
      href: '/reports',
      icon: FileText,
      description: t ? t('sidebar.analytics_reports') : 'Analytics and reports',
    },
    {
      name: t ? t('sidebar.messages') : 'Messages',
      href: '/messages',
      icon: MessageSquare,
      badge: 3,
      description: t ? t('sidebar.team_communication') : 'Team communication',
    },
    {
      name: t ? t('sidebar.calendar') : 'Calendar',
      href: '/calendar',
      icon: Calendar,
      description: t ? t('sidebar.schedule_events') : 'Schedule and events',
    },
  ];

  // Add administration features based on user role
  if (userRole === 'admin' || userRole === 'super_admin') {
    baseItems.push({
      name: t ? t('sidebar.administration') : 'Administration',
      href: '/admin',
      icon: Shield,
      description: t ? t('sidebar.system_administration') : 'System administration',
      children: [
        { name: t ? t('sidebar.user_management') : 'User Management', href: '/admin/users', icon: Users },
        { name: t ? t('sidebar.permissions') : 'Permissions', href: '/admin/permissions', icon: Shield },
        { name: t ? t('sidebar.system_settings') : 'System Settings', href: '/admin/settings', icon: Settings },
        { name: t ? t('sidebar.notifications') : 'Notifications', href: '/admin/notifications', icon: Bell },
      ],
    });
  }

  baseItems.push({
    name: t ? t('sidebar.settings') : 'Settings',
    href: '/settings',
    icon: Settings,
    description: t ? t('sidebar.user_preferences') : 'User preferences',
  });

  return baseItems;
};

const Sidebar: React.FC<SidebarProps> = ({
  className = '',
  defaultCollapsed = false,
  onCollapseChange,
  userRole = 'user',
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { t } = useLanguage();
  
  // TODO: In actual projects, replace with one of the following:
  // const pathname = usePathname(); // Next.js 13+ App Router
  // const router = useRouter(); const pathname = router.pathname; // Next.js 12 Pages Router
  const pathname = useCurrentPath(); // Temporary demo use
  
  const navigationItems = getNavigationItems(userRole, t);

  // Handle collapse state changes
  const handleCollapseToggle = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
    
    // Clear expanded state when collapsing
    if (newCollapsed) {
      setExpandedItems([]);
    }
  };

  // Handle submenu expand/collapse
  const handleItemToggle = (itemName: string) => {
    if (collapsed) return;
    
    setExpandedItems(prev => 
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  // Check if path matches
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // Check if there are active child items
  const hasActiveChild = (children?: NavigationItem[]) => {
    if (!children) return false;
    return children.some(child => isActive(child.href));
  };

  // Auto-expand menus containing active items
  useEffect(() => {
    if (collapsed) return;
    
    navigationItems.forEach(item => {
      if (item.children && hasActiveChild(item.children)) {
        setExpandedItems(prev => 
          prev.includes(item.name) ? prev : [...prev, item.name]
        );
      }
    });
  }, [pathname, collapsed, navigationItems]);

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`
      flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
      ${collapsed ? 'w-16' : 'w-64'}
      ${className}
    `}>
      {/* Collapse button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded"></div>
            </div>
            <span className="text-sm font-medium text-gray-700">{t('sidebar.navigation')}</span>
          </div>
        )}
        
        <button
          onClick={handleCollapseToggle}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isItemActive = isActive(item.href);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.name);
          const hasActiveChildItem = hasActiveChild(item.children);

          return (
            <div key={item.name}>
              {/* Main menu item */}
              <div className="relative">
                {hasChildren ? (
                  <button
                    onClick={() => handleItemToggle(item.name)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                      ${(isItemActive || hasActiveChildItem)
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                      ${collapsed ? 'justify-center' : 'justify-between'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span>{item.name}</span>
                          {item.badge && (
                            <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {!collapsed && hasChildren && (
                      <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${
                        isExpanded ? 'rotate-90' : ''
                      }`} />
                    )}
                  </button>
                ) : (
                  // TODO: In actual projects, replace with Next.js Link component
                  // <Link href={item.href} className={...}>
                  <a
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                      ${isItemActive
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </a>
                  // </Link>
                )}

                {/* Tooltip (only shown when collapsed) */}
                {collapsed && (
                  <div className="absolute left-full top-0 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    {item.name}
                    {item.description && (
                      <div className="text-gray-300 text-xs mt-1">{item.description}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Submenu */}
              {hasChildren && isExpanded && !collapsed && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = isActive(child.href);

                    return (
                      // TODO: In actual projects, replace with Next.js Link component
                      // <Link key={child.href} href={child.href} className={...}>
                      <a
                        key={child.href}
                        href={child.href}
                        className={`
                          flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200
                          ${isChildActive
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                      >
                        <ChildIcon className="h-4 w-4" />
                        <span>{child.name}</span>
                      </a>
                      // </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer information */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div className="font-medium">{t('footer.version')}</div>
            <div>{t('footer.copyright')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

/* 
=== Actual Project Migration Guide ===

1. Import Next.js components:
   Uncomment at the top of the file:
   // import Link from 'next/link';
   
   And add based on your Next.js version:
   - Next.js 13+ App Router: import { usePathname } from 'next/navigation';
   - Next.js 12 Pages Router: import { useRouter } from 'next/router';

2. Replace path getting logic:
   Delete the useCurrentPath() function and replace in the Sidebar component:
   
   const pathname = useCurrentPath(); // Delete this line
   
   Replace with:
   - App Router: const pathname = usePathname();
   - Pages Router: const router = useRouter(); const pathname = router.pathname;

3. Replace link components:
   Replace all <a href={...}> with <Link href={...}>
   
   Example:
   <a href={item.href} className={...}>
   Replace with:
   <Link href={item.href} className={...}>

4. Test routing functionality:
   Ensure all menu items can navigate and highlight correctly

5. Optional: Custom routing logic
   If you use other routing libraries (like React Router), adjust the path getting logic accordingly.
*/