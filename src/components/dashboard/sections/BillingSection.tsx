import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  BillingAggregate,
  BillingRecord,
  fetchBillingAggregate,
  fetchBillingAggregateMonthly,
  fetchBillingRecords,
  fetchBillingStatementAggregate,
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
  const [statementRecords, setStatementRecords] = useState<BillingRecord[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [statementDatePreset, setStatementDatePreset] = useState<
    'all' | 'today' | 'yesterday' | 'lastWeek' | 'lastMonth' | 'custom'
  >('all');
  const [statementCustomRange, setStatementCustomRange] = useState<DateRange | undefined>();

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

  const statementDateRange = useMemo<{
    periodStart?: string;
    periodEnd?: string;
  }>(() => {
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

    const now = new Date();

    switch (statementDatePreset) {
      case 'today': {
        return { periodStart: startOfDay(now).toISOString(), periodEnd: endOfDay(now).toISOString() };
      }
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return { periodStart: startOfDay(yesterday).toISOString(), periodEnd: endOfDay(yesterday).toISOString() };
      }
      case 'lastWeek': {
        const start = startOfDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        return { periodStart: start.toISOString(), periodEnd: endOfDay(now).toISOString() };
      }
      case 'lastMonth': {
        const start = startOfDay(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        return { periodStart: start.toISOString(), periodEnd: endOfDay(now).toISOString() };
      }
      case 'custom': {
        if (statementCustomRange?.from && statementCustomRange?.to) {
          const start = startOfDay(statementCustomRange.from);
          const end = endOfDay(statementCustomRange.to);
          if (start <= end) {
            return { periodStart: start.toISOString(), periodEnd: end.toISOString() };
          }
        }
        return {};
      }
      default:
        return {};
    }
  }, [
    statementDatePreset,
    statementCustomRange?.from ? statementCustomRange.from.getTime() : null,
    statementCustomRange?.to ? statementCustomRange.to.getTime() : null,
  ]);

  useEffect(() => {
    if (!token) return;

    const loadStatements = async () => {
      setStatementLoading(true);
      setStatementError(null);
      try {
        if (statementDateRange.periodStart && statementDateRange.periodEnd) {
          const aggregated = await fetchBillingStatementAggregate(
            {
              periodStart: statementDateRange.periodStart,
              periodEnd: statementDateRange.periodEnd,
            },
            token,
          );
          setStatementRecords(aggregated ? [aggregated] : []);
        } else {
          const result = await fetchBillingRecords(token);
          setStatementRecords(result);
        }
      } catch (err) {
        console.error('Failed to load billing statements', err);
        setStatementError(err instanceof Error ? err.message : 'Unable to load billing statements.');
      } finally {
        setStatementLoading(false);
      }
    };

    void loadStatements();
  }, [
    token,
    statementDateRange.periodStart,
    statementDateRange.periodEnd,
  ]);

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

      <Card className="bg-card/80">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Billing Statements</CardTitle>
              <CardDescription>Review historical statements or aggregate ranges.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <span className="text-[11px] font-medium text-muted-foreground">Date Range</span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Select
                  value={statementDatePreset}
                  onValueChange={(value) =>
                    setStatementDatePreset(value as 'all' | 'today' | 'yesterday' | 'lastWeek' | 'lastMonth' | 'custom')
                  }
                >
                  <SelectTrigger className="h-8 w-48 rounded-xl border-muted bg-background/60 text-xs">
                    <SelectValue placeholder="Filter by period" />
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
                {statementDatePreset === 'custom' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'h-8 justify-start rounded-xl border-muted bg-background/60 text-xs font-medium',
                          !statementCustomRange?.from && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
                        {statementCustomRange?.from ? (
                          statementCustomRange?.to ? (
                            <>
                              {format(statementCustomRange.from, 'MMM d, yyyy')} –{' '}
                              {format(statementCustomRange.to, 'MMM d, yyyy')}
                            </>
                          ) : (
                            format(statementCustomRange.from, 'MMM d, yyyy')
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
                        defaultMonth={statementCustomRange?.from}
                        selected={statementCustomRange}
                        onSelect={(range) => setStatementCustomRange(range)}
                        numberOfMonths={2}
                        captionLayout="dropdown-buttons"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {statementError && <p className="text-sm text-destructive">{statementError}</p>}
          {!statementLoading && !statementError && statementRecords.length === 0 && (
            <p className="text-sm text-muted-foreground">No billing statements found for the selected period.</p>
          )}
          {statementLoading && (
            <p className="text-sm text-muted-foreground">Loading statements…</p>
          )}
          {!statementLoading && !statementError && statementRecords.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statementRecords.map((record) => {
                  const cost = record.totalCost ?? record.amount ?? null;
                  const periodLabel =
                    record.periodStart && record.periodEnd
                      ? `${format(new Date(record.periodStart), 'MMM d, yyyy')} – ${format(
                          new Date(record.periodEnd),
                          'MMM d, yyyy',
                        )}`
                      : '—';
                  return (
                    <TableRow key={`${record.id}-${record.createdAt}`}>
                      <TableCell className="font-medium">{periodLabel}</TableCell>
                      <TableCell>{cost != null ? formatCurrency(cost) : '--'}</TableCell>
                      <TableCell className="capitalize">{record.status ?? '—'}</TableCell>
                      <TableCell>{formatDate(record.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSection;
