'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import ProfileHeader from '@/components/stripe_meta/ProfileHeader';
import DashboardContent from '@/components/stripe_meta/DashboardContent';
import OrganizationContent from '@/components/stripe_meta/OrganizationContent';
import PlansSection from '@/components/plans/PlansSection';

function ProfilePageContent() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Refresh user data when profile page loads to ensure avatar and latest info is displayed
  useEffect(() => {
    const loadUserData = async () => {
      await refreshUser();
    };
    
    // Only refresh if we have a user (authenticated)
    if (user) {
      loadUserData();
    }
  }, []); // Run once on mount

  const layoutUser = user
    ? {
        name: user.username || 'User',
        email: user.email || '',
        roles: user.roles || [],
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

  const handleProfileUpdate = async () => {
    // Refresh user data after profile update
    await refreshUser();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent user={user} />;
      case 'organization':
        return <OrganizationContent user={user} />;
      case 'subscription':
        return (
          <div className="bg-white rounded-lg">
            <PlansSection showHeader={false} />
          </div>
        );
      default:
        return <DashboardContent user={user} />;
    }
  };

  return (
    <Layout user={layoutUser} onUserAction={handleUserAction}>
      <div className="p-6">
        <div className="space-y-4 profile-header"></div>
         <div className="profile-content bg-[url('/bg-gradient.svg')] bg-cover bg-center bg-no-repeat rounded-lg">
            <div className="profile-content-wrapper pt-12">
                 <div className="profile-content-inner p-6 bg-white rounded-lg shadow-xl border border-gray-200">
                   {/* Header */}
                   {user && <ProfileHeader user={user} onProfileUpdate={handleProfileUpdate} />}
                   
                   {/* Content */}
                   <div className="mt-6">
                     {/* Horizontal nav bar */}
                     <div className="border-b border-gray-200 mb-4">
                       <nav className="-mb-px flex gap-6">
                         {[
                           { id: 'dashboard', label: 'Dashboard' },
                           { id: 'organization', label: 'My Organization' },
                           { id: 'subscription', label: 'Subscription' },
                         ].map((tab) => (
                           <button
                             key={tab.id}
                             type="button"
                             onClick={() => setActiveTab(tab.id)}
                             className={`pb-3 text-sm font-medium border-b-2 ${
                               activeTab === tab.id
                                 ? 'border-blue-500 text-blue-600'
                                 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                             }`}
                           >
                             {tab.label}
                           </button>
                         ))}
                       </nav>
                     </div>
                     {renderContent()}
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
