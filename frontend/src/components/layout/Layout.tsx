// src/components/layout/Layout.tsx
import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useRouter } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  sidebarCollapsed?: boolean;
  showHeader?: boolean;
  showSidebar?: boolean;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  onUserAction?: (action: 'profile' | 'settings' | 'logout') => void;
  onSearch?: (query: string) => void;
  onNotificationClick?: (id: string) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  className = '',
  sidebarCollapsed = false,
  showHeader = true,
  showSidebar = true,
  user = {
    name: 'Admin',
    email: 'admin@company.com',
    role: 'admin',
  },
  onUserAction,
  onSearch,
  onNotificationClick,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(sidebarCollapsed);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // 在移动设备上默认折叠侧边栏
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 处理侧边栏折叠状态变化
  const handleSidebarCollapseChange = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  };

  // 处理用户操作
  const handleUserAction = (action: 'profile' | 'settings' | 'logout') => {
    switch (action) {
      case 'profile':
        console.log('Navigate to profile page');
        // 例如：router.push('/profile');
        break;
      case 'settings':
        router.push('/profile/settings');
        break;
      case 'logout':
        // 由外部 onUserAction 处理
        break;
    }
    onUserAction?.(action);
  };

  // 处理搜索
  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    // TODO: 在实际项目中实现搜索功能
    onSearch?.(query);
  };

  // 处理通知点击
  const handleNotificationClick = (id: string) => {
    console.log('Notification clicked:', id);
    // TODO: 在实际项目中实现通知处理
    onNotificationClick?.(id);
  };

  return (
    <div className={`h-screen flex flex-col bg-gray-100 ${className}`}>
      {/* 顶部导航栏 */}
      {showHeader && (
        <Header
          user={user}
          onUserMenuClick={handleUserAction}
          onSearchChange={handleSearch}
          onNotificationClick={handleNotificationClick}
        />
      )}

      {/* 主要内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        {showSidebar && (
          <Sidebar
            defaultCollapsed={isSidebarCollapsed}
            onCollapseChange={handleSidebarCollapseChange}
            userRole={user.role}
          />
        )}

        {/* 主内容区域 */}
        <main className={`
          flex-1 overflow-auto bg-gray-50 
          ${isMobile && !isSidebarCollapsed ? 'hidden' : 'block'}
          transition-all duration-300 ease-in-out
        `}>
          {children}
        </main>
      </div>

      {/* 移动端遮罩层 */}
      {isMobile && !isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}
    </div>
  );
};

export default Layout;
