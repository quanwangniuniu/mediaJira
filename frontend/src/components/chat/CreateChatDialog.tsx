'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/authStore';
import { useChatData } from '@/hooks/useChatData';
import { useChatStore } from '@/lib/chatStore';
import { findPrivateChat } from '@/lib/api/chatApi';
import type { CreateChatDialogProps, ChatType } from '@/types/chat';
import ParticipantSelector from './ParticipantSelector';
import toast from 'react-hot-toast';

export default function CreateChatDialog({
  isOpen,
  onClose,
  projectId,
  onChatCreated,
}: CreateChatDialogProps) {
  // ✅ Use selectors for stable references
  const user = useAuthStore(state => state.user);
  const { createNewChat } = useChatData({ projectId });
  
  const [chatType, setChatType] = useState<ChatType>('private');
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Validation
  const isValid = () => {
    if (chatType === 'private') {
      return selectedParticipants.length === 1;
    } else {
      return selectedParticipants.length >= 2 && groupName.trim() !== '';
    }
  };

  // Reset form
  const resetForm = () => {
    setChatType('private');
    setGroupName('');
    setSelectedParticipants([]);
  };

  // Handle close
  const handleClose = () => {
    if (!isCreating) {
      resetForm();
      onClose();
    }
  };

  // Handle create
  const handleCreate = async () => {
    if (!isValid() || !user) return;

    try {
      setIsCreating(true);

      // For private chats, check if one already exists
      if (chatType === 'private' && selectedParticipants.length === 1) {
        const existingChat = await findPrivateChat(parseInt(projectId), selectedParticipants[0]);
        
        if (existingChat) {
          toast.success('Opening existing chat with this user');
          resetForm();
          onChatCreated(existingChat.id);
          return;
        }
      }

      // Backend will automatically add current user to participants
      const newChat = await createNewChat({
        type: chatType,
        project_id: parseInt(projectId),
        participant_ids: selectedParticipants,
        name: chatType === 'group' ? groupName.trim() : undefined,
      });

      if (newChat) {
        resetForm();
        onChatCreated(newChat.id);
      }
    } catch (error: any) {
      console.error('Error creating chat:', error);
      
      // Check if error is about duplicate chat
      const errorMsg = error?.response?.data?.detail || error?.response?.data?.non_field_errors?.[0] || '';
      if (errorMsg.includes('already exists')) {
        // Extract chat ID from error message if possible
        const chatIdMatch = errorMsg.match(/Chat ID: (\d+)/);
        if (chatIdMatch) {
          const existingChatId = parseInt(chatIdMatch[1]);
          toast.success('Opening existing chat');
          resetForm();
          onChatCreated(existingChatId);
          return;
        }
      }
      
      toast.error('Failed to create chat');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle chat type change
  const handleChatTypeChange = (type: ChatType) => {
    setChatType(type);
    setSelectedParticipants([]);
    setGroupName('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Chat Type Toggle */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Chat Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleChatTypeChange('private')}
                disabled={isCreating}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  chatType === 'private'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                👤 Private
              </button>
              <button
                onClick={() => handleChatTypeChange('group')}
                disabled={isCreating}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  chatType === 'group'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                👥 Group
              </button>
            </div>
          </div>

          {/* Group Name Input (only for group chats) */}
          {chatType === 'group' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Design Team"
                disabled={isCreating}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          )}

          {/* Participant Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {chatType === 'private' ? 'Select Participant' : 'Select Participants'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              {chatType === 'private'
                ? 'Select 1 team member for private chat'
                : 'Select at least 2 team members for group chat'}
            </p>
            <ParticipantSelector
              projectId={projectId}
              selectedIds={selectedParticipants}
              onSelect={setSelectedParticipants}
              maxSelection={chatType === 'private' ? 1 : undefined}
              currentUserId={user?.id ? Number(user.id) : 0}
            />
          </div>

          {/* Selected Counter */}
          {selectedParticipants.length > 0 && (
            <p className="text-sm text-gray-600">
              Selected: {selectedParticipants.length} member
              {selectedParticipants.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!isValid() || isCreating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              'Create Chat'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

