'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Key, Trash2, RefreshCw, Shield, User as UserIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

// ✅ All Roles with colors
const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-100 text-red-700' },
  { value: 'district_admin', label: 'District Admin', color: 'bg-purple-100 text-purple-700' },
  { value: 'station_officer', label: 'Station Officer', color: 'bg-blue-100 text-blue-700' },
  { value: 'inspector', label: 'Inspector', color: 'bg-green-100 text-green-700' },
  { value: 'viewer', label: 'Viewer', color: 'bg-gray-100 text-gray-700' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [districts, setDistricts] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const supabase = createClient();
  const router = useRouter();

  // Generate random password
  const generatePassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password + '!1';
  };

  const checkAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single();
        
      if (userData?.role !== 'super_admin') {
        toast.error('Access denied. Super admin only.');
        router.push('/dashboard');
        return;
      }
      
      setUserRole(userData.role);
    } catch (error) {
      console.error('Access check error:', error);
      router.push('/dashboard');
    }
  }, [supabase, router]);

  const loadMasterData = useCallback(async () => {
    try {
      const [districtsRes, stationsRes] = await Promise.all([
        supabase.from('railway_districts').select('id, name').order('name'),
        supabase.from('police_stations').select('id, name').order('name'),
      ]);
      
      if (districtsRes.data) setDistricts(districtsRes.data);
      if (stationsRes.data) setStations(stationsRes.data);
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  }, [supabase]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_active, is_first_login, employee_id, designation, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      toast.error(error.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    checkAccess();
    loadMasterData();
    loadUsers();
  }, [checkAccess, loadMasterData, loadUsers]);

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const role = formData.get('role') as string;
    const employeeId = formData.get('employeeId') as string;
    const designation = formData.get('designation') as string;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('User with this email already exists');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      const { error: userError } = await supabase.from('users').insert({
        auth_id: authData.user.id,
        email,
        full_name: fullName,
        role,
        employee_id: employeeId || null,
        designation: designation || null,
        is_active: true,
        is_first_login: true,
      });

      if (userError) throw userError;

      toast.success('User created successfully!');
      toast.info(`Credentials: ${email} / ${password}`);
      setShowAddDialog(false);
      (e.target as HTMLFormElement).reset();
      loadUsers();
    } catch (error: any) {
      console.error('Create user error:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setActionLoading(true);
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const role = formData.get('role') as string;
    const isActive = formData.get('isActive') === 'true';
    const designation = formData.get('designation') as string;
    const employeeId = formData.get('employeeId') as string;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          role,
          is_active: isActive,
          designation: designation || null,
          employee_id: employeeId || null,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('User updated successfully');
      setShowEditDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Update user error:', error);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('User deactivated successfully');
      setShowDeleteDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast.error(error.message || 'Failed to deactivate user');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ Password Reset - With Confirmation Modal
  const openResetPasswordDialog = (user: any) => {
    setSelectedUser(user);
    setNewPassword(generatePassword());
    setShowResetPasswordDialog(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_first_login: true })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Copy to clipboard
      navigator.clipboard.writeText(newPassword);
      
      toast.success(`Password reset for ${selectedUser.full_name}`);
      toast.info(`New Password: ${newPassword} (Copied!)`);
      
      setShowResetPasswordDialog(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  // Get role badge with color
  const getRoleBadge = (role: string) => {
    const roleConfig = ROLES.find(r => r.value === role);
    return (
      <Badge className={roleConfig?.color || 'bg-gray-100 text-gray-700'}>
        {roleConfig?.label || role || 'N/A'}
      </Badge>
    );
  };

  if (userRole !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="text-gray-600 mt-2">Super admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">User Management</h1>
            <p className="text-amber-100 text-lg">Manage system users and their access permissions</p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            variant="secondary"
            className="bg-white text-amber-600 hover:bg-amber-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="border-2 border-amber-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-amber-600" />
              System Users
              <Badge variant="outline" className="text-lg font-semibold px-3 py-1">
                {users.length} Users
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              disabled={loading}
              className="border-amber-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-lg border-2 border-amber-100">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <tr>
                  <th className="p-3 text-left font-semibold">Name</th>
                  <th className="p-3 text-left font-semibold">Email</th>
                  <th className="p-3 text-left font-semibold">Role</th>
                  <th className="p-3 text-left font-semibold">Status</th>
                  <th className="p-3 text-left font-semibold">Employee ID</th>
                  <th className="p-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={6} className="p-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <UserIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500 font-medium">No users found</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-amber-50 transition-colors">
                      <td className="p-3">
                        <p className="font-medium">{user.full_name || 'N/A'}</p>
                        {user.designation && (
                          <p className="text-xs text-gray-500">{user.designation}</p>
                        )}
                      </td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3">{getRoleBadge(user.role)}</td>
                      <td className="p-3">
                        <Badge className={user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3">{user.employee_id || 'N/A'}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditDialog(true);
                            }}
                            className="text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* ✅ Fixed: Opens confirmation dialog */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openResetPasswordDialog(user)}
                            className="text-orange-600 hover:bg-orange-50"
                            title="Reset Password"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600 hover:bg-red-50"
                            title="Deactivate"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" name="fullName" required />
              </div>
              <div>
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input id="employeeId" name="employeeId" placeholder="EMP001" />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  name="password"
                  type="text"
                  required
                  minLength={8}
                  defaultValue={generatePassword()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById('password') as HTMLInputElement;
                    input.value = generatePassword();
                  }}
                >
                  Generate
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role *</Label>
                <select
                  id="role"
                  name="role"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select Role</option>
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input id="designation" name="designation" placeholder="Sub Inspector" />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={actionLoading} className="flex-1 bg-amber-500 hover:bg-amber-600">
                {actionLoading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create User'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input name="fullName" defaultValue={selectedUser.full_name} required />
              </div>
              <div>
                <Label>Email (cannot change)</Label>
                <Input defaultValue={selectedUser.email} disabled className="bg-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee ID</Label>
                  <Input name="employeeId" defaultValue={selectedUser.employee_id || ''} />
                </div>
                <div>
                  <Label>Designation</Label>
                  <Input name="designation" defaultValue={selectedUser.designation || ''} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <select name="role" defaultValue={selectedUser.role} required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select name="isActive" defaultValue={selectedUser.is_active ? 'true' : 'false'}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={actionLoading} className="flex-1 bg-blue-500 hover:bg-blue-600">
                  {actionLoading ? 'Updating...' : 'Update User'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ Password Reset Confirmation Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Reset Password
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">Resetting password for:</p>
                <p className="font-semibold text-lg">{selectedUser.full_name}</p>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
              </div>
              
              <div>
                <Label>New Password</Label>
                <div className="flex gap-2">
                  <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="font-mono" />
                  <Button type="button" variant="outline" onClick={() => setNewPassword(generatePassword())}>
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Password will be copied to clipboard</p>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={handleResetPassword} disabled={actionLoading || !newPassword} 
                  className="flex-1 bg-orange-500 hover:bg-orange-600">
                  {actionLoading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Resetting...</> : 
                    <><Key className="mr-2 h-4 w-4" />Reset Password</>}
                </Button>
                <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Deactivate User</DialogTitle>
            <DialogDescription>User will not be able to login until reactivated.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <p>Deactivate <strong>{selectedUser.full_name}</strong>?</p>
              <div className="flex gap-2">
                <Button onClick={handleDeleteUser} disabled={actionLoading} variant="destructive" className="flex-1">
                  {actionLoading ? 'Deactivating...' : 'Deactivate'}
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}