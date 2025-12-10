import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AdminUserDetails,
  fetchAdminUserByEmail,
  updateAdminUser,
  UpdateAdminUserPayload,
} from '@/services/adminApi';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

const EditUserSection = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'user' as 'admin' | 'user',
    status: '',
    permissions: '',
  });

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
    setIsEditing(false);
    setUpdateError(null);
    setUpdateSuccess(null);
    try {
      const user = await fetchAdminUserByEmail(trimmedEmail);
      setSelectedUser(user);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Unable to fetch user details.');
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    if (selectedUser && !isEditing) {
      setEditForm({
        name: selectedUser.name ?? '',
        role: selectedUser.role === 'admin' ? 'admin' : 'user',
        status: selectedUser.status ?? '',
        permissions: selectedUser.permissions?.join(', ') ?? '',
      });
    }
  }, [selectedUser, isEditing]);

  const handleStartEditing = () => {
    if (!selectedUser) return;
    setEditForm({
      name: selectedUser.name ?? '',
      role: selectedUser.role === 'admin' ? 'admin' : 'user',
      status: selectedUser.status ?? '',
      permissions: selectedUser.permissions?.join(', ') ?? '',
    });
    setUpdateError(null);
    setUpdateSuccess(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setUpdateError(null);
    setUpdateSuccess(null);
    if (selectedUser) {
      setEditForm({
        name: selectedUser.name ?? '',
        role: selectedUser.role === 'admin' ? 'admin' : 'user',
        status: selectedUser.status ?? '',
        permissions: selectedUser.permissions?.join(', ') ?? '',
      });
    }
  };

  const parsePermissions = (value: string) =>
    value
      .split(/[\n,]/)
      .map((permission) => permission.trim())
      .filter(Boolean);

  const handleUpdate = async () => {
    if (!selectedUser) return;

    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setUpdateError('Name cannot be empty.');
      return;
    }

    const permissionsList = parsePermissions(editForm.permissions);
    const payload: UpdateAdminUserPayload = {
      email: selectedUser.email,
      name: trimmedName,
      role: editForm.role,
      status: editForm.status.trim() || undefined,
      permissions: permissionsList.length ? permissionsList : undefined,
    };

    setUpdateLoading(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    try {
      const response = await updateAdminUser(payload);
      const successMessage = response.message || 'User updated successfully.';
      setSelectedUser({
        ...selectedUser,
        name: payload.name ?? selectedUser.name,
        role: payload.role ?? selectedUser.role,
        status: payload.status ?? selectedUser.status,
        permissions: payload.permissions ?? selectedUser.permissions,
      });
      setIsEditing(false);
      setUpdateSuccess(successMessage);
      showSuccessToast('User updated', successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user.';
      setUpdateError(message);
      showErrorToast('Update failed', message);
    } finally {
      setUpdateLoading(false);
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
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Full Name</label>
                      <Input
                        value={editForm.name}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                        disabled={updateLoading}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Email</label>
                      <Input value={selectedUser.email} disabled />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Role</label>
                      <Select
                        value={editForm.role}
                        onValueChange={(value: 'admin' | 'user') => setEditForm((prev) => ({ ...prev, role: value }))}
                        disabled={updateLoading}
                      >
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Status</label>
                      <Input
                        value={editForm.status}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
                        disabled={updateLoading}
                        placeholder="e.g. active"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Permissions</label>
                    <Textarea
                      value={editForm.permissions}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, permissions: event.target.value }))}
                      disabled={updateLoading}
                      placeholder="Enter comma or newline-separated permissions"
                      className="min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground">Separate permissions with commas or new lines.</p>
                  </div>

                  {updateError && <p className="text-sm text-destructive">{updateError}</p>}
                  {updateSuccess && <p className="text-sm text-emerald-500">{updateSuccess}</p>}

                  <div className="flex flex-wrap gap-3">
                    <Button className="rounded-2xl px-6" onClick={handleUpdate} disabled={updateLoading}>
                      {updateLoading ? 'Updating…' : 'Update'}
                    </Button>
                    <Button variant="ghost" className="rounded-2xl px-6" onClick={handleCancelEdit} disabled={updateLoading}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
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
                  <Button className="rounded-2xl px-6" variant="outline" onClick={handleStartEditing}>
                    Edit details
                  </Button>
                </>
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
