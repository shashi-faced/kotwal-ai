import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  fetchAdminChatModels,
  updateChatModelStatus,
  ChatModelEntry,
} from '@/services/chatModelsApi';

type ChatModelStatus = 'active' | 'inactive' | 'suspended';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  suspended: 'bg-red-100 text-red-800 border-red-200',
};

const NEXT_STATUS: Record<string, ChatModelStatus> = {
  active: 'inactive',
  inactive: 'active',
  suspended: 'active',
};

const ChatModelsSection = () => {
  const [models, setModels] = useState<ChatModelEntry[]>([]);
  const [summary, setSummary] = useState<{ total: number; active: number; inactive: number; suspended: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminChatModels();
      setModels(res.models || []);
      setSummary(res.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat models.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleStatus = async (model: ChatModelEntry) => {
    const target = NEXT_STATUS[model.status] || 'active';
    const aiModelId = model.aiModelId || model.AIModelMaster?.id;
    if (!aiModelId) {
      toast({ title: 'Cannot toggle', description: 'No linked AI model.', variant: 'destructive' });
      return;
    }
    setUpdatingId(model.id);
    try {
      await updateChatModelStatus(aiModelId, target);
      setModels((prev) => prev.map((m) => (m.id === model.id ? { ...m, status: target } : m)));
      toast({ title: 'Status updated', description: `${model.name} is now ${STATUS_LABEL[target]}.` });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card className="bg-card/80">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Chat Models</CardTitle>
          <CardDescription>
            Models assigned by Kotwal. Toggle availability for your tenant's users.
          </CardDescription>
          {summary && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                {summary.active} active
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                {summary.inactive} inactive
              </span>
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-700">
                {summary.suspended} suspended
              </span>
              <span className="rounded-full border border-muted px-2 py-0.5 text-muted-foreground">
                {summary.total} total
              </span>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading chat models…
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-medium">Unable to load chat models</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        ) : models.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No chat models configured for this tenant yet.
          </p>
        ) : (
          models.map((model) => {
            const status = (model.status || 'inactive') as ChatModelStatus;
            const provider = model.AIModelMaster?.provider || '—';
            const aiName = model.AIModelMaster?.name || '—';
            const isUpdating = updatingId === model.id;
            return (
              <div
                key={model.id}
                className="flex flex-col gap-3 rounded-xl border border-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{model.name}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {provider} · {aiName}
                  </p>
                  {model.description && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{model.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[status] || STATUS_BADGE.inactive}`}
                  >
                    {STATUS_LABEL[status] || status}
                  </span>
                  <Button
                    variant={status === 'active' ? 'outline' : 'secondary'}
                    size="sm"
                    className="rounded-xl"
                    onClick={() => void toggleStatus(model)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : status === 'active' ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default ChatModelsSection;
