import { Message } from '@/types/chat';
import MarkdownRenderer from './MarkdownRenderer';
import { User } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
}

const ChatMessage = ({ message, isTyping }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex w-full justify-end pl-8 sm:pl-16 fade-in">
        <div className="relative max-w-[85%] rounded-3xl bg-secondary px-5 py-2.5 text-secondary-foreground shadow-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full gap-3 sm:gap-4 pr-4 sm:pr-10 fade-in">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 mt-0.5">
        <div className="w-8 h-8 rounded-full bg-background border border-border/50 flex items-center justify-center overflow-hidden shadow-sm">
          <img src="/favicon-32x32.png" alt="Kotwal" className="w-5 h-5" />
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="prose-chat px-1">
          <div className={isTyping ? 'typing-cursor' : ''}>
            <MarkdownRenderer content={message.content} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
