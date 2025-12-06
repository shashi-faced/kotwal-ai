import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center gap-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 text-primary text-sm">
            <Sparkles className="h-4 w-4" />
            Welcome to Kotwal
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">Sign in to continue</h1>
          <p className="text-muted-foreground">
            Guard your projects with Kotwal, the always-on AI sentry for deep conversations.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-lg bg-chat-input border border-chat-input-border rounded-3xl p-8 shadow-2xl space-y-6"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@kotwal.ai"
                className="pl-10 bg-background/40 border-chat-input-border h-12 rounded-2xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="pl-10 bg-background/40 border-chat-input-border h-12 rounded-2xl"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl text-base font-medium tracking-wide shadow-lg"
          >
            {loading ? 'Verifying...' : 'Enter Kotwal'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
