import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  DashboardSummary,
  DashboardAlertsResponse,
  DashboardAlertsQuery,
  fetchDashboardSummary,
  fetchDashboardAlerts,
} from '@/services/adminApi';

const formatCurrency = (amount?: number | null) => {
  if (amount == null || Number.isNaN(amount)) return '--';
  return `$${amount.toFixed(2)}`;
};

const ALERTS_PAGE_SIZE = 10;

const OverviewSection = () => {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertsData, setAlertsData] = useState<DashboardAlertsResponse | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [piiFilter, setPiiFilter] = useState<'all' | 'true' | 'false'>('all');
  const [overrideFilter, setOverrideFilter] = useState<'all' | 'true' | 'false'>('all');
  const [riskRange, setRiskRange] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [dateFilterPreset, setDateFilterPreset] = useState<
    'all' | 'today' | 'yesterday' | 'lastWeek' | 'lastMonth' | 'custom'
  >('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [alertsSortPreset, setAlertsSortPreset] = useState<'created-desc' | 'created-asc' | 'score-desc' | 'score-asc'>(
    'score-desc',
  );
  const [alertsPage, setAlertsPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const dateRange = useMemo<{ date?: string; dateStart?: string; dateEnd?: string }>(() => {
    const startOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const endOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    };
    const toDateParam = (date: Date) => format(date, 'yyyy-MM-dd');

    const now = new Date();

    switch (dateFilterPreset) {
      case 'today': {
        return { date: toDateParam(now) };
      }
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return { date: toDateParam(yesterday) };
      }
      case 'lastWeek': {
        const start = startOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        const end = endOfDay(now);
        return { dateStart: toDateParam(start), dateEnd: toDateParam(end) };
      }
      case 'lastMonth': {
        const start = startOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        const end = endOfDay(now);
        return { dateStart: toDateParam(start), dateEnd: toDateParam(end) };
      }
      case 'custom': {
        if (customDateRange?.from && customDateRange?.to) {
          const start = startOfDay(customDateRange.from);
          const end = endOfDay(customDateRange.to);
          if (start <= end) {
            return { dateStart: toDateParam(start), dateEnd: toDateParam(end) };
          }
        }
        return {};
      }
      default:
        return {};
    }
  }, [
    dateFilterPreset,
    customDateRange?.from ? customDateRange.from.getTime() : null,
    customDateRange?.to ? customDateRange.to.getTime() : null,
  ]);

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
        const query: DashboardAlertsQuery = {
          limit: ALERTS_PAGE_SIZE,
          offset: alertsPage * ALERTS_PAGE_SIZE,
        };

        if (piiFilter === 'true') {
          query.piiFlag = true;
        } else if (piiFilter === 'false') {
          query.piiFlag = false;
        }

        if (overrideFilter === 'true') {
          query.override = true;
        } else if (overrideFilter === 'false') {
          query.override = false;
        }

        if (riskRange === 'high') {
          query.riskScoreMin = 81;
        } else if (riskRange === 'medium') {
          query.riskScoreMin = 60;
          query.riskScoreMax = 80;
        } else if (riskRange === 'low') {
          query.riskScoreMax = 59;
        }

        if (dateRange.date) {
          query.date = dateRange.date;
        } else {
          if (dateRange.dateStart) {
            query.dateStart = dateRange.dateStart;
          }
          if (dateRange.dateEnd) {
            query.dateEnd = dateRange.dateEnd;
          }
        }

        switch (alertsSortPreset) {
          case 'created-asc':
            query.sortBy = 'createdAt';
            query.sortOrder = 'ASC';
            break;
          case 'score-desc':
            query.sortBy = 'piiDetails.riskScore';
            query.sortOrder = 'DESC';
            break;
          case 'score-asc':
            query.sortBy = 'piiDetails.riskScore';
            query.sortOrder = 'ASC';
            break;
          default:
            query.sortBy = 'createdAt';
            query.sortOrder = 'DESC';
        }

        const data = await fetchDashboardAlerts(query, token);
        setAlertsData(data);
      } catch (err) {
        console.error('Failed to fetch dashboard alerts', err);
        setAlertsError(err instanceof Error ? err.message : 'Unable to load alerts.');
      } finally {
        setAlertsLoading(false);
      }
    };

    void loadAlerts();
  }, [
    token,
    piiFilter,
    overrideFilter,
    riskRange,
    alertsSortPreset,
    dateFilterPreset,
    customDateRange?.from ? customDateRange.from.getTime() : null,
    customDateRange?.to ? customDateRange.to.getTime() : null,
    alertsPage,
  ]);

  useEffect(() => {
    setAlertsPage(0);
  }, [
    piiFilter,
    overrideFilter,
    riskRange,
    alertsSortPreset,
    dateFilterPreset,
    customDateRange?.from ? customDateRange.from.getTime() : null,
    customDateRange?.to ? customDateRange.to.getTime() : null,
  ]);

  const filteredAlerts =
    alertsData?.alerts?.filter((alert) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.trim().toLowerCase();
      const name = alert.userName || '';
      const email = alert.userEmail || '';
      const category = alert.riskCategory || '';
      const message = alert.message || '';
      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q) ||
        message.toLowerCase().includes(q)
      );
    }) ?? [];

  const pagination = alertsData?.pagination;
  const currentOffset = pagination?.offset ?? alertsPage * ALERTS_PAGE_SIZE;
  const totalAlerts = pagination?.total ?? currentOffset + filteredAlerts.length;
  const canPreviousPage = alertsPage > 0;
  const canNextPage = pagination
    ? currentOffset + (alertsData?.alerts?.length ?? 0) < pagination.total
    : (alertsData?.alerts?.length ?? 0) === ALERTS_PAGE_SIZE;
  const displayedRangeStart = filteredAlerts.length > 0 ? currentOffset + 1 : 0;
  const displayedRangeEnd = filteredAlerts.length > 0 ? currentOffset + filteredAlerts.length : 0;

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


      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="flex w-32 flex-col gap-1 text-xs">
              <span className="text-[11px] font-medium text-muted-foreground">PII</span>
              <Select
                value={piiFilter}
                onValueChange={(value) => setPiiFilter(value as 'all' | 'true' | 'false')}
              >
                <SelectTrigger className="h-8 rounded-xl border-muted bg-background/60 text-xs">
                  <SelectValue placeholder="PII filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-32 flex-col gap-1 text-xs">
              <span className="text-[11px] font-medium text-muted-foreground">Override</span>
              <Select
                value={overrideFilter}
                onValueChange={(value) => setOverrideFilter(value as 'all' | 'true' | 'false')}
              >
                <SelectTrigger className="h-8 rounded-xl border-muted bg-background/60 text-xs">
                  <SelectValue placeholder="Override filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-40 flex-col gap-1 text-xs">
              <span className="text-[11px] font-medium text-muted-foreground">Risk</span>
              <Select
                value={riskRange}
                onValueChange={(value) => setRiskRange(value as 'all' | 'high' | 'medium' | 'low')}
              >
                <SelectTrigger className="h-8 rounded-xl border-muted bg-background/60 text-xs">
                  <SelectValue placeholder="Risk range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">High (81+)</SelectItem>
                  <SelectItem value="medium">Medium (60–80)</SelectItem>
                  <SelectItem value="low">Low (≤59)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-56 flex-col gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground">Date Range</span>
                <Select
                  value={dateFilterPreset}
                  onValueChange={(value) =>
                    setDateFilterPreset(value as 'all' | 'today' | 'yesterday' | 'lastWeek' | 'lastMonth' | 'custom')
                  }
                >
                  <SelectTrigger className="h-8 rounded-xl border-muted bg-background/60 text-xs">
                    <SelectValue placeholder="Date filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="lastWeek">Last week</SelectItem>
                    <SelectItem value="lastMonth">Last month</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {dateFilterPreset === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'h-8 justify-start rounded-xl border-muted bg-background/60 text-xs font-medium',
                        !customDateRange?.from && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
                      {customDateRange?.from ? (
                        customDateRange?.to ? (
                          <>
                            {format(customDateRange.from, 'MMM d, yyyy')} – {format(customDateRange.to, 'MMM d, yyyy')}
                          </>
                        ) : (
                          format(customDateRange.from, 'MMM d, yyyy')
                        )
                      ) : (
                        <span>Select dates</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto rounded-2xl border border-muted bg-card p-0">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={customDateRange?.from}
                      selected={customDateRange}
                      onSelect={(range) => setCustomDateRange(range)}
                      numberOfMonths={2}
                      captionLayout="dropdown-buttons"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="flex w-40 flex-col gap-1 text-xs">
              <span className="text-[11px] font-medium text-muted-foreground">Sort By</span>
              <Select
                value={alertsSortPreset}
                onValueChange={(value) =>
                  setAlertsSortPreset(value as 'created-desc' | 'created-asc' | 'score-desc' | 'score-asc')
                }
              >
                <SelectTrigger className="h-8 rounded-xl border-muted bg-background/60 text-xs">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created-desc">Newest first</SelectItem>
                  <SelectItem value="created-asc">Oldest first</SelectItem>
                  <SelectItem value="score-desc">Highest risk</SelectItem>
                  <SelectItem value="score-asc">Lowest risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="w-full md:w-64">
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-[11px] font-medium text-muted-foreground">Search alerts</span>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user, email, or message"
                className="h-8 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-card/80">
            <CardHeader>
              <CardTitle>Recent alerts</CardTitle>
              <CardDescription>Latest alerts from the last queries.</CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading && <p className="text-sm text-muted-foreground">Loading alerts…</p>}
              {!alertsLoading && !alertsError && alertsData && filteredAlerts.length === 0 && (
                <p className="text-sm text-muted-foreground">No alerts found for current filters.</p>
              )}
              {!alertsLoading && !alertsError && alertsData && filteredAlerts.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risk</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>PII</TableHead>
                      <TableHead>Override</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.map((alert) => {
                      const created = alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '';
                      const score = alert.piiDetails?.riskScore ?? null;
                      const piiType = alert.piiDetails?.type ?? '';
                      return (
                        <TableRow key={alert.id}>
                          <TableCell className="font-medium">{alert.riskCategory}</TableCell>
                          <TableCell>{created}</TableCell>
                          <TableCell>{alert.userName}</TableCell>
                          <TableCell>{alert.userEmail}</TableCell>
                          <TableCell className="max-w-xs truncate" title={alert.message}>
                            {alert.message || '--'}
                          </TableCell>
                          <TableCell>{score != null ? score : '--'}</TableCell>
                          <TableCell>{piiType || (alert.piiFlag ? 'Yes' : 'No')}</TableCell>
                          <TableCell>{alert.override ? 'Yes' : 'No'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {!alertsLoading && !alertsError && (
                <div className="mt-4 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {filteredAlerts.length > 0 ? (
                      <span>
                        Showing <span className="font-medium text-foreground">{displayedRangeStart}</span>–
                        <span className="font-medium text-foreground">{displayedRangeEnd}</span> of{' '}
                        <span className="font-medium text-foreground">{pagination?.total ?? displayedRangeEnd}</span>
                      </span>
                    ) : (
                      <span>No data</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setAlertsPage((p) => Math.max(0, p - 1))} disabled={!canPreviousPage || alertsLoading}>
                      Previous
                    </Button>
                    <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setAlertsPage((p) => p + 1)} disabled={!canNextPage || alertsLoading}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
        </div>
      </div>
    </div>
  );
};

export default OverviewSection;
