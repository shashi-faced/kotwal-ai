import { useState } from 'react';
import DashboardSidebar, { DashboardSection } from '@/components/dashboard/Sidebar';
import ManageUsersSection from '@/components/dashboard/sections/ManageUsersSection';
import AddUserSection from '@/components/dashboard/sections/AddUserSection';
import EditUserSection from '@/components/dashboard/sections/EditUserSection';
import ChatModelsSection from '@/components/dashboard/sections/ChatModelsSection';
import BillingSection from '@/components/dashboard/sections/BillingSection';
import SecuritySection from '@/components/dashboard/sections/SecuritySection';

const sectionMeta: Record<
  DashboardSection,
  {
    title: string;
    description: string;
  }
> = {
  'manage-users': {
    title: 'Manage Users',
    description: 'Track active operators, their roles, and session health.',
  },
  'add-user': {
    title: 'Add New User',
    description: 'Provision a new analyst or admin for Kotwal.',
  },
  'edit-user': {
    title: 'Edit User',
    description: 'Update access tiers, reset MFA, or deactivate accounts.',
  },
  'chat-models': {
    title: 'Manage Chat Models',
    description: 'Enable, disable, or prioritize the models exposed in chat.',
  },
  billing: {
    title: 'Manage Billing',
    description: 'Monitor usage, invoices, and payment methods.',
  },
  security: {
    title: 'Security Alerts',
    description: 'Respond to anomalous activity detected by Kotwal.',
  },
};

const SECTION_COMPONENTS: Record<DashboardSection, () => JSX.Element> = {
  'manage-users': ManageUsersSection,
  'add-user': AddUserSection,
  'edit-user': EditUserSection,
  'chat-models': ChatModelsSection,
  billing: BillingSection,
  security: SecuritySection,
};

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState<DashboardSection>('manage-users');
  const header = sectionMeta[activeSection];
  const ActiveSection = SECTION_COMPONENTS[activeSection];

  return (
    <div className="flex h-screen bg-background text-foreground">
      <DashboardSidebar activeSection={activeSection} onSelect={setActiveSection} />
      <section className="flex-1 overflow-y-auto px-10 py-8">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Kotwal Dashboard</p>
          <h1 className="text-3xl font-semibold mt-2">{header.title}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">{header.description}</p>
        </header>
        <ActiveSection />
      </section>
    </div>
  );
};

export default Dashboard;
