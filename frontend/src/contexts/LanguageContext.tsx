import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation data for sidebar and user dropdown
const translations = {
  en: {
    // Sidebar translations
    'sidebar.navigation': 'Navigation',
    'sidebar.home': 'Home',
    'sidebar.projects': 'Projects',
    'sidebar.all_projects': 'All Projects',
    'sidebar.active_projects': 'Active Projects',
    'sidebar.completed': 'Completed',
    'sidebar.campaigns': 'Campaigns',
    'sidebar.reports': 'Reports',
    'sidebar.messages': 'Messages',
    'sidebar.calendar': 'Calendar',
    'sidebar.administration': 'Administration',
    'sidebar.user_management': 'User Management',
    'sidebar.permissions': 'Permissions',
    'sidebar.system_settings': 'System Settings',
    'sidebar.notifications': 'Notifications',
    'sidebar.settings': 'Settings',
    'sidebar.dashboard_overview': 'Dashboard and overview',
    'sidebar.manage_projects': 'Manage your projects',
    'sidebar.campaign_management': 'Campaign management',
    'sidebar.analytics_reports': 'Analytics and reports',
    'sidebar.team_communication': 'Team communication',
    'sidebar.schedule_events': 'Schedule and events',
    'sidebar.system_administration': 'System administration',
    'sidebar.user_preferences': 'User preferences',
    
    // User dropdown translations
    'user.profile': 'Profile',
    'user.settings': 'Settings',
    'user.help_support': 'Help & Support',
    'user.sign_out': 'Sign Out',
    'user.language': 'Language',
    'user.switch_to_chinese': 'Switch to Chinese',
    'user.switch_to_english': 'Switch to English',
    
    // Footer translations
    'footer.version': 'MediaJira v2.0',
    'footer.copyright': '© 2024 Your Company',
  },
  zh: {
    // Sidebar translations
    'sidebar.navigation': '导航',
    'sidebar.home': '首页',
    'sidebar.projects': '项目',
    'sidebar.all_projects': '所有项目',
    'sidebar.active_projects': '进行中项目',
    'sidebar.completed': '已完成',
    'sidebar.campaigns': '活动',
    'sidebar.reports': '报告',
    'sidebar.messages': '消息',
    'sidebar.calendar': '日历',
    'sidebar.administration': '管理',
    'sidebar.user_management': '用户管理',
    'sidebar.permissions': '权限',
    'sidebar.system_settings': '系统设置',
    'sidebar.notifications': '通知',
    'sidebar.settings': '设置',
    'sidebar.dashboard_overview': '仪表板和概览',
    'sidebar.manage_projects': '管理您的项目',
    'sidebar.campaign_management': '活动管理',
    'sidebar.analytics_reports': '分析和报告',
    'sidebar.team_communication': '团队沟通',
    'sidebar.schedule_events': '日程和事件',
    'sidebar.system_administration': '系统管理',
    'sidebar.user_preferences': '用户偏好',
    
    // User dropdown translations
    'user.profile': '个人资料',
    'user.settings': '设置',
    'user.help_support': '帮助与支持',
    'user.sign_out': '退出登录',
    'user.language': '语言',
    'user.switch_to_chinese': '切换到中文',
    'user.switch_to_english': '切换到英文',
    
    // Footer translations
    'footer.version': 'MediaJira v2.0',
    'footer.copyright': '© 2024 您的公司',
  },
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language preference to localStorage when it changes
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  // Translation function
  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const value: LanguageContextType = {
    language,
    setLanguage: handleLanguageChange,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
