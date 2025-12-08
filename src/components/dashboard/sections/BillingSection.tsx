import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BillingAggregate,
  BillingRecord,
  fetchBillingAggregate,
  fetchBillingAggregateMonthly,
  fetchBillingRecords,
} from '@/services/billingApi';

const formatCurrency = (value?: number, currency = 'USD') =>
  typeof value === 'number'
    ? value.toLocaleString(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      })
    : '--';

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '--');

const BillingSection = () => {
  const { token } = useAuth();
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [monthlyAggregate, setMonthlyAggregate] = useState<BillingAggregate | null>(null);
  const [periodAggregate, setPeriodAggregate] = useState<BillingAggregate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);

        const [recordsRes, monthlyRes, periodRes] = await Promise.all([
          fetchBillingRecords(token),
          fetchBillingAggregateMonthly(token),
          fetchBillingAggregate(
            {
              from: sevenDaysAgo.toISOString(),
              to: now.toISOString(),
            },
            token,
          ),
        ]);

        setRecords(recordsRes);
        setMonthlyAggregate(monthlyRes);
        setPeriodAggregate(periodRes);
      } catch (err) {
        console.error('Failed to load billing data', err);
        setError(err instanceof Error ? err.message : 'Something went wrong while loading billing data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const usageMetrics = useMemo(
    () => [
      {
        label: 'Monthly Spend',
        value: formatCurrency(monthlyAggregate?.totalAmount, monthlyAggregate?.currency),
      },
      {
        label: 'Monthly Tokens',
        value: monthlyAggregate?.totalTokens?.toLocaleString() ?? '--',
      },
      {
        label: '7-day Spend',
        value: formatCurrency(periodAggregate?.totalAmount, periodAggregate?.currency),
      },
    ],
    [monthlyAggregate, periodAggregate],
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle>Usage Snapshot</CardTitle>
            <CardDescription>Live metering for the current cycle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageMetrics.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-muted/50 px-4 py-3"
              >
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="font-semibold">{loading ? 'Loading…' : item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle>Billing Records</CardTitle>
            <CardDescription>Latest charges issued to this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && records.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading records…</p>
            ) : records.length === 0 ? (
              <p className="text-sm text-muted-foreground">No billing activity detected yet.</p>
            ) : (
              <div className="space-y-3">
                {records.slice(0, 4).map((record) => (
                  <div key={record.id} className="rounded-xl border border-muted/50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{record.description || 'Usage charge'}</p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(record.amount, record.currency)}{' '}
                        {record.tokens ? (
                          <span className="text-xs text-muted-foreground">({record.tokens.toLocaleString()} tokens)</span>
                        ) : null}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(record.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="rounded-2xl px-6 w-full" disabled>
              Export CSV (coming soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BillingSection;
