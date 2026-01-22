'use client';

import { MessageCircle } from 'lucide-react';

interface EmptyChatStateProps {
  onCreateChat: () => void;
}

export default function EmptyChatState({ onCreateChat }: EmptyChatStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <MessageCircle className="w-8 h-8 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No chats yet
      </h3>
      
      <p className="text-sm text-gray-600 mb-6 max-w-[250px]">
        Start a conversation with your team members or create a group chat
      </p>
      
      <button
        onClick={onCreateChat}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
      >
        Start Chatting
      </button>
    </div>
  );
}



