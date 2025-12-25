import { Conversation } from '@/types/chat';
import { Plus, MessageSquare, Menu, X, LayoutDashboard, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  loadingSessionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onOpenDashboard: () => void;
  userEmail?: string | null;
  onLogout: () => void;
}

const Sidebar = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  loadingSessionId,
  isOpen,
  onToggle,
  onOpenDashboard,
  userEmail,
  onLogout,
}: SidebarProps) => {
  const userLabel = userEmail || 'User';
  const initials = userLabel.charAt(0).toUpperCase();
  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed top-3 left-3 z-50 rounded-full border border-border bg-white/90 p-2 text-slate-700 shadow-sm transition-colors hover:bg-muted md:hidden"
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
          'fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-border bg-white/95 backdrop-blur-lg transition-transform duration-300 md:relative md:translate-x-0',
          isOpen ? 'translate-x-0 slide-in-left' : '-translate-x-full',
        )}
      >
        {/* New Chat Button */}
        <div className="p-2">
          <button
            onClick={onNewChat}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-white/80 px-3 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New chat</span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2">
          <div className="space-y-1">
            {conversations.map((conversation) => {
              const isActive = activeConversationId === conversation.id;
              const isLoading = loadingSessionId === conversation.id;
              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100',
                    isLoading && 'opacity-70'
                  )}
                  disabled={isLoading}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{conversation.title}</span>
                  {isLoading && (
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">Loading…</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{userLabel}</p>
              <p className="truncate text-xs text-slate-500">Secure session</p>
            </div>
          </div>
          <button
            onClick={onOpenDashboard}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-border px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100"
          >
            <span>Open Dashboard</span>
            <LayoutDashboard className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-destructive/40 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <span>Logout</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
