import { useRef, useEffect, KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  selectedModel: string;
  onChangeModel: (value: string) => void;
  modelOptions: { value: string; label: string }[];
  value: string;
  onInputChange: (value: string) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

const ChatInput = ({
  onSend,
  disabled,
  selectedModel,
  onChangeModel,
  modelOptions,
  value,
  onInputChange,
  inputRef,
}: ChatInputProps) => {
  const textareaRef = inputRef ?? useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value, textareaRef]);

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      onInputChange('');
      textareaRef.current?.focus();
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
        <div className="flex flex-col gap-2">
          <div className="flex-1">
            <div className="relative bg-chat-input border border-chat-input-border rounded-2xl shadow-lg text-slate-900">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Kotwal"
                disabled={disabled}
                rows={1}
                className="w-full resize-none bg-transparent px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
                style={{ maxHeight: '200px' }}
              />
              <button
                onClick={handleSubmit}
                disabled={!value.trim() || disabled}
                className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-foreground text-background disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-start pt-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Model</p>
              <Select value={selectedModel} onValueChange={onChangeModel} disabled={disabled}>
                <SelectTrigger className="h-8 rounded-lg border border-chat-input-border bg-chat-input px-2 text-xs shadow-sm w-40 text-slate-900">
                  <SelectValue placeholder="Select model" className="text-slate-900 data-[placeholder]:text-slate-400" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  {modelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-slate-900">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
