'use client';

import { format } from 'date-fns';
import type { MessageItemProps } from '@/types/chat';
import MessageStatus from './MessageStatus';

export default function MessageItem({
  message,
  isOwnMessage,
  showSender = true,
}: MessageItemProps) {
  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch {
      return '';
    }
  };

  if (isOwnMessage) {
    // Own messages (right-aligned)
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="bg-blue-600 text-white rounded-lg px-4 py-2 break-words">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1 px-1">
            <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
            <MessageStatus message={message} />
          </div>
        </div>
      </div>
    );
  }

  // Other users' messages (left-aligned)
  return (
    <div className="flex justify-start">
      <div className="max-w-[75%]">
        {showSender && (
          <p className="text-xs font-medium text-gray-700 mb-1 px-1">
            {message.sender.username}
          </p>
        )}
        <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 break-words">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="flex items-center gap-1 mt-1 px-1">
          <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

