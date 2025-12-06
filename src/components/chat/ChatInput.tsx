import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  selectedModel: string;
  onChangeModel: (value: string) => void;
  modelOptions: { value: string; label: string }[];
}

const ChatInput = ({ onSend, disabled, selectedModel, onChangeModel, modelOptions }: ChatInputProps) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 pb-6">
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="md:w-56 flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground md:mb-0">Model</p>
            <Select value={selectedModel} onValueChange={onChangeModel} disabled={disabled}>
              <SelectTrigger className="h-12 rounded-2xl border border-chat-input-border bg-chat-input px-4 text-sm shadow-sm md:w-full">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <div className="relative bg-chat-input border border-chat-input-border rounded-2xl shadow-lg">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Kotwal"
                disabled={disabled}
                rows={1}
                className="w-full resize-none bg-transparent px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                style={{ maxHeight: '200px' }}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || disabled}
                className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-foreground text-background disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Kotwal can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
};

export default ChatInput;
