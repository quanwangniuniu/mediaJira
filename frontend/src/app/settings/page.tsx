'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon } from 'lucide-react';
import SlackIntegrationModal from '@/components/slack/SlackIntegrationModal';

function SettingsPageContent() {
    const { user, logout, refreshUser } = useAuth();
    const router = useRouter();
    const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);

    useEffect(() => {
        // Ensure we have fresh user data
        if (user) {
            refreshUser();
        }
    }, []);

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
            // Already on settings page
        } else if (action === 'logout') {
            await logout();
        }
    };

    return (
        <Layout user={layoutUser} onUserAction={handleUserAction}>
            <div className="p-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <SettingsIcon className="w-6 h-6 text-blue-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                                <p className="text-sm text-gray-500">Manage your workspace preferences and integrations</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-8">
                        {/* Integrations Section */}
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Integrations</h2>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {/* Slack Card */}
                                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#4A154B] rounded-lg flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.52 2.52 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.527 2.527 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.52v-6.314zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.52v2.52h-2.52zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.522 2.521 2.527 2.527 0 0 1-2.522-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.522 2.52A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.522-2.52v-2.522h2.522zM15.165 17.688a2.527 2.527 0 0 1-2.522-2.522 2.527 2.527 0 0 1 2.522-2.522h6.314a2.527 2.527 0 0 1 2.522 2.522A2.528 2.528 0 0 1 18.956 17.688h-3.79z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Slack</h3>
                                                <p className="text-sm text-gray-500">Messaging & Notifications</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                        Connect your Slack workspace to receive notifications and manage tasks directly from Slack.
                                    </p>
                                    <button
                                        onClick={() => setIsSlackModalOpen(true)}
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        Configure
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
            <SlackIntegrationModal
                isOpen={isSlackModalOpen}
                onClose={() => setIsSlackModalOpen(false)}
            />
        </Layout>
    );
}

export default function SettingsPage() {
    return (
        <ProtectedRoute>
            <SettingsPageContent />
        </ProtectedRoute>
    );
}
