import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const BillingSection = () => {
  const metrics = [
    { label: 'Tokens Consumed', value: '1.8M / 3M' },
    { label: 'Spend this month', value: '$1,420.00' },
    { label: 'Next invoice', value: 'Jan 28, 2026' },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle>Usage Snapshot</CardTitle>
          <CardDescription>Live metering for the current cycle.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {metrics.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl border border-muted/50 px-4 py-3"
            >
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="font-semibold">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-muted/50 p-4">
            <p className="text-sm font-medium">Visa •••• 8421</p>
            <p className="text-xs text-muted-foreground">Expires 09/27 • Primary</p>
          </div>
          <Button variant="outline" className="rounded-2xl px-6">
            Add Backup Card
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSection;
