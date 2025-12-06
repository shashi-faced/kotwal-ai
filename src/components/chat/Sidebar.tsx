import { Conversation } from '@/types/chat';
import { Plus, MessageSquare, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  isOpen,
  onToggle,
}: SidebarProps) => {
  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-sidebar hover:bg-sidebar-accent transition-colors md:hidden"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-full w-64 bg-sidebar flex flex-col transition-transform duration-300 md:relative md:translate-x-0',
          isOpen ? 'translate-x-0 slide-in-left' : '-translate-x-full'
        )}
      >
        {/* New Chat Button */}
        <div className="p-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-sidebar-border hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New chat</span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2">
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                  activeConversationId === conversation.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{conversation.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
              U
            </div>
            <span className="truncate">User</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
