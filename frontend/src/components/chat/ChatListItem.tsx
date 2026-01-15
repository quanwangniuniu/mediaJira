'use client';

import { Users, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ChatListItemProps } from '@/types/chat';
import { useAuthStore } from '@/lib/authStore';

export default function ChatListItem({ chat, isActive, onClick }: ChatListItemProps) {
  // ✅ Use selector for stable reference
  const currentUser = useAuthStore(state => state.user);
  
  // Get the other participant (not current user) for private chats
  const getOtherParticipant = () => {
    if (chat.type === 'group' || !chat.participants) return null;
    // Ensure numeric comparison to avoid type mismatch (currentUser.id can be string | number | undefined)
    const userId = currentUser?.id ? Number(currentUser.id) : null;
    if (userId === null) return null;
    return chat.participants.find(p => p.user.id !== userId);
  };
  
  const otherParticipant = getOtherParticipant();
  
  // Get chat display name
  const getChatName = () => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat';
    }
    
    // For private chats, show the other participant's name
    return otherParticipant?.user?.username || 'Private Chat';
  };
  
  // Get last message preview - only show messages FROM the other person (received messages)
  const getLastMessagePreview = () => {
    if (!chat.last_message) {
      return <span className="text-gray-400 italic">No messages yet</span>;
    }
    
    const currentUserId = currentUser?.id ? Number(currentUser.id) : null;
    const senderId = chat.last_message.sender.id;
    const isOwnMessage = currentUserId !== null && senderId === currentUserId;
    
    // Only show the message if it's from the OTHER person (received message)
    if (isOwnMessage) {
      // If the last message is your own, show a subtle indicator
      return <span className="text-gray-400 italic">You sent a message</span>;
    }
    
    // Show the received message from the other person
    const sender = chat.last_message.sender.username;
    const content = chat.last_message.content;
    const preview = content.length > 40 ? `${content.substring(0, 40)}...` : content;
    
    return (
      <span className="text-gray-600">
        {sender}: {preview}
      </span>
    );
  };
  
  // Get formatted timestamp
  const getTimestamp = () => {
    if (!chat.last_message) return '';
    
    try {
      return formatDistanceToNow(new Date(chat.last_message.created_at), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 hover:bg-gray-50 transition-colors text-left ${
        isActive ? 'bg-blue-50 border-l-4 border-blue-600' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            chat.type === 'group' ? 'bg-purple-500' : 'bg-blue-500'
          } text-white font-medium`}>
            {chat.type === 'group' ? (
              <Users className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Name + Timestamp */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {getChatName()}
            </h3>
            {chat.last_message && (
              <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                {getTimestamp()}
              </span>
            )}
          </div>

          {/* Last Message + Unread Count */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm truncate flex-1">
              {getLastMessagePreview()}
            </p>
            
            {/* Unread Badge */}
            {chat.unread_count && chat.unread_count > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 flex-shrink-0">
                {chat.unread_count > 99 ? '99+' : chat.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

