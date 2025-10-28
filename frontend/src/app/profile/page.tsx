'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import ProfileHeader from '@/components/stripe_meta/ProfileHeader';
import Sidebar from '@/components/stripe_meta/Sidebar';
import DashboardContent from '@/components/stripe_meta/DashboardContent';
import OrganizationContent from '@/components/stripe_meta/OrganizationContent';

function ProfilePageContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');

  const layoutUser = user
    ? {
        name: user.username || 'User',
        email: user.email || '',
        role: user.role || 'user',
        avatar: user.avatar || undefined,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
      }
    : undefined;

  const handleUserAction = async (action: string) => {
    if (action === 'settings') {
      router.push('/profile/settings');
    } else if (action === 'logout') {
      await logout();
    }
  };

  const handleEditProfile = () => {
    router.push('/profile/settings');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent user={user} />;
      case 'organization':
        return <OrganizationContent user={user} />;
      default:
        return <DashboardContent user={user} />;
    }
  };

  return (
    <Layout user={layoutUser} onUserAction={handleUserAction}>
      <div className="p-6">
        <div className="space-y-4 profile-header">
        </div>
         <div className="profile-content bg-[url('/bg-gradient.svg')] bg-cover bg-center bg-no-repeat rounded-lg">
            <div className="profile-content-wrapper pt-12">
                 <div className="profile-content-inner p-6 bg-white rounded-lg shadow-xl border border-gray-200">
                   {/* Header */}
                   <ProfileHeader user={user} onEditClick={handleEditProfile} />
                   
                   {/* Content */}
                   <div className="flex gap-6 mt-6">
                     {/* Sidebar */}
                     <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
                     
                     {/* Detail Content */}
                     <div className="flex-1">
                       {renderContent()}
                     </div>
                   </div>
                 </div>
            </div>
        </div>
      </div>
    </Layout>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageContent />
    </ProtectedRoute>
  );
}
