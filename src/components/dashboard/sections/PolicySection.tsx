import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Save, AlertCircle, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  fetchPolicy, fetchPolicyDefaults, replacePolicy,
  PolicyDocument, DetectionAction, RedactionStrategy,
} from '@/services/policyApi';

const ACTIONS: DetectionAction[] = ['ALLOW', 'WARN', 'REDACT', 'BLOCK'];
const STRATEGIES: RedactionStrategy[] = ['TOKEN', 'MASK', 'HASH', 'FAKE'];

const CATEGORY_ORDER = ['CREDENTIAL', 'FINANCIAL', 'IDENTITY_GOV', 'IDENTITY_PII', 'NETWORK', 'CUSTOM'];

const ACTION_BADGE: Record<DetectionAction, string> = {
  BLOCK: 'bg-red-100 text-red-800 border-red-200',
  REDACT: 'bg-amber-100 text-amber-800 border-amber-200',
  WARN: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ALLOW: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

/** Deep-clone helper for safe edits to nested config objects. */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const PolicySection = () => {
  const [effective, setEffective] = useState<PolicyDocument | null>(null);
  const [draft, setDraft] = useState<PolicyDocument | null>(null);
  const [presets, setPresets] = useState<string[]>([]);
  const [defaults, setDefaults] = useState<PolicyDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAllowlistValue, setNewAllowlistValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policy, defs] = await Promise.all([fetchPolicy(), fetchPolicyDefaults()]);
      setEffective(policy.effective);
      setDraft(clone(policy.effective));
      setPresets(defs.presets || []);
      setDefaults(defs.default);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policy.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isDirty = useMemo(
    () => draft && effective && JSON.stringify(draft) !== JSON.stringify(effective),
    [draft, effective],
  );

  const updateDraft = (patch: (d: PolicyDocument) => void) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = clone(prev);
      patch(next);
      return next;
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await replacePolicy(draft);
      setEffective(res.effective);
      setDraft(clone(res.effective));
      toast({ title: 'Policy saved', description: 'New policy is in effect for your tenant.' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    if (effective) setDraft(clone(effective));
  };

  const handleResetToDefault = () => {
    if (defaults) setDraft(clone(defaults));
  };

  const addAllowlistEntry = () => {
    const v = newAllowlistValue.trim();
    if (!v) return;
    updateDraft((d) => {
      d.allowlist = Array.from(new Set([...(d.allowlist || []), v]));
    });
    setNewAllowlistValue('');
  };

  const removeAllowlistEntry = (entry: string) => {
    updateDraft((d) => {
      d.allowlist = (d.allowlist || []).filter((x) => x !== entry);
    });
  };

  if (loading) {
    return (
      <Card className="bg-card/80">
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading policy…
        </CardContent>
      </Card>
    );
  }

  if (error || !draft) {
    return (
      <Card className="border-red-200 bg-red-50/80">
        <CardContent className="flex items-start gap-2 py-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <div>
            <p className="font-medium">Unable to load policy</p>
            <p className="text-xs">{error}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categoryAction = draft.categoryAction || {};
  const redactionStrategy = draft.redactionStrategy || {};
  const severity = draft.severity || {};
  const thresholds = draft.thresholds || {};
  const allowlist = draft.allowlist || [];

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <Card className="bg-card/80">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Detection Policy</CardTitle>
            <CardDescription>
              Tune how Kotwal handles each category of sensitive data for your tenant.
              Changes take effect immediately on save.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => void load()} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleRevert} disabled={!isDirty} className="gap-2">
              <RotateCcw className="h-3.5 w-3.5" /> Revert
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetToDefault} className="gap-2">
              Reset to default
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!isDirty || saving} className="gap-2">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save policy
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Top-level config */}
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Jurisdiction preset">
            <select
              value={draft.preset || ''}
              onChange={(e) => updateDraft((d) => { d.preset = e.target.value || undefined; })}
              className="w-full rounded-lg border border-muted bg-card px-3 py-2 text-sm"
            >
              <option value="">None (custom)</option>
              {presets.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Applies a baseline (HIPAA / PCI / GDPR / DPDP_IN). Your overrides below win.
            </p>
          </Field>
          <Field label="Maximum prompt size (chars)">
            <input
              type="number"
              min={500}
              max={500000}
              value={draft.maxPromptChars ?? 50000}
              onChange={(e) => updateDraft((d) => { d.maxPromptChars = Number(e.target.value); })}
              className="w-full rounded-lg border border-muted bg-card px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Warn threshold (0–1)">
            <input
              type="number" step="0.01" min={0} max={1}
              value={thresholds.warn ?? 0.5}
              onChange={(e) => updateDraft((d) => {
                d.thresholds = { ...(d.thresholds || {}), warn: Number(e.target.value) };
              })}
              className="w-full rounded-lg border border-muted bg-card px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Block threshold (0–1)">
            <input
              type="number" step="0.01" min={0} max={1}
              value={thresholds.block ?? 0.85}
              onChange={(e) => updateDraft((d) => {
                d.thresholds = { ...(d.thresholds || {}), block: Number(e.target.value) };
              })}
              className="w-full rounded-lg border border-muted bg-card px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Critical confidence floor">
            <input
              type="number" step="0.01" min={0} max={1}
              value={draft.criticalConfidenceFloor ?? 0.7}
              onChange={(e) => updateDraft((d) => { d.criticalConfidenceFloor = Number(e.target.value); })}
              className="w-full rounded-lg border border-muted bg-card px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Quasi-identifier combo bonus">
            <input
              type="number" step="0.01" min={0} max={1}
              value={draft.quasiIdBonus ?? 0.5}
              onChange={(e) => updateDraft((d) => { d.quasiIdBonus = Number(e.target.value); })}
              className="w-full rounded-lg border border-muted bg-card px-3 py-2 text-sm"
            />
          </Field>
          <ToggleField
            label="Allow developer override"
            checked={!!draft.allowOverride}
            onChange={(v) => updateDraft((d) => { d.allowOverride = v; })}
            hint="When off, even WARN actions cannot be bypassed."
          />
          <ToggleField
            label="Require override reason"
            checked={!!draft.requireOverrideReason}
            onChange={(v) => updateDraft((d) => { d.requireOverrideReason = v; })}
            hint="Forces users to write a justification before proceeding past WARN."
          />
        </CardContent>
      </Card>

      {/* Per-category matrix */}
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Category matrix</CardTitle>
          <CardDescription>Set severity, action, and redaction strategy per category.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Severity</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Redaction</th>
                  <th className="py-2 pr-3">Effective</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_ORDER.map((cat) => {
                  const sev = severity[cat] ?? 0;
                  const act = (categoryAction[cat] || 'ALLOW') as DetectionAction;
                  const strat = (redactionStrategy[cat] || 'MASK') as RedactionStrategy;
                  return (
                    <tr key={cat} className="border-t border-muted/50">
                      <td className="py-2 pr-3 font-medium">{cat.replace(/_/g, ' ')}</td>
                      <td className="py-2 pr-3">
                        <input
                          type="number" step="0.05" min={0} max={1}
                          value={sev}
                          onChange={(e) => updateDraft((d) => {
                            d.severity = { ...(d.severity || {}), [cat]: Number(e.target.value) };
                          })}
                          className="w-20 rounded-md border border-muted bg-card px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={act}
                          onChange={(e) => updateDraft((d) => {
                            d.categoryAction = { ...(d.categoryAction || {}), [cat]: e.target.value as DetectionAction };
                          })}
                          className="rounded-md border border-muted bg-card px-2 py-1 text-xs"
                        >
                          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={strat}
                          onChange={(e) => updateDraft((d) => {
                            d.redactionStrategy = { ...(d.redactionStrategy || {}), [cat]: e.target.value as RedactionStrategy };
                          })}
                          className="rounded-md border border-muted bg-card px-2 py-1 text-xs"
                        >
                          {STRATEGIES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ACTION_BADGE[act]}`}>
                          {act}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Allowlist */}
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Allowlist</CardTitle>
          <CardDescription>
            Exact strings that should never be flagged (e.g. internal test fixtures).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input
              value={newAllowlistValue}
              onChange={(e) => setNewAllowlistValue(e.target.value)}
              placeholder="e.g. test+demo@example.com"
              className="flex-1 rounded-lg border border-muted bg-card px-3 py-2 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllowlistEntry(); } }}
            />
            <Button size="sm" variant="outline" onClick={addAllowlistEntry} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          {allowlist.length === 0 ? (
            <p className="text-xs text-muted-foreground">No allowlist entries.</p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {allowlist.map((entry) => (
                <li
                  key={entry}
                  className="flex items-center justify-between gap-2 rounded-lg border border-muted/50 bg-muted/30 px-3 py-1.5 text-xs"
                >
                  <code className="truncate">{entry}</code>
                  <button
                    type="button"
                    onClick={() => removeAllowlistEntry(entry)}
                    className="text-muted-foreground hover:text-red-600"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* JSON debug — read-only effective view */}
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Effective policy (JSON)</CardTitle>
          <CardDescription>For copy / audit purposes.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-100">
            {JSON.stringify(effective, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </label>
    {children}
  </div>
);

const ToggleField = ({
  label, checked, onChange, hint,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) => (
  <div className="flex items-start justify-between gap-3 rounded-lg border border-muted/40 bg-muted/20 p-3">
    <div>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-4 w-4"
    />
  </div>
);

export default PolicySection;
