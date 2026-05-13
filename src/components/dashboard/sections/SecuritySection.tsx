import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ShieldCheck, RefreshCw, Loader2, AlertCircle, Filter } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  fetchDashboardAlerts,
  DashboardAlert,
  DashboardAlertCounts,
  DashboardAlertsQuery,
} from '@/services/adminApi';

type FilterPreset = 'all' | 'pii' | 'override' | 'high';

const formatRelative = (iso: string): string => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso;
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
};

const RISK_BADGE: Record<string, string> = {
  High: 'bg-red-100 text-red-800 border-red-200',
  Medium: 'bg-amber-100 text-amber-800 border-amber-200',
  Low: 'bg-slate-100 text-slate-700 border-slate-200',
};

const SecuritySection = () => {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [counts, setCounts] = useState<DashboardAlertCounts | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<FilterPreset>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const buildQuery = useCallback((p: FilterPreset): DashboardAlertsQuery => {
    const base: DashboardAlertsQuery = { limit: 50, offset: 0, sortBy: 'createdAt', sortOrder: 'DESC' };
    if (p === 'pii') return { ...base, piiFlag: true };
    if (p === 'override') return { ...base, override: true };
    if (p === 'high') return { ...base, riskScoreMin: 80 };
    return base;
  }, []);

  const load = useCallback(async (p: FilterPreset) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardAlerts(buildQuery(p));
      if (!res) {
        setAlerts([]); setCounts(null); setTotal(0);
        return;
      }
      setAlerts(res.alerts || []);
      setCounts(res.counts);
      setTotal(res.pagination?.total ?? (res.alerts?.length ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => { void load(preset); }, [preset, load]);

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <Card className="bg-card/80">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Security Alerts</CardTitle>
            <CardDescription>
              Detection events from your tenant. Sensitive substrings are masked before storage.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void load(preset)} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {counts && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <SummaryPill label="Total" value={total} />
              <SummaryPill label="High risk" value={counts.highRisk} tone="red" />
              <SummaryPill label="Medium" value={counts.medRisk} tone="amber" />
              <SummaryPill label="Low" value={counts.lowRisk} tone="slate" />
              <SummaryPill label="Overrides" value={counts.overrideCount} tone="amber" />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <FilterChip active={preset === 'all'} onClick={() => setPreset('all')}>All</FilterChip>
            <FilterChip active={preset === 'pii'} onClick={() => setPreset('pii')}>PII flagged</FilterChip>
            <FilterChip active={preset === 'override'} onClick={() => setPreset('override')}>Overridden</FilterChip>
            <FilterChip active={preset === 'high'} onClick={() => setPreset('high')}>High risk</FilterChip>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <Card className="bg-card/80">
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading alerts…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/80">
          <CardContent className="flex items-start gap-2 py-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-medium">Unable to load alerts</p>
              <p className="text-xs">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <Card className="bg-card/80">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            No matching alerts. Your tenant is clean for this filter.
          </CardContent>
        </Card>
      ) : (
        alerts.map((a) => {
          const isExpanded = expandedId === a.id;
          const riskClass = RISK_BADGE[a.riskCategory] || RISK_BADGE.Low;
          const findings = (a.piiDetails as unknown as { findings?: { subtype?: string; category?: string }[] } | null | undefined)?.findings ?? [];
          const categoriesPresent = (a.piiDetails as unknown as { categoriesPresent?: string[] } | null | undefined)?.categoriesPresent ?? [];
          return (
            <Card key={a.id} className="border border-muted/60 bg-card/80">
              <CardHeader className="flex-row items-start gap-4">
                <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">
                    {a.userName || a.userEmail || 'Unknown user'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {formatRelative(a.createdAt)}
                    {a.userEmail && ` · ${a.userEmail}`}
                    {a.override && ' · override'}
                  </CardDescription>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${riskClass}`}>
                  {a.riskCategory}
                </span>
              </CardHeader>
              <CardContent>
                {categoriesPresent.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {categoriesPresent.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                      >
                        {cat.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    ))}
                  </div>
                )}
                <div className="rounded-xl bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800">
                  {a.message || '(no prompt content)'}
                </div>
                {isExpanded && findings.length > 0 && (
                  <div className="mt-3 rounded-xl border border-muted bg-white/70 p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Findings
                    </p>
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {findings.map((f, i) => (
                        <li key={i} className="rounded-lg bg-slate-50 p-2 text-xs">
                          {(f.subtype || f.category || 'sensitive data')
                            .toString()
                            .replace(/_/g, ' ')
                            .toLowerCase()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  >
                    {isExpanded ? 'Hide details' : 'View details'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      navigator.clipboard?.writeText(a.id).then(
                        () => toast({ title: 'Alert ID copied', description: a.id }),
                        () => undefined,
                      );
                    }}
                  >
                    Copy ID
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

const SummaryPill = ({
  label, value, tone,
}: { label: string; value: number; tone?: 'red' | 'amber' | 'slate' }) => {
  const colorMap: Record<string, string> = {
    red: 'border-red-200 bg-red-50 text-red-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  const cls = tone ? colorMap[tone] : 'border-muted bg-card text-foreground';
  return (
    <div className={`rounded-xl border px-3 py-2 text-center ${cls}`}>
      <p className="text-lg font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
};

const FilterChip = ({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-muted bg-card text-muted-foreground hover:bg-muted/40'
    }`}
  >
    {children}
  </button>
);

export default SecuritySection;
