import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const mockModels = [
  { name: 'OpenAI GPT-4', provider: 'openai', status: 'Enabled' },
  { name: 'Anthropic Claude 3', provider: 'anthropic', status: 'Maintenance' },
  { name: 'Llama Guard', provider: 'meta', status: 'Enabled' },
];

const ChatModelsSection = () => {
  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle>Available Models</CardTitle>
        <CardDescription>Drag to reorder priority. Toggle to enable or disable.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockModels.map((model) => (
          <div
            key={model.name}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-muted/50 px-4 py-3 gap-2"
          >
            <div>
              <p className="font-medium">{model.name}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{model.provider}</p>
            </div>
            <Button variant={model.status === 'Enabled' ? 'secondary' : 'outline'} size="sm" className="rounded-xl">
              {model.status}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ChatModelsSection;
