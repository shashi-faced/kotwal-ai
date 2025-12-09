import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSidebar, { DashboardSection } from '@/components/dashboard/Sidebar';
import OverviewSection from '@/components/dashboard/sections/OverviewSection';
import ManageUsersSection from '@/components/dashboard/sections/ManageUsersSection';
import AddUserSection from '@/components/dashboard/sections/AddUserSection';
import EditUserSection from '@/components/dashboard/sections/EditUserSection';
import ChatModelsSection from '@/components/dashboard/sections/ChatModelsSection';
import BillingSection from '@/components/dashboard/sections/BillingSection';
import SecuritySection from '@/components/dashboard/sections/SecuritySection';
import { Button } from '@/components/ui/button';
import { fetchLicenseInfo, LicenseInfo } from '@/services/adminApi';

const sectionMeta: Record<
  DashboardSection,
  {
    title: string;
    description: string;
  }
> = {
  overview: {
    title: 'Dashboard Overview',
    description: 'Stay on top of usage, alerts, and suggested next steps.',
  },
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

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const header = sectionMeta[activeSection];
  const navigate = useNavigate();
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [loadingLicenseInfo, setLoadingLicenseInfo] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);

  const loadLicenseInfo = useCallback(async () => {
    setLoadingLicenseInfo(true);
    setLicenseError(null);
    try {
      const data = await fetchLicenseInfo();
      setLicenseInfo(data);
    } catch (error) {
      console.error('Failed to fetch license info', error);
      setLicenseError('Unable to load license information.');
    } finally {
      setLoadingLicenseInfo(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'add-user') {
      void loadLicenseInfo();
    }
  }, [activeSection, loadLicenseInfo]);

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />;
      case 'manage-users':
        return <ManageUsersSection />;
      case 'add-user':
        return (
          <AddUserSection
            licenseInfo={licenseInfo}
            loadingLicenseInfo={loadingLicenseInfo}
            licenseError={licenseError}
            onRetry={loadLicenseInfo}
          />
        );
      case 'edit-user':
        return <EditUserSection />;
      case 'chat-models':
        return <ChatModelsSection />;
      case 'billing':
        return <BillingSection />;
      case 'security':
        return <SecuritySection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <DashboardSidebar activeSection={activeSection} onSelect={setActiveSection} />
      <section className="flex-1 overflow-y-auto px-10 py-8">
        <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Kotwal Dashboard</p>
            <h1 className="text-3xl font-semibold mt-2">{header.title}</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">{header.description}</p>
          </div>
          <Button variant="outline" className="rounded-2xl border-muted/60" onClick={() => navigate('/')}>
            ← Back to Chat
          </Button>
        </header>
        {renderActiveSection()}
      </section>
    </div>
  );
};

export default Dashboard;
