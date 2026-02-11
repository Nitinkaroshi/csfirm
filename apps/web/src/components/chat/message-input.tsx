'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping?: () => void;
  onStoppedTyping?: () => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onTyping, onStoppedTyping, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage('');
    onStoppedTyping?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    // Typing indicator
    onTyping?.();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onStoppedTyping?.();
    }, 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1"
      />
      <Button
        size="sm"
        onClick={handleSend}
        disabled={!message.trim() || disabled}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
