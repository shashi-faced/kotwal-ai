import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AdminUserDetails, fetchAdminUserByEmail } from '@/services/adminApi';

const EditUserSection = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  const handleSearch = async () => {
    const trimmedEmail = email.trim();
    const validationMessage = validateEmail(trimmedEmail);
    if (validationMessage) {
      setEmailError(validationMessage);
      return;
    }

    setFetchError(null);
    setSelectedUser(null);
    setLoadingUser(true);
    try {
      const user = await fetchAdminUserByEmail(trimmedEmail);
      setSelectedUser(user);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Unable to fetch user details.');
    } finally {
      setLoadingUser(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle>Search user by email</CardTitle>
          <CardDescription>Enter the exact email to fetch account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Email</label>
            <Input
              type="email"
              placeholder="user@company.com"
              value={email}
              onChange={(event) => handleEmailChange(event.target.value)}
              disabled={loadingUser}
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>
          <Button className="rounded-2xl px-6" onClick={handleSearch} disabled={loadingUser || !!emailError}>
            {loadingUser ? 'Searching…' : 'Search'}
          </Button>
          {fetchError && <p className="text-sm text-destructive">{fetchError}</p>}
        </CardContent>
      </Card>

      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle>User details</CardTitle>
          <CardDescription>View account metadata for administrative updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedUser ? (
            <>
              <div className="rounded-xl border border-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
                <p className="text-lg font-semibold">{selectedUser.name}</p>
              </div>
              <div className="rounded-xl border border-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="text-lg font-semibold break-all">{selectedUser.email}</p>
              </div>
              <div className="rounded-xl border border-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
                <p className="text-lg font-semibold capitalize">{selectedUser.role}</p>
              </div>
              {selectedUser.status && (
                <div className="rounded-xl border border-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                  <p className="text-lg font-semibold capitalize">{selectedUser.status}</p>
                </div>
              )}
              {selectedUser.permissions && selectedUser.permissions.length > 0 && (
                <div className="rounded-xl border border-muted/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Permissions</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {selectedUser.permissions.map((permission) => (
                      <li key={permission} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {loadingUser
                ? 'Fetching user details...'
                : 'Search for a user to see their details and available actions.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EditUserSection;
