import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { DashboardUser, deleteAdminUser, fetchDashboardUsers, adminChangePassword } from '@/services/adminApi';
import { Pencil, Trash2, KeyRound } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

interface ManageUsersSectionProps {
  onEditUser: (email: string) => void;
  onAddUser: () => void;
}

const formatDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '--');

const ManageUsersSection = ({ onEditUser, onAddUser }: ManageUsersSectionProps) => {
  const { token } = useAuth();
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [changePwEmail, setChangePwEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changePwLoading, setChangePwLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDashboardUsers(token);
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users', err);
        setError(err instanceof Error ? err.message : 'Unable to load users.');
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, [token]);

  return (
    <>
    <Card className="bg-card/80">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Users</CardTitle>
          <CardDescription>All operators with access to Kotwal.</CardDescription>
        </div>
        <Button className="rounded-2xl" onClick={onAddUser}>
          Add new user
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Creation date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Loading users…
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.email}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell className="font-mono text-xs">{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell className="capitalize">{user.status || '--'}</TableCell>
                  <TableCell>{formatDateTime(user.lastLogin)}</TableCell>
                  <TableCell>{formatDateTime(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditUser(user.email)}
                        className="inline-flex items-center gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setChangePwEmail(user.email);
                          setNewPassword('');
                        }}
                        className="inline-flex items-center gap-2"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span className="hidden sm:inline">Password</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!token) return;
                          const confirmed = window.confirm(
                            'Are you sure you want to delete this user? This action cannot be undone.',
                          );
                          if (!confirmed) return;

                          setDeletingEmail(user.email);
                          try {
                            const result = await deleteAdminUser(user.email, token);
                            setUsers((prev) => prev.filter((u) => u.email !== user.email));
                            showSuccessToast('User deleted', result.message);
                          } catch (err) {
                            console.error('Failed to delete user', err);
                            const message =
                              err instanceof Error ? err.message : 'Unable to delete user. Please try again.';
                            setError(message);
                            showErrorToast('Delete failed', message);
                          } finally {
                            setDeletingEmail(null);
                          }
                        }}
                        disabled={deletingEmail === user.email}
                        className="inline-flex items-center gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* Change Password Dialog */}
    <Dialog open={!!changePwEmail} onOpenChange={(open) => { if (!open) setChangePwEmail(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Set a new password for <span className="font-semibold">{changePwEmail}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setChangePwEmail(null)} disabled={changePwLoading}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!changePwEmail || !newPassword.trim()) return;
              setChangePwLoading(true);
              try {
                const result = await adminChangePassword({ email: changePwEmail, newPassword: newPassword.trim() });
                showSuccessToast('Password changed', result.message);
                setChangePwEmail(null);
                setNewPassword('');
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Unable to change password.';
                showErrorToast('Change password failed', message);
              } finally {
                setChangePwLoading(false);
              }
            }}
            disabled={changePwLoading || !newPassword.trim()}
          >
            {changePwLoading ? 'Changing…' : 'Change Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ManageUsersSection;
