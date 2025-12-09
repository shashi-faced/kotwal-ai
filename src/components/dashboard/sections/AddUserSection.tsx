import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createAdminUser, LicenseInfo } from '@/services/adminApi';
import { useToast } from '@/components/ui/use-toast';

interface AddUserSectionProps {
  licenseInfo: LicenseInfo | null;
  loadingLicenseInfo: boolean;
  licenseError: string | null;
  onRetry: () => void;
}

const AddUserSection = ({ licenseInfo, loadingLicenseInfo, licenseError, onRetry }: AddUserSectionProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user' | ''>('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const { toast } = useToast();

  const handleRetry = () => {
    onRetry();
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setEmailError(null);
    setPassword('');
    setRole('');
  };

  const validateEmail = (value: string) => {
    if (!value) {
      return 'Email is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Enter a valid email address.';
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(value ? validateEmail(value) : null);
  };

  const handleCreateUser = async () => {
    setCreateSuccess(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const emailValidationMessage = validateEmail(trimmedEmail);
    if (emailValidationMessage) {
      setEmailError(emailValidationMessage);
    }

    if (!trimmedName || !trimmedEmail || !password || !role || emailValidationMessage) {
      setCreateError('Please complete all fields with valid values before creating a user.');
      return;
    }

    setCreateError(null);
    setCreatingUser(true);
    try {
      const response = await createAdminUser({
        name: trimmedName,
        email: trimmedEmail,
        password,
        role,
      });
      const successMessage = response.message || 'User registered successfully.';
      toast({
        title: 'Success',
        description: successMessage,
      });
      setCreateSuccess(successMessage);
      resetForm();
      onRetry();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create user.');
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <Card className="max-w-3xl bg-card/80">
      <CardHeader>
        <CardTitle>Create Kotwal user</CardTitle>
        <CardDescription>Invite a teammate with granular controls.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-muted/50 bg-muted/5 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Available Licenses</p>
            <p className="mt-1 text-2xl font-semibold">
              {licenseInfo ? licenseInfo.availableLicenses : loadingLicenseInfo ? 'Loading...' : '-'}
            </p>
          </div>
          <div className="rounded-2xl border border-muted/50 bg-muted/5 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned Licenses</p>
            <p className="mt-1 text-2xl font-semibold">
              {licenseInfo ? licenseInfo.assignedLicenses : loadingLicenseInfo ? 'Loading...' : '-'}
            </p>
          </div>
          <div className="rounded-2xl border border-muted/50 bg-muted/5 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Remaining Licenses</p>
            <p className="mt-1 text-2xl font-semibold">
              {licenseInfo ? licenseInfo.remainingLicenses : loadingLicenseInfo ? 'Loading...' : '-'}
            </p>
          </div>
        </div>

        {licenseError && (
          <div className="flex items-center gap-3 text-xs text-destructive">
            <span>{licenseError}</span>
            <Button variant="outline" size="sm" className="rounded-xl px-3 py-1" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        )}

        {licenseInfo && licenseInfo.remainingLicenses > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Full Name</label>
                <Input
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={loadingLicenseInfo || creatingUser || !!emailError}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Email</label>
                <div className="space-y-1.5">
                  <Input
                    type="email"
                    placeholder="priya@company.com"
                    value={email}
                    onChange={(event) => handleEmailChange(event.target.value)}
                    disabled={loadingLicenseInfo || creatingUser}
                  />
                  {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Password</label>
                <Input
                  type="password"
                  placeholder="Enter a secure password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loadingLicenseInfo || creatingUser}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Role</label>
                <Select
                  disabled={loadingLicenseInfo || creatingUser}
                  value={role}
                  onValueChange={(value: 'admin' | 'user') => setRole(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {createError && <p className="text-sm text-destructive">{createError}</p>}
            {createSuccess && <p className="text-sm text-emerald-500">{createSuccess}</p>}

            <div className="flex items-center gap-3">
              <Button
                className="rounded-2xl px-6"
                disabled={loadingLicenseInfo || creatingUser}
                onClick={handleCreateUser}
              >
                Create
              </Button>
              <Button
                variant="ghost"
                className="text-muted-foreground"
                disabled={loadingLicenseInfo || creatingUser}
                onClick={resetForm}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-muted/40 bg-muted/10 p-4 text-sm text-muted-foreground">
            {loadingLicenseInfo
              ? 'Checking license availability...'
              : 'You have no remaining licenses. Please purchase or free up a license to add a new user.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AddUserSection;
