'use client';

import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import type { MessageInputProps } from '@/types/chat';

export default function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [content, setContent] = useState('');

  const handleSend = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || disabled) return;

    onSend(trimmedContent);
    setContent('');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 py-3 border-t border-gray-200 bg-white">
      <div className="flex items-end gap-2">
        {/* Text Input */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm max-h-24 overflow-y-auto"
          style={{
            minHeight: '38px',
            maxHeight: '96px',
          }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg p-2 transition-colors flex-shrink-0"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 mt-2">
        Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-700">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-700">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}

