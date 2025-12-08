import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchLicenseInfo, LicenseInfo } from '@/services/adminApi';

const AddUserSection = () => {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [loadingLicenseInfo, setLoadingLicenseInfo] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);

  const roles = [
    {
      name: 'Observer',
      description: 'Read-only visibility.',
    },
    {
      name: 'Analyst',
      description: 'Run chats + view insights.',
    },
    {
      name: 'Administrator',
      description: 'Full access including billing.',
    },
  ];

  useEffect(() => {
    let isMounted = true;

    const loadLicenseInfo = async () => {
      setLoadingLicenseInfo(true);
      setLicenseError(null);

      try {
        const data = await fetchLicenseInfo();
        if (isMounted) {
          setLicenseInfo(data);
        }
      } catch (error) {
        console.error('Failed to fetch license info', error);
        if (isMounted) {
          setLicenseError('Unable to load license information.');
        }
      } finally {
        if (isMounted) {
          setLoadingLicenseInfo(false);
        }
      }
    };

    loadLicenseInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Card className="max-w-3xl bg-card/80">
      <CardHeader>
        <CardTitle>Create Kotwal user</CardTitle>
        <CardDescription>Invite a teammate with granular controls.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-muted/50 bg-muted/5 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Available Licenses</p>
            <p className="mt-1 text-2xl font-semibold">
              {licenseInfo ? licenseInfo.availableLicenses : loadingLicenseInfo ? 'Loading...' : '-'}
            </p>
          </div>
          <div className="rounded-2xl border border-muted/50 bg-muted/5 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned Licenses</p>
            <p className="mt-1 text-2xl font-semibold">
              {licenseInfo ? licenseInfo.assignedLicenses : loadingLicenseInfo ? 'Loading...' : '-'}
            </p>
          </div>
          <div className="rounded-2xl border border-muted/50 bg-muted/5 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Remaining Licenses</p>
            <p className="mt-1 text-2xl font-semibold">
              {licenseInfo ? licenseInfo.remainingLicenses : loadingLicenseInfo ? 'Loading...' : '-'}
            </p>
          </div>
        </div>

        {licenseError && <p className="text-xs text-destructive">{licenseError}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Full Name</label>
            <Input placeholder="e.g. Priya Sharma" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Email</label>
            <Input type="email" placeholder="priya@company.com" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Role</label>
          <div className="grid gap-3 md:grid-cols-3">
            {roles.map((role) => (
              <button
                key={role.name}
                className="rounded-xl border border-muted/60 px-4 py-3 text-sm text-left hover:border-primary transition-colors"
              >
                <p className="font-medium">{role.name}</p>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button className="rounded-2xl px-6">Send Invite</Button>
          <Button variant="ghost" className="text-muted-foreground">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddUserSection;
