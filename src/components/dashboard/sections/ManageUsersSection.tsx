import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const mockUsers = [
  { name: 'Asha Mehta', role: 'Administrator', sessions: 4 },
  { name: 'Ravi Kulkarni', role: 'Analyst', sessions: 2 },
  { name: 'Mira Joshi', role: 'Observer', sessions: 1 },
];

const ManageUsersSection = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {mockUsers.map((user) => (
        <Card key={user.name} className="border-muted/40 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">{user.name}</CardTitle>
            <CardDescription>{user.role}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Sessions</p>
              <p className="text-2xl font-semibold mt-1">{user.sessions}</p>
            </div>
            <Button variant="secondary" size="sm">
              Manage
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ManageUsersSection;
