'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, User, CheckCircle, BarChart3, Clock, Loader2 } from 'lucide-react';
import useStripe from '@/hooks/useStripe';

interface DashboardContentProps {
  user: {
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    organization?: {
      id: number;
      name: string;
    } | null;
  };
}

export default function DashboardContent({ user }: DashboardContentProps) {
  const { getSubscription, getUsage, getSubscriptionLoading, getUsageLoading } = useStripe();
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (user?.organization?.id) {
        setIsLoading(true);
        try {
          const [subscriptionData, usageData] = await Promise.all([
            getSubscription(),
            getUsage()
          ]);
          setSubscription(subscriptionData);
          setUsage(usageData);
        } catch (error) {
          console.error('Failed to fetch dashboard data:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Clear data when no organization
        setSubscription(null);
        setUsage(null);
      }
    };

    fetchData();
  }, [user?.organization?.id]); // Only depend on organization ID

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold">Dashboard</div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-gray-800">Account</div>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Name</span>
              <span className="text-sm text-gray-800">{user?.first_name} {user?.last_name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Email</span>
              <span className="text-sm text-gray-800">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-600">Username</span>
              <span className="text-sm text-gray-800">{user?.username}</span>
            </div>
          </div>
        </div>

        <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-green-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-gray-800">Subscription</div>
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          </div>
          {user?.organization ? (
            isLoading ? (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading subscription...</p>
              </div>
            ) : subscription ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Plan</span>
                  <span className="text-sm font-semibold text-green-600">{subscription.plan.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Status</span>
                  <span className={`text-sm font-medium ${subscription.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {subscription.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">Next Billing</span>
                  <span className="text-sm text-gray-800">
                    {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-2">No Subscription</p>
                <p className="text-xs text-gray-400">You don't have an active subscription yet.</p>
              </div>
            )
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-2">Organization Required</p>
              <p className="text-xs text-gray-400">You haven't joined any organization, so subscription information is not available.</p>
            </div>
          )}
        </div>

        <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-gray-800">Usage</div>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
          </div>
          {user?.organization ? (
            isLoading ? (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading usage...</p>
              </div>
            ) : usage ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Previews</span>
                  <span className="text-sm text-gray-800">
                    {usage.previews_used} / {subscription?.plan?.max_previews_per_day || 'Unlimited'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Tasks</span>
                  <span className="text-sm text-gray-800">
                    {usage.tasks_used} / {subscription?.plan?.max_tasks_per_day || 'Unlimited'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">Team Members</span>
                  <span className="text-sm text-gray-800">
                    1 / {subscription?.plan?.max_team_members || 'Unlimited'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-2">No Usage Data</p>
                <p className="text-xs text-gray-400">No usage records found for today.</p>
              </div>
            )
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-2">Organization Required</p>
              <p className="text-xs text-gray-400">You haven't joined any organization, so usage tracking is not available.</p>
            </div>
          )}
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold text-gray-800">Recent Activity</div>
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No recent activity to display</p>
        </div>
      </div>
    </div>
  );
}
