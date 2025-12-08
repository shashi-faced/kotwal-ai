import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const OverviewSection = () => {
  const stats = [
    { label: 'Active Users', value: '32', delta: '+6.4%' },
    { label: 'Chats Today', value: '1,248', delta: '+12.1%' },
    { label: 'Alerts', value: '3', delta: '2 urgent' },
    { label: 'Spend (24h)', value: '$420', delta: '-3.2%' },
  ];

  const quickActions = [
    { title: 'Invite Teammate', description: 'Provision a new analyst or admin.' },
    { title: 'Review Billing', description: 'Check usage before invoicing.' },
    { title: 'Escalate Alert', description: 'Loop in security responders.' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/80">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xs uppercase tracking-wide text-primary">{stat.delta}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Handle the most common workflows from one panel.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <div key={action.title} className="rounded-2xl border border-muted/50 p-4 space-y-2">
              <p className="font-semibold">{action.title}</p>
              <p className="text-sm text-muted-foreground">{action.description}</p>
              <Button size="sm" variant="secondary" className="rounded-xl">
                Launch
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewSection;
