import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { NotificationPreference, SlackChannel } from '@/lib/api/slackApi';

type ToggleState = 'on' | 'off' | 'mixed';
type EventType = NotificationPreference['event_type'];

interface SlackPreferenceRowProps {
    label: string;
    description: string;
    eventType: EventType;
    toggleState: ToggleState;
    summaryText?: string;
    selectedChannel: string;
    showChannelSelect: boolean;
    channels: SlackChannel[];
    loadingChannels: boolean;
    defaultChannelName?: string | null;
    defaultChannelId?: string | null;
    onToggle: (eventType: EventType) => void;
    onChannelChange: (eventType: EventType, channelId: string) => void;
}

export const SlackPreferenceRow: React.FC<SlackPreferenceRowProps> = ({
    label,
    description,
    eventType,
    toggleState,
    summaryText,
    selectedChannel,
    showChannelSelect,
    channels,
    loadingChannels,
    defaultChannelName,
    defaultChannelId,
    onToggle,
    onChannelChange,
}) => {
    // Filter channels to remove the duplicate entry of the default channel.
    // This check validates both the Channel ID and the normalized Channel Name (ignoring '#' prefix).
    const visibleChannels = channels.filter(ch => {
        if (ch.id === defaultChannelId) return false;
        const normalizedDefaultName = defaultChannelName?.replace(/^#/, '') || '';
        if (ch.name === normalizedDefaultName) return false;
        return true;
    });

    const isChecked = toggleState === 'on';
    const isMixed = toggleState === 'mixed';

    return (
        <div className="flex items-center justify-between py-4 group">
            <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{label}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
                {summaryText && (
                    <p className={`text-xs mt-1 ${isMixed ? 'text-amber-700' : 'text-gray-400'}`}>
                        {summaryText}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-3">
                {showChannelSelect && (
                    <div className="transition-opacity duration-200">
                        <Select
                            value={selectedChannel}
                            onValueChange={(val) => onChannelChange(eventType, val)}
                            disabled={loadingChannels}
                        >
                            <SelectTrigger className="w-[160px] h-8 text-xs bg-gray-50 border-gray-200 focus:ring-1">
                                <SelectValue placeholder="Default Channel" />
                            </SelectTrigger>
                            <SelectContent>
                                {selectedChannel === "mixed" && (
                                    <SelectItem value="mixed" disabled>
                                        Mixed channels
                                    </SelectItem>
                                )}
                                <SelectItem value="default">
                                    <span className="text-gray-500 font-medium">Default</span> {defaultChannelName ? `(#${defaultChannelName.trim().replace(/^#+/, '')})` : ''}
                                </SelectItem>
                                {visibleChannels.map(ch => (
                                    <SelectItem key={ch.id} value={ch.id} className="text-xs">
                                        <span className="text-gray-400 mr-1">{ch.is_private ? '🔒' : '#'}</span>
                                        {ch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <button
                    onClick={() => onToggle(eventType)}
                    className={`
                        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer
                        rounded-full border-2 border-transparent transition-colors 
                        duration-200 ease-in-out focus:outline-none
                        ${isChecked ? 'bg-[#4A154B]' : isMixed ? 'bg-amber-100 border-amber-300' : 'bg-gray-200'}
                    `}
                >
                    {isMixed && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="h-0.5 w-3 rounded-full bg-[#4A154B]" />
                        </span>
                    )}
                    <span
                        className={`
                            pointer-events-none inline-block h-5 w-5 transform
                            rounded-full bg-white shadow ring-0 transition 
                            duration-200 ease-in-out
                            ${isChecked ? 'translate-x-5' : isMixed ? 'translate-x-2.5' : 'translate-x-0'}
                        `}
                    />
                </button>
            </div>
        </div>
    );
};
