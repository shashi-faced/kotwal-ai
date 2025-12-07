import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const mockUsers = [
  { name: 'Asha Mehta', role: 'Administrator' },
  { name: 'Ravi Kulkarni', role: 'Analyst' },
  { name: 'Mira Joshi', role: 'Observer' },
];

const EditUserSection = () => {
  const permissions = ['Run Chats', 'View Billing', 'Manage Models', 'Escalate Alerts'];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle>Choose User</CardTitle>
          <CardDescription>Switch between teammates to adjust access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockUsers.map((user) => (
            <button
              key={user.name}
              className="w-full rounded-xl border border-muted/60 px-4 py-3 text-left hover:border-primary transition-colors"
            >
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>Toggle the capabilities for the selected user.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {permissions.map((perm) => (
            <div key={perm} className="flex items-center justify-between rounded-xl border border-muted/50 px-4 py-3">
              <div>
                <p className="font-medium">{perm}</p>
                <p className="text-xs text-muted-foreground">Tap to toggle.</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-primary">Enabled</span>
            </div>
          ))}
          <div className="flex gap-3">
            <Button className="rounded-2xl px-6">Save Changes</Button>
            <Button variant="outline" className="rounded-2xl px-6 border-destructive text-destructive">
              Suspend Access
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditUserSection;
