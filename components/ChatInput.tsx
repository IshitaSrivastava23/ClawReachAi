'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Paperclip, Loader2 } from 'lucide-react';

/**
 * Chat Input Component
 * 
 * Sticky chat interface at bottom 20% of viewport
 * Features:
 * - Centered, constrained width for focus
 * - Text input with placeholder
 * - Send button
 * - Auto-focus management
 */

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  placeholder?: string;
  isLoading?: boolean;
}

export function ChatInput({
  onSendMessage,
  placeholder = "Describe your campaign, influencer preferences, or ask anything...",
  isLoading = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!message.trim() || isSending || isLoading) return;

    setIsSending(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    // Auto-focus input when component mounts
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header Label */}
      <div className="flex items-center justify-between px-2">
        <label className="text-sm font-semibold text-slate-900">
          Campaign Assistant
        </label>
        <span className="text-xs text-slate-500">
          {isLoading ? 'Processing...' : 'Ready'}
        </span>
      </div>

      {/* Input Container */}
      <div className="flex-1 flex items-end gap-3 min-h-0">
        {/* Message Input */}
        <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-200 transition-all">
          <Input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || isSending}
            className="flex-1 border-0 bg-transparent px-0 py-0 text-slate-900 placeholder-slate-500 focus:ring-0 focus:outline-none text-sm"
          />
          {/* File Attachment Button (Future) */}
          <button
            type="button"
            aria-label="Attach file"
            disabled={isLoading || isSending}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isLoading || isSending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSending || isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send
        </Button>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-slate-500 px-2">
        Shift + Enter for new line • Enter to send
      </p>
    </div>
  );
}
