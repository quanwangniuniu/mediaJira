'use client';

import { format } from 'date-fns';
import { Forward } from 'lucide-react';
import type { MessageItemProps } from '@/types/chat';
import MessageStatus from './MessageStatus';
import AttachmentDisplay from './AttachmentDisplay';
import LinkPreview from './LinkPreview';
import { extractUrls } from '@/lib/api/linkPreviewApi';

export default function MessageItem({
  message,
  isOwnMessage,
  showSender = true,
  senderRole,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}: MessageItemProps) {
  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch {
      return '';
    }
  };

  const messageContent = message.content || '';
  const isForwarded = Boolean(message.is_forwarded && message.forwarded_from);
  const forwardedFrom = message.forwarded_from?.sender_display?.trim() || '';

  const hasContent = Boolean(messageContent && messageContent.trim().length > 0);
  const hasAttachments = Boolean(message.attachments && message.attachments.length > 0);
  
  // Only check for URLs if there's content, and wrap in try-catch for safety
  let hasUrls = false;
  try {
    hasUrls = hasContent && extractUrls(messageContent).length > 0;
  } catch (error) {
    console.warn('Error extracting URLs:', error);
  }

  const handleToggleSelect = () => {
    if (!isSelectMode || !onToggleSelect) return;
    onToggleSelect(message.id);
  };

  const selectionClass = isSelectMode
    ? `cursor-pointer border ${isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-transparent'} rounded-lg p-1`
    : '';
  const forwardedContainerClass = isForwarded ? 'relative pt-4' : '';
  const ownMessageContentClass = `${forwardedContainerClass} flex flex-col items-end`;
  const forwardedHeaderBaseClass =
    'absolute top-0 flex items-center gap-1 text-[11px] text-gray-500 pointer-events-none overflow-hidden max-w-[240px] sm:max-w-[320px]';
  const senderRowClass = 'flex items-center gap-2 mb-1 px-1 w-fit max-w-[240px] sm:max-w-[320px]';

  if (isOwnMessage) {
    // Own messages (right-aligned)
    return (
      <div className={`${isSelectMode ? 'relative pl-8' : ''}`}>
        {isSelectMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggleSelect}
            className="absolute left-0 top-2 w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
        )}
        <div className="flex justify-end">
          <div className="max-w-[75%]">
            <div className={selectionClass} onClick={handleToggleSelect}>
              <div className={ownMessageContentClass}>
                {isForwarded && (
                  <div className={`${forwardedHeaderBaseClass} right-1`}>
                    <Forward className="w-3 h-3 shrink-0" />
                    <span className="min-w-0 truncate whitespace-nowrap">Forwarded from {forwardedFrom}</span>
                  </div>
                )}
                {/* Message bubble with content */}
                {hasContent && (
                  <div className="inline-block w-fit max-w-full bg-blue-600 text-white rounded-lg px-4 py-2 break-words">
                    <p className="text-sm whitespace-pre-wrap">{messageContent}</p>
                  </div>
                )}
                
                {/* Link Previews */}
                {hasUrls && (
                  <LinkPreview content={messageContent} />
                )}
                
                {/* Attachments */}
                {hasAttachments && (
                  <AttachmentDisplay 
                    attachments={message.attachments!} 
                    isOwnMessage={true}
                  />
                )}
                
                {/* Timestamp and status */}
                <div className="flex items-center justify-end gap-1 mt-1 px-1">
                  <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
                  <MessageStatus message={message} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Other users' messages (left-aligned)
  return (
    <div className={`${isSelectMode ? 'relative pl-8' : ''}`}>
      {isSelectMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleToggleSelect}
          className="absolute left-0 top-2 w-4 h-4 text-blue-600 border-gray-300 rounded"
        />
      )}
      <div className="flex justify-start">
        <div className="max-w-[75%]">
          <div className={selectionClass} onClick={handleToggleSelect}>
            <div className={forwardedContainerClass}>
              {isForwarded && (
                <div className={`${forwardedHeaderBaseClass} left-1`}>
                  <Forward className="w-3 h-3 shrink-0" />
                  <span className="min-w-0 truncate whitespace-nowrap">Forwarded from {forwardedFrom}</span>
                </div>
              )}
              {showSender && (
                <div className={senderRowClass}>
                  <p className="text-xs font-medium text-gray-700 truncate max-w-[140px]" title={message.sender.username}>
                    {message.sender.username}
                  </p>
                  {senderRole && (
                    <span
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded truncate max-w-[140px]"
                      title={senderRole}
                    >
                      {senderRole}
                    </span>
                  )}
                </div>
              )}
              
              {/* Message bubble with content */}
              {hasContent && (
                <div className="inline-block w-fit max-w-full bg-gray-100 text-gray-900 rounded-lg px-4 py-2 break-words">
                  <p className="text-sm whitespace-pre-wrap">{messageContent}</p>
                </div>
              )}
              
              {/* Link Previews */}
              {hasUrls && (
                <LinkPreview content={messageContent} />
              )}
              
              {/* Attachments */}
              {hasAttachments && (
                <AttachmentDisplay 
                  attachments={message.attachments!} 
                  isOwnMessage={false}
                />
              )}
              
              {/* Timestamp */}
              <div className="flex items-center gap-1 mt-1 px-1">
                <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
