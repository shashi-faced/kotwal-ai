import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import {
  DashboardSummary,
  DashboardAlertsResponse,
  fetchDashboardSummary,
  fetchDashboardAlerts,
} from '@/services/adminApi';

const formatCurrency = (amount?: number | null) => {
  if (amount == null || Number.isNaN(amount)) return '--';
  return `$${amount.toFixed(2)}`;
};

const OverviewSection = () => {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertsData, setAlertsData] = useState<DashboardAlertsResponse | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDashboardSummary(token);
        setSummary(data);
      } catch (err) {
        console.error('Failed to fetch dashboard summary', err);
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const loadAlerts = async () => {
      setAlertsLoading(true);
      setAlertsError(null);
      try {
        const data = await fetchDashboardAlerts(
          { limit: 10, sortBy: 'createdAt', sortOrder: 'DESC' },
          token
        );
        setAlertsData(data);
      } catch (err) {
        console.error('Failed to fetch dashboard alerts', err);
        setAlertsError(err instanceof Error ? err.message : 'Unable to load alerts.');
      } finally {
        setAlertsLoading(false);
      }
    };

    void loadAlerts();
  }, [token]);

  const stats = [
    {
      label: 'Active Users',
      value: loading ? '…' : String(summary?.activeUsers ?? 0),
      delta: '',
    },
    {
      label: 'Chats Today',
      value: loading ? '…' : String(summary?.chatsToday ?? 0),
      delta: '',
    },
    {
      label: 'Alerts',
      value: loading ? '…' : String(summary?.alerts ?? 0),
      delta: '',
    },
    {
      label: 'Spend (24h)',
      value: loading ? '…' : formatCurrency(summary?.spend ?? null),
      delta: '',
    },
  ];

  const quickActions = [
    { title: 'Invite Teammate', description: 'Provision a new analyst or admin.' },
    { title: 'Review Billing', description: 'Check usage before invoicing.' },
    { title: 'Escalate Alert', description: 'Loop in security responders.' },
  ];

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/80">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              {stat.delta && (
                <span className="text-xs uppercase tracking-wide text-primary">{stat.delta}</span>
              )}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle>Alerts breakdown</CardTitle>
            <CardDescription>PII, overrides and risk level distribution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alertsError && <p className="text-sm text-destructive">{alertsError}</p>}
            {!alertsError && (
              <>
                {(() => {
                  const piiTrue = alertsData?.counts?.piiFlagCounts?.['true'] ?? 0;
                  const piiFalse = alertsData?.counts?.piiFlagCounts?.['false'] ?? 0;
                  const overrideTrue = alertsData?.counts?.overrideCount ?? 0;
                  const overrideFalse = alertsData?.counts?.overrideCounts?.['false'] ?? 0;
                  const high = alertsData?.counts?.highRisk ?? 0;
                  const med = alertsData?.counts?.medRisk ?? 0;
                  const low = alertsData?.counts?.lowRisk ?? 0;
                  const maxValue = Math.max(high, med, low, overrideTrue, overrideFalse, piiTrue, piiFalse, 1);

                  const barHeight = (value: number, max: number) =>
                    max > 0 ? `${Math.round((value / max) * 100)}%` : '0%';

                  const clusters = [
                    {
                      label: 'Risk level',
                      bars: [
                        { label: 'High', value: high, color: 'bg-red-500' },
                        { label: 'Medium', value: med, color: 'bg-yellow-500' },
                        { label: 'Low', value: low, color: 'bg-emerald-500' },
                      ],
                    },
                    {
                      label: 'Override count',
                      bars: [
                        { label: 'True', value: overrideTrue, color: 'bg-amber-500' },
                        { label: 'False', value: overrideFalse, color: 'bg-muted-foreground' },
                      ],
                    },
                    {
                      label: 'PII flag count',
                      bars: [
                        { label: 'True', value: piiTrue, color: 'bg-primary' },
                        { label: 'False', value: piiFalse, color: 'bg-muted-foreground' },
                      ],
                    },
                  ];

                  return (
                    <div className="space-y-4">
                      <div className="flex h-40 items-end gap-6">
                        {clusters.map((cluster) => (
                          <div key={cluster.label} className="flex-1">
                            <div className="flex h-32 items-end justify-center gap-3">
                              {cluster.bars.map((bar) => (
                                <div key={bar.label} className="flex flex-col items-center gap-1">
                                  <div className="flex h-28 w-6 items-end rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={`w-full ${bar.color}`}
                                      style={{ height: barHeight(bar.value, maxValue) }}
                                    />
                                  </div>
                                  <span className="text-[10px] leading-tight text-muted-foreground">
                                    {bar.label}
                                  </span>
                                  <span className="text-xs font-medium">{bar.value}</span>
                                </div>
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-center font-medium text-muted-foreground">
                              {cluster.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle>Recent alerts</CardTitle>
            <CardDescription>Latest alerts from the last queries.</CardDescription>
          </CardHeader>
          <CardContent>
            {alertsLoading && <p className="text-sm text-muted-foreground">Loading alerts…</p>}
            {!alertsLoading && !alertsError && alertsData && alertsData.alerts.length === 0 && (
              <p className="text-sm text-muted-foreground">No alerts found.</p>
            )}
            {!alertsLoading && !alertsError && alertsData && alertsData.alerts.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>PII</TableHead>
                    <TableHead>Override</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertsData.alerts.map((alert) => {
                    const created = alert.createdAt
                      ? new Date(alert.createdAt).toLocaleString()
                      : '';
                    const score = alert.piiDetails?.riskScore ?? null;
                    const piiType = alert.piiDetails?.type ?? '';
                    return (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.riskCategory}</TableCell>
                        <TableCell>{created}</TableCell>
                        <TableCell>{alert.userName}</TableCell>
                        <TableCell>{alert.userEmail}</TableCell>
                        <TableCell>{score != null ? score : '--'}</TableCell>
                        <TableCell>{piiType || (alert.piiFlag ? 'Yes' : 'No')}</TableCell>
                        <TableCell>{alert.override ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewSection;
