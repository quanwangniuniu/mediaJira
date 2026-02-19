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
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');

  const layoutUser = user
    ? {
        name: user.username || 'User',
        email: user.email || '',
        roles: user.roles || [],
        first_name: (user as any).first_name || '',
        last_name: (user as any).last_name || '',
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

  const transformUserForProfileHeader = () => {
    if (!user) {
      return {
        username: undefined,
        email: undefined,
        avatar: undefined,
        first_name: undefined,
        last_name: undefined,
      };
    }
    return {
      username: user.username,
      email: user.email,
      avatar: (user as any).avatar,
      first_name: (user as any).first_name,
      last_name: (user as any).last_name,
    };
  };

  const transformUserForComponents = () => {
    if (!user) {
      return {
        username: undefined,
        email: undefined,
        first_name: undefined,
        last_name: undefined,
        organization: null,
      };
    }
    return {
      username: user.username,
      email: user.email,
      first_name: (user as any).first_name,
      last_name: (user as any).last_name,
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
      } : null,
    };
  };

  const renderContent = () => {
    const transformedUser = transformUserForComponents();
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent user={transformedUser} />;
      case 'organization':
        return <OrganizationContent user={{ ...transformedUser, roles: user?.roles || [] }} />;
      case 'subscription':
        return (
          <div className="bg-white rounded-lg">
            <PlansSection showHeader={false} />
          </div>
        );
      default:
        return <DashboardContent user={transformedUser} />;
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
                   <ProfileHeader user={transformUserForProfileHeader()} onEditClick={handleEditProfile} />
                   
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
