import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, UserPlus, Pencil, Bot, CreditCard, ShieldCheck } from 'lucide-react';

export type DashboardSection =
  | 'overview'
  | 'manage-users'
  | 'add-user'
  | 'edit-user'
  | 'chat-models'
  | 'billing'
  | 'security';

interface DashboardSidebarProps {
  activeSection: DashboardSection;
  onSelect: (section: DashboardSection) => void;
}

interface NavItem {
  id: DashboardSection;
  label: string;
  icon: typeof Users;
  isSub?: boolean;
}

const DashboardSidebar = ({ activeSection, onSelect }: DashboardSidebarProps) => {
  const mainNav: NavItem[] = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'manage-users', label: 'Manage Users', icon: Users },
    { id: 'add-user', label: 'Add New User', icon: UserPlus, isSub: true },
    { id: 'edit-user', label: 'Edit User', icon: Pencil, isSub: true },
    { id: 'chat-models', label: 'Manage Chat Models', icon: Bot },
    { id: 'billing', label: 'Manage Billing', icon: CreditCard },
    { id: 'security', label: 'View Security Alerts', icon: ShieldCheck },
  ];

  return (
    <aside className="w-72 bg-sidebar h-full border-r border-sidebar-border flex flex-col">
      <div className="px-6 py-5 border-b border-sidebar-border flex items-center gap-3">
        <LayoutDashboard className="w-6 h-6 text-primary" />
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Kotwal</p>
          <p className="text-lg font-semibold">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all',
                item.isSub ? 'pl-9 text-muted-foreground' : 'text-sidebar-foreground',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-inner'
                  : 'hover:bg-sidebar-accent/70'
              )}
            >
              <Icon className={cn('w-4 h-4', item.isSub && 'opacity-80')} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default DashboardSidebar;
