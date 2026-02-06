'use client';

import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import ConfirmModal from '@/components/ui/ConfirmModal';
import { SlackPreferenceRow } from './SlackPreferenceRow';
import { slackApi, SlackConnectionStatus, NotificationPreference, SlackChannel } from '@/lib/api/slackApi';
import { ProjectAPI, ProjectData } from '@/lib/api/projectApi';
import toast from 'react-hot-toast';
import { CheckCircle2, Slack, Loader2, Filter } from 'lucide-react';

interface SlackIntegrationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SlackIntegrationModal({ isOpen, onClose }: SlackIntegrationModalProps) {
    const [loading, setLoading] = useState(true);
    const [connection, setConnection] = useState<SlackConnectionStatus | null>(null);
    const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
    const [channels, setChannels] = useState<SlackChannel[]>([]);
    const [projects, setProjects] = useState<ProjectData[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | 'ALL'>('ALL');
    const [loadingChannels, setLoadingChannels] = useState(false);

    const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [connStatus, prefsList, projList] = await Promise.all([
                slackApi.getStatus(),
                slackApi.getPreferences(),
                ProjectAPI.getProjects()
            ]);

            setConnection(connStatus);
            setPreferences(prefsList || []);
            setProjects(projList || []);

            if (connStatus.is_active) {
                setLoadingChannels(true);
                try {
                    const chList = await slackApi.getChannels();
                    setChannels(chList);
                } catch (e) {
                    console.error("Failed to load channels", e);
                } finally {
                    setLoadingChannels(false);
                }
            }

        } catch (error) {
            console.error('Failed to fetch Slack status:', error);
            toast.error('Failed to load Slack integration details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const handleConnect = async () => {
        try {
            const { url } = await slackApi.initOAuth();
            window.location.href = url;
        } catch (error) {
            console.error('Failed to init OAuth:', error);
            toast.error('Failed to start Slack connection process.');
        }
    };

    const handleDisconnect = async () => {
        try {
            setDisconnecting(true);
            await slackApi.disconnect();
            toast.success('Slack workspace disconnected.');
            setIsDisconnectModalOpen(false);
            await fetchData();
        } catch (error) {
            console.error('Failed to disconnect:', error);
            toast.error('Failed to disconnect Slack.');
        } finally {
            setDisconnecting(false);
        }
    };

    // Filter preferences based on selected project
    const getFilteredPreferences = () => {
        if (selectedProjectId === 'ALL') return preferences;
        return preferences.filter(p => p.project === selectedProjectId);
    };

    const filteredPreferences = getFilteredPreferences();

    // Helper to find state of a specific event type within current filter scope
    const getPreferenceState = (eventType: string) => {
        if (!filteredPreferences.length) return false;
        // In ALL mode: returns true if ANY project has it enabled (loose check)
        // In Single mode: returns true if THIS project has it enabled

        // Refinement for ALL mode to avoid confusion: 
        // If ALL mode, show checked only if ALL projects have it enabled? Or at least one?
        // Standard UX: Check if all are true -> True. Check if mix -> indeterminate (but we have toggle).
        // Let's stick to simple: If >0 enabled, show enabled.
        return filteredPreferences.some(p => p.event_type === eventType && p.is_active);
    };

    const getPreferenceChannel = (eventType: string) => {
        // Find the first active preference in scope to determine display value
        const pref = filteredPreferences.find(p => p.event_type === eventType && p.is_active);

        if (!pref || !pref.slack_channel_id) return "default";

        if (connection && pref.slack_channel_id === connection.default_channel_id) {
            return "default";
        }

        // Note: In ALL mode, if projects have different channels, this just shows the first one found.
        // Ideally we'd show "mixed" but our Select doesn't support that easily.
        return pref.slack_channel_id;
    };

    const updatePreference = async (eventType: string, updates: Partial<NotificationPreference>) => {
        // Find all preferences matching this event type AND within the current scope
        const targets = preferences.filter(p => {
            const typeMatch = p.event_type === eventType;
            const projectMatch = selectedProjectId === 'ALL' || p.project === selectedProjectId;
            return typeMatch && projectMatch;
        });

        if (targets.length === 0) {
            console.warn(`No preference found for ${eventType} in current scope`);
            return;
        }

        // Optimistic update local state
        const oldPreferences = [...preferences];
        setPreferences(preferences.map(p => {
            const typeMatch = p.event_type === eventType;
            const projectMatch = selectedProjectId === 'ALL' || p.project === selectedProjectId;

            if (typeMatch && projectMatch) {
                return { ...p, ...updates };
            }
            return p;
        }));

        try {
            // Update all matching records
            await Promise.all(targets.map(p =>
                slackApi.updatePreference(p.id, updates)
            ));
            toast.success(selectedProjectId === 'ALL' ? 'Settings updated for all projects.' : 'Project settings updated.');
        } catch (error) {
            // Revert on failure
            setPreferences(oldPreferences);
            toast.error('Failed to update settings.');
        }
    };

    const togglePreference = (eventType: string) => {
        const currentState = getPreferenceState(eventType);
        updatePreference(eventType, { is_active: !currentState });
    };

    const changeChannel = (eventType: string, channelId: string) => {
        const actualId = channelId === "default" ? "" : channelId;
        const channelObj = channels.find(c => c.id === actualId);
        const updates: any = { slack_channel_id: actualId };

        if (channelObj) {
            updates.slack_channel_name = channelObj.name;
        } else {
            updates.slack_channel_name = "";
        }
        updatePreference(eventType, updates);
    };


    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-center gap-2 text-xl pb-2">
                            <Slack className="w-6 h-6 text-[#4A154B]" />
                            Slack Integration
                        </DialogTitle>
                        <DialogDescription>
                            Connect your Slack workspace to receive real-time notifications.
                        </DialogDescription>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <p className="text-sm text-gray-500">Loading details...</p>
                        </div>
                    ) : !connection?.is_connected ? (
                        // Not Connected State
                        <div className="py-6 flex flex-col items-center space-y-6">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <Slack className="w-8 h-8 text-gray-500" />
                            </div>
                            <div className="text-center space-y-2 max-w-sm">
                                <h3 className="text-lg font-medium text-gray-900">Connect to Slack</h3>
                                <p className="text-sm text-gray-500">
                                    Stay updated with your team's progress. Get instant notifications in your preferred Slack channel.
                                </p>
                            </div>
                            <button
                                onClick={handleConnect}
                                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#4A154B] hover:bg-[#3d113e] transition-colors w-full sm:w-auto"
                            >
                                <Slack className="w-5 h-5 mr-2" />
                                Connect Workspace
                            </button>
                        </div>
                    ) : (
                        // Connected State
                        <div className="space-y-6 py-2">
                            {/* Connection Info */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-green-800">Connected Successfully</h4>
                                    <p className="text-sm text-green-700 mt-1">
                                        Linked to workspace <span className="font-semibold">{connection.slack_team_name}</span>.
                                        {loadingChannels && <span className="ml-2 text-xs text-gray-500 animate-pulse">Loading channels...</span>}
                                    </p>
                                </div>
                            </div>

                            {/* Project Filter */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-gray-900">Notification Settings</h3>

                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-gray-400" />
                                    <Select
                                        value={String(selectedProjectId)}
                                        onValueChange={(val) => setSelectedProjectId(val === 'ALL' ? 'ALL' : Number(val))}
                                    >
                                        <SelectTrigger className="w-[180px] h-8 text-xs bg-white">
                                            <SelectValue placeholder="Select Project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Projects ({projects.length})</SelectItem>
                                            {projects.map(p => (
                                                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Preferences List */}
                            <div className="border-t pt-2">
                                {preferences.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                        <SlackPreferenceRow
                                            label="Task Created"
                                            description="Notify when a new task is created."
                                            eventType="TASK_CREATED"
                                            isChecked={getPreferenceState('TASK_CREATED')}
                                            selectedChannel={getPreferenceChannel('TASK_CREATED')}
                                            channels={channels}
                                            loadingChannels={loadingChannels}
                                            defaultChannelName={connection.default_channel_name}
                                            defaultChannelId={connection.default_channel_id}
                                            onToggle={togglePreference}
                                            onChannelChange={changeChannel}
                                        />
                                        <SlackPreferenceRow
                                            label="Task Status Changes"
                                            description="Notify when a task status moves (e.g. In Progress → Done)."
                                            eventType="TASK_STATUS_CHANGE"
                                            isChecked={getPreferenceState('TASK_STATUS_CHANGE')}
                                            selectedChannel={getPreferenceChannel('TASK_STATUS_CHANGE')}
                                            channels={channels}
                                            loadingChannels={loadingChannels}
                                            defaultChannelName={connection.default_channel_name}
                                            defaultChannelId={connection.default_channel_id}
                                            onToggle={togglePreference}
                                            onChannelChange={changeChannel}
                                        />
                                        <SlackPreferenceRow
                                            label="Task Comments"
                                            description="Notify when a new comment is posted on a task."
                                            eventType="COMMENT_UPDATED"
                                            isChecked={getPreferenceState('COMMENT_UPDATED')}
                                            selectedChannel={getPreferenceChannel('COMMENT_UPDATED')}
                                            channels={channels}
                                            loadingChannels={loadingChannels}
                                            defaultChannelName={connection.default_channel_name}
                                            defaultChannelId={connection.default_channel_id}
                                            onToggle={togglePreference}
                                            onChannelChange={changeChannel}
                                        />
                                        <SlackPreferenceRow
                                            label="Decision Made"
                                            description="Notify when a key decision is recorded or approved."
                                            eventType="DECISION_CREATED"
                                            isChecked={getPreferenceState('DECISION_CREATED')}
                                            selectedChannel={getPreferenceChannel('DECISION_CREATED')}
                                            channels={channels}
                                            loadingChannels={loadingChannels}
                                            defaultChannelName={connection.default_channel_name}
                                            defaultChannelId={connection.default_channel_id}
                                            onToggle={togglePreference}
                                            onChannelChange={changeChannel}
                                        />
                                        <SlackPreferenceRow
                                            label="Review Reminders"
                                            description="Daily reminders for assigned tasks due soon."
                                            eventType="DEADLINE_REMINDER"
                                            isChecked={getPreferenceState('DEADLINE_REMINDER')}
                                            selectedChannel={getPreferenceChannel('DEADLINE_REMINDER')}
                                            channels={channels}
                                            loadingChannels={loadingChannels}
                                            defaultChannelName={connection.default_channel_name}
                                            defaultChannelId={connection.default_channel_id}
                                            onToggle={togglePreference}
                                            onChannelChange={changeChannel}
                                        />
                                    </div>
                                ) : (
                                    <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded">
                                        Settings not available. No configurable projects found.
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t flex justify-between items-center">
                                <p className="text-xs text-gray-400">
                                    Team ID: {connection.slack_team_id}
                                </p>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to disconnect Slack?')) {
                                            handleDisconnect();
                                        }
                                    }}
                                    className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-2 rounded hover:bg-red-50 transition-colors"
                                >
                                    Disconnect Integration
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
