import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const mockAlerts = [
  {
    title: 'Unusual Token Spike',
    detail: 'Billing usage rose 63% within 10 minutes.',
    severity: 'High',
  },
  {
    title: 'PII Override Requested',
    detail: 'Moderator forced allow-list on session KTW-221.',
    severity: 'Medium',
  },
  {
    title: 'New IP Login',
    detail: 'Asha logged in from unfamiliar location.',
    severity: 'Low',
  },
];

const severityStyles: Record<
  string,
  {
    bg: string;
    text: string;
  }
> = {
  High: {
    bg: 'hsla(var(--destructive),0.18)',
    text: 'hsl(var(--destructive))',
  },
  Medium: {
    bg: 'hsla(var(--primary),0.16)',
    text: 'hsl(var(--primary))',
  },
  Low: {
    bg: 'hsla(var(--muted),0.4)',
    text: 'hsl(var(--muted-foreground))',
  },
};

const SecuritySection = () => {
  return (
    <div className="space-y-4">
      {mockAlerts.map((alert) => {
        const colors = severityStyles[alert.severity] ?? severityStyles.Low;
        return (
          <Card key={alert.title} className="border border-muted/60 bg-card/80">
            <CardHeader className="flex-row items-start gap-4">
              <div>
                <CardTitle className="text-base">{alert.title}</CardTitle>
                <CardDescription>{alert.detail}</CardDescription>
              </div>
              <span
                className="ml-auto rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: colors.bg,
                  color: colors.text,
                }}
              >
                {alert.severity}
              </span>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button size="sm" className="rounded-xl">
                  Investigate
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SecuritySection;
