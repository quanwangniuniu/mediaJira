// src/components/layout/Sidebar.tsx
import React, { useState, useEffect } from 'react';
// TODO: 在实际项目中取消注释下面的导入
// import Link from 'next/link';
// 对于 Next.js 13+ App Router，还需要导入：
// import { usePathname } from 'next/navigation';
// 对于 Next.js 12 Pages Router，还需要导入：
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
  Bell
} from 'lucide-react';

// TODO: 在实际项目中删除这个临时 hook，替换为真实的路由
const useCurrentPath = () => {
  const [pathname, setPathname] = useState('/admin/permissions');
  
  useEffect(() => {
    // TODO: 在实际项目中替换为以下之一：
    
    // 方案1: Next.js 13+ App Router
    // const pathname = usePathname();
    // setPathname(pathname);
    
    // 方案2: Next.js 12 Pages Router
    // const router = useRouter();
    // setPathname(router.pathname);
    
    // 方案3: React Router
    // const location = useLocation();
    // setPathname(location.pathname);
    
    // 现在我们硬编码当前路径为演示
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

// 导航配置 - 可以根据用户角色动态调整
const getNavigationItems = (userRole?: string): NavigationItem[] => {
  const baseItems: NavigationItem[] = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
      description: 'Dashboard and overview',
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: FolderOpen,
      description: 'Manage your projects',
      children: [
        { name: 'All Projects', href: '/projects', icon: FolderOpen },
        { name: 'Active Projects', href: '/projects/active', icon: FolderOpen },
        { name: 'Completed', href: '/projects/completed', icon: FolderOpen },
      ],
    },
    {
      name: 'Campaigns',
      href: '/campaigns',
      icon: BarChart3,
      description: 'Campaign management',
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: FileText,
      description: 'Analytics and reports',
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: MessageSquare,
      badge: 3,
      description: 'Team communication',
    },
    {
      name: 'Calendar',
      href: '/calendar',
      icon: Calendar,
      description: 'Schedule and events',
    },
  ];

  // 根据用户角色添加管理功能
  if (userRole === 'admin' || userRole === 'super_admin') {
    baseItems.push({
      name: 'Administration',
      href: '/admin',
      icon: Shield,
      description: 'System administration',
      children: [
        { name: 'User Management', href: '/admin/users', icon: Users },
        { name: 'Permissions', href: '/admin/permissions', icon: Shield },
        { name: 'System Settings', href: '/admin/settings', icon: Settings },
        { name: 'Notifications', href: '/admin/notifications', icon: Bell },
      ],
    });
  }

  baseItems.push({
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'User preferences',
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
  
  // TODO: 在实际项目中替换为以下之一：
  // const pathname = usePathname(); // Next.js 13+ App Router
  // const router = useRouter(); const pathname = router.pathname; // Next.js 12 Pages Router
  const pathname = useCurrentPath(); // 临时演示用
  
  const navigationItems = getNavigationItems(userRole);

  // 处理折叠状态变化
  const handleCollapseToggle = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
    
    // 折叠时清除展开状态
    if (newCollapsed) {
      setExpandedItems([]);
    }
  };

  // 处理子菜单展开/折叠
  const handleItemToggle = (itemName: string) => {
    if (collapsed) return;
    
    setExpandedItems(prev => 
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  // 检查路径是否匹配
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // 检查是否有活跃的子项
  const hasActiveChild = (children?: NavigationItem[]) => {
    if (!children) return false;
    return children.some(child => isActive(child.href));
  };

  // 自动展开包含活跃项的菜单
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

  // 响应式处理
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
      {/* 折叠按钮 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded"></div>
            </div>
            <span className="text-sm font-medium text-gray-700">Navigation</span>
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

      {/* 导航菜单 */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isItemActive = isActive(item.href);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.name);
          const hasActiveChildItem = hasActiveChild(item.children);

          return (
            <div key={item.name}>
              {/* 主菜单项 */}
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
                  // TODO: 在实际项目中替换为 Next.js Link 组件
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

                {/* 工具提示 (仅在折叠时显示) */}
                {collapsed && (
                  <div className="absolute left-full top-0 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    {item.name}
                    {item.description && (
                      <div className="text-gray-300 text-xs mt-1">{item.description}</div>
                    )}
                  </div>
                )}
              </div>

              {/* 子菜单 */}
              {hasChildren && isExpanded && !collapsed && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = isActive(child.href);

                    return (
                      // TODO: 在实际项目中替换为 Next.js Link 组件
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

      {/* 底部信息 */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div className="font-medium">MediaJira v2.0</div>
            <div>© 2024 Your Company</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

/* 
=== 实际项目迁移指南 ===

1. 导入 Next.js 组件：
   取消注释文件顶部的：
   // import Link from 'next/link';
   
   并根据你的 Next.js 版本添加：
   - Next.js 13+ App Router: import { usePathname } from 'next/navigation';
   - Next.js 12 Pages Router: import { useRouter } from 'next/router';

2. 替换路径获取逻辑：
   删除 useCurrentPath() 函数，在 Sidebar 组件中替换：
   
   const pathname = useCurrentPath(); // 删除这行
   
   替换为：
   - App Router: const pathname = usePathname();
   - Pages Router: const router = useRouter(); const pathname = router.pathname;

3. 替换链接组件：
   将所有的 <a href={...}> 替换为 <Link href={...}>
   
   示例：
   <a href={item.href} className={...}>
   替换为：
   <Link href={item.href} className={...}>

4. 测试路由功能：
   确保所有菜单项都能正确导航和高亮显示

5. 可选：自定义路由逻辑
   如果你使用其他路由库（如 React Router），可以相应地调整路径获取逻辑。
*/